import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ConfirmOrderDto {
  @ApiProperty({ enum: ['PICKUP', 'DELIVERY'], example: 'PICKUP' })
  @IsIn(['PICKUP', 'DELIVERY'])
  fulfillmentType: 'PICKUP' | 'DELIVERY';
}
