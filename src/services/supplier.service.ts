// src/services/supplier.service.ts
import { apiFetch } from '@/lib/api-client';

const SUPPLIER_BASE_URL = '/api/suppliers';
const EXPORT_SUPPLIER_URL = '/api/exports/suppliers';

// Interface khớp với ShopSupplier entity trong backend
export interface Supplier {
    id: number;
    code?: string;
    name: string;
    type?: string | null;           // supplier_type
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    description?: string | null;    // ghi chú
    image?: string | null;
    createdAt?: string;             // created_at
    updatedAt?: string;             // updated_at
}

export interface ExportSupplier {
    id: number;
    name: string;
}

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

export type SupplierPage = {
    content: Supplier[];
    totalElements: number;
    totalPages: number;
    number: number; // page hiện tại (0-based)
    size: number;
};

export type SupplierSearchParams = {
    code?: string;
    name?: string;
    type?: string;
    phone?: string;
    page?: number;
    size?: number;
    sort?: string;
};

function buildQuery(params: SupplierSearchParams): string {
    const searchParams = new URLSearchParams();

    if (params.code) searchParams.append('code', params.code);
    if (params.name) searchParams.append('name', params.name);
    if (params.type) searchParams.append('type', params.type);
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

// ==== CRUD danh mục NCC (/api/suppliers) ====

export async function searchSuppliers(
    params: SupplierSearchParams = {},
): Promise<SupplierPage> {
    const query = buildQuery(params);
    const res = await apiFetch<SupplierPage>(`${SUPPLIER_BASE_URL}/search${query}`);
    return res;
}

export async function getSuppliers(type?: string): Promise<Supplier[]> {
    const url = type
        ? `${SUPPLIER_BASE_URL}?type=${encodeURIComponent(type)}`
        : SUPPLIER_BASE_URL;
    try {
        const res = await apiFetch<ApiResponse<Supplier[]>>(url);
        return res.data;
    } catch (err) {
        // Thiếu quyền → trả mảng rỗng để UI không sập
        console.warn('getSuppliers fallback empty list:', err);
        return [];
    }
}

export async function getSupplier(id: number): Promise<Supplier> {
    const res = await apiFetch<ApiResponse<Supplier>>(
        `${SUPPLIER_BASE_URL}/${id}`,
    );
    return res.data;
}

export async function createSupplier(
    payload: Partial<Supplier>,
): Promise<Supplier> {
    const res = await apiFetch<ApiResponse<Supplier>>(SUPPLIER_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return res.data;
}

export async function updateSupplier(
    id: number,
    payload: Partial<Supplier>,
): Promise<Supplier> {
    const res = await apiFetch<ApiResponse<Supplier>>(
        `${SUPPLIER_BASE_URL}/${id}`,
        {
            method: 'PUT',
            body: JSON.stringify(payload),
        },
    );
    return res.data;
}

export async function deleteSupplier(id: number): Promise<void> {
    await apiFetch<ApiResponse<null>>(`${SUPPLIER_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
}

// ==== Danh sách NCC cho phiếu xuất (/api/exports/suppliers) – GIỮ NGUYÊN ====

export async function getExportSuppliers(): Promise<ExportSupplier[]> {
    const res = await apiFetch<ApiResponse<ExportSupplier[]>>(
        EXPORT_SUPPLIER_URL,
    );
    return res.data;
}
