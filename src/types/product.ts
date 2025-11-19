// src/types/product.ts
export interface Product {
  id: number;
  code: string;
  name: string;
  shortDescription?: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  status: string;
  categoryId?: number | null;
  supplierId?: number | null;
  categoryName: string | null;   // <── THÊM
  createdAt?: string;
  updatedAt?: string;
}

// Dữ liệu gửi lên khi create/update
export interface ProductPayload {
  code: string;
  name: string;
  shortDescription?: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  status: string;
  categoryId?: number | null;
  supplierId?: number | null;
}
