'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getProduct } from '@/services/product.service';
import type { Product } from '@/types/product';

// 👉 import NCC giống trang create
import {
    getSuppliers,
    type Supplier,
} from '@/services/supplier.service';

const API_BASE_URL = 'http://localhost:8080';

function buildImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${clean}`;
}

export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const productId = Number(rawId);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 👉 danh sách NCC
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // ---- LOAD SẢN PHẨM ----
    useEffect(() => {
        if (!rawId || Number.isNaN(productId)) {
            setError('ID sản phẩm không hợp lệ');
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const data = await getProduct(productId);
                setProduct(data);
            } catch (e: unknown) {
                const message =
                    e instanceof Error
                        ? e.message
                        : 'Không tải được thông tin sản phẩm';
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, [productId, rawId]);

    // ---- LOAD NHÀ CUNG CẤP ----
    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                const list = await getSuppliers();
                if (!cancelled) {
                    setSuppliers(list);
                }
            } catch (e) {
                console.error('Lỗi tải danh sách nhà cung cấp', e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return <p className="p-6">Đang tải...</p>;
    }

    if (error || !product) {
        return (
            <p className="p-6 text-red-600">
                {error ?? 'Không tìm thấy sản phẩm'}
            </p>
        );
    }

    const imageUrl = buildImageUrl(product.image);

    const priceLabel = `${Number(product.unitPrice).toLocaleString('vi-VN')} đ`;

    const normalizedStatus = (product.status ?? '').toLowerCase();
    const isActive = normalizedStatus === 'active';
    const statusLabel = isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh';
    const statusClass = isActive
        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
        : 'bg-red-100 text-red-700 border border-red-300';

    // 👉 tìm tên NCC từ supplierId
    const supplierName =
        product.supplierId != null
            ? suppliers.find((s) => s.id === product.supplierId)?.name ??
            `#${product.supplierId}`
            : '-';

    // 👉 nếu BE có minStock / maxStock, bạn có thể thêm type vào Product,
    // tạm thời dùng as any để tránh lỗi type
    // 👉 nếu BE có minStock / maxStock, tạo type mở rộng từ Product
    type ProductWithStock = Product & {
        minStock?: number | null;
        maxStock?: number | null;
    };

    const { minStock, maxStock } = product as ProductWithStock;


    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12 bg-[#f5f7fb] min-h-[calc(100vh-113px)]">
                {/* Breadcrumb */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-600">
                        Danh mục{' '}
                        <span className="mx-1 text-gray-400">{'>'}</span>
                        Danh mục hàng hóa{' '}
                        <span className="mx-1 text-gray-400">{'>'}</span>
                        <span className="text-gray-900 font-semibold">
                            Chi tiết hàng hóa
                        </span>
                    </p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl px-10 py-8 max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8 text-blue-700 tracking-wide">
                        CHI TIẾT HÀNG HÓA
                    </h2>

                    <div className="grid gap-10 lg:grid-cols-[320px,1fr] items-start">
                        {/* Ảnh + info nhỏ */}
                        <div className="flex flex-col items-center gap-4">
                            {imageUrl ? (
                                <div className="w-72 h-72 rounded-2xl overflow-hidden shadow-md border border-gray-100">
                                    <img
                                        src={imageUrl}
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-72 h-72 bg-gray-200 flex items-center justify-center rounded-2xl text-gray-500 text-sm">
                                    Không có ảnh
                                </div>
                            )}

                            <div className="w-full space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Mã hàng hóa</span>
                                    <span className="font-semibold text-gray-800">
                                        {product.code}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Giá bán</span>
                                    <span className="font-semibold text-blue-700">
                                        {priceLabel}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Trạng thái</span>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                                    >
                                        {statusLabel}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Thông tin chi tiết – bố cục giống form create */}
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Tên hàng hóa
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {product.name}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Nhóm hàng
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {product.categoryName ?? '-'}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Đơn giá
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {priceLabel}
                                </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Số lượng tồn
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {product.quantity}
                                </p>
                            </div>

                            {/* 👉 Nguồn hàng / Nhà cung cấp (giống create) */}
                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Nguồn hàng / Nhà cung cấp
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {supplierName}
                                </p>
                            </div>

                            {/* 👉 nếu BE có minStock / maxStock thì hiển thị 2 dòng này */}
                            {minStock != null && (
                                <div className="grid grid-cols-3 gap-3 items-center">
                                    <p className="font-semibold text-gray-600">
                                        Tồn kho tối thiểu
                                    </p>
                                    <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                        {minStock}
                                    </p>
                                </div>
                            )}

                            {maxStock != null && (
                                <div className="grid grid-cols-3 gap-3 items-center">
                                    <p className="font-semibold text-gray-600">
                                        Tồn kho tối đa
                                    </p>
                                    <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                        {maxStock}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mô tả */}
                    <div className="mt-10">
                        <p className="font-semibold text-gray-700 mb-2">
                            Mô tả sản phẩm
                        </p>
                        <p className="p-4 border rounded-xl bg-gray-50 whitespace-pre-line text-sm text-gray-800 min-h-[60px]">
                            {product.shortDescription || 'Không có mô tả'}
                        </p>
                    </div>

                    {/* Nút hành động */}
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
                            onClick={() =>
                                router.push(`/dashboard/products/edit/${product.id}`)
                            }
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
