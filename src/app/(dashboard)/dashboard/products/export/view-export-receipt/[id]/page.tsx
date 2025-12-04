/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';

import {
    getExportById,
    type SupplierExport,
    type SupplierExportDetail,
} from '@/services/inventory.service';

import { getCustomer, type Customer } from '@/services/customer.service';
import { getProduct } from '@/services/product.service';
import { getAllStock, getStockByProductAndStore } from '@/services/stock.service';
import { getStores, type Store } from '@/services/store.service';
import { buildImageUrl } from '@/lib/utils';

export default function ViewExportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<SupplierExport | null>(null);
    const [items, setItems] = useState<(SupplierExportDetail & { availableQuantity?: number })[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number }>>>(new Map());
    const [stores, setStores] = useState<Store[]>([]);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                // Fetch stores và stocks trước
                const [storeList, allStocks] = await Promise.all([
                    getStores(),
                    getAllStock().catch(() => []),
                ]);
                setStores(storeList);

                // Tạo map: productId -> Map<storeId, {quantity}>
                const stocksMap = new Map<number, Map<number, { quantity: number }>>();
                allStocks.forEach((stock) => {
                    if (!stocksMap.has(stock.productId)) {
                        stocksMap.set(stock.productId, new Map());
                    }
                    stocksMap.get(stock.productId)!.set(stock.storeId, {
                        quantity: stock.quantity,
                    });
                });
                setAllStocksMap(stocksMap);

                // Lấy phiếu xuất
                const exportData = await getExportById(id);

                // ---- Fetch thông tin khách hàng nếu có customerId ----
                let foundCustomer: Customer | null = null;
                if (exportData.customerId) {
                    try {
                        foundCustomer = await getCustomer(exportData.customerId);
                        console.log('👤 Found Customer:', foundCustomer);
                        setCustomer(foundCustomer);
                    } catch (err) {
                        console.error('Failed to fetch customer:', err);
                    }
                }

                // ⭐ Xử lý attachmentImages: nếu backend chưa trả về, parse từ note
                let cleanNote = exportData.note || '';
                const images = exportData.attachmentImages || [];

                // Nếu chưa có attachmentImages, thử parse từ note
                if (images.length === 0 && cleanNote) {
                    // Pattern: "text | Hợp đồng: url1, url2 | Sở cứ: url3, url4"
                    const parts = cleanNote.split(' | ');
                    const textParts: string[] = [];

                    parts.forEach(part => {
                        if (part.includes('Hợp đồng:') || part.includes('Sở cứ:')) {
                            // Extract URLs
                            const urls = part.split(':')[1]?.split(',').map(u => u.trim()) || [];
                            images.push(...urls);
                        } else {
                            textParts.push(part);
                        }
                    });

                    cleanNote = textParts.join(' | ');
                }

                const mappedExport: SupplierExport = {
                    ...exportData,
                    customerName: foundCustomer?.name ?? foundCustomer?.fullName ?? exportData.customerName ?? null,
                    customerPhone: foundCustomer?.phone ?? exportData.customerPhone ?? null,
                    customerAddress: foundCustomer?.address ?? exportData.customerAddress ?? null,
                    note: cleanNote,
                    attachmentImages: images,
                };

                // ---- DEBUG: Kiểm tra dữ liệu từ API ----
                console.log('🔍 Export Data:', exportData);
                console.log('🔍 Mapped Export:', mappedExport);

                setData(mappedExport);

                // ---- map lại danh sách sản phẩm ----
                const rawItems = (exportData.items || []) as Array<SupplierExportDetail & { price?: number }>;

                console.log('🔍 Raw Items:', rawItems);

                // ⭐ Nhóm items theo productId để hiển thị kho hàng
                const productGroups = new Map<number, {
                    productId: number;
                    items: Array<SupplierExportDetail & { price?: number }>;
                    totalQuantity: number;
                    totalAmount: number;
                }>();

                rawItems.forEach((it) => {
                    const pid = it.productId ?? 0;
                    if (!productGroups.has(pid)) {
                        productGroups.set(pid, {
                            productId: pid,
                            items: [],
                            totalQuantity: 0,
                            totalAmount: 0,
                        });
                    }
                    const group = productGroups.get(pid)!;
                    group.items.push(it);
                    group.totalQuantity += it.quantity ?? 0;
                    // Tính thành tiền cho item này
                    const price = it.unitPrice ?? it.price ?? 0;
                    const discount = it.discountPercent ?? 0;
                    const itemTotal = (price * (it.quantity ?? 0)) * (100 - discount) / 100;
                    group.totalAmount += itemTotal;
                });

                // ⭐ Fetch thông tin sản phẩm cho từng nhóm
                const mappedItems: (SupplierExportDetail & { availableQuantity?: number; storeItems?: Array<{ storeId: number; storeName: string; quantity: number }> })[] = await Promise.all(
                    Array.from(productGroups.values()).map(async (group) => {
                        const firstItem = group.items[0];
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';
                        let availableQuantity: number | undefined = undefined;

                        // Nếu đã có sẵn thông tin sản phẩm từ BE
                        if (firstItem.productCode && firstItem.productName) {
                            productCode = firstItem.productCode;
                            productName = firstItem.productName;
                            unit = firstItem.unit || 'Cái';
                        }

                        // Nếu có productId, gọi API để lấy thông tin (bao gồm tồn kho)
                        if (group.productId) {
                            try {
                                const product = await getProduct(group.productId);
                                if (!productCode) productCode = product.code;
                                if (!productName) productName = product.name;

                                // Tính tổng tồn kho từ tất cả kho
                                const productStocks = stocksMap.get(group.productId);
                                if (productStocks) {
                                    let totalStock = 0;
                                    productStocks.forEach((stockInfo) => {
                                        totalStock += stockInfo.quantity ?? 0;
                                    });
                                    availableQuantity = totalStock;
                                } else {
                                    availableQuantity = 0;
                                }
                            } catch (err) {
                                // Khi sản phẩm đã bị xóa hoặc phía BE trả lỗi 404
                                // thì ghi log dạng cảnh báo để tránh Next.js overlay chặn UI
                                const message = err instanceof Error ? err.message : 'Không thể tải sản phẩm';
                                console.warn(`Product ${group.productId} missing: ${message}`);
                                // Fallback: hiển thị productId nếu không fetch được
                                if (!productCode) productCode = `ID: ${group.productId}`;
                                if (!productName) productName = `Sản phẩm #${group.productId} (đã xóa)`;
                                availableQuantity = 0;
                            }
                        }

                        // Tạo danh sách kho từ các items trong nhóm
                        const storeItems: Array<{ storeId: number; storeName: string; quantity: number }> = [];
                        group.items.forEach((item) => {
                            if (item.storeId) {
                                const store = storeList.find(s => s.id === item.storeId);
                                const existingStore = storeItems.find(s => s.storeId === item.storeId);
                                if (existingStore) {
                                    existingStore.quantity += item.quantity ?? 0;
                                } else {
                                    storeItems.push({
                                        storeId: item.storeId,
                                        storeName: item.storeName ?? store?.name ?? `Kho ${item.storeId}`,
                                        quantity: item.quantity ?? 0,
                                    });
                                }
                            }
                        });
                        storeItems.sort((a, b) => a.storeId - b.storeId);

                        // Backend đã trả về unitPrice là giá gốc (chưa trừ chiết khấu)
                        const discount = firstItem.discountPercent || 0;
                        const originalPrice = firstItem.unitPrice ?? firstItem.price ?? 0;

                        return {
                            ...firstItem,
                            productCode,
                            productName,
                            unit,
                            unitPrice: originalPrice, // Giá gốc từ backend
                            quantity: group.totalQuantity,
                            discountPercent: discount,
                            availableQuantity,
                            storeItems, // Danh sách kho từ export receipt
                        };
                    })
                );

                console.log('🔍 Mapped Items:', mappedItems);
                setItems(mappedItems);
            } catch (err: unknown) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    if (loading) {
        return (
            <div className="ml-[264px] mt-6 text-xl">
                Đang tải...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="ml-[264px] mt-6 text-xl text-red-600">
                Không tìm thấy phiếu xuất
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12 flex gap-6">
                <div className="flex-1">
                    <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                    PHIẾU XUẤT KHO
                                </h2>
                                <button
                                    onClick={() => router.back()}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full"></div>
                        </div>

                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 mb-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-600 rounded"></div>
                                Thông tin chung
                            </h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {/* Cột trái: Khách hàng */}
                                <div className="space-y-4">
                                    <InfoRow label="Khách hàng" value={data.customerName} />

                                    {/* Hiển thị thông tin khách hàng dạng card giống import */}
                                    {data.customerId && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="font-semibold text-blue-800">Thông tin khách hàng</span>
                                            </div>

                                            <div className="text-sm">
                                                <div>
                                                    <span className="text-gray-600">Mã KH:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {customer?.code ?? '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <InfoRow label="Số điện thoại" value={data.customerPhone} />
                                            <InfoRow
                                                label="Địa chỉ"
                                                value={data.customerAddress}
                                                multi
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Cột phải: Mã phiếu và lý do */}
                                <div className="space-y-4">
                                    <InfoRow label="Mã phiếu" value={data.code} />
                                    <InfoRow label="Lý do xuất" value={data.note} multi />
                                </div>
                            </div>
                        </div>

                        {/* BẢNG SẢN PHẨM */}
                        <div className="border border-gray-300 mb-6 rounded-lg shadow-sm overflow-visible">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white h-12">
                                        <th className="px-4 w-12 font-semibold">STT</th>
                                        <th className="px-4 w-40 font-semibold">Tên hàng hóa</th>
                                        <th className="px-4 w-28 font-semibold">Mã hàng</th>
                                        <th className="px-4 w-20 font-semibold">ĐVT</th>
                                        <th className="px-4 w-48 font-semibold">Kho hàng</th>
                                        <th className="px-4 w-24 font-semibold">Tồn kho</th>
                                        <th className="px-4 w-28 font-semibold">Đơn giá</th>
                                        <th className="px-4 w-20 font-semibold">SL</th>
                                        <th className="px-4 w-24 font-semibold">Chiết khấu (%)</th>
                                        <th className="px-4 w-28 font-semibold">Thành tiền</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.length === 0 ? (
                                        <tr className="border-t h-10">
                                            <td colSpan={10} className="text-center text-gray-500 py-4">
                                                Không có sản phẩm nào
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((it, i) => (
                                            <tr key={i} className="border-b border-gray-200 h-12 hover:bg-blue-50 transition-colors">
                                                <td className="text-center">{i + 1}</td>
                                                <td className="px-2">{it.productName}</td>
                                                <td className="text-center">{it.productCode}</td>
                                                <td className="text-center">{it.unit ?? 'Cái'}</td>
                                                <td className="px-2 text-sm">
                                                    {(() => {
                                                        // Hiển thị kho từ storeItems (đã được nhóm từ export receipt)
                                                        if (it.storeItems && it.storeItems.length > 0) {
                                                            return (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {it.storeItems.map((storeItem) => (
                                                                        <span 
                                                                            key={storeItem.storeId} 
                                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700"
                                                                        >
                                                                            <span className="font-medium">{storeItem.storeName}:</span>
                                                                            <span className="font-semibold">{storeItem.quantity.toLocaleString('vi-VN')}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        // Fallback: lấy từ allStocksMap (hiển thị tồn kho hiện tại)
                                                        const productStocks = allStocksMap.get(it.productId ?? 0);
                                                        if (!productStocks || productStocks.size === 0) {
                                                            return <span className="text-gray-400">-</span>;
                                                        }
                                                        
                                                        const stocksList: Array<{ storeId: number; quantity: number; storeName: string }> = [];
                                                        productStocks.forEach((stockInfo, storeId) => {
                                                            if ((stockInfo.quantity ?? 0) > 0) {
                                                                const store = stores.find(s => s.id === storeId);
                                                                stocksList.push({
                                                                    storeId,
                                                                    quantity: stockInfo.quantity ?? 0,
                                                                    storeName: store?.name ?? `Kho ${storeId}`
                                                                });
                                                            }
                                                        });
                                                        
                                                        stocksList.sort((a, b) => a.storeId - b.storeId);
                                                        
                                                        if (stocksList.length === 0) {
                                                            return <span className="text-gray-400">-</span>;
                                                        }
                                                        
                                                        return (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {stocksList.map((stock) => (
                                                                    <span 
                                                                        key={stock.storeId} 
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700"
                                                                    >
                                                                        <span className="font-medium">{stock.storeName}:</span>
                                                                        <span className="font-semibold">{stock.quantity.toLocaleString('vi-VN')}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="text-center">
                                                    {it.availableQuantity !== undefined
                                                        ? it.availableQuantity.toLocaleString('vi-VN')
                                                        : '-'}
                                                </td>
                                                <td className="text-right">
                                                    {Number(it.unitPrice).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="text-center">{it.quantity}</td>
                                                <td className="text-center">{it.discountPercent ?? 0}</td>
                                                <td className="text-right font-semibold text-gray-800">
                                                    {(() => {
                                                        // Tính tổng từ các items trong nhóm
                                                        if (it.storeItems && it.storeItems.length > 0) {
                                                            // Tính lại tổng từ storeItems (nếu có thông tin chi tiết)
                                                            const price = Number(it.unitPrice);
                                                            const qty = it.quantity;
                                                            const discount = it.discountPercent ?? 0;
                                                            let total = price * qty;
                                                            if (discount > 0) {
                                                                total = (total * (100 - discount)) / 100;
                                                            }
                                                            return total.toLocaleString('vi-VN');
                                                        }
                                                        const price = Number(it.unitPrice);
                                                        const qty = it.quantity;
                                                        const discount = it.discountPercent ?? 0;
                                                        let total = price * qty;
                                                        if (discount > 0) {
                                                            total = (total * (100 - discount)) / 100;
                                                        }
                                                        return total.toLocaleString('vi-VN');
                                                    })()}
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold h-12 border-t-2 border-gray-300">
                                        <td colSpan={8} className="text-center text-gray-800">
                                            Tổng
                                        </td>
                                        <td className="text-right px-4 text-lg text-blue-700">
                                            {data.totalValue.toLocaleString('vi-VN')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* HÌNH ẢNH */}
                        <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-sm mb-6">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-600 rounded"></div>
                                Hợp đồng / Ảnh đính kèm
                            </h3>

                            <div className="flex gap-4 flex-wrap">
                                {(!data.attachmentImages ||
                                    data.attachmentImages.length === 0) && (
                                        <p className="text-gray-600">Không có ảnh</p>
                                    )}

                                {data.attachmentImages?.map((img, idx) => {
                                    const url = buildImageUrl(img);
                                    return (
                                        <div
                                            key={idx}
                                            className="w-[180px] h-[240px] bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden group"
                                        >
                                            {url ? (
                                                <img
                                                    src={url}
                                                    className="w-full h-full object-contain"
                                                    alt={`Ảnh ${idx + 1}`}
                                                />
                                            ) : (
                                                <span className="text-gray-400">No Image</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <StatusSidebar data={data} />
            </main>
        </div>
    );
}

/* ---------- COMPONENTS ---------- */
interface InfoRowProps {
    label: string;
    value?: string | null;
    multi?: boolean;
}

function InfoRow({ label, value, multi = false }: InfoRowProps) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-32 pt-1 text-sm font-medium text-gray-700 whitespace-nowrap">{label}</label>
            <div
                className={`flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm ${multi ? 'h-20' : ''
                    }`}
            >
                {value ?? '—'}
            </div>
        </div>
    );
}

// Helper function để chuyển trạng thái sang tiếng Việt
function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'PENDING': 'Chờ xử lý',
        'IMPORTED': 'Đã nhập',
        'EXPORTED': 'Đã xuất',
        'CANCELLED': 'Đã hủy',
        'APPROVED': 'Đã duyệt',
        'REJECTED': 'Đã từ chối',
        'RETURNED': 'Đã hoàn trả',
    };
    return statusMap[status] || status;
}

function StatusSidebar({ data }: { data: SupplierExport }) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!confirm('Xác nhận xuất kho? Tồn kho sẽ được cập nhật.')) return;

        try {
            setProcessing(true);
            const { confirmExport } = await import('@/services/inventory.service');
            await confirmExport(data.id);
            alert('Đã xác nhận xuất kho thành công!');
            // Reload lại trang để cập nhật trạng thái
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi xác nhận');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy phiếu xuất này?')) return;

        try {
            setProcessing(true);
            const { cancelExport } = await import('@/services/inventory.service');
            await cancelExport(data.id);
            alert('Đã hủy phiếu xuất!');
            // Reload lại trang để cập nhật trạng thái
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi hủy phiếu');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="w-[274px] bg-white rounded-xl shadow-xl p-6 border border-gray-200 h-fit">
            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-600 rounded"></div>
                Tình trạng
            </h3>

            <div className="space-y-4">
                <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="text-sm font-semibold mb-1 text-gray-700">Trạng thái</div>
                    <div className="text-sm text-gray-800">{getStatusText(data.status)}</div>
                </div>

                <div className="px-4 py-3 bg-gradient-to-br from-gray-50 to-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="text-sm font-semibold mb-1 text-gray-700">Tổng giá trị</div>
                    <div className="text-sm font-bold text-blue-700">{data.totalValue.toLocaleString('vi-VN')}</div>
                </div>

                {data.status === 'PENDING' && (
                    <div className="space-y-3 mt-4">
                        <button
                            onClick={handleConfirm}
                            disabled={processing}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold disabled:opacity-60 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Xuất kho
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={processing}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold disabled:opacity-60 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Hủy phiếu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
