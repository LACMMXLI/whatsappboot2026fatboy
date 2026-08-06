import { apiClient } from '../lib/apiClient';
import type { Conversation, ConversationDetail } from '../types';

export const conversationsApi = {
  list: () => apiClient.get<Conversation[]>('/conversations'),
  getOne: (id: string) => apiClient.get<ConversationDetail>(`/conversations/${id}`),
  toggleBot: (id: string) =>
    apiClient.patch<Conversation>(`/conversations/${id}/toggle-bot`),
  assign: (id: string, userId: string) =>
    apiClient.patch<Conversation>(`/conversations/${id}/assign`, { userId }),
  releaseControl: (id: string, reactivateBot?: boolean) =>
    apiClient.patch<Conversation>(`/conversations/${id}/release-control`, {
      ...(reactivateBot !== undefined ? { reactivateBot } : {}),
    }),
  resolve: (id: string) => apiClient.patch<Conversation>(`/conversations/${id}/resolve`),
  reopen: (id: string) => apiClient.patch<Conversation>(`/conversations/${id}/reopen`),
};
