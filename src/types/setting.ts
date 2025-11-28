// src/types/setting.ts
export interface Setting {
    id: number;
    settingKey: string;
    value: string;
    description?: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SettingRequest {
    key: string;
    value?: string;
    description?: string;
}

