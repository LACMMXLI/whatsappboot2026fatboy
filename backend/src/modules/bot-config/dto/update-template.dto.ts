import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateTemplateDto {
  @ApiProperty({
    example: 'Hola! Bienvenido a {businessName}, contanos que se te antoja.',
    description: 'Texto del mensaje. Podes usar {businessName} como placeholder.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
