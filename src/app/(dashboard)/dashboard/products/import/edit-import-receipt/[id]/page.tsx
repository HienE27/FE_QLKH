'use client';

import {
    useEffect,
    useMemo,
    useState,
    useRef,
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
} from 'react';
import { useRouter, useParams } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProducts, getProduct } from '@/services/product.service';

import {
    type SupplierImportCreateRequest,
    getSupplierImport,
    updateSupplierImport,
    type SupplierImportDetail,
} from '@/services/inventory.service';

import type { Product as BaseProduct } from '@/types/product';

/* ============================================================
   CONFIG ẢNH
============================================================ */
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

function buildImageUrl(path: string | null | undefined): string | null {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
}

/* ============================================================
   TYPES
============================================================ */
type Product = BaseProduct & {
    unit?: string | null;
    unitName?: string | null;
};

interface ProductItem {
    rowId: number;
    productId: number;
    code: string;
    name: string;
    unit: string;
    unitPrice: number;
    quantity: number;
    total: number;
}

/* ============================================================
   UTILS
============================================================ */
const formatMoney = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v || 0);

const parseMoney = (v: string) =>
    Number((v || '0').replace(/[.\s]/g, '')) || 0;

/* ============================================================
   TRANG EDIT PHIẾU NHẬP NCC
============================================================ */
export default function EditImportReceiptPage() {
    const router = useRouter();
    const params = useParams();
    const importId = Number(
        Array.isArray(params?.id) ? params.id[0] : params?.id,
    );

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<ProductItem[]>([]);

    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [supplierCode, setSupplierCode] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');

    const [note, setNote] = useState('');
    const [contractContent, setContractContent] = useState('');
    const [evidenceContent, setEvidenceContent] = useState('');
    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);

    const fileRef = useRef<HTMLInputElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    /* ============================================================
       LOAD DỮ LIỆU PHIẾU NHẬP
    ============================================================ */
    useEffect(() => {
        if (!importId) return;

        (async () => {
            try {
                const [sup, productList, receipt] = await Promise.all([
                    getSuppliers('NCC'),
                    getProducts(),
                    getSupplierImport(importId),
                ]);

                setSuppliers(sup);
                setAllProducts(productList);

                /* --- NCC --- */
                setSupplierId(receipt.supplierId);

                // ⭐ Tự động fill thông tin NCC từ danh sách suppliers
                const selectedSupplier = sup.find((s) => s.id === receipt.supplierId);
                if (selectedSupplier) {
                    setSupplierCode(selectedSupplier.code ?? '');
                    setSupplierPhone(selectedSupplier.phone ?? '');
                    setSupplierAddress(selectedSupplier.address ?? '');
                } else {
                    // Fallback: dùng thông tin từ receipt nếu không tìm thấy supplier
                    setSupplierCode(receipt.supplierCode ?? '');
                    setSupplierPhone(receipt.supplierPhone ?? '');
                    setSupplierAddress(receipt.supplierAddress ?? '');
                }

                setNote(receipt.note ?? '');

                /* --- mô tả --- */
                const desc = receipt.description ?? '';
                const [c1, ...c2] = desc.split('\n');
                setContractContent(c1 ?? '');
                setEvidenceContent(c2.join('\n') ?? '');

                /* --- Ảnh --- */
                setAttachmentImages(receipt.attachmentImages ?? []);

                /* --- sản phẩm --- */
                const rawItems = receipt.items ?? [];

                // ⭐ Fetch thông tin sản phẩm cho từng item
                const mapped: ProductItem[] = await Promise.all(
                    rawItems.map(async (it: SupplierImportDetail, idx) => {
                        let code = '';
                        let name = '';
                        let unit = 'Cái';

                        // Nếu đã có sẵn thông tin sản phẩm từ BE
                        if (it.productCode && it.productName) {
                            code = it.productCode;
                            name = it.productName;
                            unit = it.unit || it.unitName || 'Cái';
                        }
                        // Nếu chỉ có productId, gọi API để lấy thông tin
                        else if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                code = product.code;
                                name = product.name;
                                unit = 'Cái'; // Hoặc lấy từ product nếu có field unit
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                            }
                        }

                        return {
                            rowId: idx + 1,
                            productId: it.productId,
                            code,
                            name,
                            unit,
                            unitPrice: it.unitPrice,
                            quantity: it.quantity,
                            total: it.unitPrice * it.quantity,
                        };
                    })
                );

                setItems(mapped);
            } catch (err) {
                console.error(err);
                setError('Không tải được phiếu nhập');
            } finally {
                setLoading(false);
            }
        })();
    }, [importId]);

    /* ============================================================
       HANDLE NCC
    ============================================================ */
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

    /* ============================================================
       HANDLE IMAGE UPLOAD
    ============================================================ */
    const handleUploadImages = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

        const { uploadProductImage } = await import('@/services/product.service');

        const uploaded: string[] = [];

        for (const f of files) {
            const path = await uploadProductImage(f);
            uploaded.push(path);
        }

        setAttachmentImages((prev) => [...prev, ...uploaded]);

        e.target.value = '';
    };

    const removeImage = (url: string) => {
        setAttachmentImages((prev) => prev.filter((u) => u !== url));
    };

    /* ============================================================
       HANDLE PRODUCT TABLE
    ============================================================ */
    const changeQty = (rowId: number, v: string) => {
        const q = Number(v) || 0;
        setItems((prev) =>
            prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, quantity: q, total: q * it.unitPrice }
                    : it,
            ),
        );
    };

    const changePrice = (rowId: number, v: string) => {
        const p = parseMoney(v);
        setItems((prev) =>
            prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, unitPrice: p, total: p * it.quantity }
                    : it,
            ),
        );
    };

    const deleteRow = (rowId: number) =>
        setItems((prev) => prev.filter((it) => it.rowId !== rowId));

    const totalAll = useMemo(
        () => items.reduce((s, it) => s + it.total, 0),
        [items],
    );

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

                const prod = productList.find((p) => p.id === pid);
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
                    total: 0,
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    /* ============================================================
       SUBMIT UPDATE
    ============================================================ */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!supplierId) return setError('Chọn nhà cung cấp');
        if (items.length === 0) return setError('Chọn sản phẩm');

        const payload: SupplierImportCreateRequest = {
            storeId: 1,
            supplierId: supplierId as number,
            note,
            description: `${contractContent}\n${evidenceContent}`.trim(),
            attachmentImages,
            items: items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
            })),
        };

        try {
            setSaving(true);
            await updateSupplierImport(importId, payload);
            router.push('/dashboard/products/import/import-receipts');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Lỗi cập nhật');
        } finally {
            setSaving(false);
        }
    };

    /* ============================================================
       RENDER
    ============================================================ */

    if (loading)
        return (
            <div className="ml-[377px] mt-[120px] text-lg">Đang tải dữ liệu…</div>
        );

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

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ======================================================================
                       THÔNG TIN CHUNG
                    ====================================================================== */}
                    <div className="bg-white shadow-xl p-8 rounded-lg">
                        <h2 className="text-xl font-bold text-center mb-6">
                            CẬP NHẬT PHIẾU NHẬP KHO (NCC)
                        </h2>

                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <label className="w-32">Nguồn nhập</label>
                                    <select
                                        className="border px-3 py-1 rounded flex-1"
                                        value={supplierId}
                                        onChange={(e) =>
                                            changeSupplier(e.target.value)
                                        }
                                    >
                                        <option value="">-- Chọn NCC --</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3">
                                    <label className="w-32">Mã nguồn</label>
                                    <input
                                        type="text"
                                        value={supplierCode}
                                        onChange={(e) => setSupplierCode(e.target.value)}
                                        className="border px-3 py-1 rounded flex-1"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <label className="w-32">Số điện thoại</label>
                                    <input
                                        type="text"
                                        value={supplierPhone}
                                        onChange={(e) => setSupplierPhone(e.target.value)}
                                        className="border px-3 py-1 rounded flex-1"
                                    />
                                </div>

                                <div className="flex gap-3 items-start">
                                    <label className="w-32 pt-1">Địa chỉ</label>
                                    <textarea
                                        value={supplierAddress}
                                        onChange={(e) => setSupplierAddress(e.target.value)}
                                        className="border px-3 py-1 rounded flex-1 h-16"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <InfoLine label="Lý do nhập">
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        className="w-full border rounded p-2 h-16"
                                    />
                                </InfoLine>
                            </div>
                        </div>
                    </div>

                    {/* ======================================================================
                       BẢNG SẢN PHẨM
                    ====================================================================== */}
                    <div className="border-2 border-gray-400 rounded overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-blue-600 text-white h-10">
                                    <th className="px-2 w-12 text-center">STT</th>
                                    <th className="px-2 w-40 text-left">
                                        Tên hàng hóa
                                    </th>
                                    <th className="px-2 w-24 text-center">
                                        Mã hàng
                                    </th>
                                    <th className="px-2 w-20 text-center">ĐVT</th>
                                    <th className="px-2 w-28 text-right">Đơn giá</th>
                                    <th className="px-2 w-20 text-center">
                                        Số lượng
                                    </th>
                                    <th className="px-2 w-28 text-right">
                                        Thành tiền
                                    </th>
                                    <th className="px-2 w-16 text-center">Xóa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row, idx) => (
                                    <tr
                                        key={row.rowId}
                                        className="border-b border-gray-300 h-10 hover:bg-gray-50"
                                    >
                                        <td className="px-2 text-center">
                                            {idx + 1}
                                        </td>
                                        <td className="px-2 text-left">{row.name}</td>
                                        <td className="px-2 text-center">
                                            {row.code}
                                        </td>
                                        <td className="px-2 text-center">
                                            {row.unit}
                                        </td>
                                        <td className="px-2 text-right">
                                            <input
                                                className="w-full bg-transparent outline-none text-right"
                                                value={formatMoney(row.unitPrice)}
                                                onChange={(e) =>
                                                    changePrice(
                                                        row.rowId,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 text-center">
                                            <input
                                                type="number"
                                                min={0}
                                                className="w-full bg-transparent outline-none text-center"
                                                value={row.quantity}
                                                onChange={(e) =>
                                                    changeQty(
                                                        row.rowId,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 text-right font-medium">
                                            {formatMoney(row.total)}
                                        </td>
                                        <td className="px-2 text-center">
                                            <button
                                                type="button"
                                                title="Xóa dòng"
                                                onClick={() => deleteRow(row.rowId)}
                                                className="hover:scale-110 transition-transform"
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

                                <tr className="h-10 bg-white">
                                    <td
                                        colSpan={6}
                                        className="px-2 text-center font-bold"
                                    >
                                        Tổng
                                    </td>
                                    <td className="px-2 text-right font-bold">
                                        {formatMoney(totalAll)}
                                    </td>
                                    <td />
                                </tr>

                                {items.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-2 py-3 text-center text-gray-500"
                                        >
                                            Chưa có sản phẩm nào.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ======================================================================
                       HỢP ĐỒNG / ẢNH ĐÍNH KÈM
                    ====================================================================== */}
                    <div className="border border-black bg-gray-100 p-6 rounded mb-6">
                        <h3 className="font-bold mb-4">
                            Hợp đồng / Ảnh đính kèm
                        </h3>

                        <div className="mb-3">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                                Chọn ảnh
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleUploadImages}
                            />
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            {attachmentImages.length === 0 && (
                                <p className="text-gray-600">Không có ảnh</p>
                            )}

                            {attachmentImages.map((img, idx) => {
                                const url = buildImageUrl(img);
                                return (
                                    <div
                                        key={idx}
                                        className="w-[180px] h-[240px] bg-white border rounded shadow flex items-center justify-center relative"
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
                                        <button
                                            type="button"
                                            onClick={() => removeImage(img)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center hover:bg-red-600"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ======================================================================
                       LỖI + NÚT
                    ====================================================================== */}
                    <div className="flex justify-end gap-4">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    '/dashboard/products/import/import-receipts',
                                )
                            }
                            className="px-8 py-2.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-2.5 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
                        >
                            {saving ? 'Đang lưu…' : 'Cập nhật phiếu nhập'}
                        </button>
                    </div>
                </form>

                {/* MODAL CHỌN HÀNG HÓA */}
                {showProductModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg w-[600px] max-h-[80vh] flex flex-col">
                            <div className="px-6 py-4 border-b">
                                <h3 className="text-lg font-bold">Chọn sản phẩm</h3>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingProducts ? (
                                    <div className="text-center py-8 text-gray-500">Đang tải...</div>
                                ) : productError ? (
                                    <div className="text-center py-8 text-red-600">{productError}</div>
                                ) : productList.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Không có sản phẩm nào</div>
                                ) : (
                                    <div className="space-y-2">
                                        {productList.map((product) => {
                                            const alreadyAdded = selectedProductIds.includes(product.id);
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
                                                        disabled={alreadyAdded}
                                                        onChange={() => toggleSelectProduct(product.id)}
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
                                    type="button"
                                    onClick={closeProductModal}
                                    className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
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
            </main>
        </div>
    );
}

/* ============================================================
   COMPONENT PHỤ: INFO LINE
============================================================ */
interface InfoLineProps {
    label: string;
    value?: string;
    multi?: boolean;
    children?: ReactNode;
}

function InfoLine({ label, value, multi, children }: InfoLineProps) {
    return (
        <div className="flex gap-3 items-start">
            <label className="w-32 pt-1">{label}</label>
            <div className="flex-1">
                {children ? (
                    children
                ) : multi ? (
                    <textarea
                        readOnly
                        value={value ?? ''}
                        className="w-full border rounded px-3 py-1.5 h-16 bg-gray-100"
                    />
                ) : (
                    <input
                        readOnly
                        value={value ?? ''}
                        className="w-full border rounded px-3 py-1.5 bg-gray-100"
                    />
                )}
            </div>
        </div>
    );
}
