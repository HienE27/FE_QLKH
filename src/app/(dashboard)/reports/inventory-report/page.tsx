'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { ensureVnFont } from '@/lib/pdf';
import { searchProducts, type ProductPage } from '@/services/product.service';
import { getOrders } from '@/services/order.service';
import { aiInventoryForecast, type InventoryForecastResponse, type SimilarSnapshot } from '@/services/ai.service';
import { getAllStock } from '@/services/stock.service';
import type { Product } from '@/types/product';
import type { Order } from '@/types/order';
import RichTextEditor from '@/components/common/RichTextEditor';

// Custom scrollbar styles
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

type ProductWithStock = Product & { quantity: number };

// Format AI recommendation for better readability
const formatAiRecommendation = (text: string): JSX.Element[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: JSX.Element[] = [];
    let currentSection: string[] = [];
    let sectionType: 'urgent' | 'warning' | 'info' | 'normal' = 'normal';
    let key = 0;

    const flushSection = () => {
        if (currentSection.length === 0) return;
        
        const content = currentSection.join(' ').trim();
        if (!content) return;

        let bgColor = 'bg-blue-50';
        let borderColor = 'border-blue-300';
        let textColor = 'text-blue-900';
        let icon = '💡';

        if (sectionType === 'urgent') {
            bgColor = 'bg-red-50';
            borderColor = 'border-red-400';
            textColor = 'text-red-900';
            icon = '🚨';
        } else if (sectionType === 'warning') {
            bgColor = 'bg-yellow-50';
            borderColor = 'border-yellow-400';
            textColor = 'text-yellow-900';
            icon = '⚠️';
        } else if (sectionType === 'info') {
            bgColor = 'bg-green-50';
            borderColor = 'border-green-400';
            textColor = 'text-green-900';
            icon = '✅';
        }

        // Highlight SKU codes and numbers
        const highlightText = (str: string) => {
            const parts: (string | JSX.Element)[] = [];
            const regex = /(SKU\s+[A-Z0-9]+|Mã\s+[A-Z0-9]+|HH\d+|SP\d+|\d+\.?\d*\s*(ngày|sản phẩm|đơn vị))/gi;
            let lastIndex = 0;
            let match;

            while ((match = regex.exec(str)) !== null) {
                if (match.index > lastIndex) {
                    parts.push(str.substring(lastIndex, match.index));
                }
                parts.push(
                    <span key={match.index} className="font-bold text-gray-900 bg-yellow-100 px-1 rounded">
                        {match[0]}
                    </span>
                );
                lastIndex = match.index + match[0].length;
            }
            if (lastIndex < str.length) {
                parts.push(str.substring(lastIndex));
            }
            return parts.length > 0 ? parts : [str];
        };

        elements.push(
            <div
                key={key++}
                className={`${bgColor} ${borderColor} border-l-4 rounded-r-lg p-4 shadow-sm`}
            >
                <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{icon}</span>
                    <div className="flex-1">
                        <div className={`${textColor} text-sm leading-relaxed`}>
                            {highlightText(content)}
                        </div>
                    </div>
                </div>
            </div>
        );
        currentSection = [];
        sectionType = 'normal';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const upperLine = line.toUpperCase();

        // Detect section type
        if (upperLine.includes('CẦN NHẬP HÀNG GẤP') || upperLine.includes('URGENT') || 
            upperLine.includes('KHẨN CẤP') || upperLine.includes('HẾT HÀNG NGAY')) {
            flushSection();
            sectionType = 'urgent';
            currentSection.push(line);
        } else if (upperLine.includes('CẢNH BÁO') || upperLine.includes('WARNING') || 
                   upperLine.includes('SẮP HẾT') || upperLine.includes('THIẾU')) {
            flushSection();
            sectionType = 'warning';
            currentSection.push(line);
        } else if (upperLine.includes('ĐỀ XUẤT') || upperLine.includes('KHUYẾN NGHỊ') || 
                   upperLine.includes('GỢI Ý') || upperLine.includes('NÊN')) {
            flushSection();
            sectionType = 'info';
            currentSection.push(line);
        } else if (line.match(/^[-•]\s*/)) {
            // Bullet point
            flushSection();
            const bulletContent = line.replace(/^[-•]\s*/, '');
            elements.push(
                <div key={key++} className="flex items-start gap-3 pl-2 py-1">
                    <span className="text-blue-600 font-bold text-lg mt-0.5 flex-shrink-0">•</span>
                    <div className="flex-1 text-sm text-gray-700 leading-relaxed">
                        {bulletContent.split(/(SKU\s+[A-Z0-9]+|HH\d+|SP\d+|\d+)/gi).map((part, idx) => {
                            if (/^(SKU\s+[A-Z0-9]+|HH\d+|SP\d+|\d+)$/i.test(part.trim())) {
                                return <span key={idx} className="font-bold text-blue-700 bg-blue-50 px-1 rounded">{part}</span>;
                            }
                            return <span key={idx}>{part}</span>;
                        })}
                    </div>
                </div>
            );
        } else if (line.match(/^\d+\./)) {
            // Numbered list
            flushSection();
            const match = line.match(/^(\d+)\.\s*(.+)/);
            if (match) {
                elements.push(
                    <div key={key++} className="flex items-start gap-3 pl-2 py-1">
                        <span className="text-indigo-600 font-bold text-sm mt-0.5 flex-shrink-0 w-6">
                            {match[1]}.
                        </span>
                        <div className="flex-1 text-sm text-gray-700 leading-relaxed">
                            {match[2]}
                        </div>
                    </div>
                );
            }
        } else if (line.length > 0) {
            currentSection.push(line);
        } else {
            flushSection();
        }
    }

    flushSection();

    // If no special formatting was applied, return simple formatted text
    if (elements.length === 0) {
        return [
            <div key={0} className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {text}
            </div>
        ];
    }

    return elements;
};

