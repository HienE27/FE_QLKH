export interface Product {
  id: number;
  code: string;
  name: string;
  shortDescription?: string;
  image?: string | null;
  unitPrice: number;
  categoryName: string | null;
  status: string;
  categoryId?: number | null;
  supplierId?: number | null; // NCC chính (tương thích ngược)
  supplierIds?: number[] | null; // Danh sách NCC (many-to-many)
  unitId?: number | null;
  quantity?: number | null;
  stockQuantity?: number | null;
  unitName?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown; // Index signature để tương thích với Record<string, unknown>
}

export interface ProductPayload {
  code: string;
  name: string;
  shortDescription?: string;
  image?: string | null;
  unitPrice: number;
  status: string;
  categoryId?: number | null;
  supplierId?: number | null; // NCC chính (tương thích ngược)
  supplierIds?: number[] | null; // Danh sách NCC (many-to-many)
  unitId?: number | null;
  quantity?: number | null;
  stockQuantity?: number | null;
}
