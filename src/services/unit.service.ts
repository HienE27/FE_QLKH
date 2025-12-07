// src/services/unit.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Unit, UnitPayload } from '@/types/unit';

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

const BASE_URL = '/api/units';

export type UnitPage = {
    content: Unit[];
    totalElements: number;
    totalPages: number;
    number: number; // page hiện tại (0-based)
    size: number;
};

export type UnitSearchParams = {
    name?: string;
    page?: number;
    size?: number;
    sort?: string;
};

function buildQuery(params: UnitSearchParams): string {
    const searchParams = new URLSearchParams();

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

export async function searchUnits(
    params: UnitSearchParams = {},
): Promise<UnitPage> {
    const query = buildQuery(params);
    const res = await apiFetch<UnitPage>(`${BASE_URL}/search${query}`);
    return res;
}

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

