// src/services/store.service.ts
import { apiFetch } from '@/lib/api-client';

const STORE_BASE_URL = '/api/stores';

export interface Store {
    id: number;
    code?: string;
    name: string;
    phone?: string | null;
    address?: string | null;
    description?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

export async function getStores(): Promise<Store[]> {
    const res = await apiFetch<ApiResponse<Store[]>>(STORE_BASE_URL);
    return res.data;
}

export async function getStore(id: number): Promise<Store> {
    const res = await apiFetch<ApiResponse<Store>>(`${STORE_BASE_URL}/${id}`);
    return res.data;
}

export async function createStore(payload: Partial<Store>): Promise<Store> {
    const res = await apiFetch<ApiResponse<Store>>(STORE_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function updateStore(
    id: number,
    payload: Partial<Store>,
): Promise<Store> {
    const res = await apiFetch<ApiResponse<Store>>(`${STORE_BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function deleteStore(id: number): Promise<void> {
    await apiFetch<ApiResponse<null>>(`${STORE_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
}
