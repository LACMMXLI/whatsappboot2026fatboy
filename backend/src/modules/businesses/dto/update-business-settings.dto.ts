import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional({
    example: 3,
    description:
      'Minutos sin respuesta tras un mensaje del cliente antes de marcar la conversacion como "esperando"',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  waitingThresholdMinutes?: number;

  @ApiPropertyOptional({
    example: false,
    description:
      'Si es true, liberar el control humano de una conversacion (PATCH /conversations/:id/release-control) reactiva el bot automaticamente salvo que la request indique lo contrario',
  })
  @IsOptional()
  @IsBoolean()
  reactivateBotOnRelease?: boolean;
}
