import { Injectable } from '@nestjs/common';
import {
  BotTemplateKey,
  ConversationStatus,
  Order,
  OrderItem,
  Product,
  Promotion,
} from '@prisma/client';
import { BotIntent, MatchedProduct, MatchedPromotion } from './intent-detector.service';

export type BotTemplates = Partial<Record<BotTemplateKey, string>>;

/**
 * Textos por defecto de los 4 mensajes personalizables (usan `{businessName}`
 * como placeholder). Fuente unica de verdad: tanto el motor del bot (cuando
 * no hay override) como la API de configuracion (para mostrar el default en
 * el CRM) usan esta misma constante.
 */
export const DEFAULT_BOT_TEMPLATES: Record<BotTemplateKey, string> = {
  GREETING: 'Hola! Bienvenido a {businessName}.',
  CANCEL: 'He cancelado tu pedido.',
  HUMAN_HANDOFF:
    'Entendido, en un momento un miembro de nuestro equipo va a continuar la conversacion contigo. 🙋',
  FALLBACK: 'No entendi tu mensaje.',
};

export interface ResponseContext {
  intent: BotIntent;
  previousState: ConversationStatus;
  nextState: ConversationStatus;
  matchedProducts: MatchedProduct[];
  matchedPromotions: MatchedPromotion[];
  catalog: Product[];
  activePromotions: Promotion[];
  /** Categorias activas del catalogo, en el orden en que se le muestran al cliente. */
  categories: string[];
  /** Categoria que el cliente esta navegando ahora mismo (si el estado es BROWSING_MENU). */
  selectedCategory: string | null;
  cart: (Order & { items: OrderItem[] }) | null;
  businessName: string;
  /** Direccion de recoleccion del negocio (pickup-only). */
  pickupAddress: string | null;
  /** Nombre guardado del cliente (ya sea previo o recien provisto). */
  customerName: string | null;
  /** Textos personalizados por negocio para los mensajes cortos (opcional). */
  templates?: BotTemplates;
}

/**
 * Genera SIEMPRE la respuesta a partir de datos reales: catalogo cargado,
 * promociones activas y estado real de la conversacion/carrito. Nunca
 * responde con texto generico desconectado del negocio.
 *
 * El flujo es guiado: nunca se vuelca el catalogo completo de una vez. Se
 * pregunta el nombre, se ofrece ver promociones, se navega por categorias y
 * recien ahi se muestran los productos de UNA categoria. Los mensajes con
 * listas dinamicas siempre se arman con datos reales. Solo los mensajes
 * cortos y autocontenidos (GREETING/CANCEL/HUMAN_HANDOFF/FALLBACK) admiten
 * un texto personalizado por negocio via `ctx.templates`.
 */
@Injectable()
export class ResponseGeneratorService {
  generate(ctx: ResponseContext): string {
    switch (ctx.intent) {
      case 'talk_to_human':
        return this.applyTemplate(ctx, 'HUMAN_HANDOFF');
      case 'cancel':
        return `${this.applyTemplate(ctx, 'CANCEL')}\n\nEscribe "hola" para empezar de nuevo.`;
      case 'provide_name':
        return this.renderStateView(ctx, `Mucho gusto, ${ctx.customerName}! `);
      case 'greeting':
        return this.renderStateView(ctx, `${this.applyTemplate(ctx, 'GREETING')}\n\n`);
      case 'select_category':
        return this.renderStateView(ctx);
      case 'order':
      case 'add_product':
      case 'select_promotion':
        return this.buildOrderUpdateMessage(ctx);
      case 'confirm':
        if (ctx.nextState === 'CONFIRMING_ORDER' || ctx.nextState === 'ORDER_CREATED') {
          return this.buildConfirmMessage(ctx);
        }
        return this.renderStateView(ctx);
      case 'deny':
        if (ctx.nextState === 'BUILDING_ORDER') {
          return `Sin problema. ${this.cartSummary(ctx.cart)}\n\nDecime que mas queres agregar, o escribe "confirmar" cuando estes listo.`;
        }
        return this.renderStateView(ctx);
      default:
        return this.renderStateView(ctx);
    }
  }

  /**
   * Devuelve el template del negocio para `key` (custom si existe, si no el
   * default), con `{businessName}` sustituido.
   */
  private applyTemplate(ctx: ResponseContext, key: BotTemplateKey): string {
    const text = ctx.templates?.[key] ?? DEFAULT_BOT_TEMPLATES[key];
    return text.replaceAll('{businessName}', ctx.businessName);
  }

