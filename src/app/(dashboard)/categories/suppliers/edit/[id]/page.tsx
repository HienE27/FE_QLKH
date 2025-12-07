'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import {
    getSupplier,
    updateSupplier,
    type Supplier,
} from '@/services/supplier.service';
import { SUPPLIER_TYPES, SUPPLIER_TYPE_LABELS } from '@/types/supplier';

export default function EditSupplierPage() {
    const router = useRouter();
    const params = useParams();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const supplierId = Number(rawId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('');      // 👈 Loại nguồn
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');

    useEffect(() => {
        if (!rawId || Number.isNaN(supplierId)) {
            setError('ID nguồn hàng không hợp lệ');
            setLoading(false);
            return;
        }

        (async () => {
            try {
                setError(null);
                const s: Supplier = await getSupplier(supplierId);

                setName(s.name);
                setCode(s.code ?? '');
                setType(s.type ?? '');           // 👈 load loại nguồn
                setPhone(s.phone ?? '');
                setEmail(s.email ?? '');
                setAddress(s.address ?? '');
                setNote(s.description ?? '');
            } catch (e) {
                const msg =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được thông tin nguồn hàng';
                setError(msg);
            } finally {
                setLoading(false);
            }
        })();
    }, [supplierId, rawId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name || !code) {
            setError('Vui lòng nhập Tên nguồn và Mã nguồn');
            return;
        }

        try {
            setSaving(true);

            const payload: Partial<Supplier> = {
                code,
                name,
                type: type || undefined,       // 👈 gửi loại nguồn
                phone,
                email,
                address,
                description: note,
                image: null,
            };

            await updateSupplier(supplierId, payload);
            router.push('/categories/suppliers');
        } catch (e) {
            const msg =
                e instanceof Error ? e.message : 'Cập nhật nguồn hàng thất bại';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

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

    if (error && !name && !code) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-gray-50/50">
            <Sidebar />

            <main className="p-4 xl:ml-80">
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa nguồn hàng</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin nguồn hàng</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                                CHỈNH SỬA NGUỒN HÀNG
                            </h2>
                            <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                        </div>

                        {error && (
                            <div className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="max-w-4xl mx-auto space-y-6"
                        >
                            {/* Loại nguồn */}
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Loại nguồn
                                </label>
                                <div className="col-span-2 relative">
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white transition-all"
                                        value={type}
                                        onChange={(e) => setType(e.target.value)}
                                    >
                                        <option value="">Chọn loại nguồn</option>
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

                            {/* Tên nguồn */}
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Tên nguồn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Nhập tên nguồn"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            {/* Mã nguồn */}
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Mã nguồn <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Nhập mã nguồn"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>

                            {/* Số điện thoại */}
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Số điện thoại
                                </label>
                                <input
                                    type="text"
                                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Nhập số điện thoại"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>

                            {/* Email */}
                            <div className="grid grid-cols-3 gap-4 items-center">
                                <label className="text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    placeholder="Nhập email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Địa chỉ */}
                            <div className="grid grid-cols-3 gap-4 items-start">
                                <label className="text-sm font-medium text-gray-700 pt-2">
                                    Địa chỉ
                                </label>
                                <textarea
                                    className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="Nhập địa chỉ"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>

                            {/* Ghi chú */}
                            <div className="grid grid-cols-3 gap-4 items-start">
                                <label className="text-sm font-medium text-gray-700 pt-2">
                                    Ghi chú
                                </label>
                                <textarea
                                    className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="Nhập ghi chú"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Cập nhật
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
