// src/services/unit.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Unit, UnitPayload } from '@/types/unit';

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

const BASE_URL = '/api/units';

export async function getUnits(): Promise<Unit[]> {
    const res = await apiFetch<ApiResponse<Unit[]>>(BASE_URL);
    return res.data;
}

export async function getUnit(id: number): Promise<Unit> {
    const res = await apiFetch<ApiResponse<Unit>>(`${BASE_URL}/${id}`);
    return res.data;
}

export async function createUnit(payload: UnitPayload): Promise<Unit> {
    const res = await apiFetch<ApiResponse<Unit>>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function updateUnit(
    id: number,
    payload: UnitPayload,
): Promise<Unit> {
    const res = await apiFetch<ApiResponse<Unit>>(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function deleteUnit(id: number): Promise<void> {
    await apiFetch<ApiResponse<void>>(`${BASE_URL}/${id}`, {
        method: 'DELETE',
    });
}

