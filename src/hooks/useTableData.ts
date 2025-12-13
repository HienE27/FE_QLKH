// src/hooks/useTableData.ts
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

interface UseTableDataOptions<T, P> {
  queryKey: (string | number | undefined)[];
  queryFn: (params: P) => Promise<{
    content: T[];
    totalElements: number;
    totalPages: number;
  }>;
  searchParams: P;
  pageSize?: number;
  enabled?: boolean;
}

/**
 * Shared hook for table data fetching with pagination
 * Reduces code duplication across table pages
 */
export function useTableData<T, P extends { page?: number; size?: number }>({
  queryKey,
  queryFn,
  searchParams,
  pageSize = 10,
  enabled = true,
}: UseTableDataOptions<T, P>) {
  const [currentPage, setCurrentPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      ...searchParams,
      page: currentPage - 1, // Backend uses 0-based
      size: pageSize,
    }),
    [searchParams, currentPage, pageSize]
  );

  const query = useQuery({
    queryKey: [...queryKey, queryParams],
    queryFn: () => queryFn(queryParams),
    enabled,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
    },
    []
  );

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    data: query.data?.content ?? [],
    totalItems: query.data?.totalElements ?? 0,
    totalPages: query.data?.totalPages ?? 1,
    currentPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    handlePageChange,
    resetPage,
    refetch: query.refetch,
  };
}

