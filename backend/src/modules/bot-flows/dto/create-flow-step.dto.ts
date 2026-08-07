import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FlowStepOptionDto } from './flow-step-option.dto';

export class CreateFlowStepDto {
  @ApiProperty({ example: 'Abrimos de martes a domingo, de 13:00 a 22:00.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message: string;

  @ApiProperty({ type: [FlowStepOptionDto], required: false, default: [] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepOptionDto)
  options: FlowStepOptionDto[];

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Posicion X del paso en el lienzo del editor visual. null = todavia sin acomodar (el frontend calcula un layout automatico).',
  })
  @IsOptional()
  @IsNumber()
  positionX?: number | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Posicion Y del paso en el lienzo del editor visual. null = todavia sin acomodar (el frontend calcula un layout automatico).',
  })
  @IsOptional()
  @IsNumber()
  positionY?: number | null;
}
