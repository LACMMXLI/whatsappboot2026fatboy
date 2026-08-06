import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Promo del dia' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: '2 rollos por $150' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 150,
    description: 'Precio de la promocion como item vendible (igual que un producto).',
  })
  @IsNumber()
  @Min(0.01)
  price: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
