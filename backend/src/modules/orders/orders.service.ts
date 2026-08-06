import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Order, OrderStatus, Product, Promotion } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
  ) {}

  findAll(businessId: string) {
    return this.prisma.order.findMany({
      where: { businessId },
      include: { items: true, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(businessId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, businessId },
      include: { items: true, customer: true },
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
  ): Promise<Order> {
    const order = await this.findOne(businessId, id);
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(
        `El pedido no se puede confirmar desde el estado ${order.status}`,
      );
    }
    if (order.items.length === 0) {
      throw new BadRequestException('El pedido no tiene productos');
    }
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CONFIRMED, fulfillmentType },
    });
    await this.notifyConversation(updated);
    return updated;
  }

  async cancel(businessId: string, id: string): Promise<Order> {
    await this.findOne(businessId, id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
    await this.notifyConversation(updated);
    return updated;
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: OrderStatus,
  ): Promise<Order> {
    await this.findOne(businessId, id);
    const updated = await this.prisma.order.update({ where: { id }, data: { status } });
    await this.notifyConversation(updated);
    return updated;
  }

  /**
   * Igual que updateStatus pero sin scoping por businessId: usado por el
   * webhook publico del POS, que no tiene un JWT/businessId del que partir.
   */
  async updateStatusUnscoped(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }
    const updated = await this.prisma.order.update({ where: { id }, data: { status } });
    await this.notifyConversation(updated);
    return updated;
  }

  private async notifyConversation(order: Order): Promise<void> {
    if (!order.conversationId) {
      return;
    }
    await this.conversationsService.notifyChanged(order.businessId, order.conversationId);
  }
}
