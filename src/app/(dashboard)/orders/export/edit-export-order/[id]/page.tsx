/* eslint-disable @next/next/no-img-element */
'use client';

import {
    useEffect,
    useState,
    type FormEvent,
} from 'react';
import { useRouter, useParams } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProducts, getProduct } from '@/services/product.service';

import {
    type ExportOrderCreateRequest,
    getExportOrderById,
    updateExportOrder,
    type ExportOrderDetail,
} from '@/services/inventory.service';

interface ProductItem {
    rowId: number;
    productId: number;
    code: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    discount: number;
    total: number;
}

export default function EditExportOrderPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = Number(
        Array.isArray(params?.id) ? params.id[0] : params?.id,
    );

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [items, setItems] = useState<ProductItem[]>([]);

    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [supplierCode, setSupplierCode] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');

    const [reason, setReason] = useState('');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    useEffect(() => {
        if (!orderId) return;

        (async () => {
            try {
                const [sup, productList, order] = await Promise.all([
                    getSuppliers('INTERNAL'),
                    getProducts(),
                    getExportOrderById(orderId),
                ]);

                setSuppliers(sup);

                setSupplierId(order.supplierId || order.customerId || '');

                const selectedSupplier = sup.find((s) => s.id === (order.supplierId || order.customerId));
                if (selectedSupplier) {
                    setSupplierCode(selectedSupplier.code ?? '');
                    setSupplierPhone(selectedSupplier.phone ?? '');
                    setSupplierAddress(selectedSupplier.address ?? '');
                } else {
                    setSupplierCode(order.supplierCode ?? order.customerCode ?? '');
                    setSupplierPhone(order.supplierPhone ?? order.customerPhone ?? '');
                    setSupplierAddress(order.supplierAddress ?? order.customerAddress ?? '');
                }

                setReason(order.note ?? '');

                const rawItems = order.items ?? [];

                const mapped: ProductItem[] = await Promise.all(
                    rawItems.map(async (it: ExportOrderDetail, idx) => {
                        let code = '';
                        let name = '';
                        let unit = 'Cái';

                        if (it.productCode && it.productName) {
                            code = it.productCode;
                            name = it.productName;
                            unit = it.unit || it.unitName || 'Cái';
                        } else if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                code = product.code;
                                name = product.name;
                                unit = 'Cái';
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                            }
                        }

                        // Tính ngược lại giá gốc từ giá sau chiết khấu
                        const discount = it.discount || it.discountPercent || 0;
                        const originalPrice = discount > 0
                            ? Math.round(it.unitPrice / (1 - discount / 100))
                            : it.unitPrice;

                        return {
                            rowId: idx + 1,
                            productId: it.productId,
                            code,
                            name,
                            unit,
                            unitPrice: originalPrice, // Lưu giá gốc để tính lại khi edit
                            quantity: it.quantity,
                            discount: discount,
                            total: it.unitPrice * it.quantity, // Total vẫn dùng giá sau CK
                        };
                    })
                );

                setItems(mapped);
            } catch (err) {
                console.error(err);
                setError('Không tải được lệnh xuất');
            } finally {
                setLoading(false);
            }
        })();
    }, [orderId]);

    const changeSupplier = (v: string) => {
        if (!v) {
            setSupplierId('');
            setSupplierCode('');
            setSupplierPhone('');
            setSupplierAddress('');
            return;
        }

        const id = Number(v);
        const sp = suppliers.find((s) => s.id === id);
        setSupplierId(id);

        if (sp) {
            setSupplierCode(sp.code ?? '');
            setSupplierPhone(sp.phone ?? '');
            setSupplierAddress(sp.address ?? '');
        }
    };

    const calculateTotal = (price: number, qty: number, discount: number) => {
        const subtotal = price * qty;
        if (discount > 0) {
            return subtotal * (100 - discount) / 100;
        }
        return subtotal;
    };

    const changeQty = (rowId: number, v: string) => {
        const q = Number(v) || 0;
        setItems((prev) =>
            prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, quantity: q, total: calculateTotal(it.unitPrice, q, it.discount) }
                    : it,
            ),
        );
    };

    const changePrice = (rowId: number, v: string) => {
        const p = Number(v.replace(/[^\d]/g, '')) || 0;
        setItems((prev) =>
            prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, unitPrice: p, total: calculateTotal(p, it.quantity, it.discount) }
                    : it,
            ),
        );
    };

    const changeDiscount = (rowId: number, v: string) => {
        const d = Number(v) || 0;
        setItems((prev) =>
            prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, discount: d, total: calculateTotal(it.unitPrice, it.quantity, d) }
                    : it,
            ),
        );
    };

    const deleteRow = (rowId: number) => {
        setItems((prev) => prev.filter((it) => it.rowId !== rowId));
    };

    const totalAll = items.reduce((sum, it) => sum + it.total, 0);

    const openProductModal = async () => {
        setShowProductModal(true);
        setProductError(null);

        const idsFromCurrent = items.map((p) => p.productId);
        setSelectedProductIds(idsFromCurrent);

        if (productList.length > 0) return;

        try {
            setLoadingProducts(true);
            const list = await getProducts();
            setProductList(list);
        } catch (e) {
            console.error(e);
            setProductError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách hàng hóa',
            );
        } finally {
            setLoadingProducts(false);
        }
    };

    const closeProductModal = () => {
        setShowProductModal(false);
    };

    const toggleSelectProduct = (productId: number) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
        );
    };

    const handleAddSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            closeProductModal();
            return;
        }

        setItems((prev) => {
            const existingProductIds = new Set(prev.map((p) => p.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((p) => p.rowId)) : 0;

            const newRows: ProductItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p: any) => p.id === pid);
                if (!prod) return;

                runningRowId += 1;

                const row: ProductItem = {
                    rowId: runningRowId,
                    productId: prod.id,
                    name: prod.name,
                    code: prod.code,
                    unit: 'Cái',
                    unitPrice: prod.unitPrice ?? 0,
                    quantity: 0,
                    discount: 0,
                    total: 0,
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!supplierId) {
            setError('Vui lòng chọn nguồn xuất');
            return;
        }

        if (items.length === 0) {
            setError('Vui lòng thêm ít nhất 1 sản phẩm');
            return;
        }

        const payload: ExportOrderCreateRequest = {
            storeId: 1,
            supplierId: supplierId as number,
            note: reason || undefined,
            description: undefined,
            items: items.map((it) => {
                // Tính giá sau chiết khấu từ giá gốc
                const finalPrice = it.discount > 0
                    ? Math.round(it.unitPrice * (100 - it.discount) / 100)
                    : it.unitPrice;

                return {
                    productId: it.productId,
                    quantity: it.quantity,
                    unitPrice: finalPrice, // Gửi giá sau chiết khấu
                    discount: it.discount,
                };
            }),
        };

        console.log('📤 Payload gửi lên:', JSON.stringify(payload, null, 2));

        try {
            setSaving(true);
            await updateExportOrder(orderId, payload);
            router.push('/orders/export/export-orders');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Lỗi cập nhật');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="ml-[377px] mt-[150px] text-xl">
                Đang tải...
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                        {error}
                    </div>
                )}

                <div className="flex gap-4 mb-6">
                    <button
                        type="button"
                        onClick={openProductModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                    >
                        + Thêm hàng từ hệ thống
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-2xl p-8 border border-black">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex-1 text-center">
                            SỬA LỆNH XUẤT KHO
                        </h2>

                        <button
                            onClick={() => router.back()}
                            className="text-2xl font-bold hover:text-red-600 transition"
                        >
                            X
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-black bg-gray-100 p-6 mb-6 rounded">
                            <h3 className="font-bold mb-4">Thông tin chung</h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                                <div className="space-y-4">
                                    <InfoRow label="Nguồn xuất">
                                        <select
                                            className="w-full px-3 py-1.5 border border-black rounded bg-white"
                                            value={supplierId}
                                            onChange={(e) => changeSupplier(e.target.value)}
                                        >
                                            <option value="">-- Chọn nguồn xuất --</option>
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </InfoRow>

                                    <InfoRow label="Mã nguồn">
                                        <input
                                            type="text"
                                            value={supplierCode}
                                            readOnly
                                            className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        />
                                    </InfoRow>

                                    <InfoRow label="Số điện thoại">
                                        <input
                                            type="text"
                                            value={supplierPhone}
                                            onChange={(e) => setSupplierPhone(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-black rounded bg-white"
                                        />
                                    </InfoRow>

                                    <InfoRow label="Địa chỉ" multi>
                                        <textarea
                                            value={supplierAddress}
                                            onChange={(e) => setSupplierAddress(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-black rounded bg-white h-14"
                                        />
                                    </InfoRow>
                                </div>

                                <div className="space-y-4">
                                    <InfoRow label="Mã lệnh">
                                        <input
                                            type="text"
                                            value="Tự động tạo"
                                            readOnly
                                            className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        />
                                    </InfoRow>

                                    <InfoRow label="Xuất tại kho">
                                        <input
                                            type="text"
                                            value="Kho tổng"
                                            readOnly
                                            className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        />
                                    </InfoRow>

                                    <InfoRow label="Mã kho">
                                        <input
                                            type="text"
                                            value="KT_001"
                                            readOnly
                                            className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        />
                                    </InfoRow>

                                    <InfoRow label="Lý do" multi>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full px-3 py-1.5 border border-black rounded bg-white h-14"
                                        />
                                    </InfoRow>
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
                                        <th className="px-2 w-28">Mã hàng</th>
                                        <th className="px-2 w-20">ĐVT</th>
                                        <th className="px-2 w-28">Đơn giá</th>
                                        <th className="px-2 w-20">SL</th>
                                        <th className="px-2 w-24">Chiết khấu (%)</th>
                                        <th className="px-2 w-28">Thành tiền</th>
                                        <th className="px-2 w-16">Xóa</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map((row, idx) => (
                                        <tr key={row.rowId} className="border-t h-10">
                                            <td className="text-center">{idx + 1}</td>
                                            <td className="px-2">{row.name}</td>
                                            <td className="text-center">{row.code}</td>
                                            <td className="text-center">{row.unit}</td>
                                            <td className="text-right">
                                                <input
                                                    className="w-full bg-transparent outline-none text-right"
                                                    value={row.unitPrice.toLocaleString('vi-VN')}
                                                    onChange={(e) =>
                                                        changePrice(row.rowId, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="w-full bg-transparent outline-none text-center"
                                                    value={row.quantity}
                                                    onChange={(e) =>
                                                        changeQty(row.rowId, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    className="w-full bg-transparent outline-none text-center"
                                                    value={row.discount}
                                                    onChange={(e) =>
                                                        changeDiscount(row.rowId, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="text-right font-medium">
                                                {row.total.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteRow(row.rowId)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <svg
                                                        width="22"
                                                        height="22"
                                                        viewBox="0 0 22 22"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M3 6H19M8 6V4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4V6M17 6V18C17 18.5523 16.5523 19 16 19H6C5.44772 19 5 18.5523 5 18V6H17Z"
                                                            stroke="#f90606"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    <tr className="bg-gray-100 font-bold h-10 border-t">
                                        <td colSpan={7} className="text-center">
                                            Tổng
                                        </td>
                                        <td className="text-right px-4">
                                            {totalAll.toLocaleString('vi-VN')}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* NÚT */}
                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
                            >
                                {saving ? 'Đang lưu...' : 'Cập nhật'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Product Selection Modal */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg w-[600px] max-h-[80vh] flex flex-col">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold">Chọn sản phẩm</h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingProducts ? (
                                <div className="text-center py-8 text-gray-500">Đang tải...</div>
                            ) : productList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">Không có sản phẩm nào</div>
                            ) : (
                                <div className="space-y-2">
                                    {productList.map((product) => {
                                        const alreadyAdded = items.some(p => p.productId === product.id);
                                        return (
                                            <label
                                                key={product.id}
                                                className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${alreadyAdded
                                                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                                    : 'hover:bg-blue-50 border-gray-200'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(product.id)}
                                                    onChange={() => toggleSelectProduct(product.id)}
                                                    disabled={alreadyAdded}
                                                    className="w-4 h-4"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-medium">{product.name}</div>
                                                    <div className="text-sm text-gray-500">
                                                        Mã: {product.code} | Tồn: {product.quantity ?? 0}
                                                        {alreadyAdded && <span className="ml-2 text-orange-600">(Đã có trong phiếu)</span>}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t flex justify-end gap-3">
                            <button
                                onClick={closeProductModal}
                                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddSelectedProducts}
                                disabled={loadingProducts}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- COMPONENTS ---------- */
interface InfoRowProps {
    label: string;
    children?: React.ReactNode;
    multi?: boolean;
}

function InfoRow({ label, children, multi = false }: InfoRowProps) {
    return (
        <div className="flex items-center gap-3">
            <label className="w-28 text-sm">{label}</label>
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
