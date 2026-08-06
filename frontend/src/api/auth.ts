import { apiClient } from '../lib/apiClient';
import type { LoginResponse } from '../types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', { email, password });
}
