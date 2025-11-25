// src/types/category.ts
export interface Category {
    id: number;
    code: string;
    name: string;      // ⬅️ đúng với BE
    description?: string | null;
}