// src/app/(dashboard)/categories/suppliers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import {
    searchSuppliers,
    deleteSupplier,
    type Supplier,
} from '@/services/supplier.service';
import { SUPPLIER_TYPE_LABELS } from '@/types/supplier';

export default function QuanLyNguonHang() {
    const router = useRouter();

    const [data, setData] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchType, setSearchType] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Load data từ BE với pagination
    const loadData = async (page: number = 1) => {
            try {
                setLoading(true);
                setError(null);
            const result = await searchSuppliers({
                code: searchCode || undefined,
                name: searchName || undefined,
                type: searchType || undefined,
                phone: searchPhone || undefined,
                page: page - 1, // Backend dùng 0-based
                size: PAGE_SIZE,
            });
            setData(result.content);
            setTotalPages(result.totalPages);
            setTotalItems(result.totalElements);
            } catch (e) {
                const msg =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được danh sách nguồn hàng';
                setError(msg);
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
        loadData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchCode, searchName, searchType, searchPhone]);

    // Helper function để chuyển đổi type sang tiếng Việt
    const getTypeLabel = (type: string | null | undefined): string => {
        if (!type) return '-';
        const normalizedType = type.toUpperCase();
        return SUPPLIER_TYPE_LABELS[normalizedType as keyof typeof SUPPLIER_TYPE_LABELS] || type;
    };

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, resetPage } = usePagination({
        itemsPerPage: PAGE_SIZE,
        totalItems,
        totalPages,
        onPageChange: loadData,
    });

    // Sử dụng hook useFilterReset để tái sử dụng logic reset filter
    const { handleResetFilter } = useFilterReset({
        resetFilters: () => {
            setSearchCode('');
            setSearchName('');
            setSearchType('');
            setSearchPhone('');
        },
        loadData: async (pageNum = 1) => {
            try {
                setLoading(true);
                setError(null);
                const result = await searchSuppliers({
                    code: undefined,
                    name: undefined,
                    type: undefined,
                    phone: undefined,
                    page: pageNum - 1,
                    size: PAGE_SIZE,
                });
                setData(result.content);
                setTotalPages(result.totalPages);
                setTotalItems(result.totalElements);
            } catch (e) {
                const msg =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được danh sách nguồn hàng';
                setError(msg);
            } finally {
                setLoading(false);
            }
        },
        resetPage,
        setLoading,
        setError,
    });

    const handleDelete = async (id: number, name: string) => {
        const ok = window.confirm(`Xóa nhà cung cấp "${name}"?`);
        if (!ok) return;

        try {
            await deleteSupplier(id);
            await loadData(currentPage); // Reload data sau khi xóa
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Xóa nhà cung cấp thất bại';
            setError(msg);
        }
    };

    const handleSearch = () => {
        loadData(1); // Reset về trang đầu khi search
    };

    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />
            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Nguồn hàng nhập</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Quản lý nguồn hàng nhập</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                        <FilterSection
                            error={error}
                            onClearFilter={handleResetFilter}
                            onCreateNew={() => router.push('/categories/suppliers/create')}
                            createButtonText="Thêm mới nguồn"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                {/* Mã nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Mã nguồn
                                    </label>
                                    <input
                                        type="text"
                                        value={searchCode}
                                        onChange={(e) => setSearchCode(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập mã nguồn"
                                    />
                                </div>

                                {/* Tên nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Tên nguồn
                                    </label>
                                    <input
                                        type="text"
                                        value={searchName}
                                        onChange={(e) => setSearchName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleSearch();
                                            }
                                        }}
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập tên nguồn"
                                    />
                                </div>

                                {/* Loại nguồn */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Loại nguồn
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={searchType}
                                            onChange={(e) => setSearchType(e.target.value)}
                                            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                                        >
                                            <option value="" className="bg-white">Tất cả</option>
                                            {Object.entries(SUPPLIER_TYPE_LABELS).map(([key, label]) => (
                                                <option key={key} value={key} className="bg-white">
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                        <svg
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-blue-gray-400"
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
                            </div>

                            {/* SĐT */}
                            <div className="flex items-center gap-3">
                                <label className="block text-sm font-medium text-blue-gray-800">
                                    Số điện thoại
                                </label>
                                <input
                                    type="text"
                                    value={searchPhone}
                                    onChange={(e) => setSearchPhone(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                    className="flex-1 px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                    placeholder="Nhập số điện thoại"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={handleSearch}
                                    className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2"
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
                                    Tìm kiếm
                                </button>
                            </div>
                        </FilterSection>

                    {/* Table */}
                    <div className="px-6 pb-6">
                        <DataTable
                            columns={[
                                { key: 'stt', label: 'STT', align: 'center' },
                                { key: 'name', label: 'Tên nguồn', align: 'center' },
                                { key: 'type', label: 'Loại nguồn', align: 'center' },
                                { key: 'code', label: 'Mã nguồn', align: 'center' },
                                { key: 'phone', label: 'Số điện thoại', align: 'center' },
                                { key: 'address', label: 'Địa chỉ', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={data as unknown as Record<string, unknown>[]}
                            loading={loading}
                            emptyMessage="Không có dữ liệu"
                            startIndex={(currentPage - 1) * PAGE_SIZE}
                            renderRow={(item, index) => {
                                const supplier = item as unknown as Supplier;
                                const supplierName = String(supplier.name ?? '');
                                const supplierType = supplier.type ? String(supplier.type) : null;
                                const supplierId = Number(supplier.id);
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {supplierName || '-'}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {getTypeLabel(supplierType)}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {String(supplier.code ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
                                            {String(supplier.phone ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
                                            {String(supplier.address ?? '-')}
                                        </td>
                                        <td className="px-4">
                                            <ActionButtons
                                                onView={() =>
                                                    router.push(`/categories/suppliers/detail/${supplierId}`)
                                                }
                                                onEdit={() =>
                                                    router.push(`/categories/suppliers/edit/${supplierId}`)
                                                }
                                                onDelete={() => handleDelete(supplierId, supplierName)}
                                            />
                                        </td>
                                    </>
                                );
                            }}
                        />

                        {totalItems > 0 && (
                            <div className="mt-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalItems={totalItems}
                                    itemsPerPage={PAGE_SIZE}
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
