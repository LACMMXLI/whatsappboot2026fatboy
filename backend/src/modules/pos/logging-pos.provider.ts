import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderItem } from '@prisma/client';
import { PosProvider } from './pos-provider.interface';

/**
 * Implementacion de referencia: no hay un POS real especificado, asi que
 * este provider solo deja constancia (log) del envio. Sirve como punto de
 * extension: reemplazar por un HTTP client real implementando la misma
 * interfaz PosProvider.
 */
@Injectable()
export class LoggingPosProvider implements PosProvider {
  private readonly logger = new Logger(LoggingPosProvider.name);

  async sendOrder(order: Order & { items: OrderItem[] }): Promise<void> {
    this.logger.log(
      `Pedido ${order.id} enviado al POS (simulado). Items: ${order.items
        .map((i) => `${i.quantity}x ${i.nameSnapshot}`)
        .join(', ')}. Total: $${Number(order.total).toFixed(2)}`,
    );
  }
}
