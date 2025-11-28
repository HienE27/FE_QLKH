/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getStaffImportById, confirmStaffImport, cancelStaffImport, type StaffImport, type StaffImportDetail } from '@/services/inventory.service';
import { getProduct } from '@/services/product.service';

const API_BASE_URL = 'http://localhost:8080';

function buildImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${clean}`;
}

const formatCurrency = (value: number) => value.toLocaleString('vi-VN');
const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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

export default function ViewStaffImportReceipt() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [data, setData] = useState<StaffImport | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await getStaffImportById(id);

            console.log('📦 Staff Import Data:', result);

            // Fetch thông tin nhân viên
            let staff: any = null;
            if (result.staffId) {
                try {
                    const { getSupplier } = await import('@/services/supplier.service');
                    staff = await getSupplier(result.staffId);
                    console.log('👤 Staff:', staff);
                } catch (err) {
                    console.error('Failed to fetch staff:', err);
                }
            }

            // Map lại thông tin nhân viên
            const mappedImport: StaffImport = {
                ...result,
                staffName: staff?.name ?? result.staffName ?? null,
                staffCode: staff?.code ?? result.staffCode ?? null,
                staffPhone: staff?.phone ?? result.staffPhone ?? null,
                staffAddress: staff?.address ?? result.staffAddress ?? null,
            };

            console.log('✅ Mapped Import:', mappedImport);

            // Fetch thông tin sản phẩm cho từng item nếu thiếu
            if (mappedImport.items && mappedImport.items.length > 0) {
                const mappedItems: StaffImportDetail[] = await Promise.all(
                    mappedImport.items.map(async (item) => {
                        if (item.productCode && item.productName) {
                            return item; // Đã có đầy đủ thông tin
                        }

                        // Fetch thông tin sản phẩm
                        try {
                            const product = await getProduct(item.productId);
                            return {
                                ...item,
                                productCode: product.code,
                                productName: product.name,
                                unit: item.unit || 'Cái',
                            };
                        } catch (err) {
                            console.error('Failed to fetch product:', item.productId, err);
                            return {
                                ...item,
                                productCode: `ID: ${item.productId}`,
                                productName: `Sản phẩm #${item.productId}`,
                            };
                        }
                    })
                );
                mappedImport.items = mappedItems;
            }

            setData(mappedImport);
        } catch (error) {
            console.error('Lỗi khi tải chi tiết phiếu nhập:', error);
            alert('Không thể tải chi tiết phiếu nhập');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!confirm('Xác nhận nhập kho?')) return;
        try {
            setProcessing(true);
            await confirmStaffImport(id);
            alert('Xác nhận nhập kho thành công!');
            loadData();
        } catch (error) {
            console.error('Lỗi khi xác nhận:', error);
            alert(error instanceof Error ? error.message : 'Không thể xác nhận phiếu nhập');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Hủy phiếu nhập này?')) return;
        try {
            setProcessing(true);
            await cancelStaffImport(id);
            alert('Hủy phiếu nhập thành công!');
            loadData();
        } catch (error) {
            console.error('Lỗi khi hủy:', error);
            alert(error instanceof Error ? error.message : 'Không thể hủy phiếu nhập');
        } finally {
            setProcessing(false);
        }
    };

    const calculateTotal = () => {
        if (!data?.items) return 0;
        return data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <Header />
                <Sidebar />
                <main className="ml-[377px] mt-[113px] p-6 pr-12">
                    <div className="text-center py-8">Đang tải...</div>
                </main>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen">
                <Header />
                <Sidebar />
                <main className="ml-[377px] mt-[113px] p-6 pr-12">
                    <div className="text-center py-8">Không tìm thấy phiếu nhập</div>
                </main>
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
                            <h2 className="text-xl font-bold text-center flex-1">PHIẾU NHẬP KHO NHÂN VIÊN</h2>
                            <button
                                onClick={() => router.back()}
                                className="text-2xl font-bold hover:text-red-600 transition-colors"
                            >
                                X
                            </button>
                        </div>

                        {/* Thông tin chung */}
                        <div className="border border-black bg-gray-100 p-6 mb-6">
                            <h3 className="text-base font-bold mb-4">Thông tin chung</h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Nhân viên</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.staffName || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Mã nhân viên</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.staffCode || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Số điện thoại</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-white text-sm text-right">
                                            {data.staffPhone || 'N/A'}
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <label className="w-28 text-sm pt-2">Địa chỉ</label>
                                        <div className="flex-1 px-3 py-2 border border-black bg-white text-sm text-right h-14">
                                            {data.staffAddress || 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Mã lệnh</label>
                                        <div className="flex-1 px-3 py-1.5 border border-black bg-gray-200 text-sm text-right">
                                            {data.code}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="w-28 text-sm">Nhập tại kho</label>
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
                                        <th className="px-4 py-3 text-center font-semibold text-sm">Thành tiền</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data.items && data.items.length > 0 ? (
                                        data.items.map((item, index) => (
                                            <tr key={item.id || index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-center text-sm text-gray-700 font-semibold">{index + 1}</td>
                                                <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">{item.productName}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{item.productCode}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{item.unitName || item.unit}</td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                                <td className="px-4 py-3 text-center text-sm text-gray-700">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                    {formatCurrency(item.quantity * item.unitPrice)}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                                                Không có sản phẩm
                                            </td>
                                        </tr>
                                    )}
                                    {data.items && data.items.length > 0 && (
                                        <tr className="bg-blue-50 border-t-2 border-blue-600">
                                            <td colSpan={6} className="px-4 py-3 text-right font-bold text-sm text-gray-900">Tổng</td>
                                            <td className="px-4 py-3 text-right font-bold text-sm text-blue-600">
                                                {formatCurrency(calculateTotal())}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Hợp đồng / Ảnh đính kèm */}
                        {data.attachmentImages && data.attachmentImages.length > 0 && (
                            <div className="border border-black bg-gray-100 p-6 rounded mb-6">
                                <h3 className="text-base font-bold mb-4">Hợp đồng / Ảnh đính kèm</h3>
                                <div className="flex gap-4 flex-wrap">
                                    {data.attachmentImages.map((url, idx) => (
                                        <div
                                            key={idx}
                                            className="w-[180px] h-[240px] bg-white border rounded shadow flex items-center justify-center"
                                        >
                                            <img
                                                src={buildImageUrl(url)}
                                                alt={`Ảnh ${idx + 1}`}
                                                className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                                onClick={() => window.open(buildImageUrl(url), '_blank')}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {data.status === 'PENDING' && (
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={handleCancel}
                                    disabled={processing}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    Hủy phiếu
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={processing}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    Xác nhận nhập kho
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Status Sidebar */}
                <div className="w-[274px] bg-gray-100 rounded-lg p-5 shadow-lg h-fit">
                    <h3 className="text-base font-bold mb-4">Tình trạng</h3>
                    <div className="space-y-4">
                        <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                            <div className="text-sm font-bold mb-1">Trạng thái</div>
                            <div className="text-sm">{getStatusText(data.status)}</div>
                        </div>
                        <div className="px-4 py-2 bg-white border border-gray-400 rounded">
                            <div className="text-sm font-bold mb-1">Tổng giá trị</div>
                            <div className="text-sm">{formatCurrency(data.totalValue)}</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
