'use client';

import { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { ensureVnFont } from '@/lib/pdf';
import { usePagination } from '@/hooks/usePagination';
import {
    searchExportsPaged,
    getAllExports,
    type SupplierExport,
    type ExportStatus,
    type PageResponse,
} from '@/services/inventory.service';

type FilterStatus = ExportStatus | 'ALL';
type SortField = 'date' | 'value';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<ExportStatus, string> = {
    PENDING: 'Chờ xử lý',
    EXPORTED: 'Đã xuất kho',
    CANCELLED: 'Đã hủy',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    IMPORTED: 'Đã nhập',
    RETURNED: 'Trả hàng',
};

const statusColor: Record<ExportStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    EXPORTED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-blue-gray-100 text-blue-gray-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-600',
    IMPORTED: 'bg-blue-100 text-blue-700',
    RETURNED: 'bg-purple-100 text-purple-700',
};

const defaultFilters = {
    code: '',
    customer: '',
    from: '',
    to: '',
    status: 'ALL' as FilterStatus,
};

import { formatPrice, formatDateTime } from '@/lib/utils';

export default function ExportReportPage() {
    const [pageData, setPageData] = useState<PageResponse<SupplierExport> | null>(null);
    const [filteredData, setFilteredData] = useState<SupplierExport[]>([]);
    const [allData, setAllData] = useState<SupplierExport[]>([]); // Tất cả dữ liệu để tính thống kê

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [filters, setFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const itemsPerPage = PAGE_SIZE;

    const applyClientFilters = (
        data: SupplierExport[],
        customerKeyword: string,
    ) => {
        if (!customerKeyword) return data;
        const keyword = customerKeyword.toLowerCase();
        return data.filter((record) =>
            (record.customerName || '')
                .toLowerCase()
                .includes(keyword),
        );
    };

    // Load tất cả dữ liệu để tính thống kê (chỉ gọi khi filters thay đổi)
    const loadAllData = async (activeFilters = appliedFilters) => {
        try {
            const allExports = await getAllExports({
                status:
                    activeFilters.status === 'ALL'
                        ? 'ALL'
                        : activeFilters.status,
                code: activeFilters.code || undefined,
                from: activeFilters.from || undefined,
                to: activeFilters.to || undefined,
            });

            // Áp dụng filter customer (client-side)
            const filteredAll = applyClientFilters(allExports, activeFilters.customer);
            setAllData(filteredAll);
            return filteredAll;
        } catch (err) {
            console.error('Failed to load all export data', err);
            throw err;
        }
    };

    const fetchReportData = async (pageToLoad: number = 1, activeFilters = appliedFilters, skipAllData = false) => {
        try {
            setLoading(true);
            setError(null);

            // Chỉ load allData nếu filters thay đổi hoặc chưa có data
            if (!skipAllData && (!allData.length || JSON.stringify(activeFilters) !== JSON.stringify(appliedFilters))) {
                await loadAllData(activeFilters);
            }

            // Load dữ liệu phân trang để hiển thị bảng
            const response = await searchExportsPaged({
                status:
                    activeFilters.status === 'ALL'
                        ? 'ALL'
                        : activeFilters.status,
                code: activeFilters.code || undefined,
                from: activeFilters.from || undefined,
                to: activeFilters.to || undefined,
                page: pageToLoad - 1,
                size: itemsPerPage,
                sortField,
                sortDir: sortDirection,
            });

            setPageData(response);
            setFilteredData(applyClientFilters(response.content, activeFilters.customer));
            // Note: currentPage được quản lý bởi usePagination hook
        } catch (err) {
            console.error('Failed to load export report', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể tải báo cáo phiếu xuất',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReportData(1, defaultFilters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!pageData) return;
        const filtered = applyClientFilters(pageData.content, appliedFilters.customer);
        setFilteredData(filtered);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageData, appliedFilters.customer]);

    const handleSearch = () => {
        setAppliedFilters(filters);
        fetchReportData(1, filters);
    };

    const handleReset = () => {
        setFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setSortField('date');
        setSortDirection('desc');
        fetchReportData(1, defaultFilters);
    };

    const toggleSort = (field: SortField) => {
        setSortField(field);
        setSortDirection((prev) =>
            sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'desc',
        );
    };

    useEffect(() => {
        // Reload khi sort thay đổi (trừ lần đầu mount)
        if (pageData) {
            fetchReportData(currentPage, appliedFilters);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortField, sortDirection]);

    // Tính thống kê dựa trên TẤT CẢ dữ liệu, không chỉ trang hiện tại
    const totalValue = useMemo(
        () => allData.reduce((sum, record) => sum + (record.totalValue || 0), 0),
        [allData],
    );

    const exportedCount = useMemo(
        () => allData.filter((record) => record.status === 'EXPORTED').length,
        [allData],
    );

    const pendingCount = useMemo(
        () => allData.filter((record) => record.status === 'PENDING').length,
        [allData],
    );

    const cancelledCount = useMemo(
        () => allData.filter((record) => record.status === 'CANCELLED').length,
        [allData],
    );

    const averageValue = allData.length
        ? Math.round(totalValue / allData.length)
        : 0;

    const totalItems = pageData?.totalElements ?? filteredData.length;
    const totalPages = pageData?.totalPages ?? 1;
    const currentData = filteredData;

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, paginationInfo } = usePagination({
        itemsPerPage,
        totalItems,
        totalPages,
        onPageChange: (page) => fetchReportData(page, appliedFilters, true),
    });
    const startIndex = paginationInfo.startIndex;

    const buildRows = () =>
        allData.map((record, index) => ({
            STT: index + 1,
            'Mã phiếu': record.code,
            'Khách hàng': record.customerName || '-',
            'Ngày xuất': formatDateTime(record.exportsDate),
            'Trạng thái': statusLabels[record.status],
            'Giá trị': record.totalValue || 0,
        }));

    const handleExportExcel = async () => {
        if (!allData.length) {
            alert('Không có dữ liệu để xuất.');
            return;
        }
        try {
            const XLSX = await import('xlsx');
            const rows = buildRows();
            const sheet = XLSX.utils.json_to_sheet(
                rows.map((row) => ({
                    ...row,
                    'Giá trị': formatPrice(row['Giá trị']),
                })),
            );
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, sheet, 'Bao_cao_phieu_xuat');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `bao-cao-phieu-xuat-${date}.xlsx`);
        } catch (err) {
            console.error('Export excel error', err);
            alert('Xuất Excel thất bại.');
        }
    };

    const handleExportPDF = async () => {
        if (!allData.length) {
            alert('Không có dữ liệu để xuất.');
            return;
        }
        try {
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape' });
            await ensureVnFont(doc);
            doc.setFontSize(16);
            doc.text('Báo cáo phiếu xuất kho', 14, 18);
            doc.setFontSize(11);
            doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 14, 26);
            doc.text(`Tổng phiếu: ${allData.length}`, 14, 32);
            doc.text(`Tổng giá trị: ${formatPrice(totalValue)} đ`, 80, 32);

            autoTable(doc, {
                head: [['STT', 'Mã phiếu', 'Khách hàng', 'Ngày xuất', 'Trạng thái', 'Giá trị']],
                body: buildRows().map((row) => [
                    row.STT,
                    row['Mã phiếu'],
                    row['Khách hàng'],
                    row['Ngày xuất'],
                    row['Trạng thái'],
                    formatPrice(row['Giá trị']),
                ]),
                startY: 38,
                styles: { font: 'Roboto', fontSize: 9 },
                headStyles: { fillColor: [0, 153, 255], font: 'Roboto' },
            });

            const date = new Date().toISOString().split('T')[0];
            doc.save(`bao-cao-phieu-xuat-${date}.pdf`);
        } catch (err) {
            console.error('Export PDF error', err);
            alert('Xuất PDF thất bại.');
        }
    };

    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />
            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Báo cáo phiếu xuất</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">
                        Tổng hợp doanh thu và trạng thái phiếu xuất kho
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
                                        Khách hàng
                                    </label>
                                    <input
                                        type="text"
                                        value={filters.customer}
                                        onChange={(e) =>
                                            setFilters((prev) => ({ ...prev, customer: e.target.value }))}
                                        placeholder="Tên khách hàng"
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
                                        <p className="text-sm text-blue-gray-600 truncate">Tổng phiếu xuất</p>
                                        <p className="text-2xl font-bold text-blue-gray-800 mt-1 break-words">{allData.length}</p>
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
                                        <p className="text-sm text-blue-gray-600 truncate">Đã xuất kho</p>
                                        <p className="text-2xl font-bold text-green-600 mt-1 break-words">{exportedCount}</p>
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
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[#0099FF] text-white h-[48px] text-sm font-bold">
                                            <th className="px-3 text-center w-[80px]">STT</th>
                                            <th className="px-3 text-left w-[200px]">Mã phiếu</th>
                                            <th className="px-3 text-left w-[260px]">Khách hàng</th>
                                            <th className="px-3 text-center w-[200px]">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSort('date')}
                                                    className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition"
                                                >
                                                    Ngày xuất
                                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                                                        <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'date' && sortDirection === 'asc' ? 1 : 0.4} />
                                                        <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'date' && sortDirection === 'desc' ? 1 : 0.4} />
                                                    </svg>
                                                </button>
                                            </th>
                                            <th className="px-3 text-right w-[200px]">
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
                                            <th className="px-3 text-center w-[150px]">Trạng thái</th>
                                            <th className="px-3 text-left">Ghi chú</th>
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
                                            currentData.map((record, idx) => (
                                                <tr
                                                    key={record.id}
                                                    className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[48px]"
                                                >
                                                    <td className="px-3 text-center text-sm text-blue-gray-800">
                                                        {startIndex + idx + 1}
                                                    </td>
                                                    <td className="px-3 text-left text-sm font-medium">
                                                        {record.code}
                                                    </td>
                                                    <td className="px-3 text-left text-sm text-blue-gray-700">
                                                        {record.customerName || '-'}
                                                    </td>
                                                    <td className="px-3 text-center text-sm text-blue-gray-700">
                                                        {formatDateTime(record.exportsDate)}
                                                    </td>
                                                    <td className="px-3 text-right text-sm font-semibold text-green-600">
                                                        {formatPrice(record.totalValue || 0)}
                                                    </td>
                                                    <td className="px-3 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[record.status]}`}>
                                                            {statusLabels[record.status]}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 text-left text-sm text-blue-gray-600">
                                                        {record.note || record.description || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}

