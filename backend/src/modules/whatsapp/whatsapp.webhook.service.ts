import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MessageType, Prisma } from '@prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { CustomersService } from '../customers/customers.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { BOT_JOBS, BOT_QUEUE } from '../../queue/queue.constants';

interface EvolutionMessageContent {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string };
  audioMessage?: Record<string, unknown>;
  videoMessage?: { caption?: string };
  documentMessage?: { caption?: string; fileName?: string };
}

interface EvolutionWebhookPayload {
  event?: string;
  instance?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    pushName?: string;
    message?: EvolutionMessageContent;
    messageType?: string;
  };
}

const TEXT_MESSAGE_TYPES = ['conversation', 'extendedTextMessage'];

@Injectable()
export class WhatsappWebhookService {
  private readonly logger = new Logger(WhatsappWebhookService.name);

  constructor(
    private readonly businessesService: BusinessesService,
    private readonly customersService: CustomersService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    @InjectQueue(BOT_QUEUE) private readonly botQueue: Queue,
  ) {}

  async handleIncoming(payload: EvolutionWebhookPayload): Promise<void> {
    if (payload.event !== 'messages.upsert') {
      this.logger.debug(`Evento ignorado: ${payload.event ?? 'desconocido'}`);
      return;
    }

    const data = payload.data;
    if (!data?.key?.remoteJid || data.key.fromMe) {
      // Sin remitente identificable, o es un eco de un mensaje enviado por nosotros mismos.
      return;
    }

    if (!payload.instance) {
      this.logger.warn('Webhook sin "instance"; se ignora el evento');
      return;
    }

    const business = await this.businessesService.findByWhatsappInstance(
      payload.instance,
    );
    if (!business) {
      throw new NotFoundException(
        `No se encontro un negocio configurado para la instancia "${payload.instance}"`,
      );
    }

    const number = data.key.remoteJid.split('@')[0];
    const { content, type } = this.extractContent(data);

    const customer = await this.customersService.findOrCreateByPhone(
      business.id,
      number,
      data.pushName,
    );
    const conversation = await this.conversationsService.findOrCreateForCustomer(
      business.id,
      customer.id,
    );
    const message = await this.messagesService.createInbound({
      businessId: business.id,
      conversationId: conversation.id,
      content,
      type,
      rawPayload: payload as unknown as Prisma.InputJsonValue,
    });

    await this.botQueue.add(BOT_JOBS.PROCESS_INCOMING_MESSAGE, {
      businessId: business.id,
      conversationId: conversation.id,
      messageId: message.id,
      content,
    });
  }

  private extractContent(data: NonNullable<EvolutionWebhookPayload['data']>): {
    content: string;
    type: MessageType;
  } {
    const messageType = data.messageType ?? this.guessMessageType(data.message);

    if (messageType && TEXT_MESSAGE_TYPES.includes(messageType)) {
      const content =
        data.message?.conversation ?? data.message?.extendedTextMessage?.text ?? '';
      return { content, type: MessageType.TEXT };
    }
    if (messageType === 'imageMessage') {
      return {
        content: data.message?.imageMessage?.caption ?? '[imagen]',
        type: MessageType.IMAGE,
      };
    }
    if (messageType === 'audioMessage') {
      return { content: '[audio]', type: MessageType.AUDIO };
    }
    if (messageType === 'videoMessage') {
      return {
        content: data.message?.videoMessage?.caption ?? '[video]',
        type: MessageType.VIDEO,
      };
    }
    if (messageType === 'documentMessage') {
      return {
        content:
          data.message?.documentMessage?.fileName ??
          data.message?.documentMessage?.caption ??
          '[documento]',
        type: MessageType.DOCUMENT,
      };
    }
    return { content: '[mensaje no soportado]', type: MessageType.OTHER };
  }

  private guessMessageType(
    message?: EvolutionMessageContent,
  ): string | undefined {
    if (!message) return undefined;
    return Object.keys(message)[0];
  }
}
