'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import ActionButtons from '@/components/common/ActionButtons';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { searchInventoryChecksPaged, deleteInventoryCheck, type InventoryCheck, type InventoryCheckStatus, type PageResponse } from '@/services/inventory.service';
import { PAGE_SIZE } from '@/constants/pagination';

const statusConfig: Record<InventoryCheckStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ nhập', color: 'bg-yellow-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
};

import { formatPrice, formatDateTime } from '@/lib/utils';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';

export default function InventoryChecksPage() {
    const router = useRouter();
    const { user } = useUser();
    const { confirm } = useConfirm();
    const userRoles = user?.roles || [];

    const [pageData, setPageData] = useState<PageResponse<InventoryCheck> | null>(null);

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_CREATE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // const [sortField, setSortField] = useState<'totalDifferenceValue' | 'checkDate' | null>(null);
    // const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterStatus, setFilterStatus] = useState<InventoryCheckStatus | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Pagination states
    const itemsPerPage = PAGE_SIZE;

    const loadChecks = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);
            const result = await searchInventoryChecksPaged({
                status: filterStatus === 'ALL' ? 'ALL' : filterStatus,
                checkCode: filterCode || undefined,
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
                page: page - 1,
                size: itemsPerPage,
            });

            // Debug: Loaded checks (commented for production)
            // console.log('✅ Loaded checks:', result);
            setPageData(result);
            // Note: currentPage được quản lý bởi usePagination hook
        } catch (err) {
            console.error('❌ Error loading checks:', err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Lỗi tải danh sách phiếu kiểm kê. Vui lòng kiểm tra backend đã chạy chưa.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadChecks(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // const handleSort = (field: 'totalDifferenceValue' | 'checkDate') => {
    //     const newDirection =
    //         sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    //     setSortField(field);
    //     setSortDirection(newDirection);

    //     const sorted = [...data].sort((a, b) => {
    //         if (field === 'totalDifferenceValue') {
    //             const valueA = a.totalDifferenceValue || 0;
    //             const valueB = b.totalDifferenceValue || 0;
    //             return newDirection === 'asc' ? valueA - valueB : valueB - valueA;
    //         } else {
    //             const dateA = new Date(a.checkDate).getTime();
    //             const dateB = new Date(b.checkDate).getTime();
    //             return newDirection === 'asc' ? dateA - dateB : dateB - dateA;
    //         }
    //     });
    //     setData(sorted);
    // };

    const handleSearchClick = () => {
        loadChecks(1);
    };

    const handleClearFilters = () => {
        setFilterCode('');
        setFilterStatus('ALL');
        setFilterFromDate('');
        setFilterToDate('');
        loadChecks(1);
    };

    const handleDelete = async (id: number, checkCode: string) => {
        confirm({
            title: 'Xác nhận xóa',
            message: `Bạn có chắc chắn muốn xóa phiếu kiểm kê ${checkCode}?`,
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    await deleteInventoryCheck(id);
                    showToast.success('Xóa phiếu kiểm kê thành công!');
                    loadChecks();
                } catch (err) {
                    showToast.error(err || 'Không thể xóa phiếu kiểm kê');
                }
            },
        });
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
        onPageChange: loadChecks,
    });
    const startIndex = paginationInfo.startIndex;


    return (
        <>
            <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Kiểm kê kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Quản lý kiểm kê kho</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <FilterSection
                            error={error}
                            onClearFilter={handleClearFilters}
                            onCreateNew={canCreate ? () => router.push('/inventory/create-inventory-check') : undefined}
                            createButtonText="Tạo phiếu kiểm kê"
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
                                            onChange={(e) => setFilterStatus(e.target.value as InventoryCheckStatus | 'ALL')}
                                            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                        >
                                            <option value="ALL" className="bg-white">Tất cả</option>
                                            <option value="PENDING" className="bg-white">Chờ duyệt</option>
                                            <option value="APPROVED" className="bg-white">Đã duyệt</option>
                                            <option value="REJECTED" className="bg-white">Từ chối</option>
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
                        <VirtualTable
                            columns={[
                                { key: 'stt', label: 'STT', align: 'center' },
                                { key: 'code', label: 'Mã phiếu', align: 'center' },
                                { key: 'description', label: 'Mô tả', align: 'center' },
                                { key: 'difference', label: 'Chênh lệch', align: 'center' },
                                { key: 'date', label: 'Ngày kiểm kê', align: 'center' },
                                { key: 'status', label: 'Tình trạng', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={currentData as unknown as Record<string, unknown>[]}
                            loading={loading}
                            emptyMessage="Không có phiếu kiểm kê nào"
                            startIndex={startIndex}
                            rowHeight={48}
                            viewportHeight={560}
                            renderRow={(record, index) => {
                                const check = record as unknown as InventoryCheck;
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">{check.checkCode}</td>
                                        <td className="px-4 text-center text-sm truncate text-blue-gray-400" title={check.description || ''}>
                                            {check.description || '-'}
                                        </td>
                                        <td className={`px-4 text-center text-sm font-medium ${check.totalDifferenceValue > 0 ? 'text-green-400' : check.totalDifferenceValue < 0 ? 'text-red-400' : 'text-blue-gray-400'}`}>
                                            {formatPrice(check.totalDifferenceValue)}
                                        </td>
                                        <td className="px-4 text-center text-sm whitespace-nowrap">
                                            {formatDateTime(check.checkDate)}
                                        </td>
                                        <td className="px-4 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium text-black whitespace-nowrap ${statusConfig[check.status].color}`}>
                                                {statusConfig[check.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4">
                                            <ActionButtons
                                                onView={() => router.push(`/inventory/view-inventory-check/${check.id}`)}
                                                onEdit={() => router.push(`/inventory/edit-inventory-check/${check.id}`)}
                                                onDelete={() => handleDelete(check.id, check.checkCode)}
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
