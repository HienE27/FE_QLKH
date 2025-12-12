// src/hooks/useCustomers.ts
import { useQuery } from '@tanstack/react-query';
import { getCustomers, type Customer } from '@/services/customer.service';

/**
 * Custom hook để lấy tất cả customers với React Query caching
 */
export function useCustomers() {
    return useQuery<Customer[]>({
        queryKey: ['customers'],
        queryFn: () => getCustomers(),
        staleTime: 5 * 60 * 1000, // Cache 5 phút
        gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
        retry: 2,
    });
}

