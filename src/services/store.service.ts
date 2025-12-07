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

export type StorePage = {
    content: Store[];
    totalElements: number;
    totalPages: number;
    number: number; // page hiện tại (0-based)
    size: number;
};

export type StoreSearchParams = {
    code?: string;
    name?: string;
    page?: number;
    size?: number;
    sort?: string;
};

function buildQuery(params: StoreSearchParams): string {
    const searchParams = new URLSearchParams();

    if (params.code) searchParams.append('code', params.code);
    if (params.name) searchParams.append('name', params.name);
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

export async function searchStores(
    params: StoreSearchParams = {},
): Promise<StorePage> {
    const query = buildQuery(params);
    const res = await apiFetch<StorePage>(`${STORE_BASE_URL}/search${query}`);
    return res;
}

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
