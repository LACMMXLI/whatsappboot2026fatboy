import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login unico para los tres roles (superadmin, ADMIN y AGENT) — todos
   * pasan por aca, asi que la proteccion anti fuerza bruta cubre a
   * cualquier cuenta sin distincion. Dos capas: rate limit por IP (ver
   * @Throttle en AuthController) y bloqueo de LA CUENTA tras varios
   * intentos fallidos consecutivos, sin importar desde que IP vengan.
   */
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      // Mismo mensaje que credenciales invalidas: no revelar si el email
      // existe o no (evita enumeracion de cuentas).
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en ${minutesLeft} minuto(s).`,
      );
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      const { loginMaxFailedAttempts, loginLockoutMinutes } =
        this.configService.get('authSecurity');
      await this.usersService.registerFailedLogin(
        user.id,
        loginMaxFailedAttempts,
        loginLockoutMinutes,
      );
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.usersService.resetFailedLogins(user.id);
    }

    return this.buildAuthResponse(user, user.businessId);
  }

  private buildAuthResponse(
    user: { id: string; email: string; role: string; name: string; isSuperAdmin: boolean },
    businessId: string,
  ) {
    const payload = {
      sub: user.id,
      businessId,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }
}
