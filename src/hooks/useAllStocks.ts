// src/hooks/useAllStocks.ts
import { useQuery } from '@tanstack/react-query';
import { getAllStockPaged, type StockByStore } from '@/services/stock.service';

/**
 * Custom hook để lấy tất cả stocks với React Query caching
 * Tự động fetch tất cả pages và cache lại
 */
export function useAllStocks() {
    return useQuery<StockByStore[]>({
        queryKey: ['allStocks'],
        queryFn: async () => {
            // Fetch tất cả stocks với pagination
            const allStocks: StockByStore[] = [];
            let page = 0;
            const size = 100; // Fetch 100 records mỗi page
            let hasMore = true;

            while (hasMore) {
                const response = await getAllStockPaged({ page, size });
                allStocks.push(...response.content);
                
                hasMore = page + 1 < response.totalPages;
                page++;
                
                // Safety limit: không fetch quá 50 pages (5000 records)
                if (page >= 50) {
                    console.warn('useAllStocks: Reached safety limit of 50 pages');
                    break;
                }
            }

            return allStocks;
        },
        staleTime: 5 * 60 * 1000, // Cache 5 phút
        gcTime: 10 * 60 * 1000, // Giữ cache 10 phút
        retry: 2,
    });
}

