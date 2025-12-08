'use client';

import { useState, useEffect } from 'react';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { ensureVnFont } from '@/lib/pdf';
import { getProducts } from '@/services/product.service';
import { getOrders } from '@/services/order.service';
import { aiInventoryForecast } from '@/services/ai.service';
import { getAllStock } from '@/services/stock.service';
import type { Product } from '@/types/product';
import type { Order } from '@/types/order';

import { formatPrice } from '@/lib/utils';

// Format AI suggestion text with better layout
const formatAISuggestion = (text: string) => {
    if (!text) return null;

    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    
    return (
        <div className="space-y-5">
            {paragraphs.map((para, idx) => {
                const trimmed = para.trim();
                const lines = trimmed.split('\n').filter(l => l.trim());
                
                // Check for important notes section (contains "LƯU Ý", "QUAN TRỌNG", etc.)
                if (/LƯU Ý|QUAN TRỌNG|CẢNH BÁO|CHÚ Ý/i.test(trimmed)) {
                    const noteLines = lines.map(l => l.trim()).filter(l => l);
                    return (
                        <div key={idx} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-amber-600">
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    {noteLines.map((line, lineIdx) => {
                                        if (lineIdx === 0 && /LƯU Ý|QUAN TRỌNG|CẢNH BÁO|CHÚ Ý/i.test(line)) {
                                            return (
                                                <h6 key={lineIdx} className="text-sm font-bold text-amber-900 mb-2">
                                                    {line}
                                                </h6>
                                            );
                                        }
                                        return (
                                            <p key={lineIdx} className="text-sm text-amber-800 leading-relaxed">
                                                {line}
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                }
                
                // Check for headers (all caps, possibly with special chars, single line)
                if (lines.length === 1 && /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ\s\-\:]+$/.test(trimmed) && trimmed.length < 100) {
                    return (
                        <div key={idx} className="pt-1 first:pt-0">
                            <h5 className="text-base font-bold text-[#0099FF] mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-5 bg-gradient-to-b from-[#0099FF] to-[#0088EE] rounded-full"></span>
                                {trimmed}
                            </h5>
                        </div>
                    );
                }
                
                // Check for bullet points or numbered lists
                const firstLine = lines[0] || '';
                if (/^[\-\•\*]\s/.test(firstLine) || /^\d+[\.\)]\s/.test(firstLine)) {
                    const listItems = lines.filter(l => /^[\-\•\*]\s|^\d+[\.\)]\s/.test(l.trim()));
                    if (listItems.length > 0) {
                        return (
                            <div key={idx} className="space-y-1">
                                {listItems.map((item, itemIdx) => {
                                    const cleanItem = item.replace(/^[\-\•\*]\s|^\d+[\.\)]\s/, '').trim();
                                    return (
                                        <div key={itemIdx} className="flex items-start gap-3 pl-1">
                                            <span className="text-[#0099FF] mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-[#0099FF]"></span>
                                            <span className="text-sm leading-relaxed text-blue-gray-700 flex-1">{cleanItem}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }
                }
                
                // Regular paragraph with better formatting
                return (
                    <div key={idx} className="space-y-2">
                        {lines.map((line, lineIdx) => {
                            // Check if line is a sub-header (starts with capital and ends with colon)
                            if (/^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ].*:$/.test(line.trim()) && line.length < 80) {
                                return (
                                    <h6 key={lineIdx} className="text-sm font-semibold text-blue-gray-800 mt-3 first:mt-0">
                                        {line}
                                    </h6>
                                );
                            }
                            return (
                                <p key={lineIdx} className="text-sm leading-relaxed text-blue-gray-700">
                                    {line}
                                </p>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

type ProductWithStock = Product & { quantity: number };

export default function InventoryReportPage() {
    const [data, setData] = useState<ProductWithStock[]>([]);
    const [filteredData, setFilteredData] = useState<ProductWithStock[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [aiExpanded, setAiExpanded] = useState(true);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterMinQuantity, setFilterMinQuantity] = useState('');
    const [filterMaxQuantity, setFilterMaxQuantity] = useState('');
    const [filterStockStatus, setFilterStockStatus] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');

    // Sort states
    const [sortName, setSortName] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortQuantity, setSortQuantity] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortValue, setSortValue] = useState<'none' | 'asc' | 'desc'>('none');

    // Pagination states
    const itemsPerPage = PAGE_SIZE;

    // handlePageChange đã được cung cấp bởi usePagination hook với scroll preservation

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Lấy sản phẩm và tồn kho
            const [products, stockList] = await Promise.all([
                getProducts(),
                getAllStock().catch(() => []) // Nếu lỗi thì trả về mảng rỗng
            ]);

            // Tổng hợp tồn kho theo productId (từ tất cả các kho)
            const stockMap = new Map<number, number>();
            stockList.forEach((stock) => {
                const current = stockMap.get(stock.productId) || 0;
                stockMap.set(stock.productId, current + stock.quantity);
            });

            // Cập nhật quantity cho từng sản phẩm từ tồn kho thực tế
            const productsWithStock: ProductWithStock[] = products.map(product => ({
                ...product,
                quantity: stockMap.get(product.id) || 0
            }));

            setData(productsWithStock);

            // Apply filters
            let filtered = productsWithStock;

            // Filter by code
            if (filterCode) {
                filtered = filtered.filter(item =>
                    item.code.toLowerCase().includes(filterCode.toLowerCase())
                );
            }

            // Filter by name
            if (filterName) {
                filtered = filtered.filter(item =>
                    item.name.toLowerCase().includes(filterName.toLowerCase())
                );
            }

            // Filter by quantity range
            if (filterMinQuantity) {
                const min = Number(filterMinQuantity);
                filtered = filtered.filter(item => (item.quantity || 0) >= min);
            }
            if (filterMaxQuantity) {
                const max = Number(filterMaxQuantity);
                filtered = filtered.filter(item => (item.quantity || 0) <= max);
            }

            // Filter by stock status
            if (filterStockStatus !== 'ALL') {
                filtered = filtered.filter(item => {
                    const qty = item.quantity || 0;
                    if (filterStockStatus === 'OUT_OF_STOCK') return qty === 0;
                    if (filterStockStatus === 'LOW_STOCK') return qty > 0 && qty <= 10;
                    if (filterStockStatus === 'IN_STOCK') return qty > 10;
                    return true;
                });
            }

            // Apply sorting
            filtered = applySorting(filtered);

            setFilteredData(filtered);
            resetPage(); // Reset về trang 1 thông qua hook
        } catch (err) {
            console.error('❌ Error loading products:', err);
            setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const applySorting = (data: ProductWithStock[]) => {
        const sorted = [...data];

        // Sort by name
        if (sortName !== 'none') {
            sorted.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                if (sortName === 'asc') {
                    return nameA.localeCompare(nameB, 'vi');
                } else {
                    return nameB.localeCompare(nameA, 'vi');
                }
            });
        }

        // Sort by quantity
        if (sortQuantity !== 'none') {
            sorted.sort((a, b) => {
                const qtyA = a.quantity || 0;
                const qtyB = b.quantity || 0;
                return sortQuantity === 'asc' ? qtyA - qtyB : qtyB - qtyA;
            });
        }

        // Sort by value (quantity * unitPrice)
        if (sortValue !== 'none') {
            sorted.sort((a, b) => {
                const valueA = (a.quantity || 0) * (a.unitPrice || 0);
                const valueB = (b.quantity || 0) * (b.unitPrice || 0);
                return sortValue === 'asc' ? valueA - valueB : valueB - valueA;
            });
        }

        return sorted;
    };

    const handleSortName = () => {
        const newSort = sortName === 'none' ? 'asc' : sortName === 'asc' ? 'desc' : 'none';
        setSortName(newSort);
        setSortQuantity('none');
        setSortValue('none');
    };

    const handleSortQuantity = () => {
        const newSort = sortQuantity === 'none' ? 'asc' : sortQuantity === 'asc' ? 'desc' : 'none';
        setSortQuantity(newSort);
        setSortName('none');
        setSortValue('none');
    };

    const handleSortValue = () => {
        const newSort = sortValue === 'none' ? 'asc' : sortValue === 'asc' ? 'desc' : 'none';
        setSortValue(newSort);
        setSortName('none');
        setSortQuantity('none');
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-apply sorting when sort options change
    useEffect(() => {
        const sorted = applySorting(filteredData);
        setFilteredData(sorted);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortName, sortQuantity, sortValue]);

    const handleSearch = () => {
        loadData();
    };

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        setFilterMinQuantity('');
        setFilterMaxQuantity('');
        setFilterStockStatus('ALL');
        setSortName('none');
        setSortQuantity('none');
        setSortValue('none');
    };

    const getStockStatusLabel = (quantity: number) => {
        if (quantity === 0) return 'Hết hàng';
        if (quantity <= 10) return 'Sắp hết';
        return 'Còn hàng';
    };

    const buildExportRows = () =>
        filteredData.map((item, index) => {
            const quantity = item.quantity || 0;
            const unitPrice = item.unitPrice || 0;
            const value = quantity * unitPrice;
            return {
                STT: index + 1,
                'Mã hàng': item.code,
                'Tên hàng hóa': item.name,
                'Số lượng': quantity,
                'Đơn giá': unitPrice,
                'Giá trị tồn': value,
                'Tình trạng': getStockStatusLabel(quantity),
            };
        });

    const handleExportExcel = async () => {
        try {
            if (!filteredData.length) {
                alert('Không có dữ liệu để xuất.');
                return;
            }
            const XLSX = await import('xlsx');
            const rows = buildExportRows();
            const worksheet = XLSX.utils.json_to_sheet(rows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_ton_kho');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-ton-kho-${date}.xlsx`);
        } catch (err) {
            console.error('Export Excel failed', err);
            alert('Xuất Excel thất bại, vui lòng thử lại.');
        }
    };

    const handleExportPDF = async () => {
        try {
            if (!filteredData.length) {
                alert('Không có dữ liệu để xuất.');
                return;
            }
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape' });

            await ensureVnFont(doc);

            doc.setFontSize(16);
            doc.text('Báo cáo tồn kho', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng mặt hàng: ${totalProducts}`, 14, 32);
            doc.text(`Tổng giá trị: ${formatPrice(totalValue)} đ`, 80, 32);

            const rows = buildExportRows().map(row => [
                row.STT,
                row['Mã hàng'],
                row['Tên hàng hóa'],
                formatPrice(row['Số lượng']),
                formatPrice(row['Đơn giá']),
                formatPrice(row['Giá trị tồn']),
                row['Tình trạng'],
            ]);

            autoTable(doc, {
                head: [['STT', 'Mã hàng', 'Tên hàng hóa', 'Số lượng', 'Đơn giá', 'Giá trị tồn', 'Tình trạng']],
                body: rows,
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 70, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-ton-kho-${date}.pdf`);
        } catch (err) {
            console.error('Export PDF failed', err);
            alert('Xuất PDF thất bại, vui lòng thử lại.');
        }
    };

    // Calculate statistics
    const totalProducts = filteredData.length;
    const totalQuantity = filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = filteredData.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const outOfStockCount = filteredData.filter(item => (item.quantity || 0) === 0).length;
    const lowStockCount = filteredData.filter(item => {
        const qty = item.quantity || 0;
        return qty > 0 && qty <= 10;
    }).length;

    // Pagination - sử dụng hook để tối ưu
    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        handlePageChange,
        resetPage,
    } = usePagination(filteredData, itemsPerPage);
    const { startIndex } = paginationInfo;


    const getStockStatusBadge = (quantity: number) => {
        if (quantity === 0) {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Hết hàng</span>;
        } else if (quantity <= 10) {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Sắp hết</span>;
        } else {
            return <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Còn hàng</span>;
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Báo cáo tồn kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Thống kê và báo cáo tình trạng tồn kho hiện tại</p>
            </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 max-w-full overflow-hidden">
                    <div className="p-6 max-w-full">
                        {/* Filter Section */}
                        <div className="mb-6">
                            <h3 className="text-lg font-bold mb-4 text-blue-gray-800">Bộ lọc</h3>

                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Mã hàng</label>
                                    <input
                                        type="text"
                                        value={filterCode}
                                        onChange={(e) => setFilterCode(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập mã hàng"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Tên hàng hóa</label>
                                    <input
                                        type="text"
                                        value={filterName}
                                        onChange={(e) => setFilterName(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập tên hàng"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">SL tối thiểu</label>
                                    <input
                                        type="number"
                                        value={filterMinQuantity}
                                        onChange={(e) => setFilterMinQuantity(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="0"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">SL tối đa</label>
                                    <input
                                        type="number"
                                        value={filterMaxQuantity}
                                        onChange={(e) => setFilterMaxQuantity(e.target.value)}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="999999"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">Tình trạng</label>
                                    <select
                                        value={filterStockStatus}
                                        onChange={(e) =>
                                            setFilterStockStatus(
                                                e.target.value as 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
                                            )
                                        }
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                    >
                                        <option value="ALL" className="bg-white">Tất cả</option>
                                        <option value="IN_STOCK" className="bg-white">Còn hàng</option>
                                        <option value="LOW_STOCK" className="bg-white">Sắp hết</option>
                                        <option value="OUT_OF_STOCK" className="bg-white">Hết hàng</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 rounded-lg border border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-colors"
                                >
                                    Đặt lại
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSearch}
                                        className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60"
                                        disabled={loading}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                                            <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <p className="mt-3 text-sm text-red-400">{error}</p>
                            )}
                        </div>

                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 max-w-full">
                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Tổng mặt hàng</p>
                                        <p className="text-2xl font-bold text-blue-gray-800 mt-1 break-words">{totalProducts}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#0099FF" strokeWidth="2" />
                                            <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="#0099FF" strokeWidth="2" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Tổng số lượng</p>
                                        <p className="text-2xl font-bold text-[#0099FF] mt-1 break-words">{formatPrice(totalQuantity)}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Tổng giá trị</p>
                                        <p className="text-xl font-bold text-[#0099FF] mt-1 break-words leading-tight">{formatPrice(totalValue)}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Sắp hết hàng</p>
                                        <p className="text-2xl font-bold text-yellow-600 mt-1 break-words">{lowStockCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Hết hàng</p>
                                        <p className="text-2xl font-bold text-red-500 mt-1 break-words">{outOfStockCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Export Buttons - Fixed position, not affected by AI */}
                        <div className="flex justify-end gap-3 mb-6">
                            <button
                                onClick={handleExportExcel}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2 shadow-sm font-medium"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Xuất Excel
                            </button>
                            <button
                                onClick={handleExportPDF}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2 shadow-sm font-medium"
                            >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Xuất PDF
                            </button>
                        </div>

                        {/* AI Forecast Section - Separate section */}
                        <div className="mb-6 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <h3 className="text-base font-semibold text-blue-gray-800">
                                                AI dự báo tồn kho
                                            </h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAiExpanded(!aiExpanded)}
                                            className="text-blue-gray-600 hover:text-blue-gray-800 transition-colors p-1 rounded hover:bg-white/50"
                                            title={aiExpanded ? 'Thu gọn' : 'Mở rộng'}
                                        >
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className={`transition-transform ${aiExpanded ? '' : 'rotate-180'}`}
                                            >
                                                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </button>
                                    </div>
                                    {aiExpanded && (
                                        <>
                                            <p className="text-xs text-blue-gray-600 mb-3">
                                                Gửi danh sách hàng hiện tại cho AI để gợi ý SKU sắp thiếu / dư hàng.
                                            </p>
                                            <button
                                        type="button"
                                        onClick={async () => {
                                            if (!filteredData.length) {
                                                alert('Không có dữ liệu tồn kho để phân tích.');
                                                return;
                                            }
                                            setAiLoading(true);
                                            setAiSuggestion(null);
                                            try {
                                                // Lấy dữ liệu orders để tính avgDailySales
                                                let orders: Order[] = [];
                                                try {
                                                    orders = await getOrders();
                                                } catch (err) {
                                                    console.warn('Không thể lấy dữ liệu orders:', err);
                                                }

                                                // Tính toán avgDailySales cho mỗi sản phẩm
                                                const now = new Date();
                                                const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

                                                // Đếm số lượng bán trong 7 ngày qua theo product code
                                                const salesByProduct = new Map<string, number>();
                                                orders.forEach(order => {
                                                    const orderDate = new Date(order.createdAt || order.orderDate || '');
                                                    if (orderDate >= sevenDaysAgo) {
                                                        order.items?.forEach(item => {
                                                            const productCode = item.productCode || item.product?.code;
                                                            if (productCode) {
                                                                const current = salesByProduct.get(productCode) || 0;
                                                                salesByProduct.set(productCode, current + (item.quantity || 0));
                                                            }
                                                        });
                                                    }
                                                });

                                                // Tính avgDailySales = tổng bán trong 7 ngày / 7
                                                const items = filteredData.slice(0, 50).map(p => {
                                                    const totalSales7Days = salesByProduct.get(p.code) || 0;
                                                    const avgDailySales = totalSales7Days > 0 ? totalSales7Days / 7 : undefined;
                                                    return {
                                                        code: p.code,
                                                        name: p.name,
                                                        quantity: p.quantity || 0,
                                                        avgDailySales,
                                                    };
                                                });

                                                const data = await aiInventoryForecast(items);
                                                setAiSuggestion(data.recommendation);
                                            } catch (err) {
                                                console.error('AI inventory forecast client error:', err);
                                                alert(
                                                    err instanceof Error
                                                        ? err.message
                                                        : 'Có lỗi khi gọi AI.',
                                                );
                                            } finally {
                                                setAiLoading(false);
                                            }
                                        }}
                                        disabled={aiLoading}
                                        className="px-4 py-2 rounded-md bg-[#0099FF] text-white text-sm font-medium hover:bg-[#0088EE] disabled:opacity-60 transition-colors shadow-sm"
                                    >
                                        {aiLoading ? (
                                            <span className="flex items-center gap-2">
                                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Đang phân tích...
                                            </span>
                                        ) : (
                                            'Xin gợi ý từ AI'
                                        )}
                                    </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            {aiExpanded && aiSuggestion && (
                                <div className="mt-4 bg-white border border-blue-200 rounded-lg shadow-sm overflow-hidden">
                                    <div className="flex items-start gap-4 p-5">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#0099FF] to-[#0088EE] rounded-lg flex items-center justify-center shadow-sm">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="text-base font-bold text-blue-gray-900">Gợi ý từ AI</h4>
                                                <button
                                                    type="button"
                                                    onClick={() => setAiSuggestion(null)}
                                                    className="flex-shrink-0 text-blue-gray-400 hover:text-blue-gray-600 transition-colors p-1 rounded hover:bg-blue-gray-100"
                                                    title="Đóng"
                                                >
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <div className="prose prose-sm max-w-none text-blue-gray-700 leading-relaxed max-h-96 overflow-y-auto pr-2">
                                                {formatAISuggestion(aiSuggestion)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="rounded-xl border border-blue-gray-100 overflow-hidden">
                            <div className="overflow-x-auto max-w-full">
                                <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-[#0099FF] text-white h-[48px]">
                                        <th className="px-4 text-center font-bold text-sm w-[80px]">STT</th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Mã hàng</th>
                                        <th className="px-4 text-center font-bold text-sm w-[250px]">
                                            <button
                                                onClick={handleSortName}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Tên hàng hóa
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortName === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortName === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[120px]">
                                            <button
                                                onClick={handleSortQuantity}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Số lượng
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortQuantity === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortQuantity === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Đơn giá</th>
                                        <th className="px-4 text-center font-bold text-sm w-[180px]">
                                            <button
                                                onClick={handleSortValue}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Giá trị tồn
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                    <path d="M8 3L11 7H5L8 3Z" opacity={sortValue === 'asc' ? 1 : 0.4} />
                                                    <path d="M8 13L5 9H11L8 13Z" opacity={sortValue === 'desc' ? 1 : 0.4} />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm w-[150px]">Tình trạng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-blue-gray-500">
                                                {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu'}
                                            </td>
                                        </tr>
                                    ) : (
                                        currentData.map((record, index) => {
                                            const quantity = record.quantity || 0;
                                            const unitPrice = record.unitPrice || 0;
                                            const totalValue = quantity * unitPrice;

                                            return (
                                                <tr
                                                    key={record.id}
                                                    className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[48px]"
                                                >
                                                    <td className="px-4 text-center text-sm">
                                                        {startIndex + index + 1}
                                                    </td>
                                                    <td className="px-4 text-center text-sm font-medium">
                                                        {record.code}
                                                    </td>
                                                    <td className="px-4 text-left text-sm">
                                                        {record.name}
                                                    </td>
                                                    <td className={`px-4 text-center text-sm font-medium ${quantity === 0 ? 'text-red-600' : quantity <= 10 ? 'text-yellow-600' : 'text-blue-gray-800'
                                                        }`}>
                                                        {formatPrice(quantity)}
                                                    </td>
                                                    <td className="px-4 text-right text-sm">
                                                        {formatPrice(unitPrice)}
                                                    </td>
                                                    <td className="px-4 text-right text-sm font-medium text-green-600">
                                                        {formatPrice(totalValue)}
                                                    </td>
                                                    <td className="px-4 text-center">
                                                        {getStockStatusBadge(quantity)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filteredData.length}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </div>
                </div>
        </>
    );
}
