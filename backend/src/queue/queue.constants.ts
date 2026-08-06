export const BOT_QUEUE = 'bot-processing';

export const BOT_JOBS = {
  PROCESS_INCOMING_MESSAGE: 'process-incoming-message',
} as const;

export interface ProcessIncomingMessageJob {
  businessId: string;
  conversationId: string;
  messageId: string;
  content: string;
}
