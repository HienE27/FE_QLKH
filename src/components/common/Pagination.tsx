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

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    return (
        <div className="flex items-center justify-between px-6 py-4 border-t border-blue-gray-100 bg-white">
            <div className="text-sm text-blue-gray-600">
                Hiển thị {displayStart} - {displayEnd}/{totalItems} bản ghi
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={handlePrevious}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-blue-gray-800 hover:text-blue-gray-900"
                >
                    Trước
                </button>
                <span className="px-4 py-2 text-sm text-blue-gray-800">
                    Trang {currentPage}/{totalPages || 1}
                </span>
                <button
                    onClick={handleNext}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 text-sm border border-blue-gray-200 rounded-lg hover:bg-blue-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-blue-gray-800 hover:text-blue-gray-900"
                >
                    Sau
                </button>
            </div>
        </div>
    );
}
