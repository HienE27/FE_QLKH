/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import {
    getInventoryCheckById,
    approveInventoryCheck,
    rejectInventoryCheck,
    type InventoryCheck,
    type InventoryCheckDetail,
} from '@/services/inventory.service';

import { getProduct } from '@/services/product.service';

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

function formatDateTime(value: string | null | undefined) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN');
}

export default function ViewInventoryCheckPage() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<InventoryCheck | null>(null);
    const [items, setItems] = useState<InventoryCheckDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                const checkData = await getInventoryCheckById(id);
                setData(checkData);

                console.log('🔍 Check Data:', checkData);

                const rawItems = checkData.items || [];
                console.log('🔍 Raw Items:', rawItems);

                // Fetch thông tin sản phẩm cho từng item
                const mappedItems: InventoryCheckDetail[] = await Promise.all(
                    rawItems.map(async (it: any) => {
                        let productCode = '';
                        let productName = '';
                        let unit = 'Cái';

                        if (it.productCode && it.productName) {
                            productCode = it.productCode;
                            productName = it.productName;
                            unit = it.unit || 'Cái';
                        } else if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                productCode = product.code;
                                productName = product.name;
                                unit = 'Cái';
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                                productCode = `ID: ${it.productId}`;
                                productName = `Sản phẩm #${it.productId}`;
                            }
                        }

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            systemQuantity: it.systemQuantity ?? 0,
                            actualQuantity: it.actualQuantity ?? 0,
                            differenceQuantity: it.differenceQuantity ?? 0,
                            unitPrice: it.unitPrice ?? 0,
                            totalValue: it.totalValue ?? 0,
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
                Không tìm thấy phiếu kiểm kê
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
                                PHIẾU KIỂM KÊ KHO
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

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-4">
                                    <InfoRow label="Mã phiếu" value={data.checkCode} />
                                    <InfoRow label="Kho kiểm kê" value={data.storeName || 'Kho tổng'} />
                                    <InfoRow label="Mã kho" value={data.storeCode || 'KT_5467'} />
                                </div>

                                <div className="space-y-4">
                                    <InfoRow label="Ngày kiểm kê" value={formatDateTime(data.checkDate)} />
                                    <InfoRow label="Mô tả" value={data.description} multi />
                                    <InfoRow label="Ghi chú" value={data.note} multi />
                                </div>
                            </div>
                        </div>

                        {/* BẢNG SẢN PHẨM */}
                        <div className="border-4 border-gray-400 mb-6 overflow-hidden rounded">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[#0046ff] text-white h-10">
                                        <th className="px-2 w-12">STT</th>
                                        <th className="px-2 w-40">Tên hàng hóa</th>
                                        <th className="px-2 w-24">Mã hàng</th>
                                        <th className="px-2 w-20">ĐVT</th>
                                        <th className="px-2 w-24">SL Hệ thống</th>
                                        <th className="px-2 w-24">SL Thực tế</th>
                                        <th className="px-2 w-24">Chênh lệch</th>
                                        <th className="px-2 w-28">Đơn giá</th>
                                        <th className="px-2 w-28">Giá trị CL</th>
                                        <th className="px-2 w-32">Ghi chú</th>
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
                                            <tr key={i} className="border-t h-10">
                                                <td className="text-center">{i + 1}</td>
                                                <td className="px-2">{it.productName}</td>
                                                <td className="text-center">{it.productCode}</td>
                                                <td className="text-center">{it.unit ?? 'Cái'}</td>
                                                <td className="text-right px-2">
                                                    {formatCurrency(it.systemQuantity)}
                                                </td>
                                                <td className="text-right px-2">
                                                    {formatCurrency(it.actualQuantity)}
                                                </td>
                                                <td className={`text-right px-2 font-medium ${it.differenceQuantity > 0 ? 'text-green-600' : it.differenceQuantity < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {formatCurrency(it.differenceQuantity)}
                                                </td>
                                                <td className="text-right px-2">
                                                    {formatCurrency(it.unitPrice)}
                                                </td>
                                                <td className={`text-right px-2 font-medium ${it.totalValue > 0 ? 'text-green-600' : it.totalValue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {formatCurrency(it.totalValue)}
                                                </td>
                                                <td className="text-center px-2 text-xs">
                                                    {it.note || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    <tr className="bg-gray-100 font-bold h-10 border-t">
                                        <td colSpan={8} className="text-center">
                                            Tổng giá trị chênh lệch
                                        </td>
                                        <td className={`text-right px-4 ${data.totalDifferenceValue > 0 ? 'text-green-600' : data.totalDifferenceValue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {formatCurrency(data.totalDifferenceValue)}
                                        </td>
                                        <td></td>
                                    </tr>
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
    multi?: boolean;
}

function InfoRow({ label, value, multi = false }: InfoRowProps) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-28 text-sm pt-1">{label}</label>
            <div
                className={`flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right ${multi ? 'h-14' : ''
                    }`}
            >
                {value ?? ''}
            </div>
        </div>
    );
}

function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
        'PENDING': 'Chờ duyệt',
        'APPROVED': 'Đã duyệt',
        'REJECTED': 'Từ chối',
    };
    return statusMap[status] || status;
}

function getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
        'PENDING': 'bg-[#fcbd17]',
        'APPROVED': 'bg-[#1ea849]',
        'REJECTED': 'bg-[#ee4b3d]',
    };
    return colorMap[status] || 'bg-gray-400';
}

function StatusSidebar({ data }: { data: InventoryCheck }) {
    const router = useRouter();
    const [processing, setProcessing] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const handleApprove = async () => {
        if (!confirm('Duyệt phiếu kiểm kê này? Tồn kho sẽ được cập nhật theo số liệu thực tế.')) return;

        try {
            setProcessing(true);
            await approveInventoryCheck(data.id);
            alert('Đã duyệt phiếu kiểm kê thành công!');
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi duyệt phiếu');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Vui lòng nhập lý do từ chối');
            return;
        }

        try {
            setProcessing(true);
            await rejectInventoryCheck(data.id, { reason: rejectReason });
            alert('Đã từ chối phiếu kiểm kê!');
            setShowRejectModal(false);
            window.location.reload();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Lỗi từ chối phiếu');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <div className="w-[274px] bg-gray-100 rounded-lg p-5 shadow-lg h-fit">
                <h3 className="text-base font-bold mb-4">Tình trạng</h3>

                <div className="space-y-4">
                    <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                        <div className="text-sm font-bold mb-1">Trạng thái</div>
                        <div className={`inline-block px-3 py-1 rounded text-sm font-medium text-black ${getStatusColor(data.status)}`}>
                            {getStatusText(data.status)}
                        </div>
                    </div>

                    <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                        <div className="text-sm font-bold mb-1">Tổng chênh lệch</div>
                        <div className={`text-sm font-medium ${data.totalDifferenceValue > 0 ? 'text-green-600' : data.totalDifferenceValue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {formatCurrency(data.totalDifferenceValue)}
                        </div>
                    </div>

                    {data.status === 'PENDING' && (
                        <div className="space-y-3 mt-4">
                            <button
                                onClick={handleApprove}
                                disabled={processing}
                                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold disabled:opacity-60"
                            >
                                {processing ? 'Đang xử lý...' : 'Duyệt phiếu'}
                            </button>
                            <button
                                onClick={() => setShowRejectModal(true)}
                                disabled={processing}
                                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold disabled:opacity-60"
                            >
                                Từ chối
                            </button>
                            <button
                                onClick={() => router.push(`/inventory/edit-inventory-check/${data.id}`)}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                            >
                                Chỉnh sửa
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal từ chối */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[500px] p-6">
                        <h3 className="text-lg font-bold mb-4">Từ chối phiếu kiểm kê</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Lý do từ chối <span className="text-red-600">*</span>
                            </label>
                            <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Nhập lý do từ chối..."
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                                disabled={processing}
                                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded transition-colors disabled:opacity-60"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={processing || !rejectReason.trim()}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-60"
                            >
                                {processing ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
