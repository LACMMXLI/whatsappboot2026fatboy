import { apiClient } from '../lib/apiClient';
import type { Business, BusinessSettingsInput } from '../types';

export const businessApi = {
  me: () => apiClient.get<Business>('/businesses/me'),
  updateSettings: (input: BusinessSettingsInput) =>
    apiClient.patch<Business>('/businesses/me/settings', input),
};
