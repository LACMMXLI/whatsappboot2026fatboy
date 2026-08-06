import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Rollo California' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Sushi' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: ['california', 'rollo california'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UploadProductsDto {
  @ApiProperty({ type: [CreateProductDto] })
  @IsArray()
  @ArrayNotEmpty()
  products: CreateProductDto[];
}
