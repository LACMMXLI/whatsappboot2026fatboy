import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Endpoint publico de salud (sin JWT). Usado por el HEALTHCHECK del
   * contenedor y por Coolify/el proxy para saber si la app esta lista.
   * Verifica tambien que la base de datos responda, no solo que el proceso
   * este vivo.
   */
  @Get()
  @ApiOperation({ summary: 'Estado del servicio (liveness + conexion a la base de datos)' })
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new ServiceUnavailableException(
        `Base de datos no disponible: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
