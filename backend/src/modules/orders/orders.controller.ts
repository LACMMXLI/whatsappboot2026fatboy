import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { OrdersService } from './orders.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos del negocio (para el KDS / tablero de pedidos)' })
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
  confirm(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: ConfirmOrderDto,
  ) {
    return this.ordersService.confirm(businessId, id, dto.fulfillmentType);
  }

  @Patch(':id/ready')
  @ApiOperation({
    summary:
      'Marcar un pedido como listo para recoger (cocina/mostrador). Notifica al cliente por WhatsApp.',
  })
  ready(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.ordersService.ready(businessId, id);
  }

  @Patch(':id/deliver')
  @ApiOperation({
    summary: 'Marcar un pedido como entregado/recogido. Notifica al cliente por WhatsApp.',
  })
  deliver(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.ordersService.deliver(businessId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar un pedido' })
  cancel(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.ordersService.cancel(businessId, id);
  }
}
