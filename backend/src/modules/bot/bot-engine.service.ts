import { Injectable, Logger } from '@nestjs/common';
import { MessageSenderType, OrderStatus, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { PromotionsService } from '../promotions/promotions.service';
import { OrdersService } from '../orders/orders.service';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { CustomersService } from '../customers/customers.service';
import { IntentDetectorService } from './intent-detector.service';
import { ConversationStateMachine } from './conversation-state-machine';
import { ResponseGeneratorService } from './response-generator.service';
import { ProcessIncomingMessageJob } from '../../queue/queue.constants';
import { BotResponseTemplatesService } from '../bot-config/bot-response-templates.service';
import { BotKeywordRulesService } from '../bot-config/bot-keyword-rules.service';

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
    private readonly customersService: CustomersService,
    private readonly intentDetector: IntentDetectorService,
    private readonly stateMachine: ConversationStateMachine,
    private readonly responseGenerator: ResponseGeneratorService,
    private readonly templatesService: BotResponseTemplatesService,
    private readonly keywordsService: BotKeywordRulesService,
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
    if (!conversation.business.botEnabled) {
      this.logger.debug(
        `Bot desactivado a nivel de negocio ${job.businessId}, se omite respuesta automatica`,
      );
      return;
    }
    if (!conversation.botEnabled) {
      this.logger.debug(
        `Bot deshabilitado para conversacion ${conversation.id}, se omite respuesta automatica`,
      );
      return;
    }

    const [catalog, activePromotions, customKeywords, templateOverrides] = await Promise.all([
      this.productsService.findAll(job.businessId),
      this.promotionsService.findActive(job.businessId),
      this.keywordsService.getKeywordsMap(job.businessId),
      this.templatesService.getOverridesMap(job.businessId),
    ]);

    const categories = this.extractCategories(catalog);
    const selectedCategory =
      (conversation.context as { selectedCategory?: string } | null)?.selectedCategory ?? null;

    const { intent, matchedProducts, matchedPromotions, customerName, selectedCategory: pickedCategory } =
      this.intentDetector.detect(
        job.content,
        this.scopeCatalogToCategory(catalog, conversation.state, selectedCategory),
        conversation.state,
        customKeywords,
        activePromotions,
        categories,
      );

    let customer = conversation.customer;
    const hasCustomerName = !!customer.name;
    const hasActivePromotions = activePromotions.length > 0;

    let nextState = this.stateMachine.next(conversation.state, intent, {
      hasCustomerName,
      hasActivePromotions,
    });

    // Efectos secundarios sobre el cliente / carrito / pedido / contexto.
    let cart = await this.getDraftOrderIfAny(job.businessId, conversation.id);

    if (intent === 'provide_name' && customerName) {
      customer = await this.customersService.updateName(customer.id, customerName);
    }

    if (pickedCategory) {
      await this.conversationsService.updateContext(conversation.id, {
        ...(conversation.context as Record<string, unknown>),
        selectedCategory: pickedCategory,
      });
    }

    if ((intent === 'order' || intent === 'add_product') && matchedProducts.length > 0) {
      const draft = await this.ordersService.getOrCreateDraft(
        job.businessId,
        conversation.customerId,
        conversation.id,
      );
      for (const match of matchedProducts) {
        await this.ordersService.addItem(draft.id, match.product, match.quantity);
      }
      cart = await this.ordersService.findOne(job.businessId, draft.id);
    } else if (intent === 'select_promotion' && matchedPromotions.length > 0) {
      const draft = await this.ordersService.getOrCreateDraft(
        job.businessId,
        conversation.customerId,
        conversation.id,
      );
      for (const match of matchedPromotions) {
        await this.ordersService.addPromotionItem(draft.id, match.promotion, match.quantity);
      }
      cart = await this.ordersService.findOne(job.businessId, draft.id);
    } else if (intent === 'cancel' && cart) {
      await this.ordersService.cancel(job.businessId, cart.id);
      cart = null;
    } else if (
      (intent === 'confirm' || intent === 'affirm') &&
      nextState === 'ORDER_CREATED'
    ) {
      if (!cart || cart.status !== OrderStatus.DRAFT) {
        // No hay carrito valido; no se puede confirmar, se mantiene el estado anterior.
        nextState = conversation.state;
      } else {
        // El negocio es pickup-only: siempre se confirma para recoger.
        await this.ordersService.confirm(job.businessId, cart.id, 'PICKUP');
        cart = await this.ordersService.findOne(job.businessId, cart.id);
      }
    } else if (intent === 'talk_to_human') {
      await this.conversationsService.toggleBotOff(conversation.id);
    }

    await this.conversationsService.transitionState(conversation.id, nextState, intent);

    const activeCategory =
      nextState === 'BROWSING_MENU' ? pickedCategory ?? selectedCategory : null;

    const responseText = this.responseGenerator.generate({
      intent,
      previousState: conversation.state,
      nextState,
      matchedProducts,
      matchedPromotions,
      catalog,
      activePromotions,
      categories,
      selectedCategory: activeCategory,
      cart,
      businessName: conversation.business.name,
      pickupAddress: conversation.business.pickupAddress,
      customerName: customer.name,
      templates: templateOverrides,
    });

    await this.messagesService.sendOutbound({
      businessId: job.businessId,
      conversationId: conversation.id,
      content: responseText,
      senderType: MessageSenderType.BOT,
      automationRunId: job.messageId,
    });
  }

  /** Categorias activas del catalogo, en el orden en que aparecen (sin duplicados). */
  private extractCategories(catalog: Product[]): string[] {
    const seen = new Set<string>();
    const categories: string[] = [];
    for (const product of catalog) {
      if (!product.active) continue;
      const category = product.category ?? 'Otros';
      if (!seen.has(category)) {
        seen.add(category);
        categories.push(category);
      }
    }
    return categories;
  }

  /**
   * Mientras se navega dentro de una categoria (BROWSING_MENU), el matching
   * de productos por texto libre se limita a esa categoria para no confundir
   * con productos de otras categorias que compartan alguna palabra.
   */
  private scopeCatalogToCategory(
    catalog: Product[],
    state: string,
    selectedCategory: string | null,
  ): Product[] {
    if (state !== 'BROWSING_MENU' || !selectedCategory) {
      return catalog;
    }
    return catalog.filter((p) => (p.category ?? 'Otros') === selectedCategory);
  }

  private async getDraftOrderIfAny(businessId: string, conversationId: string) {
    const draft = await this.prisma.order.findFirst({
      where: { businessId, conversationId, status: OrderStatus.DRAFT },
      include: { items: true },
    });
    return draft;
  }
}
