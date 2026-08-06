import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class PosStatusDto {
  @ApiProperty({ example: 'clxyz-order-id' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['ready', 'delivered'], example: 'ready' })
  @IsIn(['ready', 'delivered'])
  status: 'ready' | 'delivered';
}
