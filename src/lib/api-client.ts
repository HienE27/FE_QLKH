// src/lib/api-client.ts
import { API_BASE_URL } from '@/config/api';

export interface ApiFetchOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Exponential backoff retry delay
function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return baseDelay * Math.pow(2, attempt);
}

// Create timeout promise
function createTimeoutPromise(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new TimeoutError()), timeoutMs);
  });
}

export async function apiFetch<T>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    retries = 0,
    retryDelay = 1000,
    timeout = 30000, // 30 seconds default
    ...fetchOptions
  } = options;

  // Dùng helper để thống nhất nơi lưu token
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('access_token')
      : null;

  const isFormData = fetchOptions.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  // ❗ Chỉ set JSON khi KHÔNG phải FormData
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create fetch with timeout
      const fetchPromise = fetch(`${API_BASE_URL}${url}`, {
        ...fetchOptions,
        headers,
      });

      const res = await Promise.race([
        fetchPromise,
        createTimeoutPromise(timeout),
      ]);

      if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        let errorData: unknown;

        try {
          const data = (await res.json()) as { message?: string; error?: string };
          errorData = data;
          if (data?.message) {
            errorMessage = data.message;
          } else if (data?.error) {
            errorMessage = data.error;
          }
        } catch {
          // If response is not JSON, try to get text
          try {
            const text = await res.text();
            if (text) errorMessage = text;
          } catch {
            // Ignore
          }
        }

        // Với 401/403: không retry, throw ngay
        if (res.status === 401 || res.status === 403) {
          // Clear token và redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
            window.location.href = '/login';
          }
          throw new ApiError(
            'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
            res.status,
            res.statusText,
            errorData
          );
        }

        // Với 5xx errors: retry nếu còn attempts
        if (res.status >= 500 && attempt < retries) {
          const delay = getRetryDelay(attempt, retryDelay);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new ApiError(errorMessage, res.status, res.statusText, errorData);
      }

      // nếu là 204 thì không có body
      if (res.status === 204) {
        return undefined as T;
      }

      return (await res.json()) as T;
    } catch (error) {
      lastError = error as Error;

      // Timeout errors: retry nếu còn attempts
      if (error instanceof TimeoutError && attempt < retries) {
        const delay = getRetryDelay(attempt, retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Network errors: retry nếu còn attempts
      if (
        (error instanceof TypeError || error instanceof DOMException) &&
        attempt < retries
      ) {
        const delay = getRetryDelay(attempt, retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Nếu là ApiError (401, 403, etc.) hoặc hết retries, throw ngay
      throw error;
    }
  }

  // Nếu đến đây nghĩa là đã hết retries
  if (lastError instanceof ApiError) {
    throw lastError;
  }

  throw new NetworkError(
    'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.',
    lastError
  );
}