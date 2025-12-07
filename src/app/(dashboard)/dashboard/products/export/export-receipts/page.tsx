'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import FilterSection from '@/components/common/FilterSection';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
    searchExportsPaged,
    type SupplierExport,
    type ExportStatus as BackendExportStatus,
    type PageResponse,
} from '@/services/inventory.service';
import {
    getStores,
    type Store,
} from '@/services/store.service';
import { PAGE_SIZE } from '@/constants/pagination';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { formatPrice, formatDateTime } from '@/lib/utils';

// Map trạng thái BE → label + màu
const statusConfig: Record<
    BackendExportStatus,
    { label: string; color: string }
> = {
    PENDING: { label: 'Chờ xuất', color: 'bg-yellow-500' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-green-600' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-blue-500' },
    RETURNED: { label: 'Hoàn hàng', color: 'bg-purple-500' },
};

type SortField = 'totalValue' | 'exportsDate';
type SortDirection = 'asc' | 'desc';

export default function ExportReceiptsPage() {
    const router = useRouter();
    const { user } = useUser();
    const userRoles = user?.roles || [];

    const [pageData, setPageData] = useState<PageResponse<SupplierExport> | null>(null);
    const [stores, setStores] = useState<Store[]>([]);

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.EXPORT_CREATE);

    const [loading, setLoading] = useState(false);
    const [loadingStores, setLoadingStores] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    // filter state
    const [codeFilter, setCodeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<
        BackendExportStatus | 'ALL'
    >('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

    // pagination state
    const itemsPerPage = PAGE_SIZE;

    // map storeId → name
    const storeMap = useMemo(() => {
        const map = new Map<number, string>();
        stores.forEach((s) => map.set(s.id, s.name ?? ''));
        return map;
    }, [stores]);

    // Sử dụng formatPrice và formatDateTime từ utils.ts

    const applySort = (
        list: SupplierExport[],
        field: SortField | null,
        direction: SortDirection,
    ) => {
        if (!field) return list;

        const sorted = [...list].sort((a, b) => {
            if (field === 'totalValue') {
                const va = a.totalValue ?? 0;
                const vb = b.totalValue ?? 0;
                return direction === 'asc' ? va - vb : vb - va;
            } else {
                const ta = new Date(a.exportsDate).getTime() || 0;
                const tb = new Date(b.exportsDate).getTime() || 0;
                return direction === 'asc' ? ta - tb : tb - ta;
            }
        });

        return sorted;
    };

    const fetchStores = async () => {
        try {
            setLoadingStores(true);
            const list = await getStores();
            setStores(list);
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách kho hàng';
            setError(msg);
        } finally {
            setLoadingStores(false);
        }
    };

    const fetchExports = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const result = await searchExportsPaged({
                status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
                code: codeFilter || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
                page: page - 1,
                size: itemsPerPage,
            });

            const sortedContent = applySort(result.content, sortField, sortDirection);
            setPageData({
                ...result,
                content: sortedContent,
            });
            // Note: currentPage được quản lý bởi usePagination hook
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách phiếu xuất kho';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Pagination calculations
    const totalItems = pageData?.totalElements ?? 0;
    const totalPages = pageData?.totalPages ?? 0;
    const currentData = pageData?.content ?? [];

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, paginationInfo, resetPage } = usePagination({
        itemsPerPage,
        totalItems,
        totalPages,
        onPageChange: fetchExports,
    });
    const startIndex = paginationInfo.startIndex;


    useEffect(() => {
        fetchStores();
        fetchExports(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSort = (field: SortField) => {
        const newDirection: SortDirection =
            sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

        setSortField(field);
        setSortDirection(newDirection);
        setPageData((prev) =>
            prev
                ? {
                    ...prev,
                    content: applySort(prev.content, field, newDirection),
                }
                : prev,
        );
    };

    const handleChangeStoreFilter = (value: string) => {
        const newFilter = value === 'ALL' ? 'ALL' : Number(value);
        setStoreFilter(newFilter);
        fetchExports(1);
    };


    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />
            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Phiếu xuất kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Quản lý phiếu xuất kho</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <FilterSection
                            error={error}
                            onClearFilter={async () => {
                                setCodeFilter('');
                                setStatusFilter('ALL');
                                setFromDate('');
                                setToDate('');
                                setStoreFilter('ALL');
                                setSortField(null);
                                setSortDirection('asc');
                                resetPage(); // Reset về trang 1 thông qua hook
                                // Gọi load với giá trị reset trực tiếp, không phụ thuộc vào state
                                try {
                                    setLoading(true);
                                    setError(null);
                                    const result = await searchExportsPaged({
                                        status: 'ALL',
                                        code: undefined,
                                        from: undefined,
                                        to: undefined,
                                        page: 0,
                                        size: itemsPerPage,
                                    });
                                    // Không sort khi reset
                                    setPageData(result);
                                } catch (e) {
                                    const msg =
                                        e instanceof Error
                                            ? e.message
                                            : 'Có lỗi xảy ra khi tải danh sách phiếu xuất kho';
                                    setError(msg);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            onCreateNew={canCreate ? () => router.push('/dashboard/products/export/create-export-receipt') : undefined}
                            createButtonText="Tạo phiếu xuất kho"
                        >
                            {error && (
                                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-5 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mã phiếu
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nhập mã phiếu"
                                        value={codeFilter}
                                        onChange={(e) => setCodeFilter(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Kho hàng
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={storeFilter === 'ALL' ? 'ALL' : String(storeFilter)}
                                            onChange={(e) => handleChangeStoreFilter(e.target.value)}
                                            disabled={loadingStores}
                                        >
                                            <option value="ALL">Tất cả</option>
                                            {stores.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} {s.code ? `(${s.code})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tình trạng
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={statusFilter}
                                            onChange={(e) =>
                                                setStatusFilter(
                                                    e.target.value as BackendExportStatus | 'ALL',
                                                )
                                            }
                                        >
                                            <option value="ALL">Tất cả</option>
                                            <option value="PENDING">Chờ xuất</option>
                                            <option value="EXPORTED">Đã xuất</option>
                                            <option value="CANCELLED">Đã hủy</option>
                                        </select>
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Từ ngày
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Đến ngày
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => fetchExports(1)}
                                    disabled={loading}
                                    className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
                                >
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                        <circle
                                            cx="7"
                                            cy="7"
                                            r="5"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                        <path
                                            d="M11 11L14 14"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    {loading ? 'Đang tải...' : 'Tìm kiếm'}
                                </button>
                            </div>
                        </FilterSection>

                    {/* Table */}
                    <div className="px-6 pb-6">
                        <div className="overflow-x-auto rounded-xl border border-blue-gray-100">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-[#0099FF] text-white h-[48px]">
                                        <th className="px-4 text-center font-bold text-sm">STT</th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Mã phiếu
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Khách hàng
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Kho hàng
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            <button
                                                onClick={() => handleSort('totalValue')}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Giá trị
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="white"
                                                >
                                                    <path
                                                        d="M8 3L11 7H5L8 3Z"
                                                        opacity={
                                                            sortField === 'totalValue' &&
                                                                sortDirection === 'asc'
                                                                ? 1
                                                                : 0.4
                                                        }
                                                    />
                                                    <path
                                                        d="M8 13L5 9H11L8 13Z"
                                                        opacity={
                                                            sortField === 'totalValue' &&
                                                                sortDirection === 'desc'
                                                                ? 1
                                                                : 0.4
                                                        }
                                                    />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            <button
                                                onClick={() => handleSort('exportsDate')}
                                                className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                            >
                                                Thời gian
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="white"
                                                >
                                                    <path
                                                        d="M8 3L11 7H5L8 3Z"
                                                        opacity={
                                                            sortField === 'exportsDate' &&
                                                                sortDirection === 'asc'
                                                                ? 1
                                                                : 0.4
                                                        }
                                                    />
                                                    <path
                                                        d="M8 13L5 9H11L8 13Z"
                                                        opacity={
                                                            sortField === 'exportsDate' &&
                                                                sortDirection === 'desc'
                                                                ? 1
                                                                : 0.4
                                                        }
                                                    />
                                                </svg>
                                            </button>
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Tình trạng
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!pageData || pageData.content.length === 0) && !loading && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="text-center text-sm text-gray-500 py-4"
                                            >
                                                Không có phiếu xuất kho nào
                                            </td>
                                        </tr>
                                    )}

                                    {currentData.map((record, index) => (
                                        <tr
                                            key={record.id}
                                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                        >
                                            <td className="px-4 text-center text-sm">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="px-4 text-center text-sm">{record.code}</td>
                                            <td className="px-4 text-center text-sm">
                                                {record.customerName || '-'}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {(() => {
                                                    // Lấy danh sách các kho từ items nếu có
                                                    if (record.items && record.items.length > 0) {
                                                        const storeSet = new Set<number>();
                                                        const storeNameMap = new Map<number, string>();

                                                        record.items.forEach(item => {
                                                            if (item.storeId) {
                                                                storeSet.add(item.storeId);
                                                                if (item.storeName) {
                                                                    storeNameMap.set(item.storeId, item.storeName);
                                                                }
                                                            }
                                                        });

                                                        // Nếu không có storeId trong items, dùng storeId từ record
                                                        if (storeSet.size === 0 && record.storeId) {
                                                            storeSet.add(record.storeId);
                                                        }

                                                        // Sắp xếp và hiển thị
                                                        const sortedStores = Array.from(storeSet).sort((a, b) => a - b);

                                                        if (sortedStores.length === 0) {
                                                            return <span className="text-gray-400">-</span>;
                                                        }

                                                        return (
                                                            <span>
                                                                {sortedStores.map((storeId, idx) => {
                                                                    const storeName = storeNameMap.get(storeId) || storeMap.get(storeId) || `Kho ${storeId}`;
                                                                    return (
                                                                        <span key={storeId}>
                                                                            {idx > 0 && ' | '}
                                                                            {storeName}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </span>
                                                        );
                                                    }

                                                    // Fallback: dùng storeId từ record
                                                    return (
                                                        <span>
                                                            {storeMap.get(record.storeId) ?? `Kho #${record.storeId}`}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {formatPrice(record.totalValue)}
                                            </td>
                                            <td className="px-4 text-center text-sm whitespace-nowrap">
                                                {formatDateTime(record.exportsDate)}
                                            </td>
                                            <td className="px-4 text-center">
                                                {statusConfig[record.status] && (
                                                    <span
                                                        className={`inline-block px-4 py-1 rounded-md text-sm font-medium text-black ${statusConfig[record.status].color}`}
                                                    >
                                                        {statusConfig[record.status].label}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/dashboard/products/export/view-export-receipt/${record.id}`,
                                                            )
                                                        }
                                                        className="hover:scale-110 transition-transform"
                                                        title="Xem chi tiết"
                                                    >
                                                        <svg
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
                                                                stroke="#0099FF"
                                                                strokeWidth="2"
                                                            />
                                                            <circle
                                                                cx="12"
                                                                cy="12.5"
                                                                r="3"
                                                                stroke="#0099FF"
                                                                strokeWidth="2"
                                                            />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (record.status !== 'EXPORTED' && record.status !== 'CANCELLED') {
                                                                router.push(
                                                                    `/dashboard/products/export/edit-export-receipt/${record.id}`,
                                                                );
                                                            }
                                                        }}
                                                        disabled={record.status === 'EXPORTED' || record.status === 'CANCELLED'}
                                                        className={`transition-transform ${record.status === 'EXPORTED' || record.status === 'CANCELLED'
                                                            ? 'opacity-40 cursor-not-allowed'
                                                            : 'hover:scale-110 cursor-pointer'
                                                            }`}
                                                        title={
                                                            record.status === 'EXPORTED' || record.status === 'CANCELLED'
                                                                ? 'Không thể chỉnh sửa'
                                                                : 'Chỉnh sửa'
                                                        }
                                                    >
                                                        <svg
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                                                                stroke={
                                                                    record.status === 'EXPORTED' || record.status === 'CANCELLED'
                                                                        ? '#9ca3af'
                                                                        : '#0099FF'
                                                                }
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                                stroke={
                                                                    record.status === 'EXPORTED' || record.status === 'CANCELLED'
                                                                        ? '#9ca3af'
                                                                        : '#0099FF'
                                                                }
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="mt-4">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
