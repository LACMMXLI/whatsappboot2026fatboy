import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { RealtimeGateway } from '../realtime/realtime.gateway';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos del negocio' })
  findAll(@BusinessId() businessId: string) {
    return this.ordersService.findAll(businessId);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({
    summary:
      'Obtener el pedido mas reciente de una conversacion (null si todavia no tiene ninguno)',
  })
  findLatestByConversation(
    @BusinessId() businessId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.ordersService.findLatestByConversation(businessId, conversationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un pedido por id' })
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.ordersService.findOne(businessId, id);
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary: 'Confirmar un pedido (carrito -> confirmado) definiendo pickup/delivery',
  })
  async confirm(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    const order = await this.ordersService.confirm(
      businessId,
      id,
      dto.fulfillmentType,
    );
    this.realtimeGateway.emitToBusiness(businessId, 'order.updated', order);
    return order;
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar un pedido' })
  async cancel(@BusinessId() businessId: string, @Param('id') id: string) {
    const order = await this.ordersService.cancel(businessId, id);
    this.realtimeGateway.emitToBusiness(businessId, 'order.updated', order);
    return order;
  }
}
