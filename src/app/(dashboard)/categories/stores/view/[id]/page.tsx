'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { getStore, type Store } from '@/services/store.service';
import { getStockByStore, type StockByStore } from '@/services/stock.service';
import { getProduct } from '@/services/product.service';
import { buildImageUrl, formatPrice } from '@/lib/utils';
import { PAGE_SIZE } from '@/constants/pagination';
import Pagination from '@/components/common/Pagination';

interface ProductStockInfo extends StockByStore {
    productCode?: string;
    productName?: string;
    productImage?: string;
    unitPrice?: number;
    categoryName?: string;
}

export default function ViewStorePage() {
    const params = useParams();
    const router = useRouter();
    const storeId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<ProductStockInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = PAGE_SIZE;

    useEffect(() => {
        if (!storeId || Number.isNaN(storeId)) {
            setError('ID kho hàng không hợp lệ');
            setLoading(false);
            return;
        }

        (async () => {
            try {
                setLoading(true);
                setError(null);

                // Load thông tin kho và tồn kho
                const [storeData, stocks] = await Promise.all([
                    getStore(storeId),
                    getStockByStore(storeId),
                ]);

                setStore(storeData);

                // Load thông tin sản phẩm cho mỗi stock
                const productsWithInfo: ProductStockInfo[] = await Promise.all(
                    stocks.map(async (stock) => {
                        try {
                            const product = await getProduct(stock.productId);
                            return {
                                ...stock,
                                productCode: product.code,
                                productName: product.name,
                                productImage: product.image,
                                unitPrice: product.unitPrice ? Number(product.unitPrice) : undefined,
                                categoryName: product.categoryName,
                            };
                        } catch (err) {
                            console.error(`Failed to load product ${stock.productId}:`, err);
                            return {
                                ...stock,
                                productCode: `ID: ${stock.productId}`,
                                productName: `Sản phẩm #${stock.productId}`,
                            };
                        }
                    }),
                );

                // Lọc chỉ những sản phẩm có tồn kho > 0
                const productsWithStock = productsWithInfo.filter((p) => p.quantity > 0);
                setProducts(productsWithStock);
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : 'Không thể tải thông tin kho hàng';
                setError(message);
            } finally {
                setLoading(false);
            }
        })();
    }, [storeId]);

    // Pagination calculations
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = products.slice(startIndex, endIndex);
    const displayStart = totalItems === 0 ? 0 : startIndex + 1;
    const displayEnd = Math.min(endIndex, totalItems);

    if (loading) {
        return (
            <div className="min-h-screen">
                <Sidebar />
                <main className="ml-[264px] mt-6 p-6">
                    <p className="text-lg">Đang tải...</p>
                </main>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen">
                <Sidebar />
                <main className="ml-[264px] mt-6 p-6">
                    <p className="text-lg text-red-600">
                        {error || 'Không tìm thấy kho hàng'}
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Quay lại
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">
                            Chi tiết kho hàng
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {store.name} {store.code ? `(${store.code})` : ''}
                        </p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                        Quay lại
                    </button>
                </div>

                {/* Store Info */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Thông tin kho hàng</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-600">Mã kho:</label>
                            <p className="text-gray-900">{store.code || '—'}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-600">Tên kho:</label>
                            <p className="text-gray-900">{store.name}</p>
                        </div>
                        {store.address && (
                            <div>
                                <label className="text-sm font-medium text-gray-600">Địa chỉ:</label>
                                <p className="text-gray-900">{store.address}</p>
                            </div>
                        )}
                        {store.phone && (
                            <div>
                                <label className="text-sm font-medium text-gray-600">Số điện thoại:</label>
                                <p className="text-gray-900">{store.phone}</p>
                            </div>
                        )}
                        {store.description && (
                            <div className="col-span-2">
                                <label className="text-sm font-medium text-gray-600">Mô tả:</label>
                                <p className="text-gray-900">{store.description}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Products Table */}
                <div className="bg-white rounded-lg shadow">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-semibold">
                            Danh sách sản phẩm trong kho ({products.length} sản phẩm)
                        </h2>
                    </div>

                    {products.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <p>Kho này chưa có sản phẩm nào</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-[#0046ff] text-white h-10">
                                            <th className="px-4 text-center text-sm font-bold">STT</th>
                                            <th className="px-4 text-center text-sm font-bold">Hình ảnh</th>
                                            <th className="px-4 text-left text-sm font-bold">Tên sản phẩm</th>
                                            <th className="px-4 text-center text-sm font-bold">Mã sản phẩm</th>
                                            <th className="px-4 text-center text-sm font-bold">Nhóm hàng</th>
                                            <th className="px-4 text-center text-sm font-bold">Số lượng tồn</th>
                                            <th className="px-4 text-center text-sm font-bold">Tồn tối thiểu</th>
                                            <th className="px-4 text-center text-sm font-bold">Tồn tối đa</th>
                                            <th className="px-4 text-center text-sm font-bold">Đơn giá</th>
                                            <th className="px-4 text-center text-sm font-bold">Thành tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentData.map((product, index) => {
                                            const imageUrl = buildImageUrl(product.productImage);
                                            const totalValue = (product.unitPrice || 0) * product.quantity;

                                            return (
                                                <tr
                                                    key={product.productId}
                                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                                >
                                                    <td className="px-4 text-center text-sm">
                                                        {startIndex + index + 1}
                                                    </td>
                                                    <td className="px-4 text-center">
                                                        {imageUrl ? (
                                                            <img
                                                                src={imageUrl}
                                                                alt={product.productName}
                                                                className="h-10 w-10 object-cover rounded mx-auto"
                                                                onError={(e) => {
                                                                    const target = e.currentTarget;
                                                                    target.src =
                                                                        'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 bg-gray-200 rounded mx-auto flex items-center justify-center text-gray-400 text-xs">
                                                                N/A
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 text-sm">
                                                        <button
                                                            onClick={() =>
                                                                router.push(
                                                                    `/dashboard/products/detail/${product.productId}`,
                                                                )
                                                            }
                                                            className="text-blue-600 hover:text-blue-800 hover:underline"
                                                        >
                                                            {product.productName}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 text-center text-sm">
                                                        {product.productCode}
                                                    </td>
                                                    <td className="px-4 text-center text-sm">
                                                        {product.categoryName || '—'}
                                                    </td>
                                                    <td className="px-4 text-center text-sm font-semibold text-blue-600">
                                                        {product.quantity.toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="px-4 text-center text-sm text-gray-600">
                                                        {product.minStock != null
                                                            ? product.minStock.toLocaleString('vi-VN')
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 text-center text-sm text-gray-600">
                                                        {product.maxStock != null
                                                            ? product.maxStock.toLocaleString('vi-VN')
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 text-center text-sm">
                                                        {product.unitPrice
                                                            ? formatPrice(product.unitPrice)
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 text-center text-sm font-semibold">
                                                        {formatPrice(totalValue)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="p-4 border-t">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}

                            {/* Summary */}
                            <div className="p-4 border-t bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-600">
                                        Hiển thị {displayStart} - {displayEnd} / {totalItems} sản phẩm
                                    </p>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-600">
                                            Tổng giá trị tồn kho:
                                        </p>
                                        <p className="text-lg font-bold text-blue-600">
                                            {formatPrice(
                                                products.reduce(
                                                    (sum, p) =>
                                                        sum +
                                                        (p.unitPrice || 0) * p.quantity,
                                                    0,
                                                ),
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}

