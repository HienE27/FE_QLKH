'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { getProducts } from '@/services/product.service';
import type { Product } from '@/types/product';

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export default function InventoryReportPage() {
    const router = useRouter();
    const [data, setData] = useState<Product[]>([]);
    const [filteredData, setFilteredData] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const products = await getProducts();
            setData(products);

            // Apply filters
            let filtered = products;

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
            setCurrentPage(1);
        } catch (err) {
            console.error('❌ Error loading products:', err);
            setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const applySorting = (data: Product[]) => {
        let sorted = [...data];

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

    const handleExportExcel = () => {
        alert('Chức năng xuất Excel đang được phát triển');
    };

    const handleExportPDF = () => {
        alert('Chức năng xuất PDF đang được phát triển');
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

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = filteredData.slice(startIndex, endIndex);
    const displayStart = filteredData.length === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(endIndex, filteredData.length);

    const handlePreviousPage = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

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
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
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
                                onChange={(e) => setFilterStockStatus(e.target.value as any)}
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

                {/* Export Buttons */}
                <div className="flex justify-end gap-3 mb-6">
                    <button
                        onClick={handleExportExcel}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Xuất Excel
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors flex items-center gap-2"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M14 10V12.6667C14 13.0203 13.8595 13.3594 13.6095 13.6095C13.3594 13.8595 13.0203 14 12.6667 14H3.33333C2.97971 14 2.64057 13.8595 2.39052 13.6095C2.14048 13.3594 2 13.0203 2 12.6667V10M11.3333 5.33333L8 2M8 2L4.66667 5.33333M8 2V10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Xuất PDF
                    </button>
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
                                                {startIndex + index + 1}
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            Hiển thị {displayStart} - {displayEnd}/{filteredData.length} bản ghi
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <span className="px-4 py-2 text-sm">
                                Trang {currentPage}/{totalPages || 1}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= totalPages}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
