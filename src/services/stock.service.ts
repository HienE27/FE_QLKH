// src/services/stock.service.ts
import { apiFetch } from '@/lib/api-client';

const STOCK_BASE_URL = '/api/stocks';

export interface StockByStore {
    productId: number;
    storeId: number;
    storeName?: string;
    storeCode?: string;
    quantity: number;
    minStock?: number;
    maxStock?: number;
}

type ApiResponse<T> = {
    data: T;
    message?: string;
    success?: boolean;
};

/**
 * Lấy tồn kho của 1 sản phẩm tại tất cả các kho
 */
export async function getStockByProduct(productId: number): Promise<StockByStore[]> {
    const res = await apiFetch<ApiResponse<StockByStore[]>>(
        `${STOCK_BASE_URL}/product/${productId}`,
    );
    return res.data;
}

/**
 * Lấy tồn kho của 1 sản phẩm tại 1 kho cụ thể
 */
export async function getStockByProductAndStore(
    productId: number,
    storeId: number,
): Promise<StockByStore> {
    const res = await apiFetch<ApiResponse<StockByStore>>(
        `${STOCK_BASE_URL}/product/${productId}/store/${storeId}`,
    );
    return res.data;
}

/**
 * Lấy tồn kho của tất cả sản phẩm tại 1 kho
 */
export async function getStockByStore(storeId: number): Promise<StockByStore[]> {
    const res = await apiFetch<ApiResponse<StockByStore[]>>(
        `${STOCK_BASE_URL}/store/${storeId}`,
    );
    return res.data;
}

/**
 * Lấy tồn kho của tất cả sản phẩm tại tất cả các kho
 */
export async function getAllStock(): Promise<StockByStore[]> {
    const res = await apiFetch<ApiResponse<StockByStore[]>>(STOCK_BASE_URL);
    return res.data;
}

/**
 * Tạo hoặc cập nhật tồn kho
 */
export interface CreateStockRequest {
    productId: number;
    storeId: number;
    quantity?: number;
    minStock?: number;
    maxStock?: number;
}

export async function createOrUpdateStock(request: CreateStockRequest): Promise<StockByStore> {
    const res = await apiFetch<ApiResponse<StockByStore>>(STOCK_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(request),
    });
    return res.data;
}

