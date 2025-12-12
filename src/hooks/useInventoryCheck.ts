// src/hooks/useInventoryCheck.ts
import { useQuery } from '@tanstack/react-query';
import { getInventoryCheckById, type InventoryCheck } from '@/services/inventory.service';

/**
 * Custom hook để lấy inventory check by ID với React Query caching
 */
export function useInventoryCheck(id: number | null | undefined) {
    return useQuery<InventoryCheck>({
        queryKey: ['inventoryCheck', id],
        queryFn: () => getInventoryCheckById(id!),
        enabled: !!id,
        staleTime: 2 * 60 * 1000, // Cache 2 phút
        gcTime: 5 * 60 * 1000, // Giữ cache 5 phút
        retry: 2,
    });
}

