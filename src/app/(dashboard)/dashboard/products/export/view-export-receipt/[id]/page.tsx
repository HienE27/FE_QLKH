/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import {
    getSupplierExportById,
    type SupplierExport,
    type SupplierExportDetail,
} from '@/services/inventory.service';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProduct } from '@/services/product.service';

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function buildImageUrl(path: string | null | undefined) {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE}${clean}`;
}

export default function ViewExportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<SupplierExport | null>(null);
    const [items, setItems] = useState<SupplierExportDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                // Lấy phiếu xuất
                const exportData = await getSupplierExportById(id);

                // ---- Fetch thông tin NCC nếu có supplierId ----
                let supplier: Supplier | null = null;
                if (exportData.supplierId) {
                    try {
                        const suppliers = await getSuppliers();
                        supplier = suppliers.find((s: Supplier) => s.id === exportData.supplierId) ?? null;
                        console.log('🔍 Found Supplier:', supplier);
                    } catch (err) {
                        console.error('Failed to fetch suppliers:', err);
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
                    supplierName: supplier?.name ?? exportData.supplierName ?? null,
                    supplierCode: supplier?.code ?? exportData.supplierCode ?? null,
                    supplierPhone: supplier?.phone ?? exportData.supplierPhone ?? null,
                    supplierAddress: supplier?.address ?? exportData.supplierAddress ?? null,
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

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mappedItems: SupplierExportDetail[] = await Promise.all(
                    rawItems.map(async (it) => {
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';

                        // Nếu đã có sẵn thông tin sản phẩm từ BE
                        if (it.productCode && it.productName) {
                            productCode = it.productCode;
                            productName = it.productName;
                            unit = it.unit || 'Cái';
                        }
                        // Nếu chỉ có productId, gọi API để lấy thông tin
                        else if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                productCode = product.code;
                                productName = product.name;
                                unit = 'Cái'; // Hoặc lấy từ product nếu có field unit
                            } catch (err) {
                                // Khi sản phẩm đã bị xóa hoặc phía BE trả lỗi 404
                                // thì ghi log dạng cảnh báo để tránh Next.js overlay chặn UI
                                const message = err instanceof Error ? err.message : 'Không thể tải sản phẩm';
                                console.warn(`Product ${it.productId} missing: ${message}`);
                                // Fallback: hiển thị productId nếu không fetch được
                                productCode = `ID: ${it.productId}`;
                                productName = `Sản phẩm #${it.productId} (đã xóa)`;
                            }
                        }

                        // ⭐ Tính ngược lại giá gốc từ giá sau chiết khấu
                        const discount = it.discountPercent || 0;
                        const priceAfterDiscount = it.unitPrice ?? it.price ?? 0;
                        const originalPrice = discount > 0
                            ? Math.round(priceAfterDiscount / (1 - discount / 100))
                            : priceAfterDiscount;

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            unitPrice: originalPrice, // Hiển thị giá gốc
                            quantity: it.quantity ?? 0,
                            discountPercent: discount, // ⭐ Lưu lại discount để hiển thị
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
            <div className="ml-[377px] mt-[150px] text-xl">
                Đang tải...
            </div>
        );
    }

    if (!data) {
        return (
            <div className="ml-[377px] mt-[150px] text-xl text-red-600">
                Không tìm thấy phiếu xuất
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12 flex gap-6">
                <div className="flex-1">
                    <div className="bg-white rounded-lg shadow-2xl p-8 border border-black">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex-1 text-center">
                                PHIẾU XUẤT KHO (NCC)
                            </h2>

                            <button
                                onClick={() => router.back()}
                                className="text-2xl font-bold hover:text-red-600 transition"
                            >
                                X
                            </button>
                        </div>

                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-black bg-gray-100 p-6 mb-6">
                            <h3 className="text-base font-bold mb-4">Thông tin chung</h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                {/* Left Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Nguồn nhận</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.supplierName || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Mã nguồn</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.supplierCode || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Số điện thoại</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.supplierPhone || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <label className="w-28 text-sm pt-2">Địa chỉ</label>
                                        <div className="flex-1 px-3 py-2 border border-black bg-white text-sm text-right h-14">
                                            {data.supplierAddress || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Mã lệnh</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-gray-200 text-sm text-right">
                                            {data.code}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Xuất tại kho</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            Kho tổng
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Mã kho</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            KT_5467
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <label className="w-28 text-sm pt-2">Lý do</label>
                                        <div className="flex-1 px-3 py-2 border border-black bg-white text-sm text-right h-14">
                                            {data.note || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BẢNG SẢN PHẨM */}
                        <div className="border border-gray-200 rounded-lg mb-6 overflow-hidden shadow-sm">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-blue-600 text-white">
                                        <th className="px-4 py-3 text-center font-semibold text-sm">STT</th>
                                        <th className="px-4 py-3 text-left font-semibold text-sm">Tên hàng hóa</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Mã hàng</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Đơn vị tính</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Đơn giá</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Số lượng</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Chiết khấu (%)</th>
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                                                Không có sản phẩm
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((it, i) => (
                                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-center text-sm text-gray-700 font-semibold">{i + 1}</td>
                                                <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">{it.productName}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{it.productCode}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{it.unit ?? 'Cái'}</td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                    {Number(it.unitPrice).toLocaleString('vi-VN')}
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{it.quantity}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{it.discountPercent || 0}</td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                    {(() => {
                                                        const subtotal = Number(it.unitPrice) * it.quantity;
                                                        const discount = it.discountPercent || 0;
                                                        const finalAmount = discount > 0
                                                            ? subtotal * (1 - discount / 100)
                                                            : subtotal;
                                                        return Math.round(finalAmount).toLocaleString('vi-VN');
                                                    })()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {items.length > 0 && (
                                        <tr className="bg-blue-50 border-t-2 border-blue-600">
                                            <td colSpan={7} className="px-4 py-3 text-right font-bold text-sm text-gray-900">Tổng</td>
                                            <td className="px-4 py-3 text-right font-bold text-sm text-blue-600">
                                                {data.totalValue.toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* HÌNH ẢNH */}
                        {data.attachmentImages && data.attachmentImages.length > 0 && (
                            <div className="border border-black bg-gray-100 p-6 mb-6">
                                <h3 className="text-base font-bold mb-4">Hợp đồng / Ảnh đính kèm</h3>
                                <div className="flex flex-wrap gap-4">
                                    {data.attachmentImages.map((img, idx) => {
                                        const url = buildImageUrl(img);
                                        return url ? (
                                            <div key={idx} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Ảnh ${idx + 1}`}
                                                    className="w-32 h-32 object-cover border-2 border-gray-300 rounded cursor-pointer hover:border-blue-500 transition-colors"
                                                    onClick={() => window.open(url, '_blank')}
                                                />
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <StatusSidebar data={data} />
            </main>
        </div>
    );
}

/* ---------- HELPER FUNCTIONS ---------- */
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
            const { confirmSupplierExport } = await import('@/services/inventory.service');
            await confirmSupplierExport(data.id);
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
            const { cancelSupplierExport } = await import('@/services/inventory.service');
            await cancelSupplierExport(data.id);
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
                            {processing ? 'Đang xử lý...' : 'Xuất kho'}
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
