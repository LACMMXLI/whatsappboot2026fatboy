import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { POS_PROVIDER, PosProvider } from './pos-provider.interface';

@Injectable()
export class PosService {
  private readonly logger = new Logger(PosService.name);

  constructor(
    private readonly ordersService: OrdersService,
    @Inject(POS_PROVIDER) private readonly posProvider: PosProvider,
  ) {}

  /**
   * Envia un pedido confirmado al POS y lo marca como SENT_TO_POS. El
   * emit de `order.updated` y la notificacion al cliente viven en
   * OrdersService (unico lugar que escribe cambios de estado).
   */
  async sendOrder(businessId: string, orderId: string) {
    const order = await this.ordersService.findOne(businessId, orderId);
    if (order.status !== OrderStatus.CONFIRMED) {
      throw new NotFoundException(
        `El pedido debe estar CONFIRMED para enviarse al POS (estado actual: ${order.status})`,
      );
    }
    await this.posProvider.sendOrder(order);
    return this.ordersService.updateStatus(businessId, orderId, OrderStatus.SENT_TO_POS);
  }

  /**
   * Recibe actualizaciones de estado desde el POS externo (ready/delivered).
   * No tiene businessId (webhook publico), por eso usa la variante sin
   * scoping de OrdersService. La notificacion al cliente por WhatsApp la
   * dispara OrdersService automaticamente segun el nuevo estado.
   */
  async receiveStatusUpdate(orderId: string, status: 'ready' | 'delivered') {
    const newStatus = status === 'ready' ? OrderStatus.READY : OrderStatus.DELIVERED;
    return this.ordersService.updateStatusUnscoped(orderId, newStatus);
  }
}
