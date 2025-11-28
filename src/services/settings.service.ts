// src/services/settings.service.ts
import { apiFetch } from '@/lib/api-client';
import type { Setting, SettingRequest } from '@/types/setting';

type ApiResponse<T> = {
    success: boolean;
    message?: string;
    data: T;
};

const BASE_URL = '/api/settings';

export async function getSettings(): Promise<Setting[]> {
    const res = await apiFetch<ApiResponse<Setting[]>>(BASE_URL);
    if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể tải danh sách cài đặt');
    }
    return res.data;
}

export async function getSettingByKey(key: string): Promise<Setting> {
    const res = await apiFetch<ApiResponse<Setting>>(`${BASE_URL}/${key}`);
    if (!res.success || !res.data) {
        throw new Error(res.message || 'Không tìm thấy cài đặt');
    }
    return res.data;
}

export async function getSettingById(id: number): Promise<Setting> {
    const res = await apiFetch<ApiResponse<Setting>>(`${BASE_URL}/id/${id}`);
    if (!res.success || !res.data) {
        throw new Error(res.message || 'Không tìm thấy cài đặt');
    }
    return res.data;
}

export async function createOrUpdateSetting(payload: SettingRequest): Promise<Setting> {
    const res = await apiFetch<ApiResponse<Setting>>(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    if (!res.success || !res.data) {
        throw new Error(res.message || 'Không thể tạo/cập nhật cài đặt');
    }
    return res.data;
}

export async function deleteSetting(id: number): Promise<void> {
    const res = await apiFetch<ApiResponse<void>>(`${BASE_URL}/${id}`, {
        method: 'DELETE',
    });
    if (!res.success) {
        throw new Error(res.message || 'Không thể xóa cài đặt');
    }
}

