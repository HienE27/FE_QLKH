// src/hooks/useExports.ts
import { useQuery } from '@tanstack/react-query';
import { searchExportsPaged, type SupplierExport, type PageResponse } from '@/services/inventory.service';

export type ExportSearchParams = {
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
 * Custom hook để search exports với pagination và React Query caching
 */
export function useExports(params?: ExportSearchParams) {
    return useQuery<PageResponse<SupplierExport>>({
        queryKey: ['exports', 'search', params],
        queryFn: () => searchExportsPaged(params),
        staleTime: 2 * 60 * 1000, // Cache 2 phút
        gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
        retry: 2,
    });
}

