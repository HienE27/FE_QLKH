'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { ensureVnFont } from '@/lib/pdf';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import {
    searchImportsPaged,
    type SupplierImport,
    type ExportStatus,
    type PageResponse,
} from '@/services/inventory.service';
import ReportFilters from '../components/ReportFilters';
import ReportSummary from '../components/ReportSummary';
import ReportTable from '../components/ReportTable';
import { TableSkeleton } from '@/components/common/TableSkeleton';

type FilterStatus = ExportStatus | 'ALL';
type SortField = 'date' | 'value';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<ExportStatus, string> = {
    PENDING: 'Chờ xử lý',
    IMPORTED: 'Đã nhập kho',
    CANCELLED: 'Đã hủy',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    EXPORTED: 'Đã xuất',
    RETURNED: 'Hoàn hàng',
};

const statusColor: Record<ExportStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    IMPORTED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700', // Đã hủy: tô đỏ cho dễ nhận biết
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    EXPORTED: 'bg-blue-100 text-blue-700',
    RETURNED: 'bg-purple-100 text-purple-700',
};

const VIRTUAL_ROW_HEIGHT = 56;
const VIRTUAL_VIEWPORT_HEIGHT = 520;
const VIRTUAL_OVERSCAN = 8;

const defaultFilters = {
    code: '',
    supplier: '',
    from: '',
    to: '',
    status: 'ALL' as FilterStatus,
};

import { formatPrice, formatDateTime } from '@/lib/utils';

