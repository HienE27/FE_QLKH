// src/types/order.ts
export interface Order {
  id: number;
  code?: string;
  totalAmount?: number;
  createdAt?: string;
  orderDate?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id?: number;
  productCode?: string;
  quantity?: number;
  product?: {
    code: string;
    name?: string;
  };
}

