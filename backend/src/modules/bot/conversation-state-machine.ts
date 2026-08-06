import { Injectable } from '@nestjs/common';
import { ConversationStatus } from '@prisma/client';
import { BotIntent } from './intent-detector.service';

export interface StateMachineContext {
  /** El cliente ya tiene un nombre guardado (Customer.name). */
  hasCustomerName: boolean;
  /** El negocio tiene al menos una promocion activa. */
  hasActivePromotions: boolean;
}

/**
 * Maquina de estados de la conversacion (flujo guiado). A diferencia de la
 * version anterior (tabla plana estado->intent->estado), algunas transiciones
 * dependen de contexto real del negocio/cliente:
 *  - Si el cliente no tiene nombre guardado, cualquier intento de avanzar
 *    desde IDLE se desvia primero a ASKING_NAME (salvo cancelar/hablar con humano).
 *  - Despues del nombre (o si ya lo tenia), se pregunta por promociones solo
 *    si el negocio tiene promociones activas en este momento.
 *  - El negocio es pickup-only: CONFIRMING_ORDER nunca espera eleccion de
 *    domicilio/entrega, solo confirmacion final (si/no).
 */
@Injectable()
export class ConversationStateMachine {
  next(
    currentState: ConversationStatus,
    intent: BotIntent,
    ctx: StateMachineContext,
  ): ConversationStatus {
    // Escapes universales validos en cualquier estado.
    if (intent === 'cancel') {
      return 'IDLE';
    }
    if (intent === 'talk_to_human') {
      return currentState; // el bot se desactiva; el estado queda como esta para cuando se reactive.
    }

    switch (currentState) {
      case 'IDLE':
        return this.fromIdle(intent, ctx);
      case 'ASKING_NAME':
        return intent === 'provide_name' ? this.afterName(ctx) : 'ASKING_NAME';
      case 'ASKING_PROMOTIONS':
        return this.fromAskingPromotions(intent);
      case 'BROWSING_PROMOTIONS':
        return this.fromBrowsingPromotions(intent);
      case 'BROWSING_CATEGORIES':
        return this.fromBrowsingCategories(intent);
      case 'BROWSING_MENU':
        return this.fromBrowsingMenu(intent);
      case 'BUILDING_ORDER':
        return this.fromBuildingOrder(intent);
      case 'CONFIRMING_ORDER':
        return this.fromConfirmingOrder(intent);
      case 'ORDER_CREATED':
        return this.fromOrderCreated(intent, ctx);
      default:
        return currentState;
    }
  }

  private fromIdle(intent: BotIntent, ctx: StateMachineContext): ConversationStatus {
    const wantsToAdvance =
      intent === 'greeting' ||
      intent === 'view_menu' ||
      intent === 'order' ||
      intent === 'add_product' ||
      intent === 'confirm';
    if (!wantsToAdvance) {
      return 'IDLE';
    }
    if (!ctx.hasCustomerName) {
      return 'ASKING_NAME';
    }
    if (intent === 'order' || intent === 'add_product') {
      return 'BUILDING_ORDER';
    }
    if (intent === 'view_menu') {
      return 'BROWSING_CATEGORIES';
    }
    // greeting / confirm sin pedido: arranca el flujo guiado.
    return ctx.hasActivePromotions ? 'ASKING_PROMOTIONS' : 'BROWSING_CATEGORIES';
  }

  private afterName(ctx: StateMachineContext): ConversationStatus {
    return ctx.hasActivePromotions ? 'ASKING_PROMOTIONS' : 'BROWSING_CATEGORIES';
  }

  private fromAskingPromotions(intent: BotIntent): ConversationStatus {
    if (intent === 'affirm') return 'BROWSING_PROMOTIONS';
    if (intent === 'deny' || intent === 'view_menu') return 'BROWSING_CATEGORIES';
    return 'ASKING_PROMOTIONS';
  }

  private fromBrowsingPromotions(intent: BotIntent): ConversationStatus {
    if (intent === 'select_promotion' || intent === 'order' || intent === 'add_product') {
      return 'BUILDING_ORDER';
    }
    if (intent === 'view_menu') return 'BROWSING_CATEGORIES';
    return 'BROWSING_PROMOTIONS';
  }

  private fromBrowsingCategories(intent: BotIntent): ConversationStatus {
    if (intent === 'select_category') return 'BROWSING_MENU';
    if (intent === 'order' || intent === 'add_product' || intent === 'select_promotion') {
      return 'BUILDING_ORDER';
    }
    return 'BROWSING_CATEGORIES';
  }

  private fromBrowsingMenu(intent: BotIntent): ConversationStatus {
    if (intent === 'order' || intent === 'add_product' || intent === 'select_promotion') {
      return 'BUILDING_ORDER';
    }
    if (intent === 'select_category') return 'BROWSING_MENU';
    if (intent === 'view_menu') return 'BROWSING_CATEGORIES';
    return 'BROWSING_MENU';
  }

  private fromBuildingOrder(intent: BotIntent): ConversationStatus {
    if (intent === 'confirm') return 'CONFIRMING_ORDER';
    if (intent === 'view_menu') return 'BROWSING_CATEGORIES';
    return 'BUILDING_ORDER';
  }

  private fromConfirmingOrder(intent: BotIntent): ConversationStatus {
    if (intent === 'affirm' || intent === 'confirm') return 'ORDER_CREATED';
    if (intent === 'order' || intent === 'add_product' || intent === 'select_promotion') {
      return 'BUILDING_ORDER';
    }
    if (intent === 'deny') return 'BUILDING_ORDER';
    return 'CONFIRMING_ORDER';
  }

  private fromOrderCreated(intent: BotIntent, ctx: StateMachineContext): ConversationStatus {
    if (intent === 'order' || intent === 'add_product') return 'BUILDING_ORDER';
    if (intent === 'view_menu') return 'BROWSING_CATEGORIES';
    if (intent === 'greeting') {
      return ctx.hasActivePromotions ? 'ASKING_PROMOTIONS' : 'BROWSING_CATEGORIES';
    }
    return 'ORDER_CREATED';
  }
}
