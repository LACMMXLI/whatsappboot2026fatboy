import { apiClient } from '../lib/apiClient';
import type { Order } from '../types';

export const ordersApi = {
  getByConversation: (conversationId: string) =>
    apiClient.get<Order | null>(`/orders/conversation/${conversationId}`),
};
