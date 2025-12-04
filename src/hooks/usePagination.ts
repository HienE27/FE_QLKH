import { useState, useMemo } from 'react';
import { PAGE_SIZE } from '@/constants/pagination';

export function usePagination<T>(data: T[], itemsPerPage: number = PAGE_SIZE) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    const paginationInfo = useMemo(() => ({
        currentPage,
        totalPages,
        totalItems: data.length,
        itemsPerPage,
        startIndex,
        endIndex,
        displayStart: data.length === 0 ? 0 : startIndex + 1,
        displayEnd: Math.min(endIndex, data.length),
    }), [currentPage, data.length, itemsPerPage, startIndex, endIndex, totalPages]);

    const goToPage = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const nextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const previousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const resetPage = () => {
        setCurrentPage(1);
    };

    return {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        goToPage,
        nextPage,
        previousPage,
        resetPage,
        setCurrentPage,
    };
}
