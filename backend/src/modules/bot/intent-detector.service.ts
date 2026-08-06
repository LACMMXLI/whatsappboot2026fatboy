import { Injectable } from '@nestjs/common';
import { Product, Promotion } from '@prisma/client';
import { normalizeText } from '../../common/utils/text-normalize';

export type BotIntent =
  | 'greeting'
  | 'view_menu'
  | 'order'
  | 'add_product'
  | 'confirm'
  | 'cancel'
  | 'talk_to_human'
  | 'provide_name'
  | 'affirm'
  | 'deny'
  | 'select_category'
  | 'select_promotion'
  | 'unknown';

/** Intenciones que un negocio puede extender con palabras/frases propias. */
export type ExtendableIntent = 'greeting' | 'view_menu' | 'confirm' | 'cancel' | 'talk_to_human';

export type CustomKeywords = Partial<Record<ExtendableIntent, string[]>>;

export interface MatchedProduct {
  product: Product;
  quantity: number;
}

export interface MatchedPromotion {
  promotion: Promotion;
  quantity: number;
}

export interface IntentResult {
  intent: BotIntent;
  matchedProducts: MatchedProduct[];
  matchedPromotions: MatchedPromotion[];
  /** Nombre que el cliente escribio cuando el bot se lo pidio (intent = provide_name). */
  customerName?: string;
  /** Categoria elegida (intent = select_category), tal como aparece en el catalogo. */
  selectedCategory?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  media: 0.5,
};

const GREETING_REGEX = /\b(hola|buenas|buenos dias|buenas tardes|buenas noches|que tal)\b/;
const VIEW_MENU_REGEX = /\b(menu|carta|catalogo|categorias?)\b/;
const CANCEL_REGEX = /\b(cancelar|cancela|olvida(lo)?|no quiero)\b/;
const HUMAN_REGEX = /\b(humano|persona real|agente|asesor|hablar con alguien)\b/;
const CONFIRM_REGEX = /\b(confirmar|confirmo|si,? confirmo|listo|eso es todo|es todo|finalizar)\b/;
const AFFIRM_REGEX = /\b(si|claro|dale|va|correcto|afirmativo|ok|okay|de acuerdo|porfavor|por favor)\b/;
const DENY_REGEX = /\b(no|nel|negativo|paso|nop)\b/;

/**
 * Detecta la intencion del mensaje y, si aplica, los productos/promociones
 * del catalogo mencionados (con cantidad), la categoria elegida o el nombre
 * provisto. SIEMPRE se basa en datos reales del negocio (catalogo, promos
 * activas, categorias existentes), nunca en texto generico.
 *
 * El comportamiento depende fuertemente de `currentState`: en los pasos
 * guiados (pedir nombre, si querés ver promos, elegir categoria) el texto
 * libre del cliente se interpreta distinto que en el resto de la conversacion.
 */
