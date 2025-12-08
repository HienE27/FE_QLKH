'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { getProduct } from '@/services/product.service';
import type { Product } from '@/types/product';

// 👉 import Stock service
import { getStockByProduct, type StockByStore } from '@/services/stock.service';

import { buildImageUrl } from '@/lib/utils';
import { getSupplier, getSuppliers, type Supplier } from '@/services/supplier.service';

export default function ProductDetailPage() {
    const router = useRouter();
    const params = useParams();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const productId = Number(rawId);

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);

    // 👉 danh sách tồn kho theo từng kho
    const [stocks, setStocks] = useState<StockByStore[]>([]);
    const [loadingStocks, setLoadingStocks] = useState(false);

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
                
                // Load nhiều NCC từ product.supplierIds hoặc product.supplierId (tương thích ngược)
                const supplierIdsList = (data.supplierIds && data.supplierIds.length > 0)
                    ? data.supplierIds
                    : (data.supplierId ? [data.supplierId] : []);
                
                if (supplierIdsList.length > 0) {
                    try {
                        // Load thông tin tất cả NCC
                        const allSuppliers = await getSuppliers();
                        const productSuppliers = allSuppliers.filter(s => supplierIdsList.includes(s.id));
                        setSuppliers(productSuppliers);
                    } catch (err) {
                        console.error('Lỗi tải thông tin NCC:', err);
                        setSuppliers([]);
                    }
                } else {
                    setSuppliers([]);
                }
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

    // ---- LOAD TỒN KHO ----
    useEffect(() => {
        if (!productId || Number.isNaN(productId)) {
            return;
        }

        let cancelled = false;
        setLoadingStocks(true);

        (async () => {
            try {
                const stockList = await getStockByProduct(productId);
                if (!cancelled) {
                    setStocks(stockList);
                }
            } catch (e) {
                console.error('Lỗi tải tồn kho', e);
            } finally {
                if (!cancelled) {
                    setLoadingStocks(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [productId]);


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

    // Tồn kho giờ lưu trong shop_stocks, không còn trong product
    // Không cần hiển thị kho hàng ở đây nữa

    // 👉 nếu BE có minStock / maxStock, bạn có thể thêm type vào Product,
    // tạm thời dùng as any để tránh lỗi type
    // 👉 nếu BE có minStock / maxStock, tạo type mở rộng từ Product
    type ProductWithStock = Product & {
        minStock?: number | null;
        maxStock?: number | null;
    };

    const { minStock, maxStock } = product as ProductWithStock;


    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết hàng hóa</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Xem thông tin chi tiết hàng hóa</p>
            </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-center mb-8 text-blue-gray-800 tracking-wide">
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

                            <div className="grid grid-cols-3 gap-3 items-start">
                                <p className="font-semibold text-gray-600 pt-2">
                                    Nhà cung cấp
                                </p>
                                <div className="col-span-2">
                                    {suppliers.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {suppliers.map((supplier, index) => (
                                                <span
                                                    key={supplier.id}
                                                    className="inline-flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-800 rounded-full text-sm border border-blue-200"
                                                >
                                                    {supplier.name} {supplier.type ? `(${supplier.type})` : ''}
                                                    {index === 0 && (
                                                        <span className="text-xs text-blue-600 font-semibold">(Chính)</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="px-3 py-2 border rounded-md bg-gray-50 text-gray-500">
                                            Chưa có nhà cung cấp
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 items-center">
                                <p className="font-semibold text-gray-600">
                                    Đơn giá
                                </p>
                                <p className="col-span-2 px-3 py-2 border rounded-md bg-gray-50 text-gray-900">
                                    {priceLabel}
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

                    {/* Tồn kho theo từng kho */}
                    <div className="mt-10">
                        <p className="font-semibold text-gray-700 mb-4 text-lg">
                            Tồn kho theo từng kho
                        </p>
                        {loadingStocks ? (
                            <p className="text-gray-500 text-sm">Đang tải...</p>
                        ) : stocks.length === 0 ? (
                            <p className="text-gray-500 text-sm p-4 border rounded-xl bg-gray-50">
                                Chưa có tồn kho tại kho nào
                            </p>
                        ) : (
                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                                Kho hàng
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                                                Mã kho
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                                                Số lượng tồn
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                                                Tồn tối thiểu
                                            </th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b">
                                                Tồn tối đa
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stocks.map((stock) => (
                                            <tr
                                                key={`${stock.productId}-${stock.storeId}`}
                                                className="border-b hover:bg-gray-50"
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {stock.storeName || `Kho #${stock.storeId}`}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {stock.storeCode || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {stock.quantity.toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                    {stock.minStock != null
                                                        ? stock.minStock.toLocaleString('vi-VN')
                                                        : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                    {stock.maxStock != null
                                                        ? stock.maxStock.toLocaleString('vi-VN')
                                                        : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
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
                                router.push(`/products/edit/${product.id}`)
                            }
                            className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-colors"
                        >
                            Chỉnh sửa
                        </button>
                    </div>
                    </div>
                </div>
        </>
    );
}
