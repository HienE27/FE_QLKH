// src/services/category.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Category } from '@/types/category';

type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export async function getCategories(): Promise<Category[]> {
  // endpoint tùy bạn mapping ở gateway, ví dụ:
  const res = await apiFetch<ApiResponse<Category[]>>('/api/categories');
  return res.data;
}
