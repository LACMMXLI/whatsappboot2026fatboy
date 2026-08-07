import { apiClient } from '../lib/apiClient';
import type { LoginResponse } from '../types';

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', { email, password });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/forgot-password', { email });
}

export function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>('/auth/reset-password', {
    token,
    newPassword,
  });
}
