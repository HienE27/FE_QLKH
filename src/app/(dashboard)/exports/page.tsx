'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { searchExportsPaged, type SupplierExport, type ExportStatus, type PageResponse } from '@/services/inventory.service';
import { PAGE_SIZE } from '@/constants/pagination';
import { formatPrice, formatDateTime } from '@/lib/utils';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';

const statusConfig: Record<ExportStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ duyệt', color: 'bg-yellow-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-green-500' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-gray-500' },
};

export default function ExportsPage() {
    const router = useRouter();
    const { user } = useUser();
    const userRoles = user?.roles || [];

    const [pageData, setPageData] = useState<PageResponse<SupplierExport> | null>(null);

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.EXPORT_CREATE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterStatus, setFilterStatus] = useState<ExportStatus | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Pagination states
    const itemsPerPage = PAGE_SIZE;

    const loadExports = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);
            const result = await searchExportsPaged({
                status: filterStatus === 'ALL' ? 'ALL' : filterStatus,
                code: filterCode || undefined,
                from: filterFromDate || undefined,
                to: filterToDate || undefined,
                page: page - 1,
                size: itemsPerPage,
            });

            setPageData(result);
        } catch (err) {
            console.error('Error loading exports:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Lỗi tải danh sách phiếu xuất. Vui lòng kiểm tra backend đã chạy chưa.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExports(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearchClick = () => {
        loadExports(1);
    };

    const handleClearFilters = () => {
        setFilterCode('');
        setFilterStatus('ALL');
        setFilterFromDate('');
        setFilterToDate('');
        loadExports(1);
    };

    const handleDelete = async (id: number, code: string) => {
        // TODO: Implement delete export functionality when API is available
        alert('Chức năng xóa phiếu xuất đang được phát triển');
    };

    // Pagination calculations (từ BE)
    const totalItems = pageData?.totalElements ?? 0;
    const totalPages = pageData?.totalPages ?? 0;
    const currentData = pageData?.content ?? [];

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, paginationInfo } = usePagination({
        itemsPerPage,
        totalItems,
        totalPages,
        onPageChange: loadExports,
    });
    const startIndex = paginationInfo.startIndex;

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Phiếu xuất kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý phiếu xuất kho</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                <FilterSection
                    error={error}
                    onClearFilter={handleClearFilters}
                    onCreateNew={canCreate ? () => router.push('/exports/create') : undefined}
                    createButtonText="Tạo phiếu xuất"
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
                                    <option value="EXPORTED" className="bg-white">Đã xuất</option>
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
                </FilterSection>

                {/* Table */}
                <div className="px-6 pb-6">
                    <DataTable
                        columns={[
                            { key: 'stt', label: 'STT', align: 'center' },
                            { key: 'code', label: 'Mã phiếu', align: 'center' },
                            { key: 'customer', label: 'Khách hàng', align: 'center' },
                            { key: 'value', label: 'Giá trị', align: 'center' },
                            { key: 'date', label: 'Ngày tạo', align: 'center' },
                            { key: 'status', label: 'Tình trạng', align: 'center' },
                            { key: 'actions', label: 'Thao tác', align: 'center' },
                        ]}
                        data={currentData as unknown as Record<string, unknown>[]}
                        loading={loading}
                        emptyMessage="Không có phiếu xuất nào"
                        startIndex={startIndex}
                        renderRow={(record, index) => {
                            const exportReceipt = record as unknown as SupplierExport;
                            return (
                                <>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                        {startIndex + index + 1}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">{exportReceipt.code}</td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                        {exportReceipt.customerName || '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm font-semibold text-blue-gray-800">
                                        {formatPrice(exportReceipt.totalValue)}
                                    </td>
                                    <td className="px-4 text-center text-sm whitespace-nowrap">
                                        {formatDateTime(exportReceipt.createdAt || exportReceipt.createdDate || '')}
                                    </td>
                                    <td className="px-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium text-black whitespace-nowrap ${statusConfig[exportReceipt.status as ExportStatus]?.color || 'bg-gray-500'}`}>
                                            {statusConfig[exportReceipt.status as ExportStatus]?.label || exportReceipt.status}
                                        </span>
                                    </td>
                                    <td className="px-4">
                                        <ActionButtons
                                            onView={() => router.push(`/exports/view/${exportReceipt.id}`)}
                                            onEdit={() => router.push(`/exports/edit/${exportReceipt.id}`)}
                                            onDelete={() => handleDelete(exportReceipt.id, exportReceipt.code || '')}
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
                            itemsPerPage={itemsPerPage}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

