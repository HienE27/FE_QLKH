// src/app/(dashboard)/categories/suppliers/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import {
    getSuppliers,
    deleteSupplier,
    type Supplier,
} from '@/services/supplier.service';

export default function QuanLyNguonHang() {
    const router = useRouter();

    const [data, setData] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [searchType, setSearchType] = useState('');
    const [searchPhone, setSearchPhone] = useState('');

    // load data từ BE
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError(null);
                const list = await getSuppliers();
                setData(list);
            } catch (e) {
                const msg =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được danh sách nguồn hàng';
                setError(msg);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // lọc
    const filtered = useMemo(
        () =>
            data.filter((s) => {
                const codeMatch = searchCode
                    ? (s.code ?? '').toLowerCase().includes(searchCode.toLowerCase())
                    : true;

                const nameMatch = searchName
                    ? s.name.toLowerCase().includes(searchName.toLowerCase())
                    : true;

                const typeMatch = searchType
                    ? (s.type ?? '').toLowerCase() === searchType.toLowerCase()
                    : true;

                const phoneMatch = searchPhone
                    ? (s.phone ?? '').includes(searchPhone)
                    : true;

                return codeMatch && nameMatch && typeMatch && phoneMatch;
            }),
        [data, searchCode, searchName, searchType, searchPhone],
    );

    // Use pagination hook
    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        goToPage,
    } = usePagination(filtered, 10);

    const handleDelete = async (id: number, name: string) => {
        const ok = window.confirm(`Xóa nhà cung cấp "${name}"?`);
        if (!ok) return;

        try {
            await deleteSupplier(id);
            setData((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Xóa nhà cung cấp thất bại';
            setError(msg);
        }
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
                                    <option value="Nhà cung cấp">Nhà cung cấp</option>
                                    <option value="Đại lý cấp 1">Đại lý cấp 1</option>
                                    <option value="Đại lý cấp 2">Đại lý cấp 2</option>
                                    <option value="NVBH">NVBH</option>
                                    <option value="Kho tổng">Kho tổng</option>
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

                    <div className="flex justify-end gap-3 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setSearchCode('');
                                setSearchName('');
                                setSearchType('');
                                setSearchPhone('');
                            }}
                            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                        >
                            Xóa lọc
                        </button>

                        <button
                            type="button"
                            className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                            onClick={() => router.push('/categories/suppliers/create')}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M8 3V13M3 8H13"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                            Thêm mới nguồn
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    {loading ? (
                        <p className="p-4 text-sm text-gray-500">Đang tải dữ liệu...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#0046ff] text-white">
                                    <tr className="h-[48px]">
                                        <th className="px-4 text-center font-bold text-sm">STT</th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Tên nguồn
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Loại nguồn
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Mã nguồn
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Số điện thoại
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Địa chỉ
                                        </th>
                                        <th className="px-4 text-center font-bold text-sm">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentData.map((supplier, index) => (
                                        <tr
                                            key={supplier.id}
                                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                        >
                                            <td className="px-4 text-center text-sm">
                                                {paginationInfo.startIndex + index + 1}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {supplier.name}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {supplier.type ?? '-'}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {supplier.code ?? '-'}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {supplier.phone ?? '-'}
                                            </td>
                                            <td className="px-4 text-center text-sm">
                                                {supplier.address ?? '-'}
                                            </td>
                                            <td className="px-4">
                                                <div className="flex items-center justify-center gap-3">
                                                    {/* Xem chi tiết */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/categories/suppliers/detail/${supplier.id}`,
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

                                                    {/* Sửa */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(
                                                                `/categories/suppliers/edit/${supplier.id}`,
                                                            )
                                                        }
                                                        className="hover:scale-110 transition-transform"
                                                        title="Chỉnh sửa"
                                                    >
                                                        <svg
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13"
                                                                stroke="#0046ff"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                            />
                                                            <path
                                                                d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                                                stroke="#0046ff"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>

                                                    {/* Xóa */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(supplier.id, supplier.name)
                                                        }
                                                        className="hover:scale-110 transition-transform"
                                                        title="Xóa"
                                                    >
                                                        <svg
                                                            width="24"
                                                            height="24"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                                                                stroke="#ee4b3d"
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
                                    {filtered.length === 0 && !loading && (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-4 py-4 text-center text-sm text-gray-500"
                                            >
                                                Không có dữ liệu
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                            </table>

                            {/* Pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={filtered.length}
                                itemsPerPage={10}
                                onPageChange={goToPage}
                            />

                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
