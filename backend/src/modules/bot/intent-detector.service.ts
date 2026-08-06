import { Injectable } from '@nestjs/common';
import { Product } from '@prisma/client';
import { normalizeText } from '../../common/utils/text-normalize';

export type BotIntent =
  | 'greeting'
  | 'view_menu'
  | 'order'
  | 'add_product'
  | 'confirm'
  | 'cancel'
  | 'talk_to_human'
  | 'unknown';

/** Intenciones que un negocio puede extender con palabras/frases propias. */
export type ExtendableIntent = 'greeting' | 'view_menu' | 'confirm' | 'cancel' | 'talk_to_human';

export type CustomKeywords = Partial<Record<ExtendableIntent, string[]>>;

export interface MatchedProduct {
  product: Product;
  quantity: number;
}

export interface IntentResult {
  intent: BotIntent;
  matchedProducts: MatchedProduct[];
  fulfillmentType?: 'PICKUP' | 'DELIVERY';
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
const VIEW_MENU_REGEX = /\b(menu|carta|catalogo)\b/;
const CANCEL_REGEX = /\b(cancelar|cancela|olvida(lo)?|no quiero)\b/;
const HUMAN_REGEX = /\b(humano|persona real|agente|asesor|hablar con alguien)\b/;
const CONFIRM_REGEX = /\b(confirmar|confirmo|si,? confirmo|listo|eso es todo|es todo|finalizar)\b/;
const PICKUP_REGEX = /\b(recoger|pickup|paso por el|pasar por el|retiro en local)\b/;
const DELIVERY_REGEX = /\b(delivery|domicilio|entrega|enviar a|envio a)\b/;

/**
 * Detecta la intencion del mensaje y, si aplica, los productos del catalogo
 * mencionados (con cantidad). SIEMPRE se basa en el catalogo real del negocio,
 * nunca en texto generico.
 */
@Injectable()
export class IntentDetectorService {
  detect(
    rawText: string,
    catalog: Product[],
    currentState: string,
    customKeywords: CustomKeywords = {},
  ): IntentResult {
    const normalized = normalizeText(rawText);
    const matchesCustom = (intent: ExtendableIntent): boolean =>
      (customKeywords[intent] ?? []).some((phrase) =>
        normalized.includes(normalizeText(phrase)),
      );

    if (currentState === 'CONFIRMING_ORDER') {
      if (PICKUP_REGEX.test(normalized)) {
        return { intent: 'confirm', matchedProducts: [], fulfillmentType: 'PICKUP' };
      }
      if (DELIVERY_REGEX.test(normalized)) {
        return { intent: 'confirm', matchedProducts: [], fulfillmentType: 'DELIVERY' };
      }
    }

    if (CANCEL_REGEX.test(normalized) || matchesCustom('cancel')) {
      return { intent: 'cancel', matchedProducts: [] };
    }
    if (HUMAN_REGEX.test(normalized) || matchesCustom('talk_to_human')) {
      return { intent: 'talk_to_human', matchedProducts: [] };
    }

    const matchedProducts = this.matchProducts(normalized, catalog);
    if (matchedProducts.length > 0) {
      const intent: BotIntent =
        currentState === 'BUILDING_ORDER' || currentState === 'CONFIRMING_ORDER'
          ? 'add_product'
          : 'order';
      return { intent, matchedProducts };
    }

    if (CONFIRM_REGEX.test(normalized) || matchesCustom('confirm')) {
      return { intent: 'confirm', matchedProducts: [] };
    }
    if (VIEW_MENU_REGEX.test(normalized) || matchesCustom('view_menu')) {
      return { intent: 'view_menu', matchedProducts: [] };
    }
    if (GREETING_REGEX.test(normalized) || matchesCustom('greeting')) {
      return { intent: 'greeting', matchedProducts: [] };
    }

    return { intent: 'unknown', matchedProducts: [] };
  }

  private matchProducts(
    normalizedText: string,
    catalog: Product[],
  ): MatchedProduct[] {
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
