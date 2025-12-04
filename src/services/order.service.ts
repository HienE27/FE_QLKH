// src/services/order.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Order } from '@/types/order';

export async function getOrders(): Promise<Order[]> {
  // map tới route ở API Gateway (ví dụ bạn đang dùng /api/orders)
  return apiFetch<Order[]>('/api/orders');
}
