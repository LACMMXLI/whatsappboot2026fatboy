import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateWhatsappInstanceDto {
  @ApiProperty({ example: 'sushi-roll-instance' })
  @IsString()
  @IsNotEmpty()
  whatsappInstanceId: string;
}
