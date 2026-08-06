// Tipos que reflejan los DTOs reales devueltos por el backend NestJS
// (ver D:\whatsappboot\backend\src\modules\**). Los campos Decimal de Prisma
// (price, total, subtotal) se serializan como string en JSON.

export type ConversationState =
  | 'IDLE'
  | 'BROWSING_MENU'
  | 'BUILDING_ORDER'
  | 'CONFIRMING_ORDER'
  | 'ORDER_CREATED';

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'SENT_TO_POS'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

export type FulfillmentType = 'PICKUP' | 'DELIVERY';

export type MessageDirection = 'IN' | 'OUT';

export type MessageSenderType = 'CUSTOMER' | 'BOT' | 'AGENT' | 'SYSTEM' | 'INTEGRATION';

export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'AUDIO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'OTHER';

/**
 * Estado operativo calculado por el backend (fuente de verdad). Prioridad:
 * ERROR > RESOLVED > WAITING > IN_ORDER > HUMAN_ATTENTION > NEW > ACTIVE.
 */
export type OperationalStatus =
  | 'ERROR'
  | 'RESOLVED'
  | 'WAITING'
  | 'IN_ORDER'
  | 'HUMAN_ATTENTION'
  | 'NEW'
  | 'ACTIVE';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT';
  businessId: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Customer {
  id: string;
  businessId: string;
  phone: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignedUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface Message {
  id: string;
  businessId: string;
  conversationId: string;
  direction: MessageDirection;
  type: MessageType;
  senderType: MessageSenderType;
  senderUserId: string | null;
  senderNameSnapshot: string | null;
  automationRunId: string | null;
  content: string;
  rawPayload: unknown;
  createdAt: string;
}

export interface Conversation {
  id: string;
  businessId: string;
  customerId: string;
  state: ConversationState;
  botEnabled: boolean;
  assignedUserId: string | null;
  context: Record<string, unknown>;
  lastMessageAt: string | null;
  lastInboundMessageAt: string | null;
  lastOutboundMessageAt: string | null;
  unreadCount: number;
  automationError: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: Customer;
  assignedUser: AssignedUserSummary | null;
  operationalStatus: OperationalStatus;
  activeOrderId: string | null;
  activeOrderStatus: OrderStatus | null;
  lastMessagePreview: string | null;
  lastMessageDirection: MessageDirection | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  nameSnapshot: string;
  priceSnapshot: string;
  quantity: number;
  subtotal: string;
  createdAt: string;
}

export interface Order {
  id: string;
  businessId: string;
  customerId: string;
  conversationId: string | null;
  status: OrderStatus;
  fulfillmentType: FulfillmentType | null;
  total: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  category: string | null;
  price: string;
  aliases: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  category?: string;
  price: number;
  aliases?: string[];
  active?: boolean;
}

/** Los 4 mensajes cortos y autocontenidos del bot que se pueden personalizar. */
export type BotTemplateKey = 'GREETING' | 'CANCEL' | 'HUMAN_HANDOFF' | 'FALLBACK';

export interface BotTemplate {
  key: BotTemplateKey;
  content: string;
  isCustom: boolean;
  defaultContent: string;
}

/** Intenciones que admiten palabras clave propias por negocio. */
export type BotIntentType = 'greeting' | 'view_menu' | 'confirm' | 'cancel' | 'talk_to_human';

export interface BotKeywordRule {
  id: string;
  businessId: string;
  intent: BotIntentType;
  phrase: string;
  createdAt: string;
}
