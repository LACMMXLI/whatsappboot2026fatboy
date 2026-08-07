import { apiClient } from '../lib/apiClient';
import type {
  CreateBusinessInput,
  CreateBusinessResult,
  SuperAdminBusiness,
  SuperAdminBusinessDetail,
  WhatsappProvisionResult,
} from '../types';

export const superAdminApi = {
  list: () => apiClient.get<SuperAdminBusiness[]>('/superadmin/businesses'),
  detail: (id: string) => apiClient.get<SuperAdminBusinessDetail>(`/superadmin/businesses/${id}`),
  create: (input: CreateBusinessInput) =>
    apiClient.post<CreateBusinessResult>('/superadmin/businesses', input),
  provisionWhatsapp: (id: string) =>
    apiClient.post<WhatsappProvisionResult>(`/superadmin/businesses/${id}/whatsapp/provision`),
  regenerateQr: (id: string) =>
    apiClient.post<WhatsappProvisionResult>(`/superadmin/businesses/${id}/whatsapp/qr`),
  refreshStatus: (id: string) =>
    apiClient.get<SuperAdminBusiness>(`/superadmin/businesses/${id}/whatsapp/status`),
  disconnect: (id: string) =>
    apiClient.post<SuperAdminBusiness>(`/superadmin/businesses/${id}/whatsapp/disconnect`),
  restart: (id: string) =>
    apiClient.post<SuperAdminBusiness>(`/superadmin/businesses/${id}/whatsapp/restart`),
  deleteInstance: (id: string) =>
    apiClient.post<SuperAdminBusiness>(`/superadmin/businesses/${id}/whatsapp/delete`),
};
