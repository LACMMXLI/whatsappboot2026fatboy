import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateBusinessDto {
  @ApiProperty({ example: 'Sushi Roll Express' })
  @IsNotEmpty()
  businessName: string;

  @ApiProperty({ example: 'Juan Perez' })
  @IsNotEmpty()
  adminName: string;

  @ApiProperty({ example: 'owner@sushiroll.com' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'S3curePassword!' })
  @MinLength(8)
  adminPassword: string;
}
