'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import {
    searchImportsPaged,
    type SupplierImport,
    type SupplierImportDetail,
    type ExportStatus, // 👈 dùng lại type từ service
    type PageResponse,
} from '@/services/inventory.service';
import { type Supplier } from '@/services/supplier.service';
import {
    getStores,
    type Store,
} from '@/services/store.service';
import { PAGE_SIZE } from '@/constants/pagination';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';

// dùng luôn ExportStatus làm ImportStatus cho đỡ rối
type ImportStatus = ExportStatus;

const statusConfig: Record<ImportStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ nhập', color: 'bg-yellow-500' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-green-600' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-red-500' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-amber-500' },
    REJECTED: { label: 'Từ chối', color: 'bg-red-500' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-blue-500' },
    RETURNED: { label: 'Hoàn hàng', color: 'bg-purple-500' },
};

import { formatPrice, formatDateTime } from '@/lib/utils';

export default function ImportReceiptsPage() {
    const router = useRouter();
    const { user } = useUser();
    const userRoles = user?.roles || [];

    const [pageData, setPageData] = useState<PageResponse<SupplierImport> | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [loadingStores, setLoadingStores] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.IMPORT_CREATE);

    // filter state
    const [codeFilter, setCodeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | ImportStatus>('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [supplierFilter, setSupplierFilter] = useState<number | 'ALL'>('ALL');
    const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

    // pagination state
    const itemsPerPage = PAGE_SIZE;

    const fetchSuppliers = async () => {
        try {
            setLoadingSuppliers(true);
            const { getSuppliers } = await import('@/services/supplier.service');
            const list = await getSuppliers(); // Lấy tất cả suppliers (NCC, INTERNAL, STAFF, ...)
            setSuppliers(list ?? []);
        } catch (e) {
            console.error('Lỗi khi tải danh sách nguồn nhập:', e);
            setSuppliers([]);
        } finally {
            setLoadingSuppliers(false);
        }
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

    const loadImports = async (page: number = 1) => {
        try {
            setLoading(true);
            setError(null);

            const result = await searchImportsPaged({
                status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
                code: codeFilter || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
                page: page - 1,
                size: itemsPerPage,
            });
            setPageData(result);
        } catch (err) {
            // tránh dùng any
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Lỗi tải danh sách phiếu nhập');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchStores();
        loadImports(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearchClick = () => {
        loadImports(1);
    };

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, resetPage } = usePagination({
        itemsPerPage,
        totalItems: pageData?.totalElements ?? 0,
        totalPages: pageData?.totalPages ?? 0,
        onPageChange: loadImports,
    });

    const handleChangeStoreFilter = (value: string) => {
        const newFilter = value === 'ALL' ? 'ALL' : Number(value);
        setStoreFilter(newFilter);
        loadImports(1);
    };

    // Supplier map
    const supplierMap = new Map<number, string>();
    suppliers.forEach((s) => supplierMap.set(s.id, s.name));

    // Store map
    const storeMap = new Map<number, string>();
    stores.forEach((s) => storeMap.set(s.id, s.name ?? ''));

    // Pagination calculations (từ BE)
    const totalItems = pageData?.totalElements ?? 0;
    const totalPages = pageData?.totalPages ?? 0;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = pageData?.content ?? [];
    // const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    // const displayEnd = Math.min(endIndex, totalItems);


    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />
            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Phiếu nhập kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Quản lý phiếu nhập kho</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    {/* Filter Section */}
                    <FilterSection
                            error={error}
                            onClearFilter={async () => {
                                setCodeFilter('');
                                setStatusFilter('ALL');
                                setFromDate('');
                                setToDate('');
                                setSupplierFilter('ALL');
                                setStoreFilter('ALL');
                                resetPage(); // Reset về trang 1 thông qua hook
                                // Gọi load với giá trị reset trực tiếp, không phụ thuộc vào state
                                try {
                                    setLoading(true);
                                    setError(null);
                                    const result = await searchImportsPaged({
                                        status: 'ALL',
                                        code: undefined,
                                        from: undefined,
                                        to: undefined,
                                        page: 0,
                                        size: itemsPerPage,
                                    });
                                    setPageData(result);
                                } catch (err) {
                                    if (err instanceof Error) {
                                        setError(err.message);
                                    } else {
                                        setError('Lỗi tải danh sách phiếu nhập');
                                    }
                                    console.error(err);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            onCreateNew={canCreate ? () => router.push('/dashboard/products/import/create-import-receipt') : undefined}
                            createButtonText="Tạo phiếu nhập kho"
                        >
                            <div className="grid grid-cols-6 gap-4 mb-4">
                                {/* Mã phiếu */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mã phiếu
                                    </label>
                                    <input
                                        type="text"
                                        value={codeFilter}
                                        onChange={(e) => setCodeFilter(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Nhập mã phiếu"
                                    />
                                </div>

                                {/* Nguồn nhập */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nguồn nhập
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={supplierFilter === 'ALL' ? 'ALL' : String(supplierFilter)}
                                            onChange={(e) => setSupplierFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                            disabled={loadingSuppliers}
                                        >
                                            <option value="ALL">Tất cả</option>
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
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

                                {/* Kho nhập */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Kho nhập
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

                                {/* Tình trạng */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tình trạng
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={statusFilter}
                                            onChange={(e) =>
                                                setStatusFilter(e.target.value as 'ALL' | ImportStatus)
                                            }
                                        >
                                            <option value="ALL">Tất cả</option>
                                            <option value="PENDING">Chờ nhập</option>
                                            <option value="IMPORTED">Đã nhập</option>
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

                                {/* Từ ngày */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Từ ngày
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Đến ngày */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Đến ngày
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={handleSearchClick}
                                    className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
                                    disabled={loading}
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
                        <DataTable
                            columns={[
                                { key: 'stt', label: 'STT', align: 'center' },
                                { key: 'code', label: 'Mã phiếu', align: 'center' },
                                { key: 'supplier', label: 'Nguồn nhập', align: 'center' },
                                { key: 'store', label: 'Kho nhập', align: 'center' },
                                { key: 'value', label: 'Giá trị', align: 'center' },
                                { key: 'datetime', label: 'Thời gian', align: 'center' },
                                { key: 'status', label: 'Tình trạng', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={currentData as unknown as Record<string, unknown>[]}
                            loading={loading}
                            emptyMessage="Không có phiếu nhập nào"
                            startIndex={startIndex}
                            renderRow={(record, index) => {
                                const importRecord = record as unknown as SupplierImport;
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {importRecord.code}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {importRecord.supplierName || supplierMap.get(importRecord.supplierId) || `NCC #${importRecord.supplierId}`}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {(() => {
                                                // Lấy danh sách các kho từ items nếu có
                                                if (importRecord.items && importRecord.items.length > 0) {
                                                    const storeSet = new Set<number>();
                                                    const storeNameMap = new Map<number, string>();

                                                    importRecord.items.forEach((item: SupplierImportDetail) => {
                                                        if (item.storeId) {
                                                            storeSet.add(item.storeId);
                                                            if (item.storeName) {
                                                                storeNameMap.set(item.storeId, item.storeName);
                                                            }
                                                        }
                                                    });

                                                    // Nếu không có storeId trong items, dùng storeId từ record
                                                    if (storeSet.size === 0 && importRecord.storeId) {
                                                        storeSet.add(importRecord.storeId);
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
                                                        {importRecord.storeName || storeMap.get(importRecord.storeId) || `Kho #${importRecord.storeId}`}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {formatPrice(importRecord.totalValue)}
                                        </td>
                                        <td className="px-4 text-center text-sm whitespace-nowrap">
                                            {formatDateTime(importRecord.importsDate)}
                                        </td>
                                        <td className="px-4 text-center">
                                            <span
                                                className={`inline-block px-3 py-1 rounded-md text-sm font-medium text-black whitespace-nowrap ${statusConfig[importRecord.status].color}`}
                                            >
                                                {statusConfig[importRecord.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4">
                                            <ActionButtons
                                                onView={() =>
                                                    router.push(`/dashboard/products/import/view-import-receipt/${importRecord.id}`)
                                                }
                                                onEdit={() => {
                                                    if (importRecord.status !== 'IMPORTED' && importRecord.status !== 'CANCELLED') {
                                                        router.push(`/dashboard/products/import/edit-import-receipt/${importRecord.id}`);
                                                    }
                                                }}
                                                disabled={importRecord.status === 'IMPORTED' || importRecord.status === 'CANCELLED'}
                                                editTitle={
                                                    importRecord.status === 'IMPORTED' || importRecord.status === 'CANCELLED'
                                                        ? 'Không thể chỉnh sửa'
                                                        : 'Chỉnh sửa'
                                                }
                                            />
                                        </td>
                                    </>
                                );
                            }}
                        />

                        {(pageData?.content?.length ?? 0) > 0 && (
                            <div className="mt-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={itemsPerPage}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
