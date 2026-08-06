import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { computeOperationalStatus } from './operational-status';

const PREVIEW_LENGTH = 120;

/** Include compartido: todo lo que hace falta para calcular el DTO enriquecido. */
const ENRICHED_INCLUDE = {
  customer: true,
  assignedUser: { select: { id: true, name: true, email: true } },
  business: { select: { waitingThresholdMinutes: true } },
  orders: { take: 1, orderBy: { createdAt: 'desc' as const } },
  messages: { take: 1, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.ConversationInclude;

type ConversationWithRelations = Prisma.ConversationGetPayload<{
  include: typeof ENRICHED_INCLUDE;
}>;

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findAll(businessId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: { businessId },
      include: ENRICHED_INCLUDE,
      orderBy: { lastMessageAt: 'desc' },
    });
    return conversations.map((c) => this.toDto(c));
  }

  async findOne(businessId: string, id: string) {
    const conversation = await this.getScopedEnriched(businessId, id);
    if (conversation.unreadCount > 0) {
      await this.prisma.conversation.update({
        where: { id },
        data: { unreadCount: 0 },
      });
      conversation.unreadCount = 0;
    }
    const messages = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });
    const dto = this.toDto(conversation);
    this.realtimeGateway.emitToBusiness(businessId, 'conversation.updated', dto);
    return { ...dto, messages };
  }

  /**
   * Version enriquecida sin efectos secundarios (no marca como leido). Usada
   * internamente por otros modulos (orders, bot, whatsapp) para re-serializar
   * y emitir una conversacion despues de modificarla.
   */
  async getEnriched(businessId: string, id: string) {
    const conversation = await this.getScopedEnriched(businessId, id);
    return this.toDto(conversation);
  }

  /**
   * Usado por el webhook de WhatsApp: obtiene la conversacion activa del
   * cliente o crea una nueva en estado IDLE. Emite `conversation.new` cuando
   * la crea.
   */
  async findOrCreateForCustomer(businessId: string, customerId: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: { businessId, customerId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return existing;
    }
    const created = await this.prisma.conversation.create({
      data: { businessId, customerId, state: 'IDLE' },
    });
    const dto = await this.getEnriched(businessId, created.id);
    this.realtimeGateway.emitToBusiness(businessId, 'conversation.new', dto);
    return created;
  }

  /**
   * Transiciona el estado de la conversacion y deja registro en BotState (auditoria).
   */
  async transitionState(
    id: string,
    toState: ConversationStatus,
    intent: string,
  ): Promise<void> {
    const current = await this.prisma.conversation.findUniqueOrThrow({
      where: { id },
    });
    await this.prisma.$transaction([
      this.prisma.botState.create({
        data: {
          conversationId: id,
          fromState: current.state,
          toState,
          intent,
        },
      }),
      this.prisma.conversation.update({
        where: { id },
        data: { state: toState },
      }),
    ]);
    await this.emitUpdated(current.businessId, id);
  }

  async updateContext(id: string, context: Prisma.InputJsonValue): Promise<void> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { context },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  async toggleBot(businessId: string, id: string) {
    const conversation = await this.getScoped(businessId, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { botEnabled: !conversation.botEnabled },
    });
    return this.emitUpdated(businessId, id);
  }

  /**
   * Usado por el motor del bot al detectar intencion "hablar con humano":
   * desactiva el bot para que un agente tome el control.
   */
  async toggleBotOff(id: string): Promise<void> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { botEnabled: false },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  async assign(businessId: string, id: string, userId: string) {
    await this.getScoped(businessId, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { assignedUserId: userId },
    });
    return this.emitUpdated(businessId, id);
  }

  /**
   * Libera el control humano: limpia assignedUserId y, opcionalmente,
   * reactiva el bot (si se pide explicitamente o si el negocio lo tiene
   * configurado por defecto). NO marca la conversacion como resuelta.
   * El scoping por businessId (via getScoped) evita que un usuario libere
   * una conversacion de otro negocio.
   */
  async releaseControl(
    businessId: string,
    id: string,
    reactivateBotOverride?: boolean,
  ) {
    await this.getScoped(businessId, id);
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
    });
    const reactivateBot = reactivateBotOverride ?? business.reactivateBotOnRelease;

    await this.prisma.conversation.update({
      where: { id },
      data: {
        assignedUserId: null,
        ...(reactivateBot ? { botEnabled: true } : {}),
      },
    });
    return this.emitUpdated(businessId, id);
  }

  async resolve(businessId: string, id: string) {
    await this.getScoped(businessId, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { resolvedAt: new Date() },
    });
    return this.emitUpdated(businessId, id);
  }

  async reopen(businessId: string, id: string) {
    await this.getScoped(businessId, id);
    await this.prisma.conversation.update({
      where: { id },
      data: { resolvedAt: null },
    });
    return this.emitUpdated(businessId, id);
  }

  /** Registra un mensaje entrante: marca la hora y suma al contador de no leidos. */
  async recordInboundMessage(id: string): Promise<void> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: {
        lastInboundMessageAt: new Date(),
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
      },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  /** Registra un mensaje saliente (del bot o de un agente). */
  async recordOutboundMessage(id: string): Promise<void> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { lastOutboundMessageAt: new Date(), lastMessageAt: new Date() },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  async setAutomationError(id: string, message: string): Promise<void> {
    const conversation = await this.prisma.conversation.update({
      where: { id },
      data: { automationError: message },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  async clearAutomationError(id: string): Promise<void> {
    const conversation = await this.prisma.conversation.findUniqueOrThrow({
      where: { id },
    });
    if (!conversation.automationError) {
      return;
    }
    await this.prisma.conversation.update({
      where: { id },
      data: { automationError: null },
    });
    await this.emitUpdated(conversation.businessId, id);
  }

  /** Re-serializa y emite `conversation.updated`. Usado por otros modulos (orders, pos). */
  async notifyChanged(businessId: string, id: string) {
    return this.emitUpdated(businessId, id);
  }

  private async emitUpdated(businessId: string, id: string) {
    const dto = await this.getEnriched(businessId, id);
    this.realtimeGateway.emitToBusiness(businessId, 'conversation.updated', dto);
    return dto;
  }

  private async getScoped(businessId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, businessId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada');
    }
    return conversation;
  }

  private async getScopedEnriched(
    businessId: string,
    id: string,
  ): Promise<ConversationWithRelations> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, businessId },
      include: ENRICHED_INCLUDE,
    });
    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada');
    }
    return conversation;
  }

  private toDto(conversation: ConversationWithRelations) {
    const latestOrder = conversation.orders[0] ?? null;
    const latestMessage = conversation.messages[0] ?? null;
    const operationalStatus = computeOperationalStatus({
      automationError: conversation.automationError,
      resolvedAt: conversation.resolvedAt,
      botEnabled: conversation.botEnabled,
      assignedUserId: conversation.assignedUserId,
      conversationState: conversation.state,
      activeOrderStatus: latestOrder?.status ?? null,
      lastInboundMessageAt: conversation.lastInboundMessageAt,
      lastOutboundMessageAt: conversation.lastOutboundMessageAt,
      waitingThresholdMinutes: conversation.business.waitingThresholdMinutes,
    });

    const { orders: _orders, messages: _messages, business: _business, ...rest } =
      conversation;

    return {
      ...rest,
      operationalStatus,
      activeOrderId: latestOrder?.id ?? null,
      activeOrderStatus: latestOrder?.status ?? null,
      lastMessagePreview: latestMessage
        ? latestMessage.content.slice(0, PREVIEW_LENGTH)
        : null,
      lastMessageDirection: latestMessage?.direction ?? null,
    };
  }
}
