import { apiClient } from '../lib/apiClient';
import type { BotFlow, BotFlowInput } from '../types';

export const botFlowsApi = {
  list: () => apiClient.get<BotFlow[]>('/bot-flows'),
  create: (input: BotFlowInput) => apiClient.post<BotFlow>('/bot-flows', input),
  update: (id: string, input: BotFlowInput) =>
    apiClient.put<BotFlow>(`/bot-flows/${id}`, input),
  toggleActive: (id: string, active: boolean) =>
    apiClient.patch<BotFlow>(`/bot-flows/${id}/active`, { active }),
  remove: (id: string) => apiClient.delete<void>(`/bot-flows/${id}`),
};
