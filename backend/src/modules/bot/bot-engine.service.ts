import { Injectable, Logger } from '@nestjs/common';
import { MessageSenderType, OrderStatus, Prisma, Product } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeText } from '../../common/utils/text-normalize';
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
import { BotFlowsService, FlowStepOption, FlowWithSteps } from '../bot-flows/bot-flows.service';

/** Guardado en Conversation.context mientras la conversacion esta dentro de
 *  un flujo personalizado (BotFlow). Se limpia al salir del flujo. */
interface ActiveFlowState {
  flowId: string;
  stepOrder: number;
}

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
    private readonly flowsService: BotFlowsService,
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

    const [catalog, activePromotions, customKeywords, templateOverrides, customFlows] =
      await Promise.all([
        this.productsService.findAll(job.businessId),
        this.promotionsService.findActive(job.businessId),
        this.keywordsService.getKeywordsMap(job.businessId),
        this.templatesService.getOverridesMap(job.businessId),
        this.flowsService.findActiveForEngine(job.businessId),
      ]);

    // Flujos personalizados (horarios, ubicacion, FAQs propias, etc.): rama
    // aditiva y aislada del pipeline de pedidos, ver conversation-state-machine.ts.
    // Nunca puede interrumpir un pedido en curso -- solo se activa desde los
    // estados "en reposo" (IDLE / ORDER_CREATED), y cualquier salida sin
    // match cae de vuelta al pipeline normal (nunca deja la conversacion sin
    // respuesta).
    const context = (conversation.context as Record<string, unknown>) ?? {};
    const activeFlow = context.activeFlow as ActiveFlowState | undefined;

    if (activeFlow) {
      const handled = await this.continueCustomFlow(
        conversation.id,
        context,
        activeFlow,
        customFlows,
        job,
      );
      if (handled) return;
    } else if (
      (conversation.state === 'IDLE' || conversation.state === 'ORDER_CREATED') &&
      customFlows.length > 0
    ) {
      const triggeredFlow = this.matchFlowTrigger(job.content, customFlows);
      if (triggeredFlow) {
        await this.startCustomFlow(conversation.id, context, triggeredFlow, job);
        return;
      }
    }

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
      // Se parte de `context` (ya sin `activeFlow` si veniamos de un flujo
      // personalizado recien cerrado) y NO del `conversation.context`
      // original, que en ese caso quedaria desactualizado.
      await this.conversationsService.updateContext(conversation.id, {
        ...this.withoutActiveFlow(context),
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

  // ---------------------------------------------------------------------
  // Flujos personalizados (BotFlow) -- rama aditiva, ver comentario donde
  // se invoca en handleIncomingMessage. No comparte estado ni logica con
  // ConversationStateMachine / IntentDetectorService / ResponseGeneratorService.
  // ---------------------------------------------------------------------

  /** ¿El texto entrante activa alguno de los flujos activos del negocio? */
  private matchFlowTrigger(content: string, flows: FlowWithSteps[]): FlowWithSteps | null {
    const normalized = normalizeText(content);
    return (
      flows.find((flow) =>
        flow.triggers.some((trigger) => normalized.includes(normalizeText(trigger))),
      ) ?? null
    );
  }

  /** ¿El texto entrante elige alguna de las opciones del paso actual? Por
   *  numero de lista (1, 2, ...) o por coincidencia parcial del label. */
  private matchFlowOption(content: string, options: FlowStepOption[]): FlowStepOption | null {
    if (options.length === 0) return null;
    const normalized = normalizeText(content);

    const asNumber = Number(normalized);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= options.length) {
      return options[asNumber - 1];
    }

    return (
      options.find((opt) => {
        const label = normalizeText(opt.label);
        return label.includes(normalized) || normalized.includes(label);
      }) ?? null
    );
  }

  /** Envia el primer paso de un flujo recien disparado y marca la conversacion como "dentro" de el. */
  private async startCustomFlow(
    conversationId: string,
    context: Record<string, unknown>,
    flow: FlowWithSteps,
    job: ProcessIncomingMessageJob,
  ): Promise<void> {
    const firstStep = flow.steps.find((s) => s.order === 0) ?? flow.steps[0];
    if (!firstStep) {
      // Flujo sin pasos (no deberia pasar, el DTO exige al menos 1) -- no
      // hay nada que enviar, se ignora silenciosamente.
      return;
    }

    await this.conversationsService.updateContext(conversationId, {
      ...context,
      activeFlow: { flowId: flow.id, stepOrder: firstStep.order } satisfies ActiveFlowState,
    });
    await this.messagesService.sendOutbound({
      businessId: job.businessId,
      conversationId,
      content: firstStep.message,
      senderType: MessageSenderType.BOT,
      automationRunId: job.messageId,
    });
  }

  /**
   * Procesa un mensaje mientras la conversacion esta dentro de un flujo
   * personalizado. Devuelve `true` si ya se respondio (el llamador debe
   * cortar ahi) o `false` si el flujo se cerro y el mensaje debe seguir el
   * pipeline normal -- esta es la via de escape: nunca se deja la
   * conversacion sin una respuesta real, el pipeline normal siempre
   * termina en el mensaje de fallback si no matchea nada.
   */
  private async continueCustomFlow(
    conversationId: string,
    context: Record<string, unknown>,
    activeFlow: ActiveFlowState,
    flows: FlowWithSteps[],
    job: ProcessIncomingMessageJob,
  ): Promise<boolean> {
    const flow = flows.find((f) => f.id === activeFlow.flowId);
    const currentStep = flow?.steps.find((s) => s.order === activeFlow.stepOrder);

    if (flow && currentStep) {
      const options = (currentStep.options as unknown as FlowStepOption[]) ?? [];
      const matched = this.matchFlowOption(job.content, options);

      if (matched && matched.gotoStep !== null) {
        const nextStep = flow.steps.find((s) => s.order === matched.gotoStep);
        if (nextStep) {
          await this.conversationsService.updateContext(conversationId, {
            ...context,
            activeFlow: { flowId: flow.id, stepOrder: nextStep.order } satisfies ActiveFlowState,
          });
          await this.messagesService.sendOutbound({
            businessId: job.businessId,
            conversationId,
            content: nextStep.message,
            senderType: MessageSenderType.BOT,
            automationRunId: job.messageId,
          });
          return true;
        }
      }
    }

    // Sin match, opcion de cierre (gotoStep null), paso sin opciones, o el
    // flujo/paso ya no existe (se borro/desactivo mientras el cliente
    // estaba adentro): se cierra el flujo y el mensaje sigue al pipeline
    // normal sin cortar la respuesta.
    await this.conversationsService.updateContext(
      conversationId,
      this.withoutActiveFlow(context) as Prisma.InputJsonValue,
    );
    return false;
  }

  private withoutActiveFlow(context: Record<string, unknown>): Record<string, unknown> {
    const next = { ...context };
    delete next.activeFlow;
    return next;
  }
}
