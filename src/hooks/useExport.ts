// src/hooks/useExport.ts
import { useQuery } from '@tanstack/react-query';
import { getExportById, type SupplierExport } from '@/services/inventory.service';

/**
 * Custom hook để lấy export by ID với React Query caching
 */
export function useExport(id: number | null | undefined) {
    return useQuery<SupplierExport>({
        queryKey: ['export', id],
        queryFn: () => getExportById(id!),
        enabled: !!id,
        staleTime: 2 * 60 * 1000, // Cache 2 phút
        gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
        retry: 2,
    });
}

