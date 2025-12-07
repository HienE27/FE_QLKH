// src/lib/api-client.ts
import { API_BASE_URL } from '@/config/api';

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
    // Dùng helper để thống nhất nơi lưu token
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // ❗ Chỉ set JSON khi KHÔNG phải FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
        // Với 401/403: log và trả về promise reject nhẹ, để caller có thể nuốt lỗi
        if (res.status === 401 || res.status === 403) {
            console.warn('apiFetch caught auth error:', message);
            throw new Error(message);
        }
    throw new Error(message);
  }

  // nếu là 204 thì không có body
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}