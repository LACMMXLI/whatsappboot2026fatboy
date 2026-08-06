import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'clxyz-conversation-id' })
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ example: 'Hola! En un momento te atendemos.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
