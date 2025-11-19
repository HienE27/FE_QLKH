// src/types/category.ts
export interface Category {
  id: number;
  code: string;
  name: string;      // ⬅️ đúng với BE
  image?: string | null;
  description?: string | null;
}
