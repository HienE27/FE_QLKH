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

export async function getProducts(): Promise<Product[]> {
  const res = await apiFetch<ApiResponse<Product[]>>(BASE_URL);
  return res.data;
}

export async function getProduct(id: number): Promise<Product> {
  const res = await apiFetch<ApiResponse<Product>>(`${BASE_URL}/${id}`);
  return res.data;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const res = await apiFetch<ApiResponse<Product>>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

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

export async function deleteProduct(id: number): Promise<void> {
  await apiFetch<ApiResponse<null>>(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

// ==== Upload hình ảnh sản phẩm ====

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch<ApiResponse<string>>(
    `${BASE_URL}/upload-image`,
    {
      method: 'POST',
      body: formData, // apiFetch đã handle FormData
    },
  );

  return res.data; // BE trả full URL
}














// import { apiFetch } from '@/lib/api-client';
// import type { Product, ProductPayload } from '@/types/product';

// const BASE_URL = '/api/products';

// export type ProductPage = {
//   content: Product[];
//   totalElements: number;
//   totalPages: number;
//   number: number; // page hiện tại (0-based)
//   size: number;
// };

// export type ProductSearchParams = {
//   code?: string;
//   name?: string;
//   fromDate?: string; // 'YYYY-MM-DD'
//   toDate?: string;   // 'YYYY-MM-DD'
//   page?: number;     // 0-based
//   size?: number;
// };

// function buildQuery(params: ProductSearchParams): string {
//   const searchParams = new URLSearchParams();

//   if (params.code) searchParams.append('code', params.code);
//   if (params.name) searchParams.append('name', params.name);
//   if (params.fromDate) searchParams.append('fromDate', params.fromDate);
//   if (params.toDate) searchParams.append('toDate', params.toDate);

//   if (typeof params.page === 'number') {
//     searchParams.append('page', String(params.page));
//   }
//   if (typeof params.size === 'number') {
//     searchParams.append('size', String(params.size));
//   }

//   const qs = searchParams.toString();
//   return qs ? `?${qs}` : '';
// }

// // ✅ list + filter + page
// export async function getProducts(
//   params: ProductSearchParams = {},
// ): Promise<ProductPage> {
//   const query = buildQuery(params);
//   return apiFetch<ProductPage>(`${BASE_URL}${query}`);
// }

// // detail
// export async function getProduct(id: number): Promise<Product> {
//   return apiFetch<Product>(`${BASE_URL}/${id}`);
// }

// // create
// export async function createProduct(payload: ProductPayload): Promise<Product> {
//   return apiFetch<Product>(BASE_URL, {
//     method: 'POST',
//     body: JSON.stringify(payload),
//   });
// }

// // update
// export async function updateProduct(
//   id: number,
//   payload: ProductPayload,
// ): Promise<Product> {
//   return apiFetch<Product>(`${BASE_URL}/${id}`, {
//     method: 'PUT',
//     body: JSON.stringify(payload),
//   });
// }

// // delete
// export async function deleteProduct(id: number): Promise<void> {
//   await apiFetch<void>(`${BASE_URL}/${id}`, {
//     method: 'DELETE',
//   });
// }

// // upload image (giữ nguyên)
// type ApiResponse<T> = {
//   data: T;
//   message?: string;
//   success?: boolean;
// };

// export async function uploadProductImage(file: File): Promise<string> {
//   const formData = new FormData();
//   formData.append('file', file);

//   const token = typeof window !== 'undefined'
//     ? localStorage.getItem('access_token') ?? ''
//     : '';

//   const res = await fetch(`${BASE_URL}/upload-image`, {
//     method: 'POST',
//     body: formData,
//     credentials: 'include',
//     headers: token ? { Authorization: `Bearer ${token}` } : undefined,
//   });

//   if (!res.ok) {
//     throw new Error('Upload hình ảnh thất bại');
//   }

//   const json = (await res.json()) as ApiResponse<string>;
//   return json.data;
// }
