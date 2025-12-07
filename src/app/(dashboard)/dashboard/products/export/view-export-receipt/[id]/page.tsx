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
import { getAllStock } from '@/services/stock.service';
import { getStores, type Store } from '@/services/store.service';
import { buildImageUrl, formatDateTimeWithSeconds } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { hasPermission, hasRole, PERMISSIONS } from '@/lib/permissions';

export default function ViewExportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<SupplierExport | null>(null);
    const [items, setItems] = useState<(SupplierExportDetail & { availableQuantity?: number; storeItems?: Array<{ storeId: number; storeName: string; quantity: number }> })[]>([]);
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
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-xl text-blue-gray-600">Đang tải...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-blue-gray-50/50">
                <Sidebar />
                <main className="p-4 xl:ml-80">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                        <p className="text-xl text-red-500">Không tìm thấy phiếu xuất</p>
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
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chi tiết phiếu xuất kho</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Xem thông tin chi tiết phiếu xuất kho</p>
                </div>

                <div className="flex gap-6 items-start">
                    {/* Khối nội dung chính bên trái */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-gray-100">
                        <div className="p-6">
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-2xl font-bold text-blue-gray-800">
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
                                <div className="h-1 w-24 bg-[#0099FF] rounded-full"></div>
                            </div>

                            {/* THÔNG TIN CHUNG */}
                            <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
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
                        <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[#0099FF] text-white h-12">
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

                                        <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
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
                            <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 rounded-lg shadow-sm mb-6">
                                <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
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

                    {/* Panel Tình trạng bên phải */}
                    <div className="w-[320px] shrink-0">
                        <StatusSidebar data={data} />
                    </div>
                </div>

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

// Extended type for SupplierExport with optional audit fields
type SupplierExportWithAudit = SupplierExport & {
    createdByName?: string;
    createdByRole?: string;
    createdBy?: string;
    createdAt?: string;
    createdDate?: string;
    approvedByName?: string;
    approvedByRole?: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedByName?: string;
    rejectedByRole?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    exportedByName?: string;
    exportedByRole?: string;
    exportedBy?: string;
    exportedAt?: string;
};

function StatusSidebar({ data }: { data: SupplierExport }) {
    const [processing, setProcessing] = useState(false);
    const auditData = data as SupplierExportWithAudit;
    const { user } = useUser();
    const userRoles = user?.roles || [];
    const isAdmin = hasRole(userRoles, ['ADMIN']);
    const isManager = hasRole(userRoles, ['MANAGER']);

    const pickUser = (...values: Array<string | number | null | undefined>) => {
        for (const v of values) {
            if (v === null || v === undefined) continue;
            if (typeof v === 'number') return String(v);
            if (typeof v === 'string' && v.trim().length > 0) return v.trim();
        }
        return 'Chưa có';
    };

    const createdBy = pickUser(
        auditData.createdByName,
        auditData.createdBy,
        (auditData as Record<string, string | undefined>).creatorName,
        (auditData as Record<string, string | undefined>).creator,
        (auditData as Record<string, string | undefined>).createdName,
        (auditData as Record<string, string | undefined>).createBy,
        (auditData as Record<string, string | undefined>).createUser,
        (auditData as Record<string, string | undefined>).createdByFullName,
        (auditData as Record<string, string | undefined>).createdByUsername,
    );
    const createdByRole = auditData.createdByRole ?? '';
    const createdAt =
        auditData.createdAt ??
        auditData.createdDate ??
        (auditData as Record<string, string | undefined>).createdTime ??
        (auditData as Record<string, string | undefined>).createTime ??
        '';

    const approvedBy = pickUser(
        auditData.approvedByName,
        auditData.approvedBy,
        (auditData as Record<string, string | undefined>).approverName,
        (auditData as Record<string, string | undefined>).approver,
        (auditData as Record<string, string | undefined>).approvedName,
        (auditData as Record<string, string | undefined>).approvedUser,
    );
    const approvedByRole = auditData.approvedByRole ?? '';
    const approvedAt =
        auditData.approvedAt ??
        (auditData as Record<string, string | undefined>).approvedTime ??
        '';

    const rejectedBy = pickUser(
        auditData.rejectedByName,
        auditData.rejectedBy,
        (auditData as Record<string, string | undefined>).rejectorName,
        (auditData as Record<string, string | undefined>).rejector,
        (auditData as Record<string, string | undefined>).rejectedName,
        (auditData as Record<string, string | undefined>).rejectedUser,
    );
    const rejectedByRole = auditData.rejectedByRole ?? '';
    const rejectedAt =
        auditData.rejectedAt ??
        (auditData as Record<string, string | undefined>).rejectedTime ??
        '';

    const exportedBy = pickUser(
        auditData.exportedByName,
        auditData.exportedBy,
        (auditData as Record<string, string | undefined>).exporterName,
        (auditData as Record<string, string | undefined>).exporter,
        (auditData as Record<string, string | undefined>).exportedName,
        (auditData as Record<string, string | undefined>).exportedUser,
    );
    const exportedByRole = auditData.exportedByRole ?? '';
    const exportedAt =
        auditData.exportedAt ??
        (auditData as Record<string, string | undefined>).exportedTime ??
        '';

    // Sử dụng formatDateTimeWithSeconds từ utils.ts

    // Kiểm tra quyền
    const canApprove = hasPermission(userRoles, PERMISSIONS.EXPORT_APPROVE);
    // Chỉ role có EXPORT_CONFIRM (thường là Admin) mới được xuất kho
    const canConfirm = hasPermission(userRoles, PERMISSIONS.EXPORT_CONFIRM);
    const canReject = hasPermission(userRoles, PERMISSIONS.EXPORT_REJECT);
    const canCancel = hasPermission(userRoles, PERMISSIONS.EXPORT_CANCEL);
    const canDelete = hasPermission(userRoles, PERMISSIONS.EXPORT_DELETE);

    const handleApprove = async () => {
        if (!canApprove) {
            alert('Bạn không có quyền duyệt phiếu xuất');
            return;
        }
        if (!confirm('Duyệt phiếu xuất này (chờ Admin xuất kho)?')) return;

        try {
            setProcessing(true);
            const { approveExport } = await import('@/services/inventory.service');
            await approveExport(data.id);
            alert('Đã duyệt phiếu xuất, chờ Admin xuất kho.');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi duyệt phiếu');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirm = async () => {
        if (!canConfirm) {
            alert('Chỉ Admin mới có quyền xuất kho bước cuối');
            return;
        }
        if (!confirm('Xác nhận xuất kho và cập nhật tồn kho?')) return;

        try {
            setProcessing(true);
            const { confirmExport } = await import('@/services/inventory.service');
            await confirmExport(data.id);
            alert('Đã xuất kho thành công!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi xuất kho');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!canReject) {
            alert('Bạn không có quyền từ chối phiếu xuất');
            return;
        }
        if (!confirm('Bạn chắc chắn muốn từ chối phiếu xuất này?')) return;

        try {
            setProcessing(true);
            const { rejectExport } = await import('@/services/inventory.service');
            await rejectExport(data.id);
            alert('Đã từ chối phiếu xuất!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi từ chối phiếu');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!canCancel) {
            alert('Bạn không có quyền hủy phiếu xuất');
            return;
        }
        if (!confirm('Bạn chắc chắn muốn hủy / xoá phiếu xuất này?')) return;

        try {
            setProcessing(true);
            const { cancelExport } = await import('@/services/inventory.service');
            await cancelExport(data.id);
            alert('Đã hủy phiếu xuất!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi hủy phiếu');
        } finally {
            setProcessing(false);
        }
    };

    const isPending = data.status === 'PENDING';
    const isApproved = data.status === 'APPROVED';

    const ReadonlyInput = ({ value, fallback = '—', label }: { value?: string; fallback?: string; label?: string }) => {
        const display = value && value.trim() !== '' && value !== 'Chưa có' ? value : fallback;
        const isEmpty = !value || value.trim() === '' || value === 'Chưa có';
        return (
            <div className="relative">
                <input
                    type="text"
                    readOnly
                    value={display}
                    className={`w-full h-9 px-3 text-sm bg-white border rounded-md focus:outline-none ${
                        isEmpty ? 'border-gray-200 bg-gray-50 text-gray-400 italic' : 'border-gray-300 text-gray-800'
                    }`}
                    placeholder={label}
                />
            </div>
        );
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-200 p-6">
            <h3 className="text-base font-bold mb-5 text-blue-gray-800 flex items-center gap-2">
                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                Tình trạng
            </h3>

            <div className="space-y-5">
                {/* Tạo bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Tạo bởi
                        </span>
                        <button
                            onClick={handleCancel}
                            disabled={processing || !isPending || !canDelete}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FFB55A] hover:bg-[#FFA042] text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            title={!canDelete ? 'Bạn không có quyền xóa phiếu' : ''}
                        >
                            Xóa
                        </button>
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người tạo</label>
                            <ReadonlyInput value={createdBy} label="Chưa có" />
                        </div>
                        {createdByRole && createdByRole.trim() !== '' && createdBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={createdByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(createdAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Duyệt bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Duyệt bởi
                        </span>
                        {isPending && (
                            <button
                                onClick={handleApprove}
                                disabled={processing || !canApprove}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#FFC947] hover:bg-[#FFB800] text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title={!canApprove ? 'Bạn không có quyền duyệt phiếu' : ''}
                            >
                                {processing ? 'Đang duyệt...' : 'Duyệt'}
                            </button>
                        )}
                        {isApproved && (
                            <button
                                onClick={handleConfirm}
                                disabled={processing || !canConfirm}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md text-white transition-colors shadow-sm ${canConfirm
                                    ? 'bg-[#00B894] hover:bg-[#00A884]'
                                    : 'bg-[#B0B4BA] cursor-not-allowed'
                                    }`}
                                title={!canConfirm ? 'Chỉ Admin mới được xuất kho' : ''}
                            >
                                {processing ? 'Đang xuất kho...' : 'Xuất kho'}
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người duyệt</label>
                            <ReadonlyInput value={approvedBy} label="Chưa có" />
                        </div>
                        {approvedByRole && approvedByRole.trim() !== '' && approvedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={approvedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(approvedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Từ chối bởi */}
                <div className="pb-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Từ chối bởi
                        </span>
                        {isPending && (
                            <button
                                onClick={handleReject}
                                disabled={processing || !canReject}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[#F97070] hover:bg-[#F85A5A] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                title={!canReject ? 'Bạn không có quyền từ chối phiếu' : ''}
                            >
                                Từ chối
                            </button>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người từ chối</label>
                            <ReadonlyInput value={rejectedBy} label="Chưa có" />
                        </div>
                        {rejectedByRole && rejectedByRole.trim() !== '' && rejectedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={rejectedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(rejectedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>

                {/* Đã xuất bởi */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Đã xuất bởi
                        </span>
                        {data.status === 'EXPORTED' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-700">
                                Hoàn thành
                            </span>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Người xuất kho</label>
                            <ReadonlyInput value={exportedBy} label="Chưa có" />
                        </div>
                        {exportedByRole && exportedByRole.trim() !== '' && exportedBy !== 'Chưa có' && (
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Vai trò</label>
                                <ReadonlyInput value={exportedByRole} label="—" />
                            </div>
                        )}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Thời gian</label>
                            <ReadonlyInput value={formatDateTimeWithSeconds(exportedAt)} label="Chưa có" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
