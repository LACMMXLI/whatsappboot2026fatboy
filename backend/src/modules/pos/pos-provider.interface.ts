import { Order, OrderItem } from '@prisma/client';

export const POS_PROVIDER = 'POS_PROVIDER';

/**
 * Interfaz generica para integrar un sistema POS real. La especificacion no
 * define un proveedor concreto, asi que se deja esta interfaz + una
 * implementacion de referencia (LoggingPosProvider) para que un conector
 * real (Square, Toast, etc.) se pueda enchufar despues sin tocar el resto
 * del modulo.
 */
export interface PosProvider {
  sendOrder(order: Order & { items: OrderItem[] }): Promise<void>;
}
