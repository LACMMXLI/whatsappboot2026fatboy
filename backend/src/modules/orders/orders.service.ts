import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageSenderType, Order, OrderStatus, Product, Promotion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MessagesService } from '../messages/messages.service';

const ORDER_INCLUDE = { items: true, customer: true } as const;
type OrderWithRelations = Order & { items: unknown[]; customer: unknown };

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly messagesService: MessagesService,
  ) {}

  findAll(businessId: string) {
    return this.prisma.order.findMany({
      where: { businessId },
      include: ORDER_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return order;
  }

  /**
   * Pedido mas reciente de una conversacion (o null si todavia no tiene
   * ninguno). Usado por el CRM para mostrar el panel de pedido del chat.
   */
  async findLatestByConversation(businessId: string, conversationId: string) {
    return this.prisma.order.findFirst({
      where: { businessId, conversationId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Devuelve el pedido "carrito" (status = DRAFT) de la conversacion, o lo crea
   * si el cliente todavia no tiene uno abierto. Order funciona como carrito
   * hasta que se confirma.
   */
  async getOrCreateDraft(
    businessId: string,
    customerId: string,
    conversationId: string,
  ): Promise<Order> {
    const existing = await this.prisma.order.findFirst({
      where: { businessId, conversationId, status: OrderStatus.DRAFT },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.order.create({
      data: {
        businessId,
        customerId,
        conversationId,
        status: OrderStatus.DRAFT,
      },
    });
  }

  /**
   * Agrega un producto al carrito (o incrementa la cantidad si ya estaba),
   * usando siempre un snapshot de nombre/precio (el catalogo puede cambiar despues).
   */
  async addItem(
    orderId: string,
    product: Product,
    quantity: number,
  ): Promise<Order> {
    const existingItem = await this.prisma.orderItem.findFirst({
      where: { orderId, productId: product.id },
    });

    const unitPrice = Number(product.price);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await this.prisma.orderItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, subtotal: unitPrice * newQuantity },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId,
          productId: product.id,
          nameSnapshot: product.name,
          priceSnapshot: unitPrice,
          quantity,
          subtotal: unitPrice * quantity,
        },
      });
    }

    return this.recalculateTotal(orderId);
  }

  /**
   * Igual que addItem pero para un item que viene de una promocion (tiene su
   * propio precio, no el de un Product del catalogo).
   */
  async addPromotionItem(
    orderId: string,
    promotion: Promotion,
    quantity: number,
  ): Promise<Order> {
    const existingItem = await this.prisma.orderItem.findFirst({
      where: { orderId, promotionId: promotion.id },
    });

    const unitPrice = Number(promotion.price);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      await this.prisma.orderItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity, subtotal: unitPrice * newQuantity },
      });
    } else {
      await this.prisma.orderItem.create({
        data: {
          orderId,
          promotionId: promotion.id,
          nameSnapshot: promotion.title,
          priceSnapshot: unitPrice,
          quantity,
          subtotal: unitPrice * quantity,
        },
      });
    }

    return this.recalculateTotal(orderId);
  }

  private async recalculateTotal(orderId: string): Promise<Order> {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { total },
    });
  }

  async confirm(
    businessId: string,
    id: string,
    fulfillmentType: 'PICKUP' | 'DELIVERY',
  ): Promise<OrderWithRelations> {
    const order = await this.findOne(businessId, id);
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        `El pedido no se puede confirmar desde el estado ${order.status}`,
      );
    }
    if (order.items.length === 0) {
      throw new BadRequestException('El pedido no tiene productos');
    }
    return this.applyStatus(id, OrderStatus.CONFIRMED, { fulfillmentType });
  }

  async cancel(businessId: string, id: string): Promise<OrderWithRelations> {
    await this.findOne(businessId, id);
    return this.applyStatus(id, OrderStatus.CANCELLED);
  }

  /** Cocina/mostrador termino de preparar el pedido. Notifica al cliente por WhatsApp. */
  async ready(businessId: string, id: string): Promise<OrderWithRelations> {
    const order = await this.findOne(businessId, id);
    if (order.status !== OrderStatus.CONFIRMED && order.status !== OrderStatus.SENT_TO_POS) {
      throw new BadRequestException(
        `El pedido no se puede marcar como listo desde el estado ${order.status}`,
      );
    }
    return this.applyStatus(id, OrderStatus.READY);
  }

  /** El cliente ya recogio el pedido. Notifica al cliente por WhatsApp. */
  async deliver(businessId: string, id: string): Promise<OrderWithRelations> {
    const order = await this.findOne(businessId, id);
    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException(
        `El pedido no se puede marcar como entregado desde el estado ${order.status}`,
      );
    }
    return this.applyStatus(id, OrderStatus.DELIVERED);
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: OrderStatus,
  ): Promise<OrderWithRelations> {
    await this.findOne(businessId, id);
    return this.applyStatus(id, status);
  }

  /**
   * Igual que updateStatus pero sin scoping por businessId: usado por el
   * webhook publico del POS, que no tiene un JWT/businessId del que partir.
   */
  async updateStatusUnscoped(id: string, status: OrderStatus): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    return this.applyStatus(id, status);
  }

  /**
   * Unico lugar que escribe un cambio de estado de pedido: actualiza,
   * emite `order.updated` (tiempo real para el CRM/KDS), refresca la
   * conversacion asociada, y notifica al cliente por WhatsApp cuando
   * corresponde (listo/entregado). Antes esto estaba duplicado entre el
   * controller y el modulo de POS, y el motor del bot (el camino mas
   * comun, via BotEngineService.confirm) no emitia `order.updated` en
   * absoluto.
   */
  private async applyStatus(
    id: string,
    status: OrderStatus,
    extra: { fulfillmentType?: 'PICKUP' | 'DELIVERY' } = {},
  ): Promise<OrderWithRelations> {
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, ...extra },
      include: ORDER_INCLUDE,
    });

    this.realtimeGateway.emitToBusiness(updated.businessId, 'order.updated', updated);

    if (updated.conversationId) {
      await this.conversationsService.notifyChanged(updated.businessId, updated.conversationId);
    }

    await this.notifyCustomer(updated, status);

    return updated;
  }

  /**
   * Notificaciones automaticas (listo/entregado) respetan el interruptor
   * maestro del bot (Business.botEnabled): son mensajes automaticos igual
   * que los del bot conversacional, asi que si el negocio los apago, no se
   * manda NINGUN mensaje automatico, ni siquiera estos. Si esta encendido,
   * se mandan sin importar si esa conversacion puntual tiene el bot
   * desactivado (un agente puede estar atendiendola y esto sigue siendo
   * una notificacion transaccional del pedido, no una respuesta del bot).
   */
  private async notifyCustomer(order: OrderWithRelations, status: OrderStatus): Promise<void> {
    if (!order.conversationId) {
      return;
    }
    let content: string | null = null;
    if (status === OrderStatus.READY) {
      content = 'Tu pedido ya esta listo! 🎉';
    } else if (status === OrderStatus.DELIVERED) {
      content = 'Tu pedido fue entregado. Gracias por tu compra!';
    }
    if (!content) {
      return;
    }
    const business = await this.prisma.business.findUnique({
      where: { id: order.businessId },
      select: { botEnabled: true },
    });
    if (!business?.botEnabled) {
      return;
    }
    await this.messagesService.sendOutbound({
      businessId: order.businessId,
      conversationId: order.conversationId,
      content,
      senderType: MessageSenderType.INTEGRATION,
    });
  }
}
