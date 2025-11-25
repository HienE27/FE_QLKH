'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createSupplier } from '@/services/supplier.service';
import { SUPPLIER_TYPES, SUPPLIER_TYPE_LABELS } from '@/types/supplier';

export default function ThemMoiNguon() {
    const router = useRouter();

    // form state - chỉ giữ các field có trong DB
    const [type, setType] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [note, setNote] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // kiểm tra field bắt buộc
        if (!type || !name || !code || !phone || !address) {
            setError('Vui lòng nhập đầy đủ Loại nguồn, Tên nguồn, Mã nguồn, Số điện thoại và Địa chỉ');
            return;
        }

        try {
            setSaving(true);

            await createSupplier({
                code,
                name,
                type,
                phone,
                email,
                address,
                // hiện tại DB chỉ có description, lưu ghi chú ở đây
                description: note,
            });

            // tạo xong quay lại danh sách
            router.push('/categories/suppliers');
        } catch (err) {
            const msg =
                err instanceof Error ? err.message : 'Tạo mới nguồn hàng thất bại';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <p className="text-base font-bold text-gray-800">
                        Danh mục &gt; Nguồn hàng xuất/nhập &gt; Thêm mới nguồn
                    </p>
                </div>

                {/* Main Form */}
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-center mb-6">
                        THÊM MỚI NGUỒN HÀNG
                    </h2>

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
                                Loại nguồn <span className="text-red-500">*</span>
                            </label>
                            <div className="col-span-2 relative">
                                <select
                                    className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
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
                                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập mã nguồn"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>

                        {/* Số điện thoại */}
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-sm font-medium text-gray-700">
                                Số điện thoại <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhập email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Địa chỉ */}
                        <div className="grid grid-cols-3 gap-4 items-start">
                            <label className="text-sm font-medium text-gray-700 pt-2">
                                Địa chỉ <span className="text-red-500">*</span>
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

                        {/* Action Buttons */}
                        <div className="flex justify-center gap-6 mt-8">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-12 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-60"
                            >
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
}
