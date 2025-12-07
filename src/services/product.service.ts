// src/services/product.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Product, ProductPayload } from '@/types/product';

const BASE_URL = '/api/products';

// Vỏ bọc giống BE
type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

// ====== TYPES CHO LIST + FILTER + PAGE ======

export type ProductPage = {
  content: Product[];
  totalElements: number;
  totalPages: number;
  number: number; // page hiện tại (0-based)
  size: number;
};

export type ProductSearchParams = {
  code?: string;
  name?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  page?: number;
  size?: number;
};

// Build query string
function buildQuery(params: ProductSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.code) searchParams.append('code', params.code);
  if (params.name) searchParams.append('name', params.name);
  if (params.fromDate) searchParams.append('fromDate', params.fromDate);
  if (params.toDate) searchParams.append('toDate', params.toDate);

  if (typeof params.page === 'number') {
    searchParams.append('page', String(params.page));
  }
  if (typeof params.size === 'number') {
    searchParams.append('size', String(params.size));
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ================== API FUNCTIONS ======================

// List + filter + page
export async function searchProducts(
  params: ProductSearchParams = {},
): Promise<ProductPage> {
  const query = buildQuery(params);
  // Backend endpoint: GET /api/products/search (trả về Page<ProductDto> trực tiếp, không bọc ApiResponse)
  return apiFetch<ProductPage>(`${BASE_URL}/search${query}`);
}

// Lấy toàn bộ (simple list)
// Note: Không còn filter theo storeId vì tồn kho đã chuyển sang shop_stocks
export async function getProducts(): Promise<Product[]> {
  const res = await apiFetch<ApiResponse<Product[]>>(BASE_URL);
  return res.data;
}

// Detail
export async function getProduct(id: number): Promise<Product> {
  const res = await apiFetch<ApiResponse<Product>>(`${BASE_URL}/${id}`);
  return res.data;
}

// Create
export async function createProduct(payload: ProductPayload): Promise<Product> {
  const res = await apiFetch<ApiResponse<Product>>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

// Update
export async function updateProduct(
  id: number,
  payload: ProductPayload,
): Promise<Product> {
  const res = await apiFetch<ApiResponse<Product>>(`${BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

// Delete
export async function deleteProduct(id: number): Promise<void> {
  await apiFetch<ApiResponse<null>>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

// Upload ảnh (dùng apiFetch để tự thêm token + headers)
export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch<ApiResponse<string>>(
    `${BASE_URL}/upload-image`,
    {
      method: 'POST',
      body: formData, // apiFetch tự nhận biết FormData
    },
  );

  return res.data; // trả URL ảnh
}
