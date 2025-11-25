'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
    getSupplierExports,
    type SupplierExport,
    type ExportStatus as BackendExportStatus,
} from '@/services/inventory.service';
import {
    getSuppliers,
    type Supplier,
} from '@/services/supplier.service';

// Map trạng thái BE → label + màu
const statusConfig: Record<
    BackendExportStatus,
    { label: string; color: string }
> = {
    PENDING: { label: 'Chờ xuất', color: 'bg-[#fcbd17]' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-[#1ea849]' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-[#a0a0a0]' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-[#1ea849]' },
    REJECTED: { label: 'Từ chối', color: 'bg-[#ee4b3d]' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-[#3573eb]' },
    RETURNED: { label: 'Hoàn hàng', color: 'bg-[#b84ebb]' },
};

type SortField = 'totalValue' | 'exportsDate';
type SortDirection = 'asc' | 'desc';

export default function ExportReceiptsPage() {
    const router = useRouter();

    const [data, setData] = useState<SupplierExport[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
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
    const [supplierFilter, setSupplierFilter] = useState<number | 'ALL'>('ALL');

    // pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(7);

    // map supplierId → name
    const supplierMap = useMemo(() => {
        const map = new Map<number, string>();
        suppliers.forEach((s) => map.set(s.id, s.name));
        return map;
    }, [suppliers]);

    const formatCurrency = (value: number) =>
        value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

    const formatDateTime = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        const date = d.toLocaleDateString('vi-VN');
        const time = d.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${date}  ${time}`;
    };

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

    const applySupplierFilter = (list: SupplierExport[]) => {
        if (supplierFilter === 'ALL') return list;
        return list.filter((e) => e.supplierId === supplierFilter);
    };

    const fetchSuppliers = async () => {
        try {
            setLoadingSuppliers(true);
            const list = await getSuppliers();
            setSuppliers(list);
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách nhà cung cấp';
            setError(msg);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const fetchExports = async () => {
        try {
            setLoading(true);
            setError(null);

            const exports = await getSupplierExports({
                status: statusFilter,
                code: codeFilter || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
            });

            const afterSupplierFilter = applySupplierFilter(exports);
            const afterSort = applySort(afterSupplierFilter, sortField, sortDirection);
            setData(afterSort);
            setCurrentPage(1);
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
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(endIndex, totalItems);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    useEffect(() => {
        fetchSuppliers();
        fetchExports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSort = (field: SortField) => {
        const newDirection: SortDirection =
            sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';

        setSortField(field);
        setSortDirection(newDirection);
        setData((prev) => applySort(prev, field, newDirection));
    };

    const handleChangeSupplierFilter = (value: string) => {
        const newFilter = value === 'ALL' ? 'ALL' : Number(value);
        setSupplierFilter(newFilter);
        setData((prev) =>
            applySort(
                newFilter === 'ALL'
                    ? prev
                    : prev.filter((e) => e.supplierId === newFilter),
                sortField,
                sortDirection,
            ),
        );
    };

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
                                Nhà cung cấp
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={supplierFilter === 'ALL' ? 'ALL' : String(supplierFilter)}
                                    onChange={(e) => handleChangeSupplierFilter(e.target.value)}
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
                            onClick={fetchExports}
                            disabled={loading}
                            className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
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
                        <button
                            onClick={() =>
                                router.push('/dashboard/products/export/create-export-receipt')
                            }
                            className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M8 3V13M3 8H13"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Tạo phiếu xuất kho
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#0046ff] text-white h-[48px]">
                                    <th className="px-4 text-center font-bold text-sm">STT</th>
                                    <th className="px-4 text-center font-bold text-sm">
                                        Mã phiếu
                                    </th>
                                    <th className="px-4 text-center font-bold text-sm">
                                        Nhà cung cấp
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
                                {data.length === 0 && !loading && (
                                    <tr>
                                        <td
                                            colSpan={7}
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
                                            {supplierMap.get(record.supplierId) ??
                                                `NCC #${record.supplierId}`}
                                        </td>
                                        <td className="px-4 text-center text-sm">
                                            {formatCurrency(record.totalValue)}
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
                                                                    : '#0046ff'
                                                            }
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                        />
                                                        <path
                                                            d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                            stroke={
                                                                record.status === 'EXPORTED' || record.status === 'CANCELLED'
                                                                    ? '#9ca3af'
                                                                    : '#0046ff'
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
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                            Hiển thị {displayStart} - {displayEnd}/{totalItems} bản ghi
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Trước
                            </button>
                            <span className="px-4 py-2 text-sm">
                                Trang {currentPage}/{totalPages || 1}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= totalPages}
                                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
