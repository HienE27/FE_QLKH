import { useState, useMemo, useCallback } from 'react';
import { PAGE_SIZE } from '@/constants/pagination';

interface UsePaginationOptions<T> {
    itemsPerPage?: number;
    // Cho server-side pagination: callback để load data
    onPageChange?: (page: number) => Promise<void> | void;
    // Cho client-side pagination: data array
    data?: T[];
    // Total items (cho server-side pagination)
    totalItems?: number;
    totalPages?: number;
}

export function usePagination<T = any>(
    optionsOrData: UsePaginationOptions<T> | T[],
    itemsPerPage: number = PAGE_SIZE
) {
    // Support cả 2 cách gọi: usePagination(data) hoặc usePagination({ data, onPageChange, ... })
    const isLegacyCall = Array.isArray(optionsOrData);
    const data = isLegacyCall ? optionsOrData : optionsOrData.data;
    const onPageChangeCallback = isLegacyCall ? undefined : optionsOrData.onPageChange;
    const serverTotalItems = isLegacyCall ? undefined : optionsOrData.totalItems;
    const serverTotalPages = isLegacyCall ? undefined : optionsOrData.totalPages;
    const finalItemsPerPage = isLegacyCall ? itemsPerPage : (optionsOrData.itemsPerPage ?? PAGE_SIZE);

    const [currentPage, setCurrentPage] = useState(1);

    // Client-side pagination (khi có data array)
    const clientTotalPages = data ? Math.ceil(data.length / finalItemsPerPage) : 0;
    const startIndex = (currentPage - 1) * finalItemsPerPage;
    const endIndex = startIndex + finalItemsPerPage;
    const currentData = data ? data.slice(startIndex, endIndex) : [];

    // Sử dụng server-side hoặc client-side
    const totalPages = serverTotalPages ?? clientTotalPages;
    const totalItems = serverTotalItems ?? (data?.length ?? 0);

    const paginationInfo = useMemo(
        () => ({
        currentPage,
        totalPages,
            totalItems,
            itemsPerPage: finalItemsPerPage,
        startIndex,
        endIndex,
            displayStart: totalItems === 0 ? 0 : startIndex + 1,
            displayEnd: Math.min(endIndex, totalItems),
        }),
        [currentPage, totalItems, finalItemsPerPage, startIndex, endIndex, totalPages]
    );

    // handlePageChange với scroll preservation (giống trang "Phiếu xuất kho")
    const handlePageChange = useCallback(
        (page: number) => {
            // Lưu vị trí scroll hiện tại
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;

            // Nếu có callback (server-side), gọi nó
            if (onPageChangeCallback) {
                const result = onPageChangeCallback(page);
                if (result instanceof Promise) {
                    result.finally(() => {
                        // Restore scroll position sau khi data load xong
                        setTimeout(() => {
                            window.scrollTo({
                                top: scrollPosition,
                                behavior: 'instant' as ScrollBehavior,
                            });
                        }, 50);
                    });
                } else {
                    // Sync callback, restore ngay
                    setTimeout(() => {
                        window.scrollTo({
                            top: scrollPosition,
                            behavior: 'instant' as ScrollBehavior,
                        });
                    }, 0);
                }
                // Set currentPage sau callback
                setCurrentPage(page);
            } else {
                // Client-side: chỉ set state và restore scroll
                setCurrentPage(page);
                setTimeout(() => {
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'instant' as ScrollBehavior,
                    });
                }, 0);
            }
        },
        [onPageChangeCallback]
    );

    const goToPage = useCallback(
        (page: number) => {
        if (page >= 1 && page <= totalPages) {
                handlePageChange(page);
        }
        },
        [handlePageChange, totalPages]
    );

    const nextPage = useCallback(() => {
        if (currentPage < totalPages) {
            handlePageChange(currentPage + 1);
        }
    }, [currentPage, totalPages, handlePageChange]);

    const previousPage = useCallback(() => {
        if (currentPage > 1) {
            handlePageChange(currentPage - 1);
        }
    }, [currentPage, handlePageChange]);

    const resetPage = useCallback(() => {
        handlePageChange(1);
    }, [handlePageChange]);

    return {
        // Data
        currentData,
        currentPage,
        totalPages,
        totalItems,
        paginationInfo,
        // Actions
        handlePageChange, // Main function với scroll preservation
        goToPage,
        nextPage,
        previousPage,
        resetPage,
        setCurrentPage, // Direct set (không có scroll preservation)
    };
}
