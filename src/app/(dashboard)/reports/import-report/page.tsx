'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { getSupplierImports, getInternalImports, getStaffImports, type SupplierImport, type InternalImport, type StaffImport } from '@/services/inventory.service';
import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getStores, type Store } from '@/services/store.service';
import { ensureVnFont } from '@/lib/pdf';

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

function formatDate(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN');
}

// Normalized type để gộp cả 3 loại imports với các field chung
interface NormalizedImport {
    id: number;
    code: string;
    supplierId: number;
    supplierName: string | null | undefined;
    importsDate: string;
    totalValue: number;
    status: string;
    importType: 'NCC' | 'INTERNAL' | 'NVBH';
}

export default function ImportReportPage() {
    const router = useRouter();
    const [filteredData, setFilteredData] = useState<NormalizedImport[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterSupplier, setFilterSupplier] = useState<number | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IMPORTED' | 'CANCELLED'>('ALL');
    const [filterType, setFilterType] = useState<'ALL' | 'NCC' | 'INTERNAL' | 'NVBH'>('ALL');

    // Sort states
    const [sortSupplier, setSortSupplier] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortDate, setSortDate] = useState<'none' | 'asc' | 'desc'>('none');
    const [sortValue, setSortValue] = useState<'none' | 'asc' | 'desc'>('none');

    // Load all suppliers (NCC, INTERNAL, NVBH) - memoized
    const fetchSuppliers = useCallback(async () => {
        try {
            const [nccList, internalList, nvbhList] = await Promise.all([
                getSuppliers('NCC'),
                getSuppliers('INTERNAL'),
                getSuppliers('NVBH'),
            ]);
            setSuppliers([...nccList, ...internalList, ...nvbhList]);
        } catch (e) {
            console.error(e);
        }
    }, []);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    // Memoize sorting function - MUST be declared before loadData
    const applySorting = useCallback((data: NormalizedImport[]) => {
        let sorted = [...data];

        // Sort by supplier name
        if (sortSupplier !== 'none') {
            sorted.sort((a, b) => {
                const nameA = (a.supplierName || '').toLowerCase();
                const nameB = (b.supplierName || '').toLowerCase();
                if (sortSupplier === 'asc') {
                    return nameA.localeCompare(nameB, 'vi');
                } else {
                    return nameB.localeCompare(nameA, 'vi');
                }
            });
        }

        // Sort by date
        if (sortDate !== 'none') {
            sorted.sort((a, b) => {
                const dateA = new Date(a.importsDate).getTime();
                const dateB = new Date(b.importsDate).getTime();
                return sortDate === 'asc' ? dateA - dateB : dateB - dateA;
            });
        }

        // Sort by value
        if (sortValue !== 'none') {
            sorted.sort((a, b) => {
                return sortValue === 'asc'
                    ? a.totalValue - b.totalValue
                    : b.totalValue - a.totalValue;
            });
        }

        return sorted;
    }, [sortSupplier, sortDate, sortValue]);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                status: filterStatus === 'ALL' ? undefined : filterStatus,
                code: filterCode || undefined,
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
            };

            // Batch tất cả API calls - gộp cả suppliers vào đây
            const [supplierImports, internalImports, staffImports, allSuppliers] = await Promise.all([
                getSupplierImports(params),
                getInternalImports(params),
                getStaffImports(params),
                getSuppliers(), // Lấy tất cả suppliers để map tên
            ]);

            const supplierMap = new Map(allSuppliers.map(s => [s.id, s.name]));

            // Normalize data - NCC imports
            const normalizedSupplierImports: NormalizedImport[] = supplierImports.map(item => ({
                id: item.id,
                code: item.code,
                supplierId: item.supplierId,
                supplierName: item.supplierName,
                importsDate: item.importsDate,
                totalValue: item.totalValue,
                status: item.status,
                importType: 'NCC' as const,
            }));

            // Normalize data - Internal imports
            const normalizedInternalImports: NormalizedImport[] = internalImports.map(item => ({
                id: item.id,
                code: item.code,
                supplierId: item.sourceStoreId,
                supplierName: item.sourceStoreName || supplierMap.get(item.sourceStoreId) || `Kho #${item.sourceStoreId}`,
                importsDate: item.importsDate,
                totalValue: item.totalValue,
                status: item.status,
                importType: 'INTERNAL' as const,
            }));

            // Normalize data - NVBH imports (Staff imports)
            const normalizedStaffImports: NormalizedImport[] = staffImports.map(item => ({
                id: item.id,
                code: item.code,
                supplierId: item.staffId,
                supplierName: item.staffName || supplierMap.get(item.staffId) || `NVBH #${item.staffId}`,
                importsDate: item.importsDate,
                totalValue: item.totalValue,
                status: item.status,
                importType: 'NVBH' as const,
            }));

            const allImports: NormalizedImport[] = [
                ...normalizedSupplierImports,
                ...normalizedInternalImports,
                ...normalizedStaffImports,
            ];

            // Filter by type if selected
            let filtered = allImports;
            if (filterType !== 'ALL') {
                filtered = allImports.filter(item => item.importType === filterType);
            }

            // Filter by supplier if selected
            if (filterSupplier !== 'ALL') {
                filtered = filtered.filter(item => item.supplierId === filterSupplier);
            }

            // Apply sorting
            filtered = applySorting(filtered);

            setFilteredData(filtered);
        } catch (err) {
            console.error('❌ Error loading imports:', err);
            setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterCode, filterFromDate, filterToDate, filterType, filterSupplier, applySorting]);

    const handleSortSupplier = () => {
        const newSort = sortSupplier === 'none' ? 'asc' : sortSupplier === 'asc' ? 'desc' : 'none';
        setSortSupplier(newSort);
        setSortDate('none');
        setSortValue('none');
    };

    const handleSortDate = () => {
        const newSort = sortDate === 'none' ? 'asc' : sortDate === 'asc' ? 'desc' : 'none';
        setSortDate(newSort);
        setSortSupplier('none');
        setSortValue('none');
    };

    const handleSortValue = () => {
        const newSort = sortValue === 'none' ? 'asc' : sortValue === 'asc' ? 'desc' : 'none';
        setSortValue(newSort);
        setSortSupplier('none');
        setSortDate('none');
    };

    // Memoize sorted data - MUST be declared before usePagination
    const sortedData = useMemo(() => {
        return applySorting(filteredData);
    }, [filteredData, applySorting]);

    // Use pagination hook with sorted data
    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        goToPage,
        resetPage,
    } = usePagination(sortedData, 10);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Reset page when sortedData changes (after filtering/sorting)
    useEffect(() => {
        resetPage();
    }, [sortedData.length, resetPage]);

    const handleSearch = () => {
        loadData();
    };

    const handleReset = () => {
        setFilterCode('');
        setFilterSupplier('ALL');
        setFilterFromDate('');
        setFilterToDate('');
        setFilterStatus('ALL');
        setFilterType('ALL');
        setSortSupplier('none');
        setSortDate('none');
        setSortValue('none');
    };

    const buildExportRows = useCallback(() =>
        sortedData.map((item, index) => ({
            STT: index + 1,
            'Mã phiếu': item.code,
            'Loại phiếu':
                item.importType === 'NCC'
                    ? 'NCC'
                    : item.importType === 'INTERNAL'
                        ? 'Nội bộ'
                        : 'NVBH',
            'Nguồn hàng': item.supplierName ?? '',
            'Ngày nhập': formatDate(item.importsDate),
            'Tổng giá trị': item.totalValue,
            'Trạng thái':
                item.status === 'IMPORTED'
                    ? 'Đã nhập'
                    : item.status === 'PENDING'
                        ? 'Chờ xử lý'
                        :                     'Đã hủy',
        })), [sortedData]);

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
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Bao_cao_nhap_kho');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-nhap-kho-${date}.xlsx`);
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
            doc.text('Báo cáo nhập kho', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng phiếu: ${totalImports}`, 14, 32);
            doc.text(`Tổng giá trị: ${formatCurrency(totalValue)} đ`, 80, 32);

            const rows = buildExportRows().map(row => [
                row.STT,
                row['Mã phiếu'],
                row['Loại phiếu'],
                row['Nguồn hàng'],
                row['Ngày nhập'],
                formatCurrency(row['Tổng giá trị']),
                row['Trạng thái'],
            ]);

            autoTable(doc, {
                head: [['STT', 'Mã phiếu', 'Loại', 'Nguồn hàng', 'Ngày nhập', 'Tổng giá trị', 'Trạng thái']],
                body: rows,
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 70, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-nhap-kho-${date}.pdf`);
        } catch (err) {
            console.error('Export PDF failed', err);
            alert('Xuất PDF thất bại, vui lòng thử lại.');
        }
    };

    // Memoize statistics calculations
    const statistics = useMemo(() => {
        return {
            totalImports: sortedData.length,
            totalValue: sortedData.reduce((sum, item) => sum + item.totalValue, 0),
            importedCount: sortedData.filter(item => item.status === 'IMPORTED').length,
            pendingCount: sortedData.filter(item => item.status === 'PENDING').length,
        };
    }, [sortedData]);

    const { totalImports, totalValue, importedCount, pendingCount } = statistics;

    // Pagination is now handled by usePagination hook

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Báo cáo nhập kho</h1>
                    <p className="text-gray-600 mt-1">Thống kê và báo cáo các phiếu nhập kho từ tất cả nguồn (NCC, Nội bộ, NVBH)</p>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-bold mb-4">Bộ lọc</h3>

                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã phiếu</label>
                            <input
                                type="text"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập mã phiếu"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại nguồn</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Tất cả</option>
                                <option value="NCC">Nhà cung cấp</option>
                                <option value="INTERNAL">Nội bộ</option>
                                <option value="NVBH">NVBH</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nguồn hàng</label>
                            <select
                                value={filterSupplier}
                                onChange={(e) => setFilterSupplier(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Tất cả</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
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

                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value as any)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Tất cả</option>
                                <option value="PENDING">Chờ xử lý</option>
                                <option value="IMPORTED">Đã nhập</option>
                                <option value="CANCELLED">Đã hủy</option>
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
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Tổng phiếu nhập</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{totalImports}</p>
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
                                <p className="text-sm text-gray-600">Đã nhập kho</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{importedCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 13L9 17L19 7" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Chờ xử lý</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{pendingCount}</p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
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
                                <th className="px-4 text-center font-bold text-sm w-[120px]">Mã phiếu</th>
                                <th className="px-4 text-center font-bold text-sm w-[100px]">Loại</th>
                                <th className="px-4 text-center font-bold text-sm w-[180px]">
                                    <button
                                        onClick={handleSortSupplier}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Nguồn hàng
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortSupplier === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortSupplier === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[120px]">
                                    <button
                                        onClick={handleSortDate}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Ngày nhập
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortDate === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortDate === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[180px]">
                                    <button
                                        onClick={handleSortValue}
                                        className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                    >
                                        Tổng giá trị
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                            <path d="M8 3L11 7H5L8 3Z" opacity={sortValue === 'asc' ? 1 : 0.4} />
                                            <path d="M8 13L5 9H11L8 13Z" opacity={sortValue === 'desc' ? 1 : 0.4} />
                                        </svg>
                                    </button>
                                </th>
                                <th className="px-4 text-center font-bold text-sm w-[150px]">Trạng thái</th>
                                <th className="px-4 text-center font-bold text-sm w-[120px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-500">
                                        {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu'}
                                    </td>
                                </tr>
                            ) : (
                                currentData.map((record, index) => (
                                    <tr
                                        key={record.id}
                                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                    >
                                        <td className="px-4 text-center text-sm">
                                            {paginationInfo.startIndex + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm font-medium">
                                            {record.code}
                                        </td>
                                        <td className="px-4 text-center">
                                            <span
                                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${record.importType === 'NCC'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : record.importType === 'INTERNAL'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-pink-100 text-pink-800'
                                                    }`}
                                            >
                                                {record.importType === 'NCC' ? 'NCC' : record.importType === 'INTERNAL' ? 'Nội bộ' : 'NVBH'}
                                            </span>
                                        </td>
                                        <td className="px-4 text-left text-sm">
                                            {record.supplierName || '-'}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {formatDate(record.importsDate)}
                                        </td>
                                        <td className="px-4 text-right text-sm font-medium text-green-600">
                                            {formatCurrency(record.totalValue)}
                                        </td>
                                        <td className="px-4 text-center">
                                            <span
                                                className={`inline-block px-3 py-1 rounded text-xs font-medium ${record.status === 'IMPORTED'
                                                    ? 'bg-green-100 text-green-800'
                                                    : record.status === 'PENDING'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}
                                            >
                                                {record.status === 'IMPORTED'
                                                    ? 'Đã nhập'
                                                    : record.status === 'PENDING'
                                                        ? 'Chờ xử lý'
                                                        : 'Đã hủy'}
                                            </span>
                                        </td>
                                        <td className="px-4 text-center">
                                            <button
                                                onClick={() => {
                                                    const url = record.importType === 'NCC'
                                                        ? `/dashboard/products/import/view-import-receipt/${record.id}`
                                                        : record.importType === 'INTERNAL'
                                                            ? `/orders/import/view-internal-import-receipt/${record.id}`
                                                            : `/dashboard/products/import-nvbh/view-import-nvbh-receipt/${record.id}`;
                                                    router.push(url);
                                                }}
                                                className="hover:scale-110 transition-transform"
                                                title="Xem chi tiết"
                                            >
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                    <path
                                                        d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
                                                        stroke="#0046ff"
                                                        strokeWidth="2"
                                                    />
                                                    <circle
                                                        cx="12"
                                                        cy="12.5"
                                                        r="3"
                                                        stroke="#0046ff"
                                                        strokeWidth="2"
                                                    />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={sortedData.length}
                        itemsPerPage={10}
                        onPageChange={goToPage}
                    />
                </div>
            </main>
        </div>
    );
}
