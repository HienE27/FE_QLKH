'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import ActionButtons from '@/components/common/ActionButtons';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { searchImportsPaged, type SupplierImport, type ExportStatus, type PageResponse } from '@/services/inventory.service';
import { PAGE_SIZE } from '@/constants/pagination';
import { formatPrice, formatDateTime } from '@/lib/utils';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { showToast } from '@/lib/toast';

const statusConfig: Record<ExportStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-green-500' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-gray-500' },
};

export default function ImportsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useUser();
    const userRoles = user?.roles || [];

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.IMPORT_CREATE);

    // Filter states, initialized from URL params
    const [filterCode, setFilterCode] = useState(searchParams.get('code') || '');
    const [filterStatus, setFilterStatus] = useState<ExportStatus | 'ALL'>((searchParams.get('status') as ExportStatus) || 'ALL');
    const [filterFromDate, setFilterFromDate] = useState(searchParams.get('from') || '');
    const [filterToDate, setFilterToDate] = useState(searchParams.get('to') || '');

    const debouncedFilterCode = useDebounce(filterCode, 500);

    const currentPageFromUrl = parseInt(searchParams.get('page') || '1');
    const [currentPage, setCurrentPage] = useState(currentPageFromUrl);

    // React Query for data fetching
    const { data: pageData, isLoading, isFetching, error, refetch } = useQuery<PageResponse<SupplierImport>, Error>({
        queryKey: ['imports', debouncedFilterCode, filterStatus, filterFromDate, filterToDate, currentPage],
        queryFn: async ({ signal }) => {
            const result = await searchImportsPaged({
                status: filterStatus === 'ALL' ? undefined : filterStatus,
                code: debouncedFilterCode || undefined,
                from: filterFromDate || undefined,
                to: filterToDate || undefined,
                page: currentPage - 1,
                size: PAGE_SIZE,
                signal,
            });
            return result;
        },
        staleTime: 30 * 1000, // 30 seconds stale time
        cacheTime: 5 * 60 * 1000, // 5 minutes cache time
        keepPreviousData: true, // Keep previous data while fetching new
    });

    // Sync URL with filter changes
    useEffect(() => {
        const newParams = new URLSearchParams();
        if (filterCode) newParams.set('code', filterCode);
        if (filterStatus !== 'ALL') newParams.set('status', filterStatus);
        if (filterFromDate) newParams.set('from', filterFromDate);
        if (filterToDate) newParams.set('to', filterToDate);
        if (currentPage > 1) newParams.set('page', String(currentPage));
        router.push(`?${newParams.toString()}`, { scroll: false });
    }, [filterCode, filterStatus, filterFromDate, filterToDate, currentPage, router]);

    const handleSearchClick = () => {
        setCurrentPage(1);
        refetch();
    };

    const handleClearFilters = () => {
        setFilterCode('');
        setFilterStatus('ALL');
        setFilterFromDate('');
        setFilterToDate('');
        setCurrentPage(1);
    };

    const handleDelete = async (id: number, code: string) => {
        // TODO: Implement delete import functionality when API is available
        showToast.info('Chức năng xóa phiếu nhập đang được phát triển');
    };

    // Pagination calculations (từ BE)
    const totalItems = pageData?.totalElements ?? 0;
    const totalPages = pageData?.totalPages ?? 0;
    const currentData = pageData?.content ?? [];
    const loading = isLoading || isFetching;
    const errorMessage = error ? (error instanceof Error ? error.message : 'Lỗi tải danh sách phiếu nhập') : null;

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage: pagedPage, handlePageChange, paginationInfo } = usePagination({
        itemsPerPage: PAGE_SIZE,
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

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Phiếu nhập kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý phiếu nhập kho</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <FilterSection
                    error={errorMessage}
                    onClearFilter={handleClearFilters}
                    onCreateNew={canCreate ? () => router.push('/imports/create') : undefined}
                    createButtonText="Tạo phiếu nhập"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {/* Mã phiếu */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">Mã phiếu</label>
                            <input
                                type="text"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                placeholder="Nhập mã phiếu"
                            />
                        </div>

                        {/* Tình trạng */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">Tình trạng</label>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as ExportStatus | 'ALL')}
                                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                >
                                    <option value="ALL" className="bg-white">Tất cả</option>
                                    <option value="PENDING" className="bg-white">Chờ duyệt</option>
                                    <option value="APPROVED" className="bg-white">Đã duyệt</option>
                                    <option value="IMPORTED" className="bg-white">Đã nhập</option>
                                    <option value="REJECTED" className="bg-white">Từ chối</option>
                                    <option value="CANCELLED" className="bg-white">Đã hủy</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Từ ngày */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">Từ ngày</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                            />
                        </div>

                        {/* Đến ngày */}
                        <div>
                            <label className="block text-sm font-medium text-blue-gray-800 mb-2">Đến ngày</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={handleSearchClick}
                            className="px-6 py-2 bg-white hover:bg-blue-gray-50 text-blue-gray-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-60 border border-blue-gray-300"
                            disabled={loading}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {loading ? 'Đang tải...' : 'Tìm kiếm'}
                        </button>
                    </div>
                    {/* Auto search khi debounced filter thay đổi */}
                    {debouncedFilterCode !== filterCode && (
                        <div className="text-xs text-blue-gray-500 mt-2">
                            Đang tìm kiếm...
                        </div>
                    )}
                </FilterSection>

                {/* Table */}
                <div className="px-6 pb-6">
                    <VirtualTable
                        columns={[
                            { key: 'stt', label: 'STT', align: 'center' },
                            { key: 'code', label: 'Mã phiếu', align: 'center' },
                            { key: 'supplier', label: 'Nguồn nhập', align: 'center' },
                            { key: 'value', label: 'Giá trị', align: 'center' },
                            { key: 'date', label: 'Ngày tạo', align: 'center' },
                            { key: 'status', label: 'Tình trạng', align: 'center' },
                            { key: 'actions', label: 'Thao tác', align: 'center' },
                        ]}
                        data={currentData as unknown as Record<string, unknown>[]}
                        loading={loading}
                        emptyMessage="Không có phiếu nhập nào"
                        startIndex={startIndex}
                        rowHeight={48}
                        viewportHeight={560}
                        renderRow={(record, index) => {
                            const importReceipt = record as unknown as SupplierImport;
                            return (
                                <>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">{importReceipt.code}</td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                        {importReceipt.supplierName || '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm font-semibold text-blue-gray-800">
                                        {formatPrice(importReceipt.totalValue)}
                                    </td>
                                    <td className="px-4 text-center text-sm whitespace-nowrap">
                                        {formatDateTime(importReceipt.createdAt || importReceipt.createdDate || '')}
                                    </td>
                                    <td className="px-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium text-black whitespace-nowrap ${statusConfig[importReceipt.status as ExportStatus]?.color || 'bg-gray-500'}`}>
                                            {statusConfig[importReceipt.status as ExportStatus]?.label || importReceipt.status}
                                        </span>
                                    </td>
                                    <td className="px-4">
                                        <ActionButtons
                                            onView={() => router.push(`/imports/view/${importReceipt.id}`)}
                                            onEdit={() => router.push(`/imports/edit/${importReceipt.id}`)}
                                            onDelete={() => handleDelete(importReceipt.id, importReceipt.code || '')}
                                        />
                                    </td>
                                </>
                            );
                        }}
                    />

                    {!loading && (pageData?.content?.length ?? 0) > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={PAGE_SIZE}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

