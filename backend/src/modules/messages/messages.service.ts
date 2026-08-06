import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Message,
  MessageDirection,
  MessageSenderType,
  MessageType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EvolutionApiService } from '../whatsapp/evolution-api.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

/** senderType que NO se reenvia al cliente por WhatsApp (nota interna del timeline). */
const INTERNAL_ONLY_SENDER_TYPES: MessageSenderType[] = [MessageSenderType.SYSTEM];

export interface SendOutboundParams {
  businessId: string;
  conversationId: string;
  content: string;
  senderType: Exclude<MessageSenderType, 'CUSTOMER'>;
  /** Solo aplica (y solo debe venir) cuando senderType = AGENT. */
  senderUserId?: string;
  senderNameSnapshot?: string;
  /** Relaciona mensajes del bot con la ejecucion del job que los genero. */
  automationRunId?: string;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evolutionApiService: EvolutionApiService,
    private readonly conversationsService: ConversationsService,
    private readonly realtimeGateway: RealtimeGateway,
  ) {}

  async findByConversation(
    businessId: string,
    conversationId: string,
  ): Promise<Message[]> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, businessId },
    });
    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada');
    }
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Persiste un mensaje entrante (usado por el webhook de WhatsApp).
   * Guarda siempre el rawPayload completo, tal como exige la especificacion.
   * Siempre senderType = CUSTOMER: es la unica ruta que crea mensajes entrantes.
   */
  async createInbound(params: {
    businessId: string;
    conversationId: string;
    content: string;
    type: MessageType;
    rawPayload: Prisma.InputJsonValue;
  }): Promise<Message> {
    const message = await this.prisma.message.create({
      data: {
        businessId: params.businessId,
        conversationId: params.conversationId,
        direction: MessageDirection.IN,
        type: params.type,
        senderType: MessageSenderType.CUSTOMER,
        content: params.content,
        rawPayload: params.rawPayload,
      },
    });
    await this.conversationsService.recordInboundMessage(params.conversationId);
    this.realtimeGateway.emitToBusiness(
      params.businessId,
      'message.new',
      message,
    );
    return message;
  }

  /**
   * Unico punto de envio/registro de mensajes salientes. Lo usan el motor del
   * bot (senderType BOT), el envio manual desde el CRM (AGENT, forzado por el
   * controller desde el JWT), notificaciones de integraciones como el POS
   * (INTEGRATION) y notas internas del timeline (SYSTEM). Solo SYSTEM no se
   * reenvia por WhatsApp: es una nota interna, no algo que deba leer el cliente.
   */
  async sendOutbound(params: SendOutboundParams): Promise<Message> {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: params.conversationId, businessId: params.businessId },
      include: { customer: true },
    });
    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    const dispatchToWhatsapp = !INTERNAL_ONLY_SENDER_TYPES.includes(params.senderType);
    if (dispatchToWhatsapp) {
      await this.evolutionApiService.sendMessage(
        conversation.customer.phone,
        params.content,
      );
    }

    const message = await this.prisma.message.create({
      data: {
        businessId: params.businessId,
        conversationId: params.conversationId,
        direction: MessageDirection.OUT,
        type: MessageType.TEXT,
        senderType: params.senderType,
        senderUserId: params.senderUserId,
        senderNameSnapshot: params.senderNameSnapshot,
        automationRunId: params.automationRunId,
        content: params.content,
        rawPayload: {
          source: 'internal',
          dispatchedToWhatsapp: dispatchToWhatsapp,
          content: params.content,
        },
      },
    });

    if (dispatchToWhatsapp) {
      // Solo cuenta como "respuesta al cliente" (para WAITING) si de verdad
      // le llego el mensaje; una nota SYSTEM no cuenta como respuesta.
      await this.conversationsService.recordOutboundMessage(params.conversationId);
    }
    this.realtimeGateway.emitToBusiness(
      params.businessId,
      'message.new',
      message,
    );
    return message;
  }
}
