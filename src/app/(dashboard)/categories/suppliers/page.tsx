// src/app/(dashboard)/categories/suppliers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import {
    getSuppliers,
    searchSuppliers,
    deleteSupplier,
    type Supplier,
    type Page,
} from '@/services/supplier.service';
import { SUPPLIER_TYPE_LABELS } from '@/types/supplier';

export default function QuanLyNguonHang() {
    const router = useRouter();

    const [supplierPage, setSupplierPage] = useState<Page<Supplier> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchType, setSearchType] = useState('');
    const [searchPhone, setSearchPhone] = useState('');

    // Pagination state (server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = PAGE_SIZE;

    // Load data từ BE với pagination
    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError(null);
            const pageResult = await searchSuppliers({
                code: searchCode.trim() || undefined,
                name: searchName.trim() || undefined,
                type: searchType || undefined,
                phone: searchPhone.trim() || undefined,
                page: currentPage - 1, // Backend dùng 0-based
                size: itemsPerPage,
            });
            setSupplierPage(pageResult);
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
        loadSuppliers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload khi pagination thay đổi
    useEffect(() => {
        loadSuppliers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Reset về page 1 và reload khi filter thay đổi
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            loadSuppliers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchCode, searchName, searchType, searchPhone]);

    // Data từ BE
    const currentData = Array.isArray(supplierPage)
        ? supplierPage
        : (supplierPage?.content || []);
    const totalItems = Array.isArray(supplierPage)
        ? supplierPage.length
        : (supplierPage?.totalElements || 0);
    const totalPages = Array.isArray(supplierPage)
        ? 1
        : (supplierPage?.totalPages || 1);

    // Helper function để chuyển đổi type sang tiếng Việt
    const getTypeLabel = (type: string | null | undefined): string => {
        if (!type) return '-';
        const normalizedType = type.toUpperCase();
        return SUPPLIER_TYPE_LABELS[normalizedType as keyof typeof SUPPLIER_TYPE_LABELS] || type;
    };

    const handleDelete = async (id: number, name: string) => {
        const ok = window.confirm(`Xóa nhà cung cấp "${name}"?`);
        if (!ok) return;

        try {
            await deleteSupplier(id);
            // Reload data sau khi xóa
            loadSuppliers();
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Xóa nhà cung cấp thất bại';
            setError(msg);
        }
    };

    return (
        <PageLayout>
            {/* Filter Section */}
            <FilterSection
                error={error}
                onClearFilter={() => {
                    setSearchCode('');
                    setSearchName('');
                    setSearchType('');
                    setSearchPhone('');
                }}
                onCreateNew={() => router.push('/categories/suppliers/create')}
                createButtonText="Thêm mới nguồn"
            >
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Mã nguồn */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mã nguồn
                        </label>
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập mã nguồn"
                        />
                    </div>

                    {/* Tên nguồn */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tên nguồn
                        </label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập tên nguồn"
                        />
                    </div>

                    {/* Loại nguồn */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Loại nguồn
                        </label>
                        <div className="relative">
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-100 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                {Object.entries(SUPPLIER_TYPE_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>
                                        {label}
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
                </div>

                {/* SĐT */}
                <div className="flex items-center gap-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Số điện thoại
                    </label>
                    <input
                        type="text"
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập số điện thoại"
                    />
                </div>
            </FilterSection>

            {/* Table */}
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
                data={currentData as unknown as Record<string, unknown>[]}
                loading={loading}
                emptyMessage="Không có dữ liệu"
                startIndex={(currentPage - 1) * itemsPerPage}
                renderRow={(item, index) => {
                    const supplier = item as unknown as Supplier;
                    const supplierName = String(supplier.name ?? '');
                    const supplierType = supplier.type ? String(supplier.type) : null;
                    const supplierId = Number(supplier.id);
                    return (
                        <>
                            <td className="px-4 text-center text-sm">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {supplierName}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {getTypeLabel(supplierType)}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {String(supplier.code ?? '-')}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {String(supplier.phone ?? '-')}
                            </td>
                            <td className="px-4 text-center text-sm">
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
