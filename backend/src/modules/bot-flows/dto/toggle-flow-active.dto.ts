import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleFlowActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  active: boolean;
}
