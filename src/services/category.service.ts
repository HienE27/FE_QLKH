// src/services/category.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Category } from '@/types/category';

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

const BASE_URL = '/api/categories';

export type CategoryPage = {
    content: Category[];
    totalElements: number;
    totalPages: number;
    number: number; // page hiện tại (0-based)
    size: number;
};

export type CategorySearchParams = {
    code?: string;
    name?: string;
    page?: number;
    size?: number;
    sort?: string;
};

function buildQuery(params: CategorySearchParams): string {
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

export async function searchCategories(
    params: CategorySearchParams = {},
): Promise<CategoryPage> {
    const query = buildQuery(params);
    const res = await apiFetch<ApiResponse<CategoryPage>>(`${BASE_URL}/search${query}`);
    return res.data;
}

export async function getCategories(): Promise<Category[]> {
    const res = await apiFetch<ApiResponse<Category[]>>(BASE_URL);
    return res.data;
}

export async function getCategory(id: number): Promise<Category> {
    const res = await apiFetch<ApiResponse<Category>>(`${BASE_URL}/${id}`);
    return res.data;
}

export interface CategoryPayload {
    code: string;
    name: string;
    description?: string | null;
}

export async function createCategory(payload: CategoryPayload): Promise<Category> {
    const res = await apiFetch<ApiResponse<Category>>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function updateCategory(
    id: number,
    payload: CategoryPayload,
): Promise<Category> {
    const res = await apiFetch<ApiResponse<Category>>(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function deleteCategory(id: number): Promise<void> {
    await apiFetch<ApiResponse<void>>(`${BASE_URL}/${id}`, {
        method: 'DELETE',
    });
}