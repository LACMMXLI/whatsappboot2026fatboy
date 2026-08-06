import { Injectable, Logger } from '@nestjs/common';
import { MessageSenderType, OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';
import { OrdersService } from '../orders/orders.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { IntentDetectorService } from './intent-detector.service';
import { ConversationStateMachine } from './conversation-state-machine';
import { ResponseGeneratorService } from './response-generator.service';
import { ProcessIncomingMessageJob } from '../../queue/queue.constants';

@Injectable()
export class BotEngineService {
  private readonly logger = new Logger(BotEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly promotionsService: PromotionsService,
    private readonly ordersService: OrdersService,
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly intentDetector: IntentDetectorService,
    private readonly stateMachine: ConversationStateMachine,
    private readonly responseGenerator: ResponseGeneratorService,
  ) {}

  async handleIncomingMessage(job: ProcessIncomingMessageJob): Promise<void> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: job.conversationId },
      include: { business: true, customer: true },
    });
    if (!conversation) {
      this.logger.warn(`Conversacion ${job.conversationId} no encontrada`);
      return;
    }
    if (!conversation.botEnabled) {
      this.logger.debug(
        `Bot deshabilitado para conversacion ${conversation.id}, se omite respuesta automatica`,
      );
      return;
    }

    const [catalog, activePromotions] = await Promise.all([
      this.productsService.findAll(job.businessId),
      this.promotionsService.findActive(job.businessId),
    ]);

    const { intent, matchedProducts, fulfillmentType } =
      this.intentDetector.detect(job.content, catalog, conversation.state);

    let nextState = this.stateMachine.next(conversation.state, intent);

    // Efectos secundarios sobre el carrito / pedido.
    let cart = await this.getDraftOrderIfAny(job.businessId, conversation.id);

    if (
      (intent === 'order' || intent === 'add_product') &&
      matchedProducts.length > 0
    ) {
      const draft = await this.ordersService.getOrCreateDraft(
        job.businessId,
        conversation.customerId,
        conversation.id,
      );
      for (const match of matchedProducts) {
        await this.ordersService.addItem(draft.id, match.product, match.quantity);
      }
      cart = await this.ordersService.findOne(job.businessId, draft.id);
    } else if (intent === 'cancel' && cart) {
      await this.ordersService.cancel(job.businessId, cart.id);
      cart = null;
    } else if (intent === 'confirm' && nextState === 'ORDER_CREATED') {
      if (!cart || cart.status !== OrderStatus.DRAFT) {
        // No hay carrito valido; no se puede confirmar, se mantiene el estado anterior.
        nextState = conversation.state;
      } else if (!fulfillmentType) {
        nextState = 'CONFIRMING_ORDER';
      } else {
        await this.ordersService.confirm(job.businessId, cart.id, fulfillmentType);
        cart = await this.ordersService.findOne(job.businessId, cart.id);
      }
    } else if (intent === 'talk_to_human') {
      await this.conversationsService.toggleBotOff(conversation.id);
    }

    await this.conversationsService.transitionState(
      conversation.id,
      nextState,
      intent,
    );

    const responseText = this.responseGenerator.generate({
      intent,
      previousState: conversation.state,
      nextState,
      matchedProducts,
      catalog,
      activePromotions,
      cart,
      businessName: conversation.business.name,
      fulfillmentType,
    });

    await this.messagesService.sendOutbound({
      businessId: job.businessId,
      conversationId: conversation.id,
      content: responseText,
      senderType: MessageSenderType.BOT,
      automationRunId: job.messageId,
    });
  }

  private async getDraftOrderIfAny(businessId: string, conversationId: string) {
    const draft = await this.prisma.order.findFirst({
      where: { businessId, conversationId, status: OrderStatus.DRAFT },
      include: { items: true },
    });
    return draft;
  }
}
