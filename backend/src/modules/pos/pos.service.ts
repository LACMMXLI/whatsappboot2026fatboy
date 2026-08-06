import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MessageSenderType, OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { MessagesService } from '../messages/messages.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { POS_PROVIDER, PosProvider } from './pos-provider.interface';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly messagesService: MessagesService,
    private readonly realtimeGateway: RealtimeGateway,
    @Inject(POS_PROVIDER) private readonly posProvider: PosProvider,
  ) {}

  /**
   * Envia un pedido confirmado al POS y lo marca como SENT_TO_POS.
   */
  async sendOrder(businessId: string, orderId: string) {
    const order = await this.ordersService.findOne(businessId, orderId);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new NotFoundException(
        `El pedido debe estar CONFIRMED para enviarse al POS (estado actual: ${order.status})`,
      );
    }
    await this.posProvider.sendOrder(order);
    const updated = await this.ordersService.updateStatus(
      businessId,
      orderId,
      OrderStatus.SENT_TO_POS,
    );
    this.realtimeGateway.emitToBusiness(businessId, 'order.updated', updated);
    return updated;
  }

  /**
   * Recibe actualizaciones de estado desde el POS externo (ready/delivered)
   * y dispara la notificacion al cliente por WhatsApp. No tiene businessId
   * (webhook publico), por eso usa la variante sin scoping de OrdersService.
   */
  async receiveStatusUpdate(orderId: string, status: 'ready' | 'delivered') {
    const newStatus = status === 'ready' ? OrderStatus.READY : OrderStatus.DELIVERED;
    const updated = await this.ordersService.updateStatusUnscoped(orderId, newStatus);

    this.realtimeGateway.emitToBusiness(updated.businessId, 'order.updated', updated);

    if (updated.conversationId) {
      const notification =
        status === 'ready'
          ? 'Tu pedido ya esta listo! 🎉'
          : 'Tu pedido fue entregado. Gracias por tu compra!';
      try {
        await this.messagesService.sendOutbound({
          businessId: updated.businessId,
          conversationId: updated.conversationId,
          content: notification,
          senderType: MessageSenderType.INTEGRATION,
        });
      } catch (error) {
        this.logger.warn(
          `No se pudo notificar al cliente del pedido ${orderId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return updated;
  }
}
