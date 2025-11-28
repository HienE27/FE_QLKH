interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
}: PaginationProps) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(startIndex + itemsPerPage, totalItems);
    const maxPage = Math.max(1, totalPages);

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < maxPage) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
                Hiển thị {displayStart} - {displayEnd}/{totalItems} bản ghi
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Trước
                </button>
                <span className="px-4 py-2 text-sm">
                    Trang {currentPage}/{maxPage}
                </span>
                <button
                    onClick={handleNext}
                    disabled={currentPage >= maxPage}
                    className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Sau
                </button>
            </div>
        </div>
    );
}
