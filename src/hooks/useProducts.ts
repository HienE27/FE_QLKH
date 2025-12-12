// src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { getProducts, type Product } from '@/services/product.service';

/**
 * Custom hook để lấy tất cả products với React Query caching
 */
export function useProducts() {
    return useQuery<Product[]>({
        queryKey: ['products'],
        queryFn: () => getProducts(),
        staleTime: 5 * 60 * 1000, // Cache 5 phút
        gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
        retry: 2,
    });
}

