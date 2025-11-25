'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getInternalImports, type InternalImport, type ExportStatus } from '@/services/inventory.service';

const statusConfig: Record<ExportStatus, { label: string; color: string }> = {
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

function formatDateTime(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN');
}

interface InternalSupplier {
    id: number;
    name: string;
    code?: string;
}

export default function PhieuNhapKhoNoiBo() {
    const router = useRouter();
    const [data, setData] = useState<InternalImport[]>([]);
    const [internalSuppliers, setInternalSuppliers] = useState<InternalSupplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<'totalValue' | 'importsDate' | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Filter states
    const [filterCode, setFilterCode] = useState('');
    const [filterStatus, setFilterStatus] = useState<ExportStatus | 'ALL'>('ALL');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [sourceStoreFilter, setSourceStoreFilter] = useState<number | 'ALL'>('ALL');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(7);

    const fetchInternalSuppliers = async () => {
        try {
            setLoadingSuppliers(true);
            const { getSuppliers } = await import('@/services/supplier.service');
            const list = await getSuppliers('INTERNAL');
            setInternalSuppliers(list);
        } catch (e) {
            console.error('Lỗi khi tải danh sách kho nội bộ:', e);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const loadImports = async () => {
        try {
            setLoading(true);
            setError(null);
            const imports: InternalImport[] = await getInternalImports({
                status: filterStatus === 'ALL' ? 'ALL' : filterStatus,
                code: filterCode || undefined,
                fromDate: filterFromDate || undefined,
                toDate: filterToDate || undefined,
            });

            // Apply source store filter
            const filtered = sourceStoreFilter === 'ALL'
                ? imports
                : imports.filter(im => im.sourceStoreId === sourceStoreFilter);

            setData(filtered);
            setCurrentPage(1);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Lỗi tải danh sách phiếu nhập nội bộ');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInternalSuppliers();
        loadImports();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSort = (field: 'totalValue' | 'importsDate') => {
        const newDirection =
            sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
        setSortField(field);
        setSortDirection(newDirection);

        const sorted = [...data].sort((a, b) => {
            if (field === 'totalValue') {
                const valueA = a.totalValue || 0;
                const valueB = b.totalValue || 0;
                return newDirection === 'asc' ? valueA - valueB : valueB - valueA;
            } else {
                const dateA = new Date(a.importsDate).getTime();
                const dateB = new Date(b.importsDate).getTime();
                return newDirection === 'asc' ? dateA - dateB : dateB - dateA;
            }
        });
        setData(sorted);
    };

    const handleSearchClick = () => {
        setCurrentPage(1);
        loadImports();
    };

    // Internal supplier map
    const supplierMap = new Map<number, string>();
    internalSuppliers.forEach((s) => supplierMap.set(s.id, s.name));

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

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {/* Filter Section */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="grid grid-cols-5 gap-4 mb-4">
                        {/* Mã phiếu */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã phiếu</label>
                            <input
                                type="text"
                                value={filterCode}
                                onChange={(e) => setFilterCode(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập mã phiếu"
                            />
                        </div>

                        {/* Nguồn nhập (Kho nội bộ) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nguồn nhập</label>
                            <div className="relative">
                                <select
                                    className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={sourceStoreFilter === 'ALL' ? 'ALL' : String(sourceStoreFilter)}
                                    onChange={(e) => setSourceStoreFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                    disabled={loadingSuppliers}
                                >
                                    <option value="ALL">Tất cả</option>
                                    {internalSuppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Tình trạng */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng</label>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as ExportStatus | 'ALL')}
                                    className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ALL">Tất cả</option>
                                    <option value="PENDING">Chờ duyệt</option>
                                    <option value="APPROVED">Đã duyệt</option>
                                    <option value="REJECTED">Từ chối</option>
                                    <option value="IMPORTED">Đã nhập</option>
                                    <option value="CANCELLED">Đã hủy</option>
                                </select>
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Từ ngày */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filterFromDate}
                                    onChange={(e) => setFilterFromDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Đến ngày */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filterToDate}
                                    onChange={(e) => setFilterToDate(e.target.value)}
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
                                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
                                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            {loading ? 'Đang tải...' : 'Tìm kiếm'}
                        </button>
                        <button
                            onClick={() => router.push('/orders/import/create-internal-import-receipt')}
                            className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                            Tạo phiếu nhập kho
                        </button>
                    </div>
                    {error && (
                        <p className="mt-3 text-sm text-red-600 text-right">{error}</p>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full table-fixed">
                            <colgroup>
                                <col className="w-[80px]" />
                                <col className="w-[180px]" />
                                <col className="w-[250px]" />
                                <col className="w-[180px]" />
                                <col className="w-[180px]" />
                                <col className="w-[180px]" />
                                <col className="w-[150px]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-[#0046ff] text-white h-[48px]">
                                    <th className="px-4 text-center font-bold text-sm">STT</th>
                                    <th className="px-4 text-center font-bold text-sm">Mã phiếu</th>
                                    <th className="px-4 text-center font-bold text-sm">Nguồn nhập</th>
                                    <th className="px-4 text-center font-bold text-sm">
                                        <button
                                            onClick={() => handleSort('totalValue')}
                                            className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                        >
                                            Giá trị
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white" className="transition-transform">
                                                <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'totalValue' && sortDirection === 'asc' ? 1 : 0.4} />
                                                <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'totalValue' && sortDirection === 'desc' ? 1 : 0.4} />
                                            </svg>
                                        </button>
                                    </th>
                                    <th className="px-4 text-center font-bold text-sm">
                                        <button
                                            onClick={() => handleSort('importsDate')}
                                            className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition-colors"
                                        >
                                            Thời gian
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="white" className="transition-transform">
                                                <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'importsDate' && sortDirection === 'asc' ? 1 : 0.4} />
                                                <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'importsDate' && sortDirection === 'desc' ? 1 : 0.4} />
                                            </svg>
                                        </button>
                                    </th>
                                    <th className="px-4 text-center font-bold text-sm">Tình trạng</th>
                                    <th className="px-4 text-center font-bold text-sm">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="text-center py-4 text-sm text-gray-500"
                                        >
                                            {loading
                                                ? 'Đang tải dữ liệu...'
                                                : 'Không có phiếu nhập nào'}
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((record, index) => (
                                        <tr
                                            key={record.id}
                                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                        >
                                            <td className="px-4 text-center text-sm">
                                                {startIndex + index + 1}
                                            </td>
                                            <td className="px-4 text-center text-sm">{record.code}</td>
                                            <td className="px-4 text-center text-sm">
                                                {supplierMap.get(record.sourceStoreId) || record.sourceStoreName || `Kho #${record.sourceStoreId}`}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {formatCurrency(record.totalValue)}
                                            </td>
                                            <td className="px-4 text-center text-sm whitespace-nowrap">
                                                {formatDateTime(record.importsDate)}
                                            </td>
                                            <td className="px-4 text-center">
                                                <span
                                                    className={`inline-block px-4 py-1 rounded-md text-sm font-medium text-black ${statusConfig[record.status].color}`}
                                                >
                                                    {statusConfig[record.status].label}
                                                </span>
                                            </td>
                                            <td className="px-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/orders/import/view-internal-import-receipt/${record.id}`,
                                                            )
                                                        }
                                                        className="hover:scale-110 transition-transform"
                                                        title="Xem chi tiết"
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                                                            if (
                                                                record.status !== 'IMPORTED' &&
                                                                record.status !== 'CANCELLED'
                                                            ) {
                                                                router.push(
                                                                    `/orders/import/edit-internal-import-receipt/${record.id}`,
                                                                );
                                                            }
                                                        }}
                                                        disabled={
                                                            record.status === 'IMPORTED' ||
                                                            record.status === 'CANCELLED'
                                                        }
                                                        className={`transition-transform ${record.status === 'IMPORTED' ||
                                                            record.status === 'CANCELLED'
                                                            ? 'opacity-40 cursor-not-allowed'
                                                            : 'hover:scale-110 cursor-pointer'
                                                            }`}
                                                        title={
                                                            record.status === 'IMPORTED' ||
                                                                record.status === 'CANCELLED'
                                                                ? 'Không thể chỉnh sửa'
                                                                : 'Chỉnh sửa'
                                                        }
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                            <path
                                                                d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                                                                stroke={
                                                                    record.status === 'IMPORTED' ||
                                                                        record.status === 'CANCELLED'
                                                                        ? '#9ca3af'
                                                                        : '#0046ff'
                                                                }
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                                stroke={
                                                                    record.status === 'IMPORTED' ||
                                                                        record.status === 'CANCELLED'
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
                                    ))
                                )}
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
