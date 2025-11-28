import { useState, useMemo } from 'react';

export function usePagination<T>(data: T[], itemsPerPage: number = 10) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
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
        const maxPage = Math.max(1, Math.ceil(data.length / itemsPerPage));
        if (page >= 1 && page <= maxPage) {
            setCurrentPage(page);
        }
    };

    const nextPage = () => {
        const maxPage = Math.max(1, Math.ceil(data.length / itemsPerPage));
        if (currentPage < maxPage) {
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
