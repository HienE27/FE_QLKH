import { API_BASE_URL } from '@/config/api';

/**
 * Format currency to Vietnamese format
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

/**
 * Format price with currency symbol
 */
export function formatPrice(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Build full image URL from relative path
 */
export function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Format date time to Vietnamese format
 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return value;
  }
}

/**
 * Parse money string to number
 */
export function parseMoney(input: string): number {
  const cleaned = input.replace(/[^\d,.-]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse number from string
 */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  const cleaned = String(input).replace(/[^\d,.-]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

