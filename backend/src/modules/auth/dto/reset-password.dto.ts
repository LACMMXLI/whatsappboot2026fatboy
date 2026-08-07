import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por email (query param del link)' })
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NuevaPassword123!' })
  @MinLength(8)
  newPassword: string;
}
