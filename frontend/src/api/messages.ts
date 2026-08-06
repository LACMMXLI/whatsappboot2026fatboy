import { apiClient } from '../lib/apiClient';
import type { Message } from '../types';

export const messagesApi = {
  listByConversation: (conversationId: string) =>
    apiClient.get<Message[]>(`/messages/${conversationId}`),
  send: (conversationId: string, content: string) =>
    apiClient.post<Message>('/messages/send', { conversationId, content }),
};
