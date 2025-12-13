'use client';

import { useRef, useEffect, useState, useMemo, useCallback, memo } from 'react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

function PaginationComponent({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    loading = false,
}: PaginationProps) {
    const scrollPositionRef = useRef<number | null>(null);
    const prevPageRef = useRef(currentPage);
    const isPageChangingRef = useRef(false);
    const [jumpPage, setJumpPage] = useState('');
    const [showJumpInput, setShowJumpInput] = useState(false);

    const startIndex = (currentPage - 1) * itemsPerPage;
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(startIndex + itemsPerPage, totalItems);

    // Tính toán các số trang cần hiển thị
    const pageNumbers = useMemo(() => {
        if (totalPages <= 7) {
            // Nếu <= 7 trang, hiển thị tất cả
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        const maxVisible = 7;

        // Luôn hiển thị trang đầu
        pages.push(1);

        if (currentPage <= 4) {
            // Gần đầu: 1, 2, 3, 4, 5, ..., totalPages
            for (let i = 2; i <= 5; i++) {
                pages.push(i);
            }
            pages.push('ellipsis-end');
            pages.push(totalPages);
        } else if (currentPage >= totalPages - 3) {
            // Gần cuối: 1, ..., totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
            pages.push('ellipsis-start');
            for (let i = totalPages - 4; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Ở giữa: 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
            pages.push('ellipsis-start');
            pages.push(currentPage - 1);
            pages.push(currentPage);
            pages.push(currentPage + 1);
            pages.push('ellipsis-end');
            pages.push(totalPages);
        }

        return pages;
    }, [currentPage, totalPages]);

    // Restore scroll position sau khi page thay đổi
    useEffect(() => {
        if (isPageChangingRef.current && scrollPositionRef.current !== null) {
            // Đợi để đảm bảo DOM đã update và data đã load
            const timer = setTimeout(() => {
                window.scrollTo({
                    top: scrollPositionRef.current!,
                    behavior: 'instant' as ScrollBehavior
                });
                scrollPositionRef.current = null;
                isPageChangingRef.current = false;
            }, 100);
            
            prevPageRef.current = currentPage;
            
            return () => clearTimeout(timer);
        } else {
            prevPageRef.current = currentPage;
        }
    }, [currentPage]);

    const handlePageClick = useCallback((newPage: number) => {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
        
        // Lưu vị trí scroll hiện tại trước khi chuyển trang
        scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
        isPageChangingRef.current = true;
        
        // Gọi callback để chuyển trang
        onPageChange(newPage);
    }, [currentPage, totalPages, onPageChange]);

    const handleFirst = useCallback(() => {
        handlePageClick(1);
    }, [handlePageClick]);

    const handlePrevious = useCallback(() => {
        handlePageClick(currentPage - 1);
    }, [currentPage, handlePageClick]);

    const handleNext = useCallback(() => {
        handlePageClick(currentPage + 1);
    }, [currentPage, handlePageClick]);

    const handleLast = useCallback(() => {
        handlePageClick(totalPages);
    }, [totalPages, handlePageClick]);

    const handleJumpSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const page = parseInt(jumpPage, 10);
        if (page >= 1 && page <= totalPages) {
            handlePageClick(page);
            setJumpPage('');
            setShowJumpInput(false);
        }
    }, [jumpPage, totalPages, handlePageClick]);

    const handleJumpInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || (/^\d+$/.test(value) && parseInt(value, 10) >= 1 && parseInt(value, 10) <= totalPages)) {
            setJumpPage(value);
        }
    }, [totalPages]);

    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-between px-6 py-4 border-t border-blue-gray-100 bg-white">
                <div className="text-sm text-blue-gray-600">
                    Hiển thị {displayStart} - {displayEnd}/{totalItems} bản ghi
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-blue-gray-100 bg-white">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                    <div className="flex items-center gap-2 text-[#0099FF]">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm font-medium">Đang tải...</span>
                    </div>
                </div>
            )}

            <div className="text-sm text-blue-gray-600 transition-opacity duration-200" style={{ opacity: loading ? 0.5 : 1 }}>
                Hiển thị {displayStart} - {displayEnd}/{totalItems} bản ghi
            </div>
            
            <div className={`flex items-center gap-1 sm:gap-2 flex-wrap justify-center transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Nút Đầu */}
                <button
                    onClick={handleFirst}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-blue-gray-800 hover:text-blue-gray-900 hover:shadow-md active:scale-95"
                    title="Trang đầu"
                >
                    <span className="hidden sm:inline">Đầu</span>
                    <span className="sm:hidden">«</span>
                </button>

                {/* Nút Trước */}
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-blue-gray-800 hover:text-blue-gray-900 hover:shadow-md active:scale-95"
                >
                    <span className="hidden sm:inline">Trước</span>
                    <span className="sm:hidden">‹</span>
                </button>

                {/* Số trang */}
                <div className="flex items-center gap-1">
                    {pageNumbers.map((page, index) => {
                        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                            return (
                                <span key={`ellipsis-${index}`} className="px-2 text-blue-gray-400">
                                    ...
                                </span>
                            );
                        }
                        
                        const pageNum = page as number;
                        const isActive = pageNum === currentPage;
                        
                        return (
                            <button
                                key={pageNum}
                                onClick={() => !loading && handlePageClick(pageNum)}
                                disabled={loading}
                                className={`px-3 py-2 text-sm border rounded-lg transition-all duration-200 min-w-[36px] ${
                                    isActive
                                        ? 'bg-gradient-to-r from-[#0099FF] to-[#0088EE] text-white border-[#0099FF] font-semibold shadow-md scale-105'
                                        : 'border-blue-gray-200 text-blue-gray-800 hover:bg-blue-gray-50 hover:text-blue-gray-900 hover:shadow-md active:scale-95'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Nút Sau */}
                <button
                    onClick={handleNext}
                    disabled={currentPage >= totalPages || loading}
                    className="px-3 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-blue-gray-800 hover:text-blue-gray-900 hover:shadow-md active:scale-95"
                >
                    <span className="hidden sm:inline">Sau</span>
                    <span className="sm:hidden">›</span>
                </button>

                {/* Nút Cuối */}
                <button
                    onClick={handleLast}
                    disabled={currentPage >= totalPages || loading}
                    className="px-3 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-blue-gray-800 hover:text-blue-gray-900 hover:shadow-md active:scale-95"
                    title="Trang cuối"
                >
                    <span className="hidden sm:inline">Cuối</span>
                    <span className="sm:hidden">»</span>
                </button>

                {/* Nhảy trang */}
                <div className="relative">
                    {showJumpInput ? (
                        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
                            <input
                                type="text"
                                value={jumpPage}
                                onChange={handleJumpInputChange}
                                onBlur={() => {
                                    if (!jumpPage) {
                                        setShowJumpInput(false);
                                    }
                                }}
                                placeholder={`1-${totalPages}`}
                                className="w-16 px-2 py-2 text-sm border border-blue-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-center text-blue-gray-800"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="px-2 py-2 text-sm bg-[#0099FF] text-white rounded-lg hover:bg-[#0088EE] transition-colors"
                                title="Đi đến"
                            >
                                ✓
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowJumpInput(false);
                                    setJumpPage('');
                                }}
                                className="px-2 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 transition-colors text-blue-gray-800"
                                title="Hủy"
                            >
                                ✕
                            </button>
                        </form>
                    ) : (
                        <button
                            onClick={() => setShowJumpInput(true)}
                            className="px-3 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 transition-colors text-blue-gray-800 hover:text-blue-gray-900"
                            title="Nhảy đến trang"
                        >
                            <span className="hidden sm:inline">Đến</span>
                            <span className="sm:hidden">→</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const Pagination = memo(PaginationComponent);
export default Pagination;
