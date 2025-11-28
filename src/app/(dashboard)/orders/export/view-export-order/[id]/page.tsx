/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
    getExportOrderById,
    approveExportOrder,
    cancelExportOrder,
    type ExportOrder,
    type ExportOrderDetail,
} from '@/services/inventory.service';
import { getProduct } from '@/services/product.service';

const formatCurrency = (value: number) => value.toLocaleString('vi-VN');

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

export default function ViewExportOrder() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<ExportOrder | null>(null);
    const [items, setItems] = useState<ExportOrderDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                // Lấy lệnh xuất
                const orderData = await getExportOrderById(id);

                console.log('🔍 Export Order Data:', orderData);

                // Map supplier info sang customer fields để hiển thị
                const mappedOrder: ExportOrder = {
                    ...orderData,
                    customerName: orderData.supplierName ?? orderData.customerName ?? null,
                    customerCode: orderData.supplierCode ?? orderData.customerCode ?? null,
                    customerPhone: orderData.supplierPhone ?? orderData.customerPhone ?? null,
                    customerAddress: orderData.supplierAddress ?? orderData.customerAddress ?? null,
                };

                setData(mappedOrder);

                // ---- map lại danh sách sản phẩm ----
                const rawItems = orderData.items || [];

                console.log('🔍 Raw Items:', rawItems);

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mappedItems: ExportOrderDetail[] = await Promise.all(
                    rawItems.map(async (it: any) => {
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
                                unit = 'Cái';
                            } catch (err) {
                                // Sản phẩm có thể đã bị xóa, không cần log error
                                const errorMessage = err instanceof Error ? err.message : String(err);
                                if (!errorMessage.includes('Không tìm thấy')) {
                                    console.warn('Failed to fetch product:', it.productId, err);
                                }
                                productCode = `ID: ${it.productId}`;
                                productName = `Sản phẩm #${it.productId}`;
                            }
                        }

                        // ⭐ Tính ngược lại giá gốc từ giá sau chiết khấu
                        const discount = it.discount || it.discountPercent || 0;
                        const priceAfterDiscount = it.unitPrice ?? it.price ?? 0;
                        const originalPrice = discount > 0
                            ? Math.round(priceAfterDiscount / (1 - discount / 100))
                            : priceAfterDiscount;

                        console.log('🔍 Item discount:', {
                            discount: it.discount,
                            discountPercent: it.discountPercent,
                            finalDiscount: discount,
                            priceAfterDiscount,
                            originalPrice
                        });

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            unitPrice: originalPrice, // Hiển thị giá gốc
                            quantity: it.quantity ?? 0,
                            discount: discount, // ⭐ Thêm discount vào return
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
                Không tìm thấy lệnh xuất
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
                                LỆNH XUẤT KHO
                            </h2>

                            <button
                                onClick={() => router.back()}
                                className="text-2xl font-bold hover:text-red-600 transition"
                            >
                                X
                            </button>
                        </div>

                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-black bg-gray-100 p-6 mb-6 rounded">
                            <h3 className="font-bold mb-4">Thông tin chung</h3>

                            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                <InfoRow label="Nguồn xuất" value={data.customerName || 'N/A'} />
                                <InfoRow label="Mã lệnh" value={data.code || 'N/A'} />
                                <InfoRow label="Mã nguồn" value={data.customerCode || 'N/A'} />
                                <InfoRow label="Xuất tại kho" value="Kho tổng" />
                                <InfoRow label="Số điện thoại" value={data.customerPhone || 'N/A'} />
                                <InfoRow label="Mã kho" value="KT_5467" />
                                <InfoRow label="Địa chỉ" value={data.customerAddress || 'N/A'} />
                                <InfoRow label="Lý do" value={data.note || 'N/A'} />
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
                                                Không có sản phẩm nào
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
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{it.discount || it.discountPercent || 0}</td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                    {(() => {
                                                        const subtotal = Number(it.unitPrice) * it.quantity;
                                                        const discount = it.discount || it.discountPercent || 0;
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
}

function InfoRow({ label, value }: InfoRowProps) {
    return (
        <div className="flex items-center gap-3">
            <label className="w-28 text-sm">{label}</label>
            <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm">
                {value ?? ''}
            </div>
        </div>
    );
}

function StatusSidebar({ data }: { data: ExportOrder }) {
    const router = useRouter();
    const [processing, setProcessing] = useState(false);

    const handleApprove = async () => {
        if (!confirm('Duyệt lệnh xuất này?')) return;

        try {
            setProcessing(true);
            await approveExportOrder(data.id);
            alert('Duyệt lệnh xuất thành công!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi duyệt lệnh');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy lệnh xuất này?')) return;

        try {
            setProcessing(true);
            await cancelExportOrder(data.id);
            alert('Hủy lệnh xuất thành công!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi hủy lệnh');
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
                            onClick={handleApprove}
                            disabled={processing}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-60"
                        >
                            {processing ? 'Đang xử lý...' : 'Duyệt lệnh'}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={processing}
                            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-60"
                        >
                            Hủy lệnh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
