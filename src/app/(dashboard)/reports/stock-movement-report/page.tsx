'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { ensureVnFont } from '@/lib/pdf';
import { getProducts } from '@/services/product.service';
import {
    getSupplierImports,
    getInternalImports,
    getStaffImports,
    getSupplierExports,
    getInternalExports,
    getStaffExports
} from '@/services/inventory.service';
import type { Product } from '@/types/product';

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

interface StockMovement {
    productId: number;
    productCode: string;
    productName: string;
    openingStock: number;
    totalImport: number;
    totalExport: number;
    closingStock: number;
    unitPrice: number;
    openingValue: number;
    importValue: number;
    exportValue: number;
    closingValue: number;
}

export default function StockMovementReportPage() {
    const [data, setData] = useState<StockMovement[]>([]);
    const [filteredData, setFilteredData] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Sort states
    const [sortName, setSortName] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortImport, setSortImport] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortExport, setSortExport] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortClosing, setSortClosing] = useState<'none' | 'asc' | 'desc'>('none');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
            };

            // Load products and all imports/exports (NCC, INTERNAL, NVBH)
            const [
                products,
                supplierImports,
                internalImports,
                staffImports,
                supplierExports,
                internalExports,
                staffExports
            ] = await Promise.all([
                getProducts(),
                getSupplierImports(params),
                getInternalImports(params),
                getStaffImports(params),
                getSupplierExports(params),
                getInternalExports(params),
                getStaffExports(params),
            ]);

            // Gộp tất cả imports và exports
            const allImports = [...supplierImports, ...internalImports, ...staffImports];
            const allExports = [...supplierExports, ...internalExports, ...staffExports];

            console.log('📊 Stock Movement Report:');
            console.log('- Total products:', products.length);
            console.log('- Total imports:', allImports.length);
            console.log('- Total exports:', allExports.length);

            // Calculate stock movements for each product
            const movements: StockMovement[] = products.map(product => {
                const currentStock = product.quantity || 0;
                const unitPrice = product.unitPrice || 0;

                // Calculate total import for this product (from all sources)
                let totalImport = 0;
                allImports.forEach(importReceipt => {
                    if (importReceipt.status === 'IMPORTED') {
                        importReceipt.items?.forEach(item => {
                            if (item.productId === product.id) {
                                totalImport += item.quantity;
                            }
                        });
                    }
                });

                // Calculate total export for this product (to all destinations)
                let totalExport = 0;
                allExports.forEach(exportReceipt => {
                    if (exportReceipt.status === 'EXPORTED') {
                        exportReceipt.items?.forEach(item => {
                            if (item.productId === product.id) {
                                totalExport += item.quantity;
                            }
                        });
                    }
                });

                // Calculate opening stock (current - import + export)
                const openingStock = Math.max(0, currentStock - totalImport + totalExport);

                return {
                    productId: product.id,
                    productCode: product.code,
                    productName: product.name,
                    openingStock,
                    totalImport,
                    totalExport,
                    closingStock: currentStock,
                    unitPrice,
                    openingValue: openingStock * unitPrice,
                    importValue: totalImport * unitPrice,
                    exportValue: totalExport * unitPrice,
                    closingValue: currentStock * unitPrice,
                };
            });

            setData(movements);

            // Apply filters
            let filtered = movements;

            if (filterCode) {
                filtered = filtered.filter(item =>
                    item.productCode.toLowerCase().includes(filterCode.toLowerCase())
                );
            }

            if (filterName) {
                filtered = filtered.filter(item =>
                    item.productName.toLowerCase().includes(filterName.toLowerCase())
                );
            }

            // Apply sorting
            filtered = applySorting(filtered);

            setFilteredData(filtered);
            setCurrentPage(1);
        } catch (err) {
            console.error('❌ Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const applySorting = (data: StockMovement[]) => {
        let sorted = [...data];

        if (sortName !== 'none') {
            sorted.sort((a, b) => {
                const nameA = a.productName.toLowerCase();
                const nameB = b.productName.toLowerCase();
                return sortName === 'asc'
                    ? nameA.localeCompare(nameB, 'vi')
                    : nameB.localeCompare(nameA, 'vi');
            });
        }

        if (sortImport !== 'none') {
            sorted.sort((a, b) =>
                sortImport === 'asc'
                    ? a.totalImport - b.totalImport
                    : b.totalImport - a.totalImport
            );
        }

        if (sortExport !== 'none') {
            sorted.sort((a, b) =>
                sortExport === 'asc'
                    ? a.totalExport - b.totalExport
                    : b.totalExport - a.totalExport
            );
        }

        if (sortClosing !== 'none') {
            sorted.sort((a, b) =>
                sortClosing === 'asc'
                    ? a.closingStock - b.closingStock
                    : b.closingStock - a.closingStock
            );
        }

        return sorted;
    };

    const handleSortName = () => {
        const newSort = sortName === 'none' ? 'asc' : sortName === 'asc' ? 'desc' : 'none';
        setSortName(newSort);
        setSortImport('none');
        setSortExport('none');
        setSortClosing('none');
    };

    const handleSortImport = () => {
        const newSort = sortImport === 'none' ? 'asc' : sortImport === 'asc' ? 'desc' : 'none';
        setSortImport(newSort);
        setSortName('none');
        setSortExport('none');
        setSortClosing('none');
    };

    const handleSortExport = () => {
        const newSort = sortExport === 'none' ? 'asc' : sortExport === 'asc' ? 'desc' : 'none';
        setSortExport(newSort);
        setSortName('none');
        setSortImport('none');
        setSortClosing('none');
    };

    const handleSortClosing = () => {
        const newSort = sortClosing === 'none' ? 'asc' : sortClosing === 'asc' ? 'desc' : 'none';
        setSortClosing(newSort);
        setSortName('none');
        setSortImport('none');
        setSortExport('none');
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const sorted = applySorting(filteredData);
        setFilteredData(sorted);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortName, sortImport, sortExport, sortClosing]);

    const handleSearch = () => {
        loadData();
    };

    const handleReset = () => {
        setFilterCode('');
        setFilterName('');
        setFilterFromDate('');
        setFilterToDate('');
        setSortName('none');
        setSortImport('none');
        setSortExport('none');
        setSortClosing('none');
    };

    const buildExportRows = () =>
        filteredData.map((item, index) => ({
            STT: index + 1,
            'Mã hàng': item.productCode,
            'Tên hàng hóa': item.productName,
            'Tồn đầu': item.openingStock,
            'Nhập': item.totalImport,
            'Xuất': item.totalExport,
            'Tồn cuối': item.closingStock,
            'Đơn giá': item.unitPrice,
            'Giá trị tồn cuối': item.closingValue,
        }));

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
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_xuat_nhap_ton');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-xuat-nhap-ton-${date}.xlsx`);
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
            doc.text('Báo cáo xuất nhập tồn', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng mặt hàng: ${filteredData.length}`, 14, 32);

            const rows = buildExportRows().map(row => [
                row.STT,
                row['Mã hàng'],
                row['Tên hàng hóa'],
                formatCurrency(row['Tồn đầu']),
                formatCurrency(row['Nhập']),
                formatCurrency(row['Xuất']),
                formatCurrency(row['Tồn cuối']),
                formatCurrency(row['Đơn giá']),
                formatCurrency(row['Giá trị tồn cuối']),
            ]);

            autoTable(doc, {
                head: [['STT', 'Mã hàng', 'Tên hàng hóa', 'Tồn đầu', 'Nhập', 'Xuất', 'Tồn cuối', 'Đơn giá', 'Giá trị tồn cuối']],
                body: rows,
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 70, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-xuat-nhap-ton-${date}.pdf`);
        } catch (err) {
            console.error('Export PDF failed', err);
            alert('Xuất PDF thất bại, vui lòng thử lại.');
        }
    };

    // Calculate statistics
    const totalOpeningStock = filteredData.reduce((sum, item) => sum + item.openingStock, 0);
    const totalImport = filteredData.reduce((sum, item) => sum + item.totalImport, 0);
    const totalExport = filteredData.reduce((sum, item) => sum + item.totalExport, 0);
    const totalClosingStock = filteredData.reduce((sum, item) => sum + item.closingStock, 0);
    const totalOpeningValue = filteredData.reduce((sum, item) => sum + item.openingValue, 0);
    const totalImportValue = filteredData.reduce((sum, item) => sum + item.importValue, 0);
    const totalExportValue = filteredData.reduce((sum, item) => sum + item.exportValue, 0);
    const totalClosingValue = filteredData.reduce((sum, item) => sum + item.closingValue, 0);

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

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Báo cáo xuất nhập tồn</h1>
                    <p className="text-gray-600 mt-1">Thống kê biến động kho theo từng sản phẩm</p>
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tồn đầu kỳ</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{formatCurrency(totalOpeningStock)}</p>
                                <p className="text-xs text-gray-500 mt-1">Giá trị: {formatCurrency(totalOpeningValue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M9 11H15M9 15H15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng nhập</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalImport)}</p>
                                <p className="text-xs text-gray-500 mt-1">Giá trị: {formatCurrency(totalImportValue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 5V19M5 12L12 5L19 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng xuất</p>
                                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalExport)}</p>
                                <p className="text-xs text-gray-500 mt-1">Giá trị: {formatCurrency(totalExportValue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 19V5M5 12L12 19L19 12" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tồn cuối kỳ</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalClosingStock)}</p>
                                <p className="text-xs text-gray-500 mt-1">Giá trị: {formatCurrency(totalClosingValue)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#10B981" strokeWidth="2" />
                                    <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="#10B981" strokeWidth="2" />
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
                                <th className="px-4 text-center font-bold text-sm w-[60px]">STT</th>
                                <th className="px-4 text-center font-bold text-sm w-[120px]">Mã hàng</th>
                                <th className="px-4 text-center font-bold text-sm w-[200px]">
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
                                <th className="px-4 text-center font-bold text-sm w-[100px]">Tồn đầu</th>
                                <th className="px-4 text-center font-bold text-sm w-[100px]">
                                    <button
                                        onClick={handleSortImport}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Nhập
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortImport === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortImport === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[100px]">
                                    <button
                                        onClick={handleSortExport}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Xuất
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortExport === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortExport === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[100px]">
                                    <button
                                        onClick={handleSortClosing}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Tồn cuối
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortClosing === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortClosing === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[120px]">Đơn giá</th>
                                <th className="px-4 text-center font-bold text-sm w-[140px]">Giá trị tồn cuối</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-gray-500">
                                        {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu'}
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((record, index) => (
                                    <tr
                                        key={record.productId}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                    >
                                        <td className="px-4 text-center text-sm">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm font-medium">
                                            {record.productCode}
                                        </td>
                                        <td className="px-4 text-left text-sm">
                                            {record.productName}
                                        </td>
                                        <td className="px-4 text-center text-sm text-gray-600">
                                            {formatCurrency(record.openingStock)}
                                        </td>
                                        <td className="px-4 text-center text-sm font-medium text-blue-600">
                                            {formatCurrency(record.totalImport)}
                                        </td>
                                        <td className="px-4 text-center text-sm font-medium text-orange-600">
                                            {formatCurrency(record.totalExport)}
                                        </td>
                                        <td className="px-4 text-center text-sm font-medium text-green-600">
                                            {formatCurrency(record.closingStock)}
                                        </td>
                                        <td className="px-4 text-right text-sm">
                                            {formatCurrency(record.unitPrice)}
                                        </td>
                                        <td className="px-4 text-right text-sm font-medium text-green-600">
                                            {formatCurrency(record.closingValue)}
                                        </td>
                                    </tr>
                                ))
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
