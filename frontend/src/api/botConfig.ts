import { apiClient } from '../lib/apiClient';
import type { BotIntentType, BotKeywordRule, BotTemplate, BotTemplateKey } from '../types';

export const botConfigApi = {
  listTemplates: () => apiClient.get<BotTemplate[]>('/bot-config/templates'),
  updateTemplate: (key: BotTemplateKey, content: string) =>
    apiClient.put<BotTemplate>(`/bot-config/templates/${key}`, { content }),
  resetTemplate: (key: BotTemplateKey) =>
    apiClient.delete<BotTemplate>(`/bot-config/templates/${key}`),
  listKeywords: () => apiClient.get<BotKeywordRule[]>('/bot-config/keywords'),
  createKeyword: (intent: BotIntentType, phrase: string) =>
    apiClient.post<BotKeywordRule>('/bot-config/keywords', { intent, phrase }),
  removeKeyword: (id: string) => apiClient.delete<void>(`/bot-config/keywords/${id}`),
};
