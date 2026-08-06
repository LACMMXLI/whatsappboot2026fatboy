import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Sushi Roll Express' })
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'owner@sushiroll.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassword!' })
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsNotEmpty()
  name: string;
}
