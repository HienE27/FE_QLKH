/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import {
    getSupplierImportById,
    type SupplierImport,
    type SupplierImportDetail,
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

export default function ViewImportReceipt() {
    const params = useParams();
    const router = useRouter();

    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const id = Number(rawId);

    const [data, setData] = useState<SupplierImport | null>(null);
    const [items, setItems] = useState<SupplierImportDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        (async () => {
            try {
                setLoading(true);

                // Lấy phiếu nhập
                const importData = await getSupplierImportById(id);

                // ---- Fetch thông tin NCC ----
                let supplier: Supplier | null = null;
                if (importData.supplierId) {
                    try {
                        const suppliers = await getSuppliers('NCC');
                        supplier = suppliers.find((s: Supplier) => s.id === importData.supplierId) ?? null;
                        console.log('🏪 Found supplier:', supplier);
                    } catch (err) {
                        console.error('Failed to fetch suppliers:', err);
                    }
                }

                const mappedImport: SupplierImport = {
                    ...importData,
                    supplierName: supplier?.name ?? importData.supplierName ?? null,
                    supplierCode: supplier?.code ?? importData.supplierCode ?? null,
                    supplierPhone: supplier?.phone ?? importData.supplierPhone ?? null,
                    supplierAddress: supplier?.address ?? importData.supplierAddress ?? null,
                };

                setData(mappedImport);

                // ---- DEBUG: Kiểm tra dữ liệu từ API ----
                console.log('🔍 Import Data:', importData);

                // ---- map lại danh sách sản phẩm ----
                const rawItems = importData.items || [];

                console.log('🔍 Raw Items:', rawItems);

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mappedItems: SupplierImportDetail[] = await Promise.all(
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
                                unit = 'Cái'; // Hoặc lấy từ product nếu có field unit
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                                // Fallback: hiển thị productId nếu không fetch được
                                productCode = `ID: ${it.productId}`;
                                productName = `Sản phẩm #${it.productId}`;
                            }
                        }

                        return {
                            ...it,
                            productCode,
                            productName,
                            unit,
                            unitPrice: it.unitPrice ?? it.price ?? 0,
                            quantity: it.quantity ?? 0,
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
                Không tìm thấy phiếu nhập
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
                                PHIẾU NHẬP KHO (NCC)
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
                                    <InfoRow label="Nguồn xuất" value={data.supplierName} />
                                    <InfoRow label="Mã nguồn" value={data.supplierCode} />
                                    <InfoRow label="Số điện thoại" value={data.supplierPhone} />
                                    <InfoRow
                                        label="Địa chỉ"
                                        value={data.supplierAddress}
                                        multi
                                    />
                                </div>

                                <div className="space-y-4">
                                    <InfoRow label="Mã lệnh" value={data.code} />
                                    <InfoRow label="Xuất tại kho" value="Kho tổng" />
                                    <InfoRow label="Mã kho" value="KT_5467" />
                                    <InfoRow label="Lý do" value={data.note} multi />
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
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
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
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                    {(Number(it.unitPrice) * it.quantity).toLocaleString('vi-VN')}
                                                </td>
                                            </tr>
                                        ))
                                    )}

                                    {items.length > 0 && (
                                        <tr className="bg-blue-50 border-t-2 border-blue-600">
                                            <td colSpan={6} className="px-4 py-3 text-right font-bold text-sm text-gray-900">
                                                Tổng
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-sm text-blue-600">
                                                {data.totalValue.toLocaleString('vi-VN')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* HÌNH ẢNH */}
                        <div className="border border-black bg-gray-100 p-6 rounded">
                            <h3 className="font-bold mb-4">
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
                                            className="w-[180px] h-[240px] bg-white border rounded shadow flex items-center justify-center"
                                        >
                                            {url ? (
                                                <img
                                                    src={url}
                                                    className="w-full h-full object-contain"
                                                    alt={`Ảnh ${idx + 1}`}
                                                />
                                            ) : (
                                                <span>No Image</span>
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
    const router = useRouter();
    const [processing, setProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!confirm('Xác nhận nhập kho? Tồn kho sẽ được cập nhật.')) return;

        try {
            setProcessing(true);
            const { confirmSupplierImport } = await import('@/services/inventory.service');
            await confirmSupplierImport(data.id);
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
            const { cancelSupplierImport } = await import('@/services/inventory.service');
            await cancelSupplierImport(data.id);
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