export default function InventoryReportPage() {
    const [productPage, setProductPage] = useState<ProductPage | null>(null);
    const [stockMap, setStockMap] = useState<Map<number, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [editedAiSuggestion, setEditedAiSuggestion] = useState<string>('');
    const [similarSnapshots, setSimilarSnapshots] = useState<SimilarSnapshot[]>([]);
    const [showAiDetails, setShowAiDetails] = useState(false);
    const [isEditingAi, setIsEditingAi] = useState(false);

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

    // Pagination states (server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = PAGE_SIZE;

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Lấy sản phẩm từ backend với pagination (code/name search)
            // Note: Backend không hỗ trợ filter quantity/status, nên sẽ filter ở frontend
            const [pageResult, stockList] = await Promise.all([
                searchProducts({
                    code: filterCode.trim() || undefined,
                    name: filterName.trim() || undefined,
                    page: currentPage - 1, // Backend dùng 0-based
                    size: itemsPerPage,
                }),
                getAllStock().catch(() => []) // Nếu lỗi thì trả về mảng rỗng
            ]);

            setProductPage(pageResult);

            // Tổng hợp tồn kho theo productId (từ tất cả các kho)
            const newStockMap = new Map<number, number>();
            stockList.forEach((stock) => {
                const current = newStockMap.get(stock.productId) || 0;
                newStockMap.set(stock.productId, current + stock.quantity);
            });
            setStockMap(newStockMap);
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

    // Reload từ BE khi pagination thay đổi
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Reset về page 1 và reload khi filter code/name thay đổi
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            loadData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterCode, filterName]);

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
            doc.text(`Tổng giá trị: ${formatCurrency(totalValue)} đ`, 80, 32);

            const rows = buildExportRows().map(row => [
                row.STT,
                row['Mã hàng'],
                row['Tên hàng hóa'],
                formatCurrency(row['Số lượng']),
                formatCurrency(row['Đơn giá']),
                formatCurrency(row['Giá trị tồn']),
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

    // Tính filteredData từ productPage và stockMap
    const allProductsWithStock: ProductWithStock[] = (productPage?.content || []).map(product => ({
        ...product,
        quantity: stockMap.get(product.id) || 0
    }));

    // Apply filters (quantity/status) ở FE
    let filtered = allProductsWithStock;
    if (filterMinQuantity) {
        const min = Number(filterMinQuantity);
        filtered = filtered.filter(item => (item.quantity || 0) >= min);
    }
    if (filterMaxQuantity) {
        const max = Number(filterMaxQuantity);
        filtered = filtered.filter(item => (item.quantity || 0) <= max);
    }
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
    const filteredData = applySorting(filtered);

    // Calculate statistics
    const totalProducts = productPage?.totalElements || 0;
    const totalQuantity = filteredData.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = filteredData.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    const outOfStockCount = filteredData.filter(item => (item.quantity || 0) === 0).length;
    const lowStockCount = filteredData.filter(item => {
        const qty = item.quantity || 0;
        return qty > 0 && qty <= 10;
    }).length;

    // Pagination từ BE
    const totalPages = productPage?.totalPages || 1;
    const currentData = filteredData; // Đã filter quantity/status


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
        <div className="min-h-screen">
            <style jsx global>{customScrollbarStyles}</style>
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Báo cáo tồn kho</h1>
                    <p className="text-gray-600 mt-1">Thống kê và báo cáo tình trạng tồn kho hiện tại</p>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4">Bộ lọc</h3>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã hàng</label>
                            <input
                                type="text"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập mã hàng"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tên hàng hóa</label>
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập tên hàng"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">SL tối thiểu</label>
                            <input
                                type="number"
                                value={filterMinQuantity}
                                onChange={(e) => setFilterMinQuantity(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                                min="0"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">SL tối đa</label>
                            <input
                                type="number"
                                value={filterMaxQuantity}
                                onChange={(e) => setFilterMaxQuantity(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="999999"
                                min="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng</label>
                            <select
                                value={filterStockStatus}
                                onChange={(e) =>
                                    setFilterStockStatus(
                                        e.target.value as 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK',
                                    )
                                }
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Tất cả</option>
                                <option value="IN_STOCK">Còn hàng</option>
                                <option value="LOW_STOCK">Sắp hết</option>
                                <option value="OUT_OF_STOCK">Hết hàng</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <button
                            onClick={handleReset}
                            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md transition-colors"
                        >
                            Đặt lại
                        </button>

                        <div className="flex gap-3">
                            <button
                                onClick={handleSearch}
                                className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
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
                        <p className="mt-3 text-sm text-red-600">{error}</p>
                    )}
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-5 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng mặt hàng</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{totalProducts}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#3B82F6" strokeWidth="2" />
                                    <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="#3B82F6" strokeWidth="2" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng số lượng</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalQuantity)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng giá trị</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalValue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Sắp hết hàng</p>
                                <p className="text-2xl font-bold text-yellow-600 mt-1">{lowStockCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Hết hàng</p>
                                <p className="text-2xl font-bold text-red-600 mt-1">{outOfStockCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Export Buttons - Fixed Position */}
                <div className="flex justify-end gap-3 mb-4">
                    <button
                        onClick={handleExportExcel}
                        className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg font-medium"
                    >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Xuất Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-md hover:shadow-lg font-medium"
                    >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Xuất PDF
                    </button>
                </div>

                {/* AI Forecast Section - Independent */}
                <div className="mb-6">
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200 shadow-lg">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800">AI dự báo tồn kho thông minh</h3>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                            Phân tích tồn kho hiện tại và tham khảo các kỳ tương tự từ lịch sử (Milvus)
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!filteredData.length) {
                                        alert('Không có dữ liệu tồn kho để phân tích.');
                                        return;
                                    }
                                    setAiLoading(true);
                                    setAiSuggestion(null);
                                    setSimilarSnapshots([]);
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

                                        const data: InventoryForecastResponse = await aiInventoryForecast(items);
                                        setAiSuggestion(data.recommendation);
                                        setEditedAiSuggestion(data.recommendation);
                                        setSimilarSnapshots(data.similarSnapshots || []);
                                        setShowAiDetails(true);
                                        setIsEditingAi(false);
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
                                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                            >
                                {aiLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Đang phân tích...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>Xin gợi ý từ AI</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Similar Snapshots từ Milvus */}
                        {similarSnapshots.length > 0 && (
                            <div className="mb-4 bg-white/70 backdrop-blur-sm rounded-lg p-5 border-2 border-purple-200 shadow-md">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-base font-bold text-gray-800 block">Các kỳ tồn kho tương tự từ lịch sử</span>
                                        <span className="text-xs text-gray-500">Dữ liệu từ Milvus Vector Database</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {similarSnapshots.map((snapshot, idx) => {
                                        const similarityPercent = Math.max(0, Math.min(100, 100 - (snapshot.similarityScore * 10)));
                                        return (
                                            <div key={idx} className="bg-white rounded-lg p-4 border-2 border-purple-200 shadow-sm hover:shadow-lg hover:border-purple-400 transition-all">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                                                            <span className="text-sm font-semibold text-gray-800 truncate">{snapshot.snapshotTime}</span>
                                                            <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-xs font-bold whitespace-nowrap shadow-sm">
                                                                {similarityPercent.toFixed(0)}% tương tự
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{snapshot.summary}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* AI Recommendation */}
                        {aiSuggestion && (
                            <div className="bg-white/90 backdrop-blur-sm rounded-lg border-2 border-blue-200 overflow-hidden shadow-md">
                                <div className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <span className="text-base font-bold text-gray-800 block">Khuyến nghị từ AI</span>
                                            <span className="text-xs text-gray-500">
                                                {isEditingAi ? 'Đang chỉnh sửa' : showAiDetails ? 'Nhấp để thu gọn' : 'Nhấp để mở rộng'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {showAiDetails && !isEditingAi && (
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingAi(true)}
                                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors flex items-center gap-1"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Chỉnh sửa
                                            </button>
                                        )}
                                        {isEditingAi && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsEditingAi(false);
                                                        setEditedAiSuggestion(aiSuggestion);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                                >
                                                    Hủy
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAiSuggestion(editedAiSuggestion);
                                                        setIsEditingAi(false);
                                                    }}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors flex items-center gap-1"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Lưu
                                                </button>
                                            </>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => setShowAiDetails(!showAiDetails)}
                                            className="p-2 rounded hover:bg-blue-100 transition-colors"
                                        >
                                            <svg
                                                className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${showAiDetails ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                                {showAiDetails && (
                                    <div className="p-6 bg-gradient-to-b from-gray-50/80 to-white">
                                        {isEditingAi ? (
                                            <RichTextEditor
                                                value={editedAiSuggestion}
                                                onChange={setEditedAiSuggestion}
                                                placeholder="Chỉnh sửa khuyến nghị từ AI..."
                                                height="h-96"
                                            />
                                        ) : (
                                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                                <div className="space-y-4">
                                                    {formatAiRecommendation(aiSuggestion)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-[#0046ff] text-white h-[48px]">
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
                                    <td colSpan={7} className="text-center py-8 text-gray-500">
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
                                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                        >
                                            <td className="px-4 text-center text-sm">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-4 text-center text-sm font-medium">
                                                {record.code}
                                            </td>
                                            <td className="px-4 text-left text-sm">
                                                {record.name}
                                            </td>
                                            <td className={`px-4 text-center text-sm font-medium ${quantity === 0 ? 'text-red-600' : quantity <= 10 ? 'text-yellow-600' : 'text-gray-800'
                                                }`}>
                                                {formatCurrency(quantity)}
                                            </td>
                                            <td className="px-4 text-right text-sm">
                                                {formatCurrency(unitPrice)}
                                            </td>
                                            <td className="px-4 text-right text-sm font-medium text-green-600">
                                                {formatCurrency(totalValue)}
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

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={filteredData.length}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </main>
        </div>
    );
}
