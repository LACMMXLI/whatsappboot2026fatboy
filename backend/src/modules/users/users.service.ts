import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

const SALT_ROUNDS = 10;

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
}
