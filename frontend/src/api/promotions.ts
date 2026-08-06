import { apiClient } from '../lib/apiClient';
import type { Promotion, PromotionInput } from '../types';

export const promotionsApi = {
  list: () => apiClient.get<Promotion[]>('/promotions'),
  create: (input: PromotionInput) => apiClient.post<Promotion>('/promotions', input),
  update: (id: string, input: Partial<PromotionInput>) =>
    apiClient.patch<Promotion>(`/promotions/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/promotions/${id}`),
};
