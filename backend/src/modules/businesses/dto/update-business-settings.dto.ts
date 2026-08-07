import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

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
    example: 'Av. Reforma 123, local 4',
    description:
      'Direccion donde el cliente recoge su pedido. El bot la incluye al confirmar un pedido (solo se maneja servicio de recoleccion).',
  })
  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Interruptor maestro del bot: si es false, no responde automaticamente en NINGUNA conversacion del negocio (sin importar el estado de cada chat individual). Util para pausar todo (cerrado, mantenimiento).',
  })
  @IsOptional()
  @IsBoolean()
  botEnabled?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'Si es true, liberar el control humano de una conversacion (PATCH /conversations/:id/release-control) reactiva el bot automaticamente salvo que la request indique lo contrario',
  })
  @IsOptional()
  @IsBoolean()
  reactivateBotOnRelease?: boolean;
}
