import { useCallback } from 'react';

/**
 * Hook để tái sử dụng logic reset filter và reload data
 * 
 * @example
 * ```tsx
 * const { handleResetFilter } = useFilterReset({
 *   resetFilters: () => {
 *     setSearchCode('');
 *     setSearchName('');
 *   },
 *   loadData: async (page = 1) => {
 *     const result = await searchSuppliers({ page: page - 1, size: PAGE_SIZE });
 *     setData(result.content);
 *   },
 *   resetPage: () => resetPage(), // từ usePagination hook
 * });
 * 
 * <FilterSection onClearFilter={handleResetFilter} />
 * ```
 */
interface UseFilterResetOptions {
    /**
     * Function để reset tất cả filter states về giá trị mặc định
     */
    resetFilters: () => void;
    
    /**
     * Function để load data với page number
     * @param page - Page number (1-based)
     */
    loadData: (page?: number) => Promise<void>;
    
    /**
     * Optional: Function để reset pagination về trang 1
     * Nếu không có, sẽ tự động gọi loadData(1)
     */
    resetPage?: () => void;
    
    /**
     * Optional: Function để set loading state
     */
    setLoading?: (loading: boolean) => void;
    
    /**
     * Optional: Function để set error state
     */
    setError?: (error: string | null) => void;
}

/**
 * Custom hook để xử lý reset filter và reload data
 * 
 * **Chức năng:**
 * - Reset tất cả filter states về giá trị mặc định
 * - Reset pagination về trang 1 (nếu có resetPage)
 * - Reload data với filters đã reset
 * - Xử lý loading và error states
 * 
 * **Lợi ích:**
 * - Giảm code duplicate (9 files có pattern giống nhau)
 * - Thống nhất logic reset filter
 * - Dễ maintain và test
 * 
 * **Sử dụng:**
 * Thay vì viết lại logic reset filter ở mỗi page, chỉ cần:
 * 1. Định nghĩa resetFilters function
 * 2. Định nghĩa loadData function
 * 3. Sử dụng hook và pass vào FilterSection
 */
export function useFilterReset({
    resetFilters,
    loadData,
    resetPage,
    setLoading,
    setError,
}: UseFilterResetOptions) {
    const handleResetFilter = useCallback(async () => {
        // Reset tất cả filter states
        resetFilters();
        
        // Reset pagination về trang 1 (nếu có)
        resetPage?.();
        
        // Set loading state (nếu có)
        setLoading?.(true);
        setError?.(null);
        
        try {
            // Load data với page 1 và filters đã reset
            await loadData(1);
        } catch (error) {
            // Handle error (nếu có setError)
            const message = error instanceof Error ? error.message : 'Lỗi tải dữ liệu';
            setError?.(message);
        } finally {
            // Clear loading state (nếu có)
            setLoading?.(false);
        }
    }, [resetFilters, loadData, resetPage, setLoading, setError]);

    return {
        handleResetFilter,
    };
}

