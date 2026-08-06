import { ConversationStatus, OrderStatus } from '@prisma/client';

export type OperationalStatus =
  | 'ERROR'
  | 'RESOLVED'
  | 'WAITING'
  | 'IN_ORDER'
  | 'HUMAN_ATTENTION'
  | 'NEW'
  | 'ACTIVE';

export interface OperationalStatusInput {
  automationError: string | null;
  resolvedAt: Date | null;
  botEnabled: boolean;
  assignedUserId: string | null;
  conversationState: ConversationStatus;
  activeOrderStatus: OrderStatus | null;
  lastInboundMessageAt: Date | null;
  lastOutboundMessageAt: Date | null;
  waitingThresholdMinutes: number;
  /** Inyectable para tests; por defecto la hora actual. */
  now?: Date;
}

const IN_ORDER_CONVERSATION_STATES: ConversationStatus[] = [
  'BUILDING_ORDER',
  'CONFIRMING_ORDER',
];
const IN_ORDER_ORDER_STATUSES: OrderStatus[] = ['DRAFT', 'CONFIRMED', 'SENT_TO_POS'];

/**
 * Calcula el estado operativo de una conversacion para el CRM. El backend es
 * la fuente de verdad: esta misma logica se replica (como fallback, nunca
 * como fuente primaria) en el frontend por si un payload llega sin el campo
 * ya calculado. Prioridad exacta:
 * ERROR > RESOLVED > WAITING > IN_ORDER > HUMAN_ATTENTION > NEW > ACTIVE
 */
export function computeOperationalStatus(
  input: OperationalStatusInput,
): OperationalStatus {
  if (input.automationError) {
    return 'ERROR';
  }
  if (input.resolvedAt) {
    return 'RESOLVED';
  }

  const now = input.now ?? new Date();
  const inboundIsLatest =
    input.lastInboundMessageAt !== null &&
    (input.lastOutboundMessageAt === null ||
      input.lastInboundMessageAt > input.lastOutboundMessageAt);
  const msSinceInbound = input.lastInboundMessageAt
    ? now.getTime() - input.lastInboundMessageAt.getTime()
    : null;
  const thresholdMs = input.waitingThresholdMinutes * 60_000;
  const unattended = !input.botEnabled && !input.assignedUserId;

  const isWaiting =
    inboundIsLatest &&
    ((msSinceInbound !== null && msSinceInbound >= thresholdMs) || unattended);
  if (isWaiting) {
    return 'WAITING';
  }

  const inOrder =
    IN_ORDER_CONVERSATION_STATES.includes(input.conversationState) ||
    (input.activeOrderStatus !== null &&
      IN_ORDER_ORDER_STATUSES.includes(input.activeOrderStatus));
  if (inOrder) {
    return 'IN_ORDER';
  }

  if (!input.botEnabled || input.assignedUserId) {
    return 'HUMAN_ATTENTION';
  }

  if (inboundIsLatest && msSinceInbound !== null && msSinceInbound < thresholdMs) {
    return 'NEW';
  }

  return 'ACTIVE';
}
