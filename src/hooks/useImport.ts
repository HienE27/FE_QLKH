// src/hooks/useImport.ts
import { useQuery } from '@tanstack/react-query';
import { getImportById, type SupplierImport } from '@/services/inventory.service';

/**
 * Custom hook để lấy import by ID với React Query caching
 */
export function useImport(id: number | null | undefined) {
    return useQuery<SupplierImport>({
        queryKey: ['import', id],
        queryFn: () => getImportById(id!),
        enabled: !!id,
        staleTime: 2 * 60 * 1000, // Cache 2 phút
        gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
        retry: 2,
    });
}

