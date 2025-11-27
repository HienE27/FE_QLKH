import { apiFetch } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export async function aiChat(message: string) {
  const response = await apiFetch<ApiResponse<{ message: string }>>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return response.data;
}

export async function aiProductDescription(name: string) {
  const response = await apiFetch<ApiResponse<{
    shortDescription: string;
    seoDescription: string;
    longDescription: string;
    attributes: string[];
  }>>('/api/ai/product-description', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return response.data;
}

export async function aiInventoryForecast(items: Array<{ code: string; name: string; quantity: number; avgDailySales?: number }>) {
  const response = await apiFetch<ApiResponse<{ recommendation: string }>>('/api/ai/inventory-forecast', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
  return response.data;
}


