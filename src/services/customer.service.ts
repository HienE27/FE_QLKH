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

export type CustomerPage = {
  content: Customer[];
  totalElements: number;
  totalPages: number;
  number: number; // page hiện tại (0-based)
  size: number;
};

export type CustomerSearchParams = {
  code?: string;
  name?: string;
  phone?: string;
  page?: number;
  size?: number;
  sort?: string;
};

function buildQuery(params: CustomerSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.code) searchParams.append('code', params.code);
  if (params.name) searchParams.append('name', params.name);
  if (params.phone) searchParams.append('phone', params.phone);
  if (typeof params.page === 'number') {
    searchParams.append('page', String(params.page));
  }
  if (typeof params.size === 'number') {
    searchParams.append('size', String(params.size));
  }
  if (params.sort) {
    searchParams.append('sort', params.sort);
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export async function searchCustomers(
  params: CustomerSearchParams = {},
): Promise<CustomerPage> {
  const query = buildQuery(params);
  const res = await apiFetch<CustomerPage>(`${CUSTOMER_BASE_URL}/search${query}`);
  return res;
}

export async function getCustomers(): Promise<Customer[]> {
  const res = await apiFetch<ApiResponse<Customer[]>>(CUSTOMER_BASE_URL);
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

