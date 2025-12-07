// src/types/unit.ts
export interface Unit {
    id: number;
    name: string;
    description?: string | null;
    active?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    [key: string]: unknown; // Index signature để tương thích với Record<string, unknown>
}

export interface UnitPayload {
    name: string;
    description?: string | null;
    active?: boolean;
}

