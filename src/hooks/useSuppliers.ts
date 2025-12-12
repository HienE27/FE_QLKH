// src/hooks/useSuppliers.ts
import { useQuery } from '@tanstack/react-query';
import { getSuppliers, type Supplier } from '@/services/supplier.service';

/**
 * Custom hook để lấy tất cả suppliers với React Query caching
 */
export function useSuppliers(type?: string) {
    return useQuery<Supplier[]>({
        queryKey: ['suppliers', type],
        queryFn: () => getSuppliers(type),
        staleTime: 5 * 60 * 1000, // Cache 5 phút
        gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
        retry: 2,
    });
}

