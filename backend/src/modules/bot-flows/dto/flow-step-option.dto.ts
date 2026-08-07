import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class FlowStepOptionDto {
  @ApiProperty({ example: 'Ver horarios de fin de semana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @ApiProperty({
    example: 1,
    nullable: true,
    description: 'Indice (order) del paso al que salta esta opcion. null = termina el flujo.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  gotoStep: number | null;
}
