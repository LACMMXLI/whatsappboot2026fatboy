import { apiClient } from '../lib/apiClient';
import type { Customer } from '../types';

export const customersApi = {
  list: () => apiClient.get<Customer[]>('/customers'),
};
