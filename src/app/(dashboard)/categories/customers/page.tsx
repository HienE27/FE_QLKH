// src/app/(dashboard)/categories/customers/page.tsx
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
    getCustomers,
    searchCustomers,
    deleteCustomer,
    type Customer,
    type Page,
} from '@/services/customer.service';

export default function QuanLyKhachHang() {
    const router = useRouter();

    const [customerPage, setCustomerPage] = useState<Page<Customer> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchPhone, setSearchPhone] = useState('');

    // Pagination state (server-side)
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = PAGE_SIZE;

    // Load data từ BE với pagination
    const loadCustomers = async () => {
        try {
            setLoading(true);
            setError(null);
            const pageResult = await searchCustomers({
                code: searchCode.trim() || undefined,
                name: searchName.trim() || undefined,
                phone: searchPhone.trim() || undefined,
                page: currentPage - 1, // Backend dùng 0-based
                size: itemsPerPage,
            });
            setCustomerPage(pageResult);
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : 'Không tải được danh sách khách hàng';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload khi pagination thay đổi
    useEffect(() => {
        loadCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Reset về page 1 và reload khi filter thay đổi
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        } else {
            loadCustomers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchCode, searchName, searchPhone]);

    // Data từ BE
    const currentData = Array.isArray(customerPage)
        ? customerPage
        : (customerPage?.content || []);
    const totalItems = Array.isArray(customerPage)
        ? customerPage.length
        : (customerPage?.totalElements || 0);
    const totalPages = Array.isArray(customerPage)
        ? 1
        : (customerPage?.totalPages || 1);


    const handleDelete = async (id: number, name: string) => {
        const ok = window.confirm(`Xóa khách hàng "${name}"?`);
        if (!ok) return;

        try {
            await deleteCustomer(id);
            // Reload data sau khi xóa
            loadCustomers();
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Xóa khách hàng thất bại';
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
                    setSearchPhone('');
                }}
                onCreateNew={() => router.push('/categories/customers/create')}
                createButtonText="Thêm mới khách hàng"
            >
                <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Mã khách hàng */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mã khách hàng
                        </label>
                        <input
                            type="text"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập mã khách hàng"
                        />
                    </div>

                    {/* Tên khách hàng */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tên khách hàng
                        </label>
                        <input
                            type="text"
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập tên khách hàng"
                        />
                    </div>

                    {/* SĐT */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Số điện thoại
                        </label>
                        <input
                            type="text"
                            value={searchPhone}
                            onChange={(e) => setSearchPhone(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nhập số điện thoại"
                        />
                    </div>
                </div>

            </FilterSection>

            {/* Table */}
            <DataTable
                columns={[
                    { key: 'stt', label: 'STT', align: 'center' },
                    { key: 'code', label: 'Mã khách hàng', align: 'center' },
                    { key: 'name', label: 'Tên khách hàng', align: 'center' },
                    { key: 'phone', label: 'Số điện thoại', align: 'center' },
                    { key: 'address', label: 'Địa chỉ', align: 'center' },
                    { key: 'actions', label: 'Thao tác', align: 'center' },
                ]}
                data={currentData as unknown as Record<string, unknown>[]}
                loading={loading}
                emptyMessage="Không có dữ liệu"
                startIndex={(currentPage - 1) * itemsPerPage}
                renderRow={(item, index) => {
                    const customer = item as unknown as Customer;
                    const customerName = String(customer.name ?? customer.fullName ?? '');
                    const customerId = Number(customer.id);
                    return (
                        <>
                            <td className="px-4 text-center text-sm">
                                {(currentPage - 1) * itemsPerPage + index + 1}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {String(customer.code ?? '-')}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {customerName}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {String(customer.phone ?? '-')}
                            </td>
                            <td className="px-4 text-center text-sm">
                                {String(customer.address ?? '-')}
                            </td>
                            <td className="px-4">
                                <ActionButtons
                                    onView={() =>
                                        router.push(`/categories/customers/detail/${customerId}`)
                                    }
                                    onEdit={() =>
                                        router.push(`/categories/customers/edit/${customerId}`)
                                    }
                                    onDelete={() => handleDelete(customerId, customerName)}
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
