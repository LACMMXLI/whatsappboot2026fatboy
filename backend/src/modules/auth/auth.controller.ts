import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login unico para superadmin, ADMIN y AGENT (el rol se resuelve desde
   * el usuario encontrado, no desde el request). Limite de intentos por IP
   * mas estricto que el resto de la API (LOGIN_THROTTLE_LIMIT por
   * LOGIN_THROTTLE_TTL_MS, default 5 por minuto); el bloqueo por cuenta
   * (independiente de la IP) se resuelve en AuthService.login.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: parseInt(process.env.LOGIN_THROTTLE_LIMIT ?? '5', 10),
      ttl: parseInt(process.env.LOGIN_THROTTLE_TTL_MS ?? '60000', 10),
    },
  })
  @ApiOperation({ summary: 'Iniciar sesion y obtener un JWT' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * "Olvide mi contraseña" — disponible para cualquier cuenta (superadmin,
   * ADMIN o AGENT). Rate limit propio y mas estricto que login (menos
   * intentos, ventana mas larga) porque ademas de fuerza bruta esto puede
   * usarse para spamear emails de recuperacion a un tercero.
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: parseInt(process.env.PASSWORD_RESET_THROTTLE_LIMIT ?? '3', 10),
      ttl: parseInt(process.env.PASSWORD_RESET_THROTTLE_TTL_MS ?? '600000', 10),
    },
  })
  @ApiOperation({
    summary: 'Solicitar un enlace de recuperacion de contraseña por email',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /** Aplica la nueva contraseña usando el token recibido por email. */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: parseInt(process.env.PASSWORD_RESET_THROTTLE_LIMIT ?? '3', 10),
      ttl: parseInt(process.env.PASSWORD_RESET_THROTTLE_TTL_MS ?? '600000', 10),
    },
  })
  @ApiOperation({ summary: 'Establecer una nueva contraseña con el token del email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