@Injectable()
export class IntentDetectorService {
  detect(
    rawText: string,
    catalog: Product[],
    currentState: string,
    customKeywords: CustomKeywords = {},
    activePromotions: Promotion[] = [],
    categories: string[] = [],
  ): IntentResult {
    const normalized = normalizeText(rawText);
    const matchesCustom = (intent: ExtendableIntent): boolean =>
      (customKeywords[intent] ?? []).some((phrase) =>
        normalized.includes(normalizeText(phrase)),
      );
    const empty = { matchedProducts: [] as MatchedProduct[], matchedPromotions: [] as MatchedPromotion[] };

    // El bot esta esperando el nombre del cliente: cualquier texto se toma
    // como nombre, salvo que pida explicitamente hablar con un humano o cancelar.
    if (currentState === 'ASKING_NAME') {
      if (CANCEL_REGEX.test(normalized)) {
        return { intent: 'cancel', ...empty };
      }
      if (HUMAN_REGEX.test(normalized) || matchesCustom('talk_to_human')) {
        return { intent: 'talk_to_human', ...empty };
      }
      const customerName = rawText.trim().slice(0, 80);
      if (!customerName) {
        return { intent: 'unknown', ...empty };
      }
      return { intent: 'provide_name', ...empty, customerName };
    }

    if (CANCEL_REGEX.test(normalized) || matchesCustom('cancel')) {
      return { intent: 'cancel', ...empty };
    }
    if (HUMAN_REGEX.test(normalized) || matchesCustom('talk_to_human')) {
      return { intent: 'talk_to_human', ...empty };
    }

    // El bot pregunto si quiere ver las promociones del dia (si/no).
    if (currentState === 'ASKING_PROMOTIONS') {
      if (VIEW_MENU_REGEX.test(normalized) || matchesCustom('view_menu')) {
        return { intent: 'view_menu', ...empty };
      }
      if (AFFIRM_REGEX.test(normalized)) {
        return { intent: 'affirm', ...empty };
      }
      if (DENY_REGEX.test(normalized)) {
        return { intent: 'deny', ...empty };
      }
      return { intent: 'unknown', ...empty };
    }

    // El bot esta mostrando las promociones activas, esperando que elija una.
    if (currentState === 'BROWSING_PROMOTIONS') {
      const matchedPromotions = this.matchPromotions(normalized, activePromotions);
      if (matchedPromotions.length > 0) {
        return { intent: 'select_promotion', matchedProducts: [], matchedPromotions };
      }
      const matchedProducts = this.matchProducts(normalized, catalog);
      if (matchedProducts.length > 0) {
        return { intent: 'order', matchedProducts, matchedPromotions: [] };
      }
      if (VIEW_MENU_REGEX.test(normalized) || matchesCustom('view_menu')) {
        return { intent: 'view_menu', ...empty };
      }
      return { intent: 'unknown', ...empty };
    }

    // El bot esta mostrando las categorias del catalogo, esperando que elija una.
    if (currentState === 'BROWSING_CATEGORIES') {
      const selectedCategory = this.matchCategory(normalized, categories);
      if (selectedCategory) {
        return { intent: 'select_category', ...empty, selectedCategory };
      }
      const matchedProducts = this.matchProducts(normalized, catalog);
      if (matchedProducts.length > 0) {
        return { intent: 'order', matchedProducts, matchedPromotions: [] };
      }
      const matchedPromotions = this.matchPromotions(normalized, activePromotions);
      if (matchedPromotions.length > 0) {
        return { intent: 'select_promotion', matchedProducts: [], matchedPromotions };
      }
      return { intent: 'unknown', ...empty };
    }

    // El bot esta mostrando los productos de UNA categoria ya elegida.
    if (currentState === 'BROWSING_MENU') {
      const matchedProducts = this.matchProducts(normalized, catalog);
      if (matchedProducts.length > 0) {
        return { intent: 'order', matchedProducts, matchedPromotions: [] };
      }
      const matchedPromotions = this.matchPromotions(normalized, activePromotions);
      if (matchedPromotions.length > 0) {
        return { intent: 'select_promotion', matchedProducts: [], matchedPromotions };
      }
      const selectedCategory = this.matchCategory(normalized, categories);
      if (selectedCategory) {
        return { intent: 'select_category', ...empty, selectedCategory };
      }
      if (VIEW_MENU_REGEX.test(normalized) || matchesCustom('view_menu')) {
        return { intent: 'view_menu', ...empty };
      }
      return { intent: 'unknown', ...empty };
    }

    if (currentState === 'CONFIRMING_ORDER') {
      if (AFFIRM_REGEX.test(normalized) || CONFIRM_REGEX.test(normalized) || matchesCustom('confirm')) {
        return { intent: 'confirm', ...empty };
      }
      if (DENY_REGEX.test(normalized)) {
        return { intent: 'deny', ...empty };
      }
      const matchedProducts = this.matchProducts(normalized, catalog);
      if (matchedProducts.length > 0) {
        return { intent: 'add_product', matchedProducts, matchedPromotions: [] };
      }
      const matchedPromotions = this.matchPromotions(normalized, activePromotions);
      if (matchedPromotions.length > 0) {
        return { intent: 'select_promotion', matchedProducts: [], matchedPromotions };
      }
      return { intent: 'unknown', ...empty };
    }

    // Resto de los estados (IDLE, BUILDING_ORDER, ORDER_CREATED): flujo generico.
    const matchedProducts = this.matchProducts(normalized, catalog);
    if (matchedProducts.length > 0) {
      const intent: BotIntent = currentState === 'BUILDING_ORDER' ? 'add_product' : 'order';
      return { intent, matchedProducts, matchedPromotions: [] };
    }
    const matchedPromotions = this.matchPromotions(normalized, activePromotions);
    if (matchedPromotions.length > 0) {
      return { intent: 'select_promotion', matchedProducts: [], matchedPromotions };
    }

    if (CONFIRM_REGEX.test(normalized) || matchesCustom('confirm')) {
      return { intent: 'confirm', ...empty };
    }
    if (VIEW_MENU_REGEX.test(normalized) || matchesCustom('view_menu')) {
      return { intent: 'view_menu', ...empty };
    }
    if (GREETING_REGEX.test(normalized) || matchesCustom('greeting')) {
      return { intent: 'greeting', ...empty };
    }

    return { intent: 'unknown', ...empty };
  }

