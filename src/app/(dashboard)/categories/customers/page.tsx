// src/app/(dashboard)/categories/customers/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import { useDebounce } from '@/hooks/useDebounce';
import {
    searchCustomers,
    deleteCustomer,
    type Customer,
} from '@/services/customer.service';

export default function QuanLyKhachHang() {
    const router = useRouter();

    const [data, setData] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchPhone, setSearchPhone] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Debounce search inputs (500ms)
    const debouncedSearchCode = useDebounce(searchCode, 500);
    const debouncedSearchName = useDebounce(searchName, 500);
    const debouncedSearchPhone = useDebounce(searchPhone, 500);

    // Load data từ BE với pagination
    const loadData = async (page: number = 1) => {
            try {
                setLoading(true);
                setError(null);
            const result = await searchCustomers({
                code: debouncedSearchCode || undefined,
                name: debouncedSearchName || undefined,
                phone: debouncedSearchPhone || undefined,
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
                        : 'Không tải được danh sách khách hàng';
                setError(msg);
            } finally {
                setLoading(false);
            }
    };

    useEffect(() => {
        loadData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchCode, debouncedSearchName, debouncedSearchPhone]);


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
            setSearchPhone('');
        },
        loadData: async (page = 1) => {
            try {
                setLoading(true);
                setError(null);
                const response = await searchCustomers({
                    code: undefined,
                    name: undefined,
                    phone: undefined,
                    page: page - 1,
                size: PAGE_SIZE,
            });
                setData(response.content);
                setTotalPages(response.totalPages);
                setTotalItems(response.totalElements);
            } catch (e) {
                const msg =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được danh sách khách hàng';
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
        const ok = window.confirm(`Xóa khách hàng "${name}"?`);
        if (!ok) return;

        try {
            await deleteCustomer(id);
            await loadData(currentPage); // Reload data sau khi xóa
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Xóa khách hàng thất bại';
            setError(msg);
        }
    };

    const handleSearch = () => {
        loadData(1); // Reset về trang đầu khi search
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Khách hàng</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý khách hàng</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                        <FilterSection
                            error={error}
                            onClearFilter={handleResetFilter}
                            onCreateNew={() => router.push('/categories/customers/create')}
                            createButtonText="Thêm mới khách hàng"
                        >
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                {/* Mã khách hàng */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Mã khách hàng
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
                                        placeholder="Nhập mã khách hàng"
                                    />
                                </div>

                                {/* Tên khách hàng */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                                        Tên khách hàng
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
                                        placeholder="Nhập tên khách hàng"
                                    />
                                </div>

                                {/* SĐT */}
                                <div>
                                    <label className="block text-sm font-medium text-blue-gray-800 mb-2">
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
                                        className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                                        placeholder="Nhập số điện thoại"
                                    />
                                </div>
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
                                { key: 'code', label: 'Mã khách hàng', align: 'center' },
                                { key: 'name', label: 'Tên khách hàng', align: 'center' },
                                { key: 'phone', label: 'Số điện thoại', align: 'center' },
                                { key: 'address', label: 'Địa chỉ', align: 'center' },
                                { key: 'actions', label: 'Thao tác', align: 'center' },
                            ]}
                            data={data as unknown as Record<string, unknown>[]}
                            loading={loading}
                            emptyMessage="Không có dữ liệu"
                            startIndex={(currentPage - 1) * PAGE_SIZE}
                            renderRow={(item, index) => {
                                const customer = item as unknown as Customer;
                                const customerName = String(customer.name ?? customer.fullName ?? '');
                                const customerId = Number(customer.id);
                                return (
                                    <>
                                        <td className="px-4 text-center text-sm text-blue-gray-800">
                                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {String(customer.code ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-800 font-medium">
                                            {customerName || '-'}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
                                            {String(customer.phone ?? '-')}
                                        </td>
                                        <td className="px-4 text-center text-sm text-blue-gray-600">
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
        </>
    );
}