export default function ImportReportPage() {
    const queryClient = useQueryClient();
    const [pageData, setPageData] = useState<PageResponse<SupplierImport> | null>(null);
    const [filteredData, setFilteredData] = useState<SupplierImport[]>([]);
    const [allDataForExport, setAllDataForExport] = useState<SupplierImport[]>([]);
    const [loadingAllData, setLoadingAllData] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
    const [currentPage, setCurrentPage] = useState(1);
    const [virtualScrollTop, setVirtualScrollTop] = useState(0);
    const debouncedFilters = {
        ...filters,
        supplier: useDebounce(filters.supplier, 400),
        code: useDebounce(filters.code, 400),
    };

    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả' },
      ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
    ],
    [],
  );

    const itemsPerPage = PAGE_SIZE;

  const handleFilterChange = (next: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

    const applyClientFilters = (
        data: SupplierImport[],
        supplierKeyword: string,
    ) => {
        if (!supplierKeyword) return data;
        const keyword = supplierKeyword.toLowerCase();
        return data.filter((record) =>
            (record.supplierName || '')
                .toLowerCase()
                .includes(keyword),
        );
    };

    // Chỉ load toàn bộ khi cần export Excel/PDF, với date range filter
    const loadAllDataForExport = async () => {
        if (loadingAllData) return;
        try {
            setLoadingAllData(true);
            // Load tất cả với date range filter để giảm dữ liệu
            const allImports: SupplierImport[] = [];
            let page = 0;
            let hasMore = true;
            
            while (hasMore) {
                const result = await searchImportsPaged({
                    status: appliedFilters.status === 'ALL' ? 'ALL' : appliedFilters.status,
                code: appliedFilters.code || undefined,
                from: appliedFilters.from || undefined,
                to: appliedFilters.to || undefined,
                    page,
                    size: 100, // Load 100 mỗi lần
                });
                
                allImports.push(...result.content);
                hasMore = !result.last && result.content.length > 0;
                page++;
                
                // Giới hạn tối đa 1000 bản ghi để tránh quá tải
                if (allImports.length >= 1000) break;
            }
            
            setAllDataForExport(applyClientFilters(allImports, appliedFilters.supplier));
        } catch (err) {
            console.error('Error loading all data for export:', err);
            setAllDataForExport([]);
        } finally {
            setLoadingAllData(false);
        }
    };

    // Query paginated data for table
    const pageQuery = useQuery({
        queryKey: ['imports-report', appliedFilters, currentPage, sortField, sortDirection],
        queryFn: async () =>
            searchImportsPaged({
                status: appliedFilters.status === 'ALL' ? undefined : appliedFilters.status,
                code: appliedFilters.code || undefined,
                from: appliedFilters.from || undefined,
                to: appliedFilters.to || undefined,
                page: currentPage - 1,
                size: itemsPerPage,
                sortField,
                sortDir: sortDirection,
            }),
        keepPreviousData: true,
        staleTime: 60_000,
    });

    // Tính toán summary từ paginated data (ước lượng)
    const estimatedTotal = useMemo(() => {
        if (!pageData) return { total: 0, imported: 0, pending: 0, cancelled: 0 };
        // Ước lượng dựa trên tỷ lệ trong page hiện tại
        const pageImported = filteredData.filter(r => r.status === 'IMPORTED').length;
        const pagePending = filteredData.filter(r => r.status === 'PENDING').length;
        const pageCancelled = filteredData.filter(r => r.status === 'CANCELLED').length;
        const pageTotal = filteredData.length;
        
        if (pageTotal === 0) return { total: 0, imported: 0, pending: 0, cancelled: 0 };
        
        const ratio = pageData.totalElements / pageTotal;
        return {
            total: pageData.totalElements,
            imported: Math.round(pageImported * ratio),
            pending: Math.round(pagePending * ratio),
            cancelled: Math.round(pageCancelled * ratio),
        };
    }, [pageData, filteredData]);

    useEffect(() => {
        if (pageQuery.data) {
            setPageData(pageQuery.data);
            setFilteredData(applyClientFilters(pageQuery.data.content, appliedFilters.supplier));
            setError(null);
        }
        if (pageQuery.error) {
            console.error('Failed to load import report', pageQuery.error);
            setError(
                pageQuery.error instanceof Error
                    ? pageQuery.error.message
                    : 'Không thể tải báo cáo phiếu nhập',
            );
        }
    }, [pageQuery.data, pageQuery.error, appliedFilters.supplier]);

    useEffect(() => {
        setLoading(pageQuery.isFetching && currentPage === 1);
    }, [pageQuery.isFetching, currentPage]);

    // Load toàn bộ data khi filter được apply để tính statistics chính xác
    useEffect(() => {
        // Load data ngay khi filter được apply (bao gồm cả khi không có filter - load tất cả)
        loadAllDataForExport();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appliedFilters]);

    const handleSearch = () => {
        const nextFilters = { ...filters, supplier: debouncedFilters.supplier, code: debouncedFilters.code };
        setAppliedFilters(nextFilters);
        setCurrentPage(1);
        setAllDataForExport([]); // Reset all data khi filter thay đổi
        queryClient.invalidateQueries({ queryKey: ['imports-report'] });
    };

    const handleReset = () => {
        setFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setSortField('date');
        setSortDirection('desc');
        setCurrentPage(1);
        setAllDataForExport([]); // Reset all data
        queryClient.invalidateQueries({ queryKey: ['imports-report'] });
    };

    const toggleSort = (field: SortField) => {
        setSortField(field);
        setSortDirection((prev) =>
            sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc',
        );
        setCurrentPage(1);
    };

    // Tính toán từ toàn bộ data đã load (chính xác, không ước lượng)
    const totalValue = useMemo(() => {
        if (allDataForExport.length > 0) {
            return allDataForExport.reduce((sum, record) => sum + (record.totalValue || 0), 0);
        }
        // Nếu chưa load xong, trả về 0 thay vì ước lượng sai
        return 0;
    }, [allDataForExport]);

    const importedCount = useMemo(() => {
        if (allDataForExport.length > 0) {
            return allDataForExport.filter((record) => record.status === 'IMPORTED').length;
        }
        return 0;
    }, [allDataForExport]);

    const pendingCount = useMemo(() => {
        if (allDataForExport.length > 0) {
            return allDataForExport.filter((record) => record.status === 'PENDING').length;
        }
        return 0;
    }, [allDataForExport]);

    const cancelledCount = useMemo(() => {
        if (allDataForExport.length > 0) {
            return allDataForExport.filter((record) => record.status === 'CANCELLED').length;
        }
        return 0;
    }, [allDataForExport]);

    const averageValue = useMemo(() => {
        if (allDataForExport.length > 0) {
            return Math.round(totalValue / allDataForExport.length);
        }
        return 0;
    }, [allDataForExport, totalValue]);

    const totalItems = pageData?.totalElements ?? filteredData.length;
    const totalPages = pageData?.totalPages ?? 1;
    const currentData = filteredData;

    const totalVirtualHeight = useMemo(
        () => currentData.length * VIRTUAL_ROW_HEIGHT,
        [currentData.length],
    );

    const startVirtualIndex = useMemo(
        () => Math.max(0, Math.floor(virtualScrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN),
        [virtualScrollTop],
    );

    const endVirtualIndex = useMemo(
        () =>
            Math.min(
                currentData.length,
                Math.ceil((virtualScrollTop + VIRTUAL_VIEWPORT_HEIGHT) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN,
            ),
        [virtualScrollTop, currentData.length],
    );

    const visibleRows = useMemo(
        () => currentData.slice(startVirtualIndex, endVirtualIndex),
        [currentData, startVirtualIndex, endVirtualIndex],
    );

    const paddingTop = startVirtualIndex * VIRTUAL_ROW_HEIGHT;
    const paddingBottom = Math.max(0, totalVirtualHeight - endVirtualIndex * VIRTUAL_ROW_HEIGHT);

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage: pagedPage, handlePageChange, paginationInfo } = usePagination({
        itemsPerPage,
        totalItems,
        totalPages,
        onPageChange: (page) => setCurrentPage(page),
    });
    const startIndex = paginationInfo.startIndex;

    useEffect(() => {
        if (pagedPage !== currentPage) {
            setCurrentPage(pagedPage);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagedPage]);


    const handleExportExcel = async () => {
        // Load tất cả data nếu chưa có
        let dataToExport = allDataForExport;
        if (dataToExport.length === 0) {
            await loadAllDataForExport();
            // Đợi state update - reload từ state sau khi load xong
            await new Promise(resolve => setTimeout(resolve, 100));
            dataToExport = allDataForExport;
            if (dataToExport.length === 0) {
                alert('Không có dữ liệu để xuất. Vui lòng kiểm tra lại bộ lọc.');
                return;
            }
        }
        try {
            const XLSX = await import('xlsx');
            const rows = dataToExport.map((record, index) => ({
            STT: index + 1,
            'Mã phiếu': record.code,
            'Nhà cung cấp': record.supplierName || '-',
            'Ngày nhập': formatDateTime(record.importsDate),
            'Trạng thái': statusLabels[record.status],
            'Giá trị': record.totalValue || 0,
        }));
            const sheet = XLSX.utils.json_to_sheet(
                rows.map((row) => ({
                    ...row,
                    'Giá trị': formatPrice(row['Giá trị']),
                })),
            );
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, 'Bao_cao_phieu_nhap');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-phieu-nhap-${date}.xlsx`);
        } catch (err) {
            console.error('Export excel error', err);
            alert('Xuất Excel thất bại.');
        }
    };

    const handleExportPDF = async () => {
        // Load tất cả data nếu chưa có
        let dataToExport = allDataForExport;
        if (dataToExport.length === 0) {
            await loadAllDataForExport();
            // Đợi state update
            await new Promise(resolve => setTimeout(resolve, 100));
            dataToExport = allDataForExport;
            if (dataToExport.length === 0) {
                alert('Không có dữ liệu để xuất. Vui lòng kiểm tra lại bộ lọc.');
            return;
            }
        }
        try {
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape' });
            await ensureVnFont(doc);
            doc.setFontSize(16);
            doc.text('Báo cáo phiếu nhập kho', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng phiếu: ${dataToExport.length}`, 14, 32);
            const exportTotalValue = dataToExport.reduce((sum, r) => sum + (r.totalValue || 0), 0);
            doc.text(`Tổng giá trị: ${formatPrice(exportTotalValue)} đ`, 80, 32);

            const rows = dataToExport.map((record, index) => ({
                STT: index + 1,
                'Mã phiếu': record.code,
                'Nhà cung cấp': record.supplierName || '-',
                'Ngày nhập': formatDateTime(record.importsDate),
                'Trạng thái': statusLabels[record.status],
                'Giá trị': record.totalValue || 0,
            }));

            autoTable(doc, {
                head: [['STT', 'Mã phiếu', 'Nhà cung cấp', 'Ngày nhập', 'Trạng thái', 'Giá trị']],
                body: rows.map((row) => [
                    row.STT,
                    row['Mã phiếu'],
                    row['Nhà cung cấp'],
                    row['Ngày nhập'],
                    row['Trạng thái'],
                    formatPrice(row['Giá trị']),
                ]),
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 153, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-phieu-nhap-${date}.pdf`);
        } catch (err) {
            console.error('Export PDF error', err);
            alert('Xuất PDF thất bại.');
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Báo cáo phiếu nhập</h1>
                <p className="text-sm text-blue-gray-600 uppercase">
                    Theo dõi giá trị và trạng thái phiếu nhập kho
                </p>
            </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6 space-y-6">
                        <section>
                            <h3 className="text-lg font-bold text-blue-gray-800 mb-4">Bộ lọc</h3>
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Mã phiếu
                                    </label>
                                    <input
                                        type="text"
                                        value={filters.code}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, code: e.target.value }))}
                                        placeholder="Nhập mã phiếu"
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Nhà cung cấp
                                    </label>
                                    <input
                                        type="text"
                                        value={filters.supplier}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, supplier: e.target.value }))}
                                        placeholder="Tên nhà cung cấp"
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Từ ngày
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.from}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, from: e.target.value }))}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Đến ngày
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.to}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, to: e.target.value }))}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Trạng thái
                                    </label>
                                    <select
                                        value={filters.status}
                                        onChange={(e) =>
                                            setFilters((prev) => ({
                                                ...prev,
                                                status: e.target.value as FilterStatus,
                                            }))}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        {Object.entries(statusLabels).map(([key, label]) => (
                                            <option key={key} value={key}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {error && (
                                <p className="text-sm text-red-500 mt-3">{error}</p>
                            )}
                            <div className="flex items-center justify-between mt-6">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2 rounded-lg border border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-colors"
                                >
                                    Đặt lại
                                </button>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSearch}
                                        disabled={loading}
                                        className="px-6 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0088EE] text-white flex items-center gap-2 disabled:opacity-60"
                                    >
                                        {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                    </button>
                                </div>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-full">
                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Tổng phiếu nhập</p>
                                        <p className="text-2xl font-bold text-blue-gray-800 mt-1 break-words">{allDataForExport.length > 0 ? allDataForExport.length : (pageData?.totalElements ?? 0)}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 5V19M5 12L12 5L19 12" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                        <p className="text-sm text-blue-gray-600 truncate">Đã nhập kho</p>
                                        <p className="text-2xl font-bold text-green-600 mt-1 break-words">{importedCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M5 12L10 17L19 8" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Đang chờ xử lý</p>
                                        <p className="text-2xl font-bold text-yellow-600 mt-1 break-words">{pendingCount}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M12 8V12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M12 16H12.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F59E0B" strokeWidth="2" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm text-blue-gray-600 truncate">Giá trị trung bình</p>
                                        <p className="text-xl font-bold text-blue-gray-800 mt-1 break-words leading-tight">{formatPrice(averageValue)}</p>
                                    </div>
                                    <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <path d="M4 12H20M4 12C4 8.13401 7.13401 5 11 5V19C7.13401 19 4 15.866 4 12Z" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="flex items-center justify-between gap-3">
                            <p className="text-sm text-blue-gray-600">
                                Hủy/Trả hàng: <span className="font-semibold text-red-500">{cancelledCount}</span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleExportExcel}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2 font-medium shadow-sm"
                                >
                                    Xuất Excel
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2 font-medium shadow-sm"
                                >
                                    Xuất PDF
                                </button>
                            </div>
                        </section>

                        <div className="rounded-xl border border-blue-gray-100 overflow-hidden">
                            {loading ? (
                                <TableSkeleton columns={7} rows={8} />
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <div
                                            className="max-h-[520px] overflow-auto"
                                            onScroll={(e) => setVirtualScrollTop(e.currentTarget.scrollTop)}
                                            style={{ height: VIRTUAL_VIEWPORT_HEIGHT }}
                                        >
                                            <table className="w-full min-w-[900px]">
                                                <thead>
                                                    <tr className="bg-[#0099FF] text-white h-[48px] text-sm font-bold sticky top-0 z-10">
                                                    <th className="px-4 text-center w-[80px]">STT</th>
                                                    <th className="px-4 text-left w-[200px]">Mã phiếu</th>
                                                    <th className="px-4 text-left w-[260px]">Nhà cung cấp</th>
                                                    <th className="px-4 text-center w-[200px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSort('date')}
                                                            className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition"
                                                        >
                                                            Ngày nhập
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                                <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'date' && sortDirection === 'asc' ? 1 : 0.4} />
                                                                <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'date' && sortDirection === 'desc' ? 1 : 0.4} />
                                                            </svg>
                                                        </button>
                                                    </th>
                                                    <th className="px-4 text-right w-[200px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSort('value')}
                                                            className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition"
                                                        >
                                                            Tổng tiền
                                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                                <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'value' && sortDirection === 'asc' ? 1 : 0.4} />
                                                                <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'value' && sortDirection === 'desc' ? 1 : 0.4} />
                                                            </svg>
                                                        </button>
                                                    </th>
                                                    <th className="px-4 text-center w-[150px]">Trạng thái</th>
                                                    <th className="px-4 text-left">Ghi chú</th>
                                                </tr>
                                            </thead>
                                                <tbody>
                                                    {currentData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="text-center py-8 text-blue-gray-500">
                                                                Không có dữ liệu
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        <>
                                                            <tr style={{ height: paddingTop }} aria-hidden />
                                                            {visibleRows.map((record, idx) => {
                                                                const actualIndex = startIndex + startVirtualIndex + idx + 1;
                                                                return (
                                                                    <tr
                                                                        key={record.id ?? `${startVirtualIndex}-${idx}`}
                                                                        className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[48px]"
                                                                    >
                                                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                                                            {actualIndex}
                                                                        </td>
                                                                        <td className="px-4 text-left text-sm font-medium">
                                                                            {record.code}
                                                                        </td>
                                                                        <td className="px-4 text-left text-sm text-blue-gray-700">
                                                                            {record.supplierName || '-'}
                                                                        </td>
                                                                        <td className="px-4 text-center text-sm text-blue-gray-700 whitespace-nowrap">
                                                                            {formatDateTime(record.importsDate)}
                                                                        </td>
                                                                        <td className="px-4 text-right text-sm font-semibold text-green-600">
                                                                            {formatPrice(record.totalValue || 0)}
                                                                        </td>
                                                                        <td className="px-4 text-center">
                                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[record.status]}`}>
                                                                                {statusLabels[record.status]}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 text-left text-sm text-blue-gray-600">
                                                                            {record.note || record.description || '-'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            <tr style={{ height: paddingBottom }} aria-hidden />
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            totalItems={totalItems}
                                            itemsPerPage={itemsPerPage}
                                            onPageChange={handlePageChange}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
        </>
    );
}

