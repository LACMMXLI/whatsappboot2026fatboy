import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AssignConversationDto {
  @ApiProperty({ example: 'clxyz123' })
  @IsString()
  userId: string;
}
