// src/types/supplier.ts

export const SUPPLIER_TYPES = {
    NCC: 'NCC',           // Nhà cung cấp
    INTERNAL: 'INTERNAL', // Nội bộ (kho/chi nhánh)
    STAFF: 'STAFF',       // Nhân viên bán hàng
} as const;

export type SupplierType = typeof SUPPLIER_TYPES[keyof typeof SUPPLIER_TYPES];

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
    [SUPPLIER_TYPES.NCC]: 'Nhà cung cấp',
    [SUPPLIER_TYPES.INTERNAL]: 'Nội bộ',
    [SUPPLIER_TYPES.STAFF]: 'Nhân viên bán hàng',
};
