// src/services/customer.service.ts
import { apiFetch } from '@/lib/api-client';

const CUSTOMER_BASE_URL = '/api/customers';

export interface Customer {
  id: number;
  username?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  address?: string;
  country?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  code?: string;
  name?: string;
  description?: string;
}

export interface CustomerRequest {
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  country?: string;
  gender?: string;
  code?: string;
  name?: string;
  description?: string;
}

type ApiResponse<T> = {
  data: T;
  message?: string;
  success?: boolean;
};

export async function getCustomers(): Promise<Customer[]> {
  const res = await apiFetch<ApiResponse<Customer[]>>(CUSTOMER_BASE_URL);
  return res.data;
}

// Page type cho pagination
export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // page hiện tại (0-based)
  size: number;
  first: boolean;
  last: boolean;
};

// Search với pagination
export async function searchCustomers(params?: {
  code?: string;
  name?: string;
  phone?: string;
  page?: number;
  size?: number;
}): Promise<Page<Customer>> {
  const qs = new URLSearchParams();
  
  if (params?.code) qs.set('code', params.code);
  if (params?.name) qs.set('name', params.name);
  if (params?.phone) qs.set('phone', params.phone);
  
  // Pagination params - luôn gửi page và size
  qs.set('page', String(params?.page ?? 0));
  qs.set('size', String(params?.size ?? 10));
  
  const url = `${CUSTOMER_BASE_URL}?${qs.toString()}`;
  const res = await apiFetch<ApiResponse<Page<Customer>>>(url);
  
  if (!res.data) {
    console.error('❌ searchCustomers: res.data is null/undefined', res);
    throw new Error('Response không có data');
  }
  
  // Nếu res.data là Array, convert sang Page format
  if (Array.isArray(res.data)) {
    console.warn('⚠️ searchCustomers: res.data is Array, converting to Page format');
    return {
      content: res.data,
      totalElements: res.data.length,
      totalPages: 1,
      number: params?.page ?? 0,
      size: params?.size ?? 10,
      first: (params?.page ?? 0) === 0,
      last: true,
    };
  }
  
  return res.data;
}

export async function getCustomer(id: number): Promise<Customer> {
  const res = await apiFetch<ApiResponse<Customer>>(`${CUSTOMER_BASE_URL}/${id}`);
  return res.data;
}

export async function createCustomer(payload: CustomerRequest): Promise<Customer> {
  const res = await apiFetch<ApiResponse<Customer>>(CUSTOMER_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function updateCustomer(id: number, payload: CustomerRequest): Promise<Customer> {
  const res = await apiFetch<ApiResponse<Customer>>(`${CUSTOMER_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deleteCustomer(id: number): Promise<void> {
  await apiFetch<ApiResponse<null>>(`${CUSTOMER_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
}

