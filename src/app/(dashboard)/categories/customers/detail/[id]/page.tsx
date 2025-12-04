'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import { getCustomer } from '@/services/customer.service';
import type { Customer } from '@/services/customer.service';

export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const customerId = Number(rawId);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!rawId || Number.isNaN(customerId)) {
            setError('ID khách hàng không hợp lệ');
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const data = await getCustomer(customerId);
                setCustomer(data);
            } catch (e: unknown) {
                const message =
                    e instanceof Error ? e.message : 'Không tải được dữ liệu khách hàng';
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, [customerId, rawId]);

    if (loading) return <p className="p-6">Đang tải...</p>;

    if (error || !customer) {
        return <p className="p-6 text-red-600">{error ?? 'Không tìm thấy khách hàng'}</p>;
    }

    const displayName = customer.name ?? customer.fullName ?? '-';

    return (
        <div className="min-h-screen bg-[#f5f7fb]">
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600">
                        Danh mục <span className="mx-1">{'>'}</span>
                        Khách hàng <span className="mx-1">{'>'}</span>
                        <span className="text-gray-900 font-semibold">Chi tiết khách hàng</span>
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-xl px-10 py-8 max-w-4xl mx-auto border border-gray-200">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            CHI TIẾT KHÁCH HÀNG
                        </h2>
                        <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
                    </div>

                    {/* Info layout */}
                    <div className="grid grid-cols-3 gap-y-5 gap-x-10 text-sm">
                        <p className="font-semibold text-gray-600">Tên khách hàng</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                            {displayName}
                        </p>

                        <p className="font-semibold text-gray-600">Mã khách hàng</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                            {customer.code ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Số điện thoại</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {customer.phone ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Email</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {customer.email ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Địa chỉ</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {customer.address ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Ghi chú</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 whitespace-pre-line">
                            {customer.description || 'Không có ghi chú'}
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-center gap-6 mt-10">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-10 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold shadow-sm transition-colors"
                        >
                            Quay lại
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push(`/categories/customers/edit/${customer.id}`)}
                            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors"
                        >
                            Chỉnh sửa
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
