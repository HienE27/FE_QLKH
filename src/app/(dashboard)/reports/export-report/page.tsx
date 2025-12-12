'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { ensureVnFont } from '@/lib/pdf';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { showToast } from '@/lib/toast';
import ReportFilters from '../components/ReportFilters';
import ReportSummary from '../components/ReportSummary';
import ReportTable from '../components/ReportTable';
import {
  searchExportsPaged,
  type SupplierExport,
  type ExportStatus,
  type PageResponse,
} from '@/services/inventory.service';
import { formatPrice, formatDateTime } from '@/lib/utils';

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
  CANCELLED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-600',
  IMPORTED: 'bg-blue-100 text-blue-700',
  RETURNED: 'bg-purple-100 text-purple-700',
};

const VIRTUAL_ROW_HEIGHT = 56;
const VIRTUAL_VIEWPORT_HEIGHT = 520;
const VIRTUAL_OVERSCAN = 8;

const defaultFilters = {
  code: '',
  customer: '',
  from: '',
  to: '',
  status: 'ALL' as FilterStatus,
};

export default function ExportReportPage() {
  const queryClient = useQueryClient();

  const [pageData, setPageData] = useState<PageResponse<SupplierExport> | null>(null);
  const [filteredData, setFilteredData] = useState<SupplierExport[]>([]);
  const [allDataForExport, setAllDataForExport] = useState<SupplierExport[]>([]);
  const [loadingAllData, setLoadingAllData] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);

  const debouncedFilters = {
    ...filters,
    customer: useDebounce(filters.customer, 400),
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
    data: SupplierExport[],
    customerKeyword: string,
  ) => {
    if (!customerKeyword) return data;
    const keyword = customerKeyword.toLowerCase();
    return data.filter((record) =>
      (record.customerName || '').toLowerCase().includes(keyword),
    );
  };

  // Chỉ load toàn bộ khi cần export Excel/PDF, với date range filter
  const loadAllDataForExport = async () => {
    if (loadingAllData) return;
    try {
      setLoadingAllData(true);
      // Load tất cả với date range filter để giảm dữ liệu
      const allExports: SupplierExport[] = [];
      let page = 0;
      let hasMore = true;
      
      while (hasMore) {
        const result = await searchExportsPaged({
          status: appliedFilters.status === 'ALL' ? 'ALL' : appliedFilters.status,
        code: appliedFilters.code || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
          page,
          size: 100, // Load 100 mỗi lần
        });
        
        allExports.push(...result.content);
        hasMore = !result.last && result.content.length > 0;
        page++;
        
        // Giới hạn tối đa 1000 bản ghi để tránh quá tải
        if (allExports.length >= 1000) break;
      }
      
      setAllDataForExport(applyClientFilters(allExports, appliedFilters.customer));
    } catch (err) {
      console.error('Error loading all data for export:', err);
      setAllDataForExport([]);
    } finally {
      setLoadingAllData(false);
    }
  };

  const pageQuery = useQuery<PageResponse<SupplierExport>>({
    queryKey: ['exports-report', appliedFilters, currentPage, sortField, sortDirection],
    queryFn: async () =>
      searchExportsPaged({
        status:
          appliedFilters.status === 'ALL'
            ? 'ALL'
            : appliedFilters.status,
        code: appliedFilters.code || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
        page: currentPage - 1,
        size: itemsPerPage,
        sortField,
        sortDir: sortDirection,
      }),
    staleTime: 60_000,
  });

  useEffect(() => {
    setLoading(pageQuery.isFetching && currentPage === 1);
  }, [pageQuery.isFetching, currentPage]);

  // Tính toán summary từ paginated data (ước lượng)
  const estimatedTotal = useMemo(() => {
    if (!pageData) return { total: 0, exported: 0, pending: 0, cancelled: 0 };
    // Ước lượng dựa trên tỷ lệ trong page hiện tại
    const pageExported = filteredData.filter(r => r.status === 'EXPORTED').length;
    const pagePending = filteredData.filter(r => r.status === 'PENDING').length;
    const pageCancelled = filteredData.filter(r => r.status === 'CANCELLED').length;
    const pageTotal = filteredData.length;
    
    if (pageTotal === 0) return { total: 0, exported: 0, pending: 0, cancelled: 0 };
    
    const ratio = pageData.totalElements / pageTotal;
    return {
      total: pageData.totalElements,
      exported: Math.round(pageExported * ratio),
      pending: Math.round(pagePending * ratio),
      cancelled: Math.round(pageCancelled * ratio),
    };
  }, [pageData, filteredData]);

  useEffect(() => {
    if (pageQuery.data) {
      setPageData(pageQuery.data);
      setFilteredData(applyClientFilters(pageQuery.data.content, appliedFilters.customer));
      setError(null);
    }
    if (pageQuery.error instanceof Error) {
      setError(pageQuery.error.message);
    } else if (pageQuery.error) {
      setError('Không thể tải báo cáo phiếu xuất');
    }
  }, [pageQuery.data, pageQuery.error, appliedFilters.customer]);

  // Load toàn bộ data khi filter được apply để tính statistics chính xác
  useEffect(() => {
    // Load data ngay khi filter được apply (bao gồm cả khi không có filter - load tất cả)
    loadAllDataForExport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  const handleSearch = () => {
    const nextFilters = { ...filters, customer: debouncedFilters.customer, code: debouncedFilters.code };
    setAppliedFilters(nextFilters);
    setCurrentPage(1);
    setAllDataForExport([]); // Reset all data khi filter thay đổi
    queryClient.invalidateQueries({ queryKey: ['exports-report'] });
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setSortField('date');
    setSortDirection('desc');
    setCurrentPage(1);
    setAllDataForExport([]); // Reset all data
    queryClient.invalidateQueries({ queryKey: ['exports-report'] });
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

  const exportedCount = useMemo(() => {
    if (allDataForExport.length > 0) {
      return allDataForExport.filter((record) => record.status === 'EXPORTED').length;
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
  }, [pagedPage, currentPage]);


  const handleExportExcel = async () => {
    // Load tất cả data nếu chưa có
    let dataToExport = allDataForExport;
    if (dataToExport.length === 0) {
      await loadAllDataForExport();
      // Đợi state update - reload từ state sau khi load xong
      await new Promise(resolve => setTimeout(resolve, 100));
      dataToExport = allDataForExport;
      if (dataToExport.length === 0) {
        showToast.error('Không có dữ liệu để xuất. Vui lòng kiểm tra lại bộ lọc.');
        return;
      }
    }
    try {
      const XLSX = await import('xlsx');
      const rows = dataToExport.map((record, index) => ({
      STT: index + 1,
      'Mã phiếu': record.code,
      'Khách hàng': record.customerName || '-',
      'Ngày xuất': formatDateTime(record.exportsDate),
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
      XLSX.utils.book_append_sheet(workbook, sheet, 'Bao_cao_phieu_xuat');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `bao-cao-phieu-xuat-${date}.xlsx`);
    } catch (err) {
      console.error('Export excel error', err);
      showToast.error('Xuất Excel thất bại.');
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
        showToast.error('Không có dữ liệu để xuất. Vui lòng kiểm tra lại bộ lọc.');
      return;
      }
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
      doc.text(`Tổng phiếu: ${dataToExport.length}`, 14, 32);
      const exportTotalValue = dataToExport.reduce((sum, r) => sum + (r.totalValue || 0), 0);
      doc.text(`Tổng giá trị: ${formatPrice(exportTotalValue)} đ`, 80, 32);

      const rows = dataToExport.map((record, index) => ({
        STT: index + 1,
        'Mã phiếu': record.code,
        'Khách hàng': record.customerName || '-',
        'Ngày xuất': formatDateTime(record.exportsDate),
        'Trạng thái': statusLabels[record.status],
        'Giá trị': record.totalValue || 0,
      }));

      autoTable(doc, {
        head: [['STT', 'Mã phiếu', 'Khách hàng', 'Ngày xuất', 'Trạng thái', 'Giá trị']],
        body: rows.map((row) => [
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
      showToast.error('Xuất PDF thất bại.');
    }
  };

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Báo cáo phiếu xuất</h1>
        <p className="text-sm text-blue-gray-600 uppercase">
          Theo dõi giá trị và trạng thái phiếu xuất kho
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
        <div className="p-6 space-y-6">
          <ReportFilters
            filters={filters}
            partnerKey="customer"
            partnerLabel="Khách hàng"
            statusOptions={statusOptions}
            loading={loading}
            error={error}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
          />

          <ReportSummary
            totalLabel="Tổng phiếu xuất"
            processedLabel="Đã xuất kho"
            cancelledLabel="Đã hủy"
            totalCount={allDataForExport.length > 0 ? allDataForExport.length : (pageData?.totalElements ?? 0)}
            totalValue={totalValue}
            processedCount={exportedCount}
            pendingCount={pendingCount}
            cancelledCount={cancelledCount}
            averageValue={averageValue}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          />

          <ReportTable
            loading={loading}
            currentData={currentData}
            visibleRows={visibleRows}
            paddingTop={paddingTop}
            paddingBottom={paddingBottom}
            startIndex={startIndex}
            startVirtualIndex={startVirtualIndex}
            sortField={sortField}
            sortDirection={sortDirection}
            onToggleSort={toggleSort}
            dateLabel="Ngày xuất"
            valueLabel="Tổng tiền"
            partnerLabel="Khách hàng"
            getCode={(row) => (row as SupplierExport).code}
            getPartner={(row) => (row as SupplierExport).customerName}
            getDate={(row) => formatDateTime((row as SupplierExport).exportsDate)}
            getValue={(row) => (row as SupplierExport).totalValue || 0}
            getStatus={(row) => (row as SupplierExport).status}
            getNote={(row) => (row as SupplierExport).note}
            statusLabels={statusLabels}
            statusColor={statusColor}
            formatPrice={formatPrice}
            onScroll={(scrollTop) => setVirtualScrollTop(scrollTop)}
          />

                <div className="p-4">
            <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={handlePageChange} />
          </div>
        </div>
      </div>
    </>
  );
}

