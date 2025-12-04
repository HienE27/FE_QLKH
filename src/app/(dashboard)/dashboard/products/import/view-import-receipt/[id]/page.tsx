/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';

import {
    getImportById,
    type SupplierImport,
    type SupplierImportDetail,
} from '@/services/inventory.service';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProduct } from '@/services/product.service';
import { getStockByProductAndStore } from '@/services/stock.service';
import { buildImageUrl } from '@/lib/utils';

export default function ViewImportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<SupplierImport | null>(null);
    const [items, setItems] = useState<(SupplierImportDetail & { availableQuantity?: number })[]>([]);
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                // Lấy phiếu nhập
                const importData = await getImportById(id);

                // ---- Fetch thông tin nguồn nhập ----
                let foundSupplier: Supplier | null = null;
                if (importData.supplierId) {
                    try {
                        const suppliers = await getSuppliers(); // Lấy tất cả suppliers (NCC, INTERNAL, STAFF, ...)
                        foundSupplier = suppliers.find((s: Supplier) => s.id === importData.supplierId) ?? null;
                        console.log('🏪 Found supplier:', foundSupplier);
                        setSupplier(foundSupplier);
                    } catch (err) {
                        console.error('Failed to fetch suppliers:', err);
                    }
                }

                const mappedImport: SupplierImport = {
                    ...importData,
                    supplierName: foundSupplier?.name ?? importData.supplierName ?? null,
                    supplierCode: foundSupplier?.code ?? importData.supplierCode ?? null,
                    supplierPhone: foundSupplier?.phone ?? importData.supplierPhone ?? null,
                    supplierAddress: foundSupplier?.address ?? importData.supplierAddress ?? null,
                };

                setData(mappedImport);

                // ---- DEBUG: Kiểm tra dữ liệu từ API ----
                console.log('🔍 Import Data:', importData);

                // ---- map lại danh sách sản phẩm ----
                const rawItems = importData.items || [];

                console.log('🔍 Raw Items:', rawItems);

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mappedItems: (SupplierImportDetail & { availableQuantity?: number })[] = await Promise.all(
                    rawItems.map(async (it: SupplierImportDetail) => {
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';
                        let availableQuantity: number | undefined = undefined;

                        // Nếu đã có sẵn thông tin sản phẩm từ BE
                        if (it.productCode && it.productName) {
                            productCode = it.productCode;
                            productName = it.productName;
                            unit = it.unit || 'Cái';
                        }

                        // Nếu có productId, gọi API để lấy thông tin
                        if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                if (!productCode) productCode = product.code;
                                if (!productName) productName = product.name;

                                // Lấy tồn kho từ shop_stocks nếu có storeId
                                if (it.storeId) {
                                    try {
                                        const stock = await getStockByProductAndStore(it.productId, Number(it.storeId));
                                        availableQuantity = stock.quantity ?? 0;
                                    } catch (stockErr) {
                                        console.error('Failed to fetch stock:', it.productId, it.storeId, stockErr);
                                        availableQuantity = 0;
                                    }
                                } else {
                                    availableQuantity = 0;
                                }
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                                // Fallback: hiển thị productId nếu không fetch được
                                if (!productCode) productCode = `ID: ${it.productId}`;
                                if (!productName) productName = `Sản phẩm #${it.productId}`;
                                availableQuantity = 0;
                            }
                        }

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            unitPrice: it.unitPrice ?? 0,
                            quantity: it.quantity ?? 0,
                            availableQuantity,
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
                Không tìm thấy phiếu nhập
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
                                    PHIẾU NHẬP KHO
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
                                {/* Cột trái: Nguồn nhập */}
                                <div className="space-y-4">
                                    <InfoRow label="Nguồn nhập" value={data.supplierName} />

                                    {/* Hiển thị thông tin NCC dạng card giống edit */}
                                    {data.supplierId && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span className="font-semibold text-blue-800">Thông tin nhà cung cấp</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Mã NCC:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {data.supplierCode ?? '-'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Loại:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {supplier?.type ?? '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <InfoRow label="Số điện thoại" value={data.supplierPhone} />
                                            <InfoRow
                                                label="Địa chỉ"
                                                value={data.supplierAddress}
                                                multi
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Cột phải: Mã phiếu và lý do */}
                                <div className="space-y-4">
                                    <InfoRow label="Mã phiếu" value={data.code} />
                                    <InfoRow label="Lý do nhập" value={data.note} multi />
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
                                        <th className="px-4 w-32 font-semibold">Kho nhập</th>
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
                                                    {it.storeName || (it.storeId ? `Kho #${it.storeId}` : '-')}
                                                    {it.storeCode && ` (${it.storeCode})`}
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
                                        <td colSpan={9} className="text-center text-gray-800">
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

function StatusSidebar({ data }: { data: SupplierImport }) {
    const [processing, setProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!confirm('Xác nhận nhập kho? Tồn kho sẽ được cập nhật.')) return;

        try {
            setProcessing(true);
            const { confirmImport } = await import('@/services/inventory.service');
            await confirmImport(data.id);
            alert('Đã xác nhận nhập kho thành công!');
            // Reload lại trang để cập nhật trạng thái
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi xác nhận');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy phiếu nhập này?')) return;

        try {
            setProcessing(true);
            const { cancelImport } = await import('@/services/inventory.service');
            await cancelImport(data.id);
            alert('Đã hủy phiếu nhập!');
            // Reload lại trang để cập nhật trạng thái
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi hủy phiếu');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="w-[274px] bg-gray-100 rounded-lg p-5 shadow-lg h-fit">
            <h3 className="text-base font-bold mb-4">Tình trạng</h3>

            <div className="space-y-4">
                <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                    <div className="text-sm font-bold mb-1">Trạng thái</div>
                    <div className="text-sm">{getStatusText(data.status)}</div>
                </div>

                <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                    <div className="text-sm font-bold mb-1">Tổng giá trị</div>
                    <div className="text-sm">{data.totalValue.toLocaleString('vi-VN')}</div>
                </div>

                {data.status === 'PENDING' && (
                    <div className="space-y-3 mt-4">
                        <button
                            onClick={handleConfirm}
                            disabled={processing}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-60"
                        >
                            {processing ? 'Đang xử lý...' : 'Nhập kho'}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={processing}
                            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-60"
                        >
                            Hủy phiếu
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
