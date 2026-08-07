import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateFlowStepDto } from './create-flow-step.dto';

export class CreateFlowDto {
  @ApiProperty({ example: 'Horarios' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiProperty({
    example: ['horarios', 'a que hora abren', 'horario de atencion'],
    description: 'Frases que activan el flujo (se comparan igual que las keywords custom)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  triggers: string[];

  @ApiProperty({ type: [CreateFlowStepDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFlowStepDto)
  steps: CreateFlowStepDto[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  active?: boolean;
}
