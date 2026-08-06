import { apiClient } from '../lib/apiClient';
import type { Product, ProductInput } from '../types';

export const productsApi = {
  list: () => apiClient.get<Product[]>('/products'),
  create: (input: ProductInput) => apiClient.post<Product>('/products', input),
  update: (id: string, input: Partial<ProductInput>) =>
    apiClient.patch<Product>(`/products/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/products/${id}`),
  uploadJson: (products: ProductInput[]) =>
    apiClient.post<Product[]>('/products/upload', { products }),
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<Product[]>('/products/upload', formData);
  },
};
