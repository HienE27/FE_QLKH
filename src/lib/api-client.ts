// src/lib/api-client.ts
const API_BASE_URL = 'http://localhost:8080'; // API Gateway

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
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
    
    // Provide more specific error messages for common status codes
    if (res.status === 403) {
      message = 'Không có quyền truy cập. Vui lòng đăng nhập lại.';
    } else if (res.status === 401) {
      message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    } else if (res.status === 404) {
      message = 'Không tìm thấy tài nguyên.';
    } else if (res.status >= 500) {
      message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
    }
    
    throw new Error(message);
  }

  // nếu là 204 thì không có body
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}