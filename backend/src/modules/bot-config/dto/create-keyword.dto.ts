import { ApiProperty } from '@nestjs/swagger';
import { BotIntentType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateKeywordDto {
  @ApiProperty({
    enum: ['greeting', 'view_menu', 'confirm', 'cancel', 'talk_to_human'],
    example: 'view_menu',
  })
  @IsEnum(BotIntentType)
  intent: BotIntentType;

  @ApiProperty({ example: 'que tienen', description: 'Palabra o frase disparadora' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  phrase: string;
}
