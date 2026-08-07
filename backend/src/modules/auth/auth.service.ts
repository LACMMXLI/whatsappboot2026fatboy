import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
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

  /**
   * "Olvide mi contraseña": genera un token de un solo uso y lo manda por
   * email con un link al CRM. SIEMPRE responde el mismo mensaje generico,
   * exista o no ese email — si se distinguiera la respuesta, cualquiera
   * podria usar este endpoint para averiguar que emails estan registrados
   * (enumeracion de cuentas). El rate limit de @Throttle en el controller
   * ademas evita que se use para spamear emails de recuperacion.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericResponse = {
      message:
        'Si el email esta registrado, vas a recibir un enlace para restablecer tu contraseña.',
    };

    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return genericResponse;
    }

    const { passwordResetTtlMinutes } = this.configService.get('authSecurity');
    const frontendUrl = this.configService.get<string>('frontendUrl');
    if (!frontendUrl) {
      // No podemos armar un link util sin esto. No falla la request (el
      // mensaje sigue siendo generico), pero queda claro en el log que
      // falta configurar FRONTEND_URL antes de que esto sirva de verdad.
      this.logger.error(
        'FRONTEND_URL no esta configurado: no se puede armar el link de recuperacion de contraseña.',
      );
      return genericResponse;
    }

    const rawToken = await this.usersService.createPasswordResetToken(
      user.id,
      passwordResetTtlMinutes,
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);

    return genericResponse;
  }

  /** Aplica la nueva contraseña si el token es valido (existe, no vencio, no se uso). */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenRecord = await this.usersService.findValidPasswordResetToken(
      dto.token,
    );
    if (!tokenRecord) {
      throw new UnauthorizedException(
        'El enlace de recuperacion es invalido o ya vencio. Solicita uno nuevo.',
      );
    }

    await this.usersService.resetPasswordWithToken(
      tokenRecord.id,
      tokenRecord.userId,
      dto.newPassword,
    );

    return { message: 'Contraseña actualizada. Ya podes iniciar sesion.' };
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
