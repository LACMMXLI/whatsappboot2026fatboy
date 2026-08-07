import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordResetToken, User, UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

function hashToken(rawToken: string): string {
  // Solo se persiste este hash (sha256, determinista): el token crudo va
  // por email y nunca se guarda, asi una fuga de la base no permite
  // reconstruir links de recuperacion validos.
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findAllByBusiness(businessId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(data: {
    businessId: string;
    email: string;
    passwordHash: string;
    name: string;
    role?: UserRole;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /**
   * Suma un intento de login fallido y, si llega al umbral, bloquea la
   * cuenta hasta `lockedUntil`. Independiente del rate limit por IP: esto
   * protege contra ataques distribuidos (muchas IPs contra un mismo email).
   */
  async registerFailedLogin(
    userId: string,
    maxAttempts: number,
    lockoutMinutes: number,
  ): Promise<void> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    if (user.failedLoginAttempts >= maxAttempts) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + lockoutMinutes * 60_000),
        },
      });
    }
  }

  /** Resetea el contador de intentos fallidos y el bloqueo tras un login exitoso. */
  resetFailedLogins(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  /**
   * Usado tanto por SuperAdminService (crear el primer ADMIN de un negocio
   * nuevo) como por UsersController (un ADMIN agrega empleados a su propio
   * negocio): hashea la contraseña y valida que el email no exista.
   */
  async createWithPassword(
    businessId: string,
    dto: { email: string; password: string; name: string; role?: UserRole },
  ): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.create({
      businessId,
      email: dto.email,
      passwordHash,
      name: dto.name,
      role: dto.role ?? 'AGENT',
    });
  }

  /**
   * Genera un token de recuperacion de un solo uso para "olvide mi
   * contraseña". Invalida (borra) cualquier token anterior sin usar del
   * mismo usuario, para que solo el link mas reciente sea valido.
   * Devuelve el token CRUDO (va por email) — nunca se guarda asi en la DB.
   */
  async createPasswordResetToken(
    userId: string,
    ttlMinutes: number,
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    return rawToken;
  }

  /** Busca un token de recuperacion vigente (no usado, no vencido) por su valor crudo. */
  findValidPasswordResetToken(
    rawToken: string,
  ): Promise<(PasswordResetToken & { user: User }) | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashToken(rawToken),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  /**
   * Aplica la nueva contraseña, marca el token como usado, limpia
   * cualquier bloqueo de cuenta activo (tiene sentido: si pudo probar que
   * es dueño del email, no hace falta seguir bloqueado) e invalida el
   * resto de tokens de recuperacion pendientes del usuario.
   */
  async resetPasswordWithToken(
    tokenId: string,
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId, usedAt: null, id: { not: tokenId } },
      }),
    ]);
  }
}
