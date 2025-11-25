'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getSupplier } from '@/services/supplier.service';
import type { Supplier } from '@/services/supplier.service';

export default function SupplierDetailPage() {
    const router = useRouter();
    const params = useParams();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const supplierId = Number(rawId);

    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!rawId || Number.isNaN(supplierId)) {
            setError('ID nguồn hàng không hợp lệ');
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const data = await getSupplier(supplierId);
                setSupplier(data);
            } catch (e: unknown) {
                const message =
                    e instanceof Error ? e.message : 'Không tải được dữ liệu nguồn hàng';
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, [supplierId, rawId]);

    if (loading) return <p className="p-6">Đang tải...</p>;

    if (error || !supplier) {
        return <p className="p-6 text-red-600">{error ?? 'Không tìm thấy nguồn hàng'}</p>;
    }

    return (
        <div className="min-h-screen bg-[#f5f7fb]">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600">
                        Danh mục <span className="mx-1">{'>'}</span>
                        Nguồn hàng xuất/nhập <span className="mx-1">{'>'}</span>
                        <span className="text-gray-900 font-semibold">Chi tiết nguồn hàng</span>
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl px-10 py-8 max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8 text-blue-700 tracking-wide">
                        CHI TIẾT NGUỒN HÀNG
                    </h2>

                    {/* Info layout */}
                    <div className="grid grid-cols-3 gap-y-5 gap-x-10 text-sm">
                        <p className="font-semibold text-gray-600">Tên nguồn</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                            {supplier.name}
                        </p>

                        <p className="font-semibold text-gray-600">Mã nguồn</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                            {supplier.code ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Số điện thoại</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {supplier.phone ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Email</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {supplier.email ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Địa chỉ</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50">
                            {supplier.address ?? '-'}
                        </p>

                        <p className="font-semibold text-gray-600">Ghi chú</p>
                        <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 whitespace-pre-line">
                            {supplier.description || 'Không có ghi chú'}
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
                            onClick={() => router.push(`/categories/suppliers/edit/${supplier.id}`)}
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
