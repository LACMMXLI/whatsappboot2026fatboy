import { Injectable } from '@nestjs/common';
import {
  BotTemplateKey,
  ConversationStatus,
  Order,
  OrderItem,
  Product,
  Promotion,
} from '@prisma/client';
import { BotIntent, MatchedProduct } from './intent-detector.service';

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
  catalog: Product[];
  activePromotions: Promotion[];
  cart: (Order & { items: OrderItem[] }) | null;
  businessName: string;
  fulfillmentType?: 'PICKUP' | 'DELIVERY';
  /** Textos personalizados por negocio para los mensajes cortos (opcional). */
  templates?: BotTemplates;
}

/**
 * Genera SIEMPRE la respuesta a partir de datos reales: catalogo cargado,
 * promociones activas y estado real de la conversacion/carrito. Nunca
 * responde con texto generico desconectado del negocio.
 *
 * Los mensajes con listas dinamicas (menu, resumen de carrito) siempre se
 * arman con datos reales. Solo los mensajes cortos y autocontenidos
 * (GREETING/CANCEL/HUMAN_HANDOFF/FALLBACK) admiten un texto personalizado
 * por negocio via `ctx.templates`; si no hay override, se usa el default.
 */
@Injectable()
export class ResponseGeneratorService {
  generate(ctx: ResponseContext): string {
    switch (ctx.intent) {
      case 'talk_to_human':
        return this.applyTemplate(ctx, 'HUMAN_HANDOFF');
      case 'cancel':
        return `${this.applyTemplate(ctx, 'CANCEL')} ${this.menuHint()}${this.promotionsHint(ctx.activePromotions)}`;
      case 'greeting':
        return `${this.applyTemplate(ctx, 'GREETING')} ${this.menuHint()}${this.promotionsHint(ctx.activePromotions)}`;
      case 'view_menu':
        return this.buildMenuMessage(ctx.catalog, ctx.activePromotions);
      case 'order':
      case 'add_product':
        return this.buildOrderUpdateMessage(ctx);
      case 'confirm':
        return this.buildConfirmMessage(ctx);
      default:
        return this.buildFallbackMessage(ctx);
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

  private buildMenuMessage(catalog: Product[], promotions: Promotion[]): string {
    const active = catalog.filter((p) => p.active);
    if (active.length === 0) {
      return 'Todavia no tenemos productos cargados en el catalogo. En breve estara disponible.';
    }
    const byCategory = new Map<string, Product[]>();
    for (const product of active) {
      const category = product.category ?? 'Otros';
      byCategory.set(category, [...(byCategory.get(category) ?? []), product]);
    }
    const lines: string[] = ['Este es nuestro menu:'];
    for (const [category, products] of byCategory) {
      lines.push(`\n*${category}*`);
      for (const product of products) {
        lines.push(`- ${product.name}: $${Number(product.price).toFixed(2)}`);
      }
    }
    lines.push('\nEscribe el nombre del producto que quieras pedir.');
    return lines.join('\n') + this.promotionsHint(promotions);
  }

  private buildOrderUpdateMessage(ctx: ResponseContext): string {
    if (ctx.matchedProducts.length === 0 || !ctx.cart) {
      return this.buildFallbackMessage(ctx);
    }
    const addedLines = ctx.matchedProducts.map(
      (m: MatchedProduct) =>
        `- ${m.quantity}x ${m.product.name} ($${(Number(m.product.price) * m.quantity).toFixed(2)})`,
    );
    const total = Number(ctx.cart.total);
    return [
      'Agregue a tu pedido:',
      ...addedLines,
      `\nTotal actual: $${total.toFixed(2)}`,
      '\nPuedes seguir agregando productos o escribir "confirmar" para continuar.',
    ].join('\n');
  }

  private buildConfirmMessage(ctx: ResponseContext): string {
    if (ctx.previousState === 'BUILDING_ORDER' && ctx.nextState === 'CONFIRMING_ORDER') {
      const summary = this.cartSummary(ctx.cart);
      return `${summary}\n\nEs para recoger (pickup) o a domicilio (delivery)?`;
    }
    if (ctx.nextState === 'ORDER_CREATED' && ctx.fulfillmentType) {
      const total = ctx.cart ? Number(ctx.cart.total).toFixed(2) : '0.00';
      const tipo = ctx.fulfillmentType === 'PICKUP' ? 'para recoger' : 'a domicilio';
      return `Pedido confirmado ${tipo}. Total: $${total}. Te avisaremos cuando este listo. Gracias por tu compra!`;
    }
    if (ctx.previousState === 'CONFIRMING_ORDER') {
      return 'Para confirmar tu pedido necesito saber si es para recoger (pickup) o a domicilio (delivery).';
    }
    return 'No tienes un pedido en curso todavia. Escribe "menu" para ver nuestras opciones.';
  }

  private buildFallbackMessage(ctx: ResponseContext): string {
    if (ctx.catalog.filter((p) => p.active).length === 0) {
      return 'Todavia no tenemos productos cargados en el catalogo. En breve estara disponible.';
    }
    return `${this.applyTemplate(ctx, 'FALLBACK')} ${this.menuHint()}${this.promotionsHint(ctx.activePromotions)}`;
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

  private menuHint(): string {
    return 'Escribe "menu" para ver nuestras opciones.';
  }

  private promotionsHint(promotions: Promotion[]): string {
    if (promotions.length === 0) {
      return '';
    }
    const lines = promotions.map((p) => `🎉 ${p.title}${p.description ? `: ${p.description}` : ''}`);
    return `\n\n${lines.join('\n')}`;
  }
}
