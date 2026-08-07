import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

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
}
