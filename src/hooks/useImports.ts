// src/hooks/useImports.ts
import { useQuery } from '@tanstack/react-query';
import { searchImportsPaged, type SupplierImport, type PageResponse } from '@/services/inventory.service';

export type ImportSearchParams = {
    status?: string | "ALL";
    code?: string;
    from?: string;
    to?: string;
    sortField?: "date" | "value";
    sortDir?: "asc" | "desc";
    page?: number;
    size?: number;
};

/**
 * Custom hook để search imports với pagination và React Query caching
 */
export function useImports(params?: ImportSearchParams) {
    return useQuery<PageResponse<SupplierImport>>({
        queryKey: ['imports', 'search', params],
        queryFn: () => searchImportsPaged(params),
        staleTime: 2 * 60 * 1000, // Cache 2 phút
        gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
        retry: 2,
    });
}

