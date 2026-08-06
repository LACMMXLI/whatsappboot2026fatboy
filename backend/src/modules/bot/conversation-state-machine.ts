import { Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { BotIntent } from './intent-detector.service';

type Transitions = Partial<Record<BotIntent, ConversationStatus>>;

const TRANSITIONS: Record<ConversationStatus, Transitions> = {
  IDLE: {
    greeting: 'IDLE',
    view_menu: 'BROWSING_MENU',
    order: 'BUILDING_ORDER',
    add_product: 'BUILDING_ORDER',
    cancel: 'IDLE',
    talk_to_human: 'IDLE',
  },
  BROWSING_MENU: {
    greeting: 'BROWSING_MENU',
    view_menu: 'BROWSING_MENU',
    order: 'BUILDING_ORDER',
    add_product: 'BUILDING_ORDER',
    cancel: 'IDLE',
    talk_to_human: 'BROWSING_MENU',
  },
  BUILDING_ORDER: {
    greeting: 'BUILDING_ORDER',
    view_menu: 'BROWSING_MENU',
    order: 'BUILDING_ORDER',
    add_product: 'BUILDING_ORDER',
    confirm: 'CONFIRMING_ORDER',
    cancel: 'IDLE',
    talk_to_human: 'BUILDING_ORDER',
  },
  CONFIRMING_ORDER: {
    confirm: 'ORDER_CREATED',
    cancel: 'IDLE',
    order: 'BUILDING_ORDER',
    add_product: 'BUILDING_ORDER',
    talk_to_human: 'CONFIRMING_ORDER',
  },
  ORDER_CREATED: {
    order: 'BUILDING_ORDER',
    add_product: 'BUILDING_ORDER',
    greeting: 'IDLE',
    view_menu: 'BROWSING_MENU',
  },
};

/**
 * Maquina de estados de la conversacion. Pura: dado el estado actual y la
 * intencion detectada, devuelve el siguiente estado. Los 5 estados y las
 * transiciones cubren exactamente el flujo pedido en la especificacion.
 */
@Injectable()
export class ConversationStateMachine {
  next(
    currentState: ConversationStatus,
    intent: BotIntent,
  ): ConversationStatus {
    const table = TRANSITIONS[currentState];
    return table[intent] ?? currentState;
  }
}
