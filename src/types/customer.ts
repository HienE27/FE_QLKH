// src/types/customer.ts

export const CUSTOMER_TYPES = {
    KH: 'KH',           // Khách hàng
    DOANH_NGHIEP: 'DOANH_NGHIEP', // Doanh nghiệp
    CA_NHAN: 'CA_NHAN', // Cá nhân
} as const;

export type CustomerType = typeof CUSTOMER_TYPES[keyof typeof CUSTOMER_TYPES];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
    [CUSTOMER_TYPES.KH]: 'Khách hàng',
    [CUSTOMER_TYPES.DOANH_NGHIEP]: 'Doanh nghiệp',
    [CUSTOMER_TYPES.CA_NHAN]: 'Cá nhân',
};

