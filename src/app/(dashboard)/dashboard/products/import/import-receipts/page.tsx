'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import {
    getAllImports,
    type SupplierImport,
    type ExportStatus, // 👈 dùng lại type từ service
    type Page,
} from '@/services/inventory.service';
import { type Supplier } from '@/services/supplier.service';
import {
    getStores,
    type Store,
} from '@/services/store.service';
import { PAGE_SIZE } from '@/constants/pagination';
import Pagination from '@/components/common/Pagination';

// dùng luôn ExportStatus làm ImportStatus cho đỡ rối
type ImportStatus = ExportStatus;

interface ImportRecord {
    id: number;
    code: string;
    supplier: string;
    value: string;
    datetime: string;
    status: ImportStatus;
    type: 'supplier' | 'employee';
}

const statusConfig: Record<ImportStatus, { label: string; color: string }> = {
    PENDING: { label: 'Chờ nhập', color: 'bg-[#fcbd17]' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-[#1ea849]' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-[#a0a0a0]' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-[#1ea849]' },
    REJECTED: { label: 'Từ chối', color: 'bg-[#ee4b3d]' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-[#3573eb]' },
    RETURNED: { label: 'Hoàn hàng', color: 'bg-[#b84ebb]' },
};

function formatCurrency(value: number | null | undefined) {
    const n = Number(value ?? 0);
    return new Intl.NumberFormat('vi-VN').format(n);
}

import { formatDateTime } from '@/lib/utils';

export default function ImportReceiptsPage() {
    const router = useRouter();

    const [importPage, setImportPage] = useState<Page<SupplierImport> | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [loadingStores, setLoadingStores] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // filter state
    const [codeFilter, setCodeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | ImportStatus>('ALL');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [supplierFilter, setSupplierFilter] = useState<number | 'ALL'>('ALL');
    const [storeFilter, setStoreFilter] = useState<number | 'ALL'>('ALL');

    // pagination state (server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = PAGE_SIZE;

    const fetchSuppliers = async () => {
        // Chỉ load nếu chưa có dữ liệu
        if (suppliers.length > 0) return;
        try {
            setLoadingSuppliers(true);
            const { getSuppliers } = await import('@/services/supplier.service');
            const list = await getSuppliers(); // Lấy tất cả suppliers (NCC, INTERNAL, STAFF, ...)
            setSuppliers(list);
        } catch (e) {
            console.error('Lỗi khi tải danh sách nguồn nhập:', e);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const fetchStores = async () => {
        // Chỉ load nếu chưa có dữ liệu
        if (stores.length > 0) return;
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

    const loadImports = async () => {
        try {
            setLoading(true);
            setError(null);

            // Gọi BE với pagination và filter
            const pageResult = await getAllImports({
                status: statusFilter === 'ALL' ? 'ALL' : statusFilter,
                code: codeFilter || undefined,
                from: fromDate || undefined,
                to: toDate || undefined,
                supplierId: supplierFilter === 'ALL' ? undefined : supplierFilter,
                storeId: storeFilter === 'ALL' ? undefined : storeFilter,
                page: currentPage - 1, // Backend dùng 0-based
                size: itemsPerPage,
            });

            console.log('📦 Import page result:', pageResult);
            console.log('📦 Import page result type:', typeof pageResult, Array.isArray(pageResult));
            console.log('📦 Import page result.content:', pageResult?.content);
            setImportPage(pageResult);
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
        // Load imports trước (quan trọng nhất)
        loadImports();
        // Lazy load suppliers/stores sau (load song song nhưng không block UI)
        Promise.all([fetchSuppliers(), fetchStores()]).catch(console.error);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload từ BE khi pagination thay đổi
    useEffect(() => {
        loadImports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Reset về page 1 và reload khi filter thay đổi (status, code, date, supplier, store)
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            loadImports();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, codeFilter, fromDate, toDate, supplierFilter, storeFilter]);

    const handleSearchClick = () => {
        setCurrentPage(1);
        loadImports();
    };

    const handleChangeStoreFilter = (value: string) => {
        const newFilter = value === 'ALL' ? 'ALL' : Number(value);
        setStoreFilter(newFilter);
        setCurrentPage(1);
    };

    // Supplier map
    const supplierMap = new Map<number, string>();
    suppliers.forEach((s) => supplierMap.set(s.id, s.name));

    // Store map
    const storeMap = new Map<number, string>();
    stores.forEach((s) => storeMap.set(s.id, s.name ?? ''));

    // Data từ BE đã được filter supplier/store
    // Nếu importPage là Array (fallback), dùng trực tiếp
    const currentData = Array.isArray(importPage)
        ? importPage
        : (importPage?.content || []);
    const totalItems = Array.isArray(importPage)
        ? importPage.length
        : (importPage?.totalElements || 0);
    const totalPages = Array.isArray(importPage)
        ? 1
        : (importPage?.totalPages || 1);
    const displayStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const displayEnd = Math.min(currentPage * itemsPerPage, totalItems);


    return (
        <PageLayout>
            {/* Filter Section */}
            <FilterSection
                error={error}
                onClearFilter={() => {
                    setCodeFilter('');
                    setStatusFilter('ALL');
                    setFromDate('');
                    setToDate('');
                    setSupplierFilter('ALL');
                    setStoreFilter('ALL');
                }}
                onCreateNew={() => router.push('/dashboard/products/import/create-import-receipt')}
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
                                    onFocus={() => fetchSuppliers()}
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
                                    onFocus={() => fetchStores()}
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
                            className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
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
                    startIndex={(currentPage - 1) * itemsPerPage}
                    renderRow={(record, index) => {
                        const importRecord = record as unknown as SupplierImport;
                        return (
                        <>
                            <td className="px-4 text-center text-sm">
                                {(currentPage - 1) * itemsPerPage + index + 1}
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

                                        importRecord.items.forEach(item => {
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
                                {formatCurrency(importRecord.totalValue)}
                            </td>
                            <td className="px-4 text-center text-sm whitespace-nowrap">
                                {formatDateTime(importRecord.importsDate)}
                            </td>
                            <td className="px-4 text-center">
                                <span
                                    className={`inline-block px-4 py-1 rounded-md text-sm font-medium text-black ${statusConfig[importRecord.status].color}`}
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

                {!loading && currentData.length > 0 && (
                    <div className="mt-4">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
        </PageLayout>
    );
}
