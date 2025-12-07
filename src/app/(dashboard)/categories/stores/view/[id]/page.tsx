/* eslint-disable @next/next/no-img-element */
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
import { usePagination } from '@/hooks/usePagination';

type ProductStockInfo = StockByStore & {
    productCode?: string;
    productName?: string;
    productImage?: string | null;
    unitPrice?: number;
    categoryName?: string | null;
};

export default function ViewStorePage() {
    const params = useParams();
    const router = useRouter();
    const storeId = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

    const [store, setStore] = useState<Store | null>(null);
    const [products, setProducts] = useState<ProductStockInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const itemsPerPage = PAGE_SIZE;

    // Pagination - sử dụng hook để tối ưu
    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        handlePageChange,
    } = usePagination(products, itemsPerPage);
    const totalItems = products.length;
    const { startIndex, displayStart, displayEnd } = paginationInfo;
    // handlePageChange đã được cung cấp bởi usePagination hook với scroll preservation

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
                const productsWithInfo: ProductStockInfo[] = (await Promise.all(
                    stocks.map(async (stock): Promise<ProductStockInfo> => {
                        try {
                            const product = await getProduct(stock.productId);
                            return {
                                ...stock,
                                productCode: product.code,
                                productName: product.name,
                                productImage: product.image ?? null,
                                unitPrice: product.unitPrice ? Number(product.unitPrice) : undefined,
                                categoryName: product.categoryName ?? null,
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
                )) as ProductStockInfo[];

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


    if (loading) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-lg text-blue-gray-600">Đang tải...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (error || !store) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-lg text-red-500">
                            {error || 'Không tìm thấy kho hàng'}
                        </p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 bg-[#0099FF] text-white rounded hover:bg-[#0088EE]"
                        >
                            Quay lại
                        </button>
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
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết kho hàng</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Xem thông tin chi tiết kho hàng</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        {/* Store Info */}
                        <div className="mb-6">
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
                        <div className="mt-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-blue-gray-800">
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
                                                <tr className="bg-gradient-to-br from-blue-500 to-blue-600 text-white h-10">
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
                                                onPageChange={handlePageChange}
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
                    </div>
                </div>
            </main>
        </div>
    );
}

