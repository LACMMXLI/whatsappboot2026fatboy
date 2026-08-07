import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsString, MaxLength, ValidateNested } from 'class-validator';
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
}
