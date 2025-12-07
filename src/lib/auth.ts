// src/lib/auth.ts

const TOKEN_KEY = 'access_token';

export function saveToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// tiện nếu sau này muốn check nhanh
export function isLoggedIn(): boolean {
  return !!getToken();
}
