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

// ==== CRUD danh mục NCC (/api/suppliers) ====

export async function getSuppliers(type?: string): Promise<Supplier[]> {
    const url = type
        ? `${SUPPLIER_BASE_URL}?type=${encodeURIComponent(type)}`
        : SUPPLIER_BASE_URL;
    const res = await apiFetch<ApiResponse<Supplier[]>>(url);
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
export async function searchSuppliers(params?: {
    code?: string;
    name?: string;
    type?: string;
    phone?: string;
    page?: number;
    size?: number;
}): Promise<Page<Supplier>> {
    const qs = new URLSearchParams();
    
    if (params?.code) qs.set('code', params.code);
    if (params?.name) qs.set('name', params.name);
    if (params?.type) qs.set('type', params.type);
    if (params?.phone) qs.set('phone', params.phone);
    
    // Pagination params - luôn gửi page và size
    qs.set('page', String(params?.page ?? 0));
    qs.set('size', String(params?.size ?? 10));
    
    const url = `${SUPPLIER_BASE_URL}?${qs.toString()}`;
    const res = await apiFetch<ApiResponse<Page<Supplier>>>(url);
    
    if (!res.data) {
        console.error('❌ searchSuppliers: res.data is null/undefined', res);
        throw new Error('Response không có data');
    }
    
    // Nếu res.data là Array, convert sang Page format
    if (Array.isArray(res.data)) {
        console.warn('⚠️ searchSuppliers: res.data is Array, converting to Page format');
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
