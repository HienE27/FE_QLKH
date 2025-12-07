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
 * Format date time to Vietnamese format with seconds
 * Format: HH:mm:ss DD/MM/YYYY
 */
export function formatDateTimeWithSeconds(value: string | null | undefined): string {
  if (!value || value.trim() === '') return '';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    // Format: HH:mm:ss DD/MM/YYYY
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
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
 * Handles Vietnamese format: "21.990.000" (dot as thousand separator)
 * Also handles: "21,990,000" (comma as thousand separator)
 * And: "21990000" (no separator)
 */
export function parseNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  
  // Convert to string and remove all non-digit characters except dots and commas
  let cleaned = String(input).replace(/[^\d,.-]/g, '');
  
  // Vietnamese format: dots are thousand separators, not decimal points
  // Check if it's Vietnamese format (has dots but no comma before the last 3 digits)
  // Pattern: "21.990.000" or "1.234.567"
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Remove all dots (they are thousand separators in VN format)
    cleaned = cleaned.replace(/\./g, '');
  } else if (cleaned.includes(',')) {
    // If has comma, it might be decimal separator or thousand separator
    // Check if comma is followed by exactly 3 digits (thousand separator)
    // Otherwise treat as decimal separator
    const lastCommaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(lastCommaIndex + 1);
    
    if (afterComma.length === 3 && cleaned.split(',').length > 1) {
      // Likely thousand separator (e.g., "1,234,567")
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // Likely decimal separator (e.g., "123,45")
      cleaned = cleaned.replace(/,/g, '.');
    }
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

