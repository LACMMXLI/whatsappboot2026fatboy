import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'empleado@sushiroll.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3curePassword!' })
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Maria Lopez' })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'AGENT',
    enum: UserRole,
    description: 'Rol dentro del negocio (no confundir con superadmin). Default: AGENT.',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
