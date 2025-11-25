// src/services/category.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Category } from '@/types/category';

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

const BASE_URL = '/api/categories';

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