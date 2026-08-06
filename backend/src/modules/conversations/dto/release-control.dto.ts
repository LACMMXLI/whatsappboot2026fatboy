import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ReleaseControlDto {
  @ApiPropertyOptional({
    example: true,
    description:
      'Si se especifica, fuerza reactivar (true) o no reactivar (false) el bot al liberar el control, sin importar la configuracion del negocio (waitingThresholdMinutes/reactivateBotOnRelease). Si se omite, se usa Business.reactivateBotOnRelease.',
  })
  @IsOptional()
  @IsBoolean()
  reactivateBot?: boolean;
}