  /**
   * Muestra lo que corresponde para el estado actual de la conversacion
   * (usado tanto para el primer mensaje de ese paso como para reintentar
   * cuando no se entendio la respuesta del cliente).
   */
  private renderStateView(ctx: ResponseContext, prefix = ''): string {
    switch (ctx.nextState) {
      case 'ASKING_NAME':
        return `${prefix}Para comenzar, decime tu nombre por favor.`;
      case 'ASKING_PROMOTIONS':
        return `${prefix}Antes de ver el menu, queres ver las promociones de hoy? (si/no)`;
      case 'BROWSING_PROMOTIONS':
        return `${prefix}${this.buildPromotionsListMessage(ctx.activePromotions)}`;
      case 'BROWSING_CATEGORIES':
        return `${prefix}${this.buildCategoriesListMessage(ctx.categories)}`;
      case 'BROWSING_MENU':
        return `${prefix}${this.buildCategoryMenuMessage(ctx.catalog, ctx.selectedCategory)}`;
      case 'CONFIRMING_ORDER':
        return `${prefix}${this.buildConfirmMessage({ ...ctx, nextState: 'CONFIRMING_ORDER' })}`;
      default:
        return `${prefix}${this.applyTemplate(ctx, 'FALLBACK')}`.trim();
    }
  }

  private buildPromotionsListMessage(promotions: Promotion[]): string {
    if (promotions.length === 0) {
      return 'No tenemos promociones activas en este momento. Escribe "menu" para ver las categorias.';
    }
    const lines = promotions.map(
      (p, i) =>
        `${i + 1}. 🎉 ${p.title}${p.description ? ` — ${p.description}` : ''}: $${Number(p.price).toFixed(2)}`,
    );
    return [
      'Estas son las promociones de hoy:',
      ...lines,
      '\nEscribe el numero o el nombre de la promo que quieras. Para ver el resto del menu, escribe "menu".',
    ].join('\n');
  }

  private buildCategoriesListMessage(categories: string[]): string {
    if (categories.length === 0) {
      return 'Todavia no tenemos productos cargados en el catalogo. En breve estara disponible.';
    }
    const lines = categories.map((c, i) => `${i + 1}. ${c}`);
    return [
      'Estas son nuestras categorias:',
      ...lines,
      '\nEscribe el numero o el nombre de la categoria que quieras ver.',
    ].join('\n');
  }

  private buildCategoryMenuMessage(catalog: Product[], selectedCategory: string | null): string {
    const active = catalog.filter(
      (p) => p.active && (p.category ?? 'Otros') === selectedCategory,
    );
    if (active.length === 0) {
      return `Todavia no hay productos cargados en "${selectedCategory}". Escribe "categorias" para ver otras opciones.`;
    }
    const lines = active.map((p) => `- ${p.name}: $${Number(p.price).toFixed(2)}`);
    return [
      `*${selectedCategory}*`,
      ...lines,
      '\nEscribe el nombre del producto que quieras pedir, o "categorias" para ver otras opciones.',
    ].join('\n');
  }

  private buildOrderUpdateMessage(ctx: ResponseContext): string {
    const hasProducts = ctx.matchedProducts.length > 0;
    const hasPromotions = ctx.matchedPromotions.length > 0;
    if ((!hasProducts && !hasPromotions) || !ctx.cart) {
      return this.renderStateView(ctx);
    }
    const productLines = ctx.matchedProducts.map(
      (m: MatchedProduct) =>
        `- ${m.quantity}x ${m.product.name} ($${(Number(m.product.price) * m.quantity).toFixed(2)})`,
    );
    const promotionLines = ctx.matchedPromotions.map(
      (m: MatchedPromotion) =>
        `- ${m.quantity}x 🎉 ${m.promotion.title} ($${(Number(m.promotion.price) * m.quantity).toFixed(2)})`,
    );
    const total = Number(ctx.cart.total);
    return [
      'Agregue a tu pedido:',
      ...productLines,
      ...promotionLines,
      `\nTotal actual: $${total.toFixed(2)}`,
      '\nPuedes seguir agregando productos o escribir "confirmar" para continuar.',
    ].join('\n');
  }

  private buildConfirmMessage(ctx: ResponseContext): string {
    if (ctx.nextState === 'ORDER_CREATED') {
      const total = ctx.cart ? Number(ctx.cart.total).toFixed(2) : '0.00';
      const address = ctx.pickupAddress ? ` Lo recoges en: ${ctx.pickupAddress}.` : '';
      const name = ctx.customerName ? `, ${ctx.customerName}` : '';
      return `Pedido confirmado para recoger. Total: $${total}.${address} Te avisaremos cuando este listo. Gracias por tu compra${name}!`;
    }
    if (ctx.nextState === 'CONFIRMING_ORDER') {
      const summary = this.cartSummary(ctx.cart);
      const address = ctx.pickupAddress ? `\n\nLo recoges en: ${ctx.pickupAddress}.` : '';
      const name = ctx.customerName ? `, ${ctx.customerName}` : '';
      return `${summary}${address}\n\nConfirmas tu pedido${name}? (si/no)`;
    }
    return 'No tienes un pedido en curso todavia. Escribe "hola" para comenzar.';
  }

  private cartSummary(cart: (Order & { items: OrderItem[] }) | null): string {
    if (!cart || cart.items.length === 0) {
      return 'Tu pedido esta vacio.';
    }
    const lines = cart.items.map(
      (item) => `- ${item.quantity}x ${item.nameSnapshot}: $${Number(item.subtotal).toFixed(2)}`,
    );
    return ['Tu pedido:', ...lines, `Total: $${Number(cart.total).toFixed(2)}`].join('\n');
  }
}