  private matchProducts(normalizedText: string, catalog: Product[]): MatchedProduct[] {
    const words = normalizedText.split(' ');
    const matches: MatchedProduct[] = [];

    for (const product of catalog) {
      const candidates = [product.name, ...product.aliases].map(normalizeText);
      const matchedCandidate = candidates.find((candidate) =>
        normalizedText.includes(candidate),
      );
      if (!matchedCandidate) {
        continue;
      }

      const candidateFirstWord = matchedCandidate.split(' ')[0];
      const wordIndex = words.indexOf(candidateFirstWord);
      const quantity = this.extractQuantityBefore(words, wordIndex);
      matches.push({ product, quantity });
    }

    return matches;
  }

  private matchPromotions(
    normalizedText: string,
    activePromotions: Promotion[],
  ): MatchedPromotion[] {
    // Seleccion por numero de lista (1-based, en el mismo orden en que se muestran).
    const numeric = normalizedText.match(/^\d+$/);
    if (numeric) {
      const index = parseInt(numeric[0], 10) - 1;
      const promotion = activePromotions[index];
      return promotion ? [{ promotion, quantity: 1 }] : [];
    }

    const words = normalizedText.split(' ');
    const matches: MatchedPromotion[] = [];
    for (const promotion of activePromotions) {
      const candidate = normalizeText(promotion.title);
      if (!normalizedText.includes(candidate)) {
        continue;
      }
      const wordIndex = words.indexOf(candidate.split(' ')[0]);
      const quantity = this.extractQuantityBefore(words, wordIndex);
      matches.push({ promotion, quantity });
    }
    return matches;
  }

  private matchCategory(normalizedText: string, categories: string[]): string | null {
    // Seleccion por numero de lista (1-based, en el mismo orden en que se muestran).
    const numeric = normalizedText.match(/^\d+$/);
    if (numeric) {
      const index = parseInt(numeric[0], 10) - 1;
      return categories[index] ?? null;
    }
    const match = categories.find((category) =>
      normalizedText.includes(normalizeText(category)),
    );
    return match ?? null;
  }

  private extractQuantityBefore(words: string[], index: number): number {
    if (index <= 0) {
      return 1;
    }
    for (let i = Math.max(0, index - 3); i < index; i++) {
      const word = words[i];
      if (/^\d+$/.test(word)) {
        return parseInt(word, 10);
      }
      if (NUMBER_WORDS[word]) {
        return NUMBER_WORDS[word];
      }
    }
    return 1;
  }
}
