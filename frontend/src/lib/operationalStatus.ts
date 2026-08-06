import type { ConversationState, OperationalStatus, OrderStatus } from '../types';

export interface OperationalStatusInput {
  automationError: string | null;
  resolvedAt: string | null;
  botEnabled: boolean;
  assignedUserId: string | null;
  conversationState: ConversationState;
  activeOrderStatus: OrderStatus | null;
  lastInboundMessageAt: string | null;
  lastOutboundMessageAt: string | null;
  waitingThresholdMinutes: number;
}

const IN_ORDER_CONVERSATION_STATES: ConversationState[] = [
  'BUILDING_ORDER',
  'CONFIRMING_ORDER',
];
const IN_ORDER_ORDER_STATUSES: OrderStatus[] = ['DRAFT', 'CONFIRMED', 'SENT_TO_POS'];

/**
 * Fallback local: replica exactamente la logica del backend
 * (backend/src/modules/conversations/operational-status.ts). El backend es
 * la fuente de verdad y ya manda `operationalStatus` calculado en cada
 * conversacion; esta funcion solo se usa si un payload llegara sin ese campo.
 */
export function computeOperationalStatus(
  input: OperationalStatusInput,
): OperationalStatus {
  if (input.automationError) return 'ERROR';
  if (input.resolvedAt) return 'RESOLVED';

  const now = Date.now();
  const lastInbound = input.lastInboundMessageAt
    ? new Date(input.lastInboundMessageAt).getTime()
    : null;
  const lastOutbound = input.lastOutboundMessageAt
    ? new Date(input.lastOutboundMessageAt).getTime()
    : null;
  const inboundIsLatest =
    lastInbound !== null && (lastOutbound === null || lastInbound > lastOutbound);
  const msSinceInbound = lastInbound !== null ? now - lastInbound : null;
  const thresholdMs = input.waitingThresholdMinutes * 60_000;
  const unattended = !input.botEnabled && !input.assignedUserId;

  const isWaiting =
    inboundIsLatest &&
    ((msSinceInbound !== null && msSinceInbound >= thresholdMs) || unattended);
  if (isWaiting) return 'WAITING';

  const inOrder =
    IN_ORDER_CONVERSATION_STATES.includes(input.conversationState) ||
    (input.activeOrderStatus !== null &&
      IN_ORDER_ORDER_STATUSES.includes(input.activeOrderStatus));
  if (inOrder) return 'IN_ORDER';

  if (!input.botEnabled || input.assignedUserId) return 'HUMAN_ATTENTION';

  if (inboundIsLatest && msSinceInbound !== null && msSinceInbound < thresholdMs) {
    return 'NEW';
  }

  return 'ACTIVE';
}
