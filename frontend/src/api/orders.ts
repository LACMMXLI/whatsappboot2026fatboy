import { apiClient } from '../lib/apiClient';
import type { Order } from '../types';

export const ordersApi = {
  getByConversation: (conversationId: string) =>
    apiClient.get<Order | null>(`/orders/conversation/${conversationId}`),
  list: () => apiClient.get<Order[]>('/orders'),
  ready: (id: string) => apiClient.patch<Order>(`/orders/${id}/ready`),
  deliver: (id: string) => apiClient.patch<Order>(`/orders/${id}/deliver`),
  cancel: (id: string) => apiClient.patch<Order>(`/orders/${id}/cancel`),
};
