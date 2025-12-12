// src/hooks/useStores.ts
import { useQuery } from '@tanstack/react-query';
import { getStores, type Store } from '@/services/store.service';

/**
 * Custom hook để lấy tất cả stores với React Query caching
 */
export function useStores() {
    return useQuery<Store[]>({
        queryKey: ['stores'],
        queryFn: () => getStores(),
        staleTime: 5 * 60 * 1000, // Cache 5 phút
        gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
        retry: 2,
    });
}

