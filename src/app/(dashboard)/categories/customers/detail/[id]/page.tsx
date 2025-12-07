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

    if (loading) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-sm text-blue-gray-600">Đang tải...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !customer) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-sm text-red-500">{error ?? 'Không tìm thấy khách hàng'}</p>
                    </div>
                </main>
            </div>
        );
    }

    const displayName = customer.name ?? customer.fullName ?? '-';

    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />

            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết khách hàng</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Xem thông tin chi tiết khách hàng</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                                CHI TIẾT KHÁCH HÀNG
                            </h2>
                            <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
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
                                className="px-10 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold shadow-md transition-colors"
                            >
                                Chỉnh sửa
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
