/* eslint-disable @next/next/no-img-element */
'use client';

import {
    useEffect,
    useState,
    useRef,
    type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

import {
    getSuppliers,
    type Supplier,
} from '@/services/supplier.service';



import {
    createSupplierImport,
    type SupplierImportCreateRequest,
} from '@/services/inventory.service';

import {
    getProducts,
    uploadProductImage,
} from '@/services/product.service';
import type { Product } from '@/types/product';

const API_BASE_URL = 'http://localhost:8080';

function buildImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${clean}`;
}

interface ProductItem {
    id: number;
    productId: number;
    name: string;
    code: string;
    unit: string;
    price: string;
    quantity: string;
    discount: string;
    total: string;
    availableQuantity: number;
}

const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : 0;
};

function InfoRow({
    label,
    children,
    multi = false,
}: {
    label: string;
    children: React.ReactNode;
    multi?: boolean;
}) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-28 text-sm pt-1">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export default function TaoPhieuNhapKho() {
    const router = useRouter();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');

    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [reason, setReason] = useState('');

    const [products, setProducts] = useState<ProductItem[]>([]);

    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                setLoadingSuppliers(true);
                const list = await getSuppliers('NCC');
                setSuppliers(list);
            } catch (e) {
                console.error(e);
                setError(
                    e instanceof Error
                        ? e.message
                        : 'Có lỗi xảy ra khi tải danh sách nhà cung cấp',
                );
            } finally {
                setLoadingSuppliers(false);
            }
        };

        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (!selectedSupplierId) return;
        const s = suppliers.find((x) => x.id === selectedSupplierId);
        if (!s) return;
        setPhone(s.phone ?? '');
        setAddress(s.address ?? '');
    }, [selectedSupplierId, suppliers]);

    const recalcRowTotal = (item: ProductItem): ProductItem => {
        const price = parseNumber(item.price);
        const qty = parseNumber(item.quantity);
        const discountPercent = parseNumber(item.discount);

        let total = price * qty;
        if (discountPercent > 0) {
            total = (total * (100 - discountPercent)) / 100;
        }

        return {
            ...item,
            total: total > 0 ? formatCurrency(total) : '',
        };
    };

    const handleChangeProductField = (
        id: number,
        field: keyof ProductItem,
        value: string,
    ) => {
        setProducts((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                const updated: ProductItem = { ...p, [field]: value } as ProductItem;
                return recalcRowTotal(updated);
            }),
        );
    };

    const calculateTotal = () => {
        const sum = products.reduce((acc, item) => {
            const total = parseNumber(item.total);
            return acc + total;
        }, 0);
        return formatCurrency(sum);
    };

    const deleteProduct = (id: number) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const openProductModal = async () => {
        setShowProductModal(true);
        setProductError(null);

        const idsFromCurrent = products.map((p) => p.productId);
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

        setProducts((prev) => {
            const existingProductIds = new Set(prev.map((p) => p.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((p) => p.id)) : 0;

            const newRows: ProductItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p) => p.id === pid);
                if (!prod) return;

                runningRowId += 1;

                const row: ProductItem = {
                    id: runningRowId,
                    productId: prod.id,
                    name: prod.name,
                    code: prod.code,
                    unit: 'Cái',
                    price: formatCurrency(prod.unitPrice ?? 0),
                    quantity: '',
                    discount: '',
                    total: '',
                    availableQuantity: prod.quantity ?? 0,
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    const handleUploadImages = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingImages(true);
            const uploadedUrls: string[] = [];

            for (const file of Array.from(files)) {
                const url = await uploadProductImage(file);
                uploadedUrls.push(url);
            }

            setAttachmentImages((prev) => [...prev, ...uploadedUrls]);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Tải ảnh thất bại',
            );
        } finally {
            setUploadingImages(false);
            e.target.value = '';
        }
    };

    const removeImage = (url: string) => {
        setAttachmentImages((prev) => prev.filter((u) => u !== url));
    };

    const handleSave = async () => {
        try {
            setError(null);
            setSuccess(null);

            if (!selectedSupplierId) {
                setError('Vui lòng chọn nguồn xuất');
                return;
            }

            if (products.length === 0) {
                setError('Vui lòng thêm ít nhất 1 hàng hóa');
                return;
            }

            const items = products
                .filter((p) => parseNumber(p.quantity) > 0 && parseNumber(p.price) > 0)
                .map((p) => ({
                    productId: p.productId,
                    quantity: parseNumber(p.quantity),
                    unitPrice: parseNumber(p.price),
                }));

            if (items.length === 0) {
                setError('Vui lòng nhập ít nhất 1 hàng hóa có số lượng > 0');
                return;
            }

            const payload: SupplierImportCreateRequest = {
                storeId: 1,
                supplierId: selectedSupplierId as number,
                note: reason || undefined,
                description: undefined,
                attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
                items,
            };

            setSaving(true);
            const created = await createSupplierImport(payload);

            setSuccess(`Tạo phiếu nhập kho thành công (Mã: ${created.code ?? created.id})`);

            setTimeout(() => {
                router.push('/dashboard/products/import/import-receipts');
            }, 800);
        } catch (e) {
            console.error(e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tạo phiếu nhập kho',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                {error && (
                    <div className="mb-4 text-sm text-red-600 whitespace-pre-line bg-red-50 border border-red-200 rounded px-4 py-2">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-4 py-2">
                        {success}
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
                    <h2 className="text-xl font-bold text-center mb-6">PHIẾU NHẬP KHO</h2>

                    <div className="border border-black bg-gray-100 p-6 mb-6 rounded">
                        <h3 className="text-base font-bold mb-4">Thông tin chung</h3>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                            <div className="space-y-4">
                                <InfoRow label="Nguồn xuất">
                                    <select
                                        className="w-full px-3 py-1.5 border border-black rounded bg-white"
                                        disabled={loadingSuppliers}
                                        value={
                                            selectedSupplierId === ''
                                                ? ''
                                                : String(selectedSupplierId)
                                        }
                                        onChange={(e) =>
                                            setSelectedSupplierId(
                                                e.target.value ? Number(e.target.value) : '',
                                            )
                                        }
                                    >
                                        <option value="">Chọn nhà cung cấp</option>
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
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        value={
                                            selectedSupplierId
                                                ? suppliers.find((s) => s.id === selectedSupplierId)
                                                    ?.code ?? ''
                                                : ''
                                        }
                                        readOnly
                                    />
                                </InfoRow>

                                <InfoRow label="Số điện thoại">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-black rounded"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </InfoRow>

                                <InfoRow label="Địa chỉ" multi>
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-black rounded h-14 resize-none"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                    />
                                </InfoRow>
                            </div>

                            <div className="space-y-4">
                                <InfoRow label="Mã phiếu">
                                    <input
                                        type="text"
                                        value="Tự động tạo"
                                        readOnly
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                    />
                                </InfoRow>

                                <InfoRow label="Nhập tại kho">
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
                                        value="KT_5467"
                                        readOnly
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                    />
                                </InfoRow>

                                <InfoRow label="Lý do" multi>
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-black rounded h-14 resize-none"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </InfoRow>
                            </div>
                        </div>
                    </div>

                    <div className="border-4 border-gray-400 mb-6 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0046ff] text-white h-12">
                                    <th className="px-2 text-center font-bold w-12">STT</th>
                                    <th className="px-2 text-center font-bold w-40">Tên hàng hóa</th>
                                    <th className="px-2 text-center font-bold w-24">Mã hàng</th>
                                    <th className="px-2 text-center font-bold w-20">Đơn vị tính</th>
                                    <th className="px-2 text-center font-bold w-28">Đơn giá</th>
                                    <th className="px-2 text-center font-bold w-20">Số lượng</th>
                                    <th className="px-2 text-center font-bold w-24">Chiết khấu (%)</th>
                                    <th className="px-2 text-center font-bold w-28">Thành tiền</th>
                                    <th className="px-2 text-center font-bold w-16">Xóa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr
                                        key={product.id}
                                        className="border border-gray-400 h-12 hover:bg-gray-50"
                                    >
                                        <td className="px-2 text-center text-sm border-r border-gray-400">
                                            {index + 1}
                                        </td>
                                        <td className="px-2 text-left text-sm border-r border-gray-400">
                                            {product.name}
                                        </td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">
                                            {product.code}
                                        </td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">
                                            {product.unit}
                                        </td>
                                        <td className="px-2 text-right text-sm border-r border-gray-400">
                                            <input
                                                className="w-full text-right bg-transparent focus:outline-none"
                                                value={product.price}
                                                onChange={(e) =>
                                                    handleChangeProductField(
                                                        product.id,
                                                        'price',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">
                                            <input
                                                className="w-full text-center bg-transparent focus:outline-none"
                                                value={product.quantity}
                                                onChange={(e) =>
                                                    handleChangeProductField(
                                                        product.id,
                                                        'quantity',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">
                                            <input
                                                className="w-full text-center bg-transparent focus:outline-none"
                                                value={product.discount}
                                                onChange={(e) =>
                                                    handleChangeProductField(
                                                        product.id,
                                                        'discount',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className="px-2 text-right text-sm font-medium border-r border-gray-400">
                                            {product.total}
                                        </td>
                                        <td className="px-2 text-center border-r border-gray-400">
                                            <button
                                                type="button"
                                                onClick={() => deleteProduct(product.id)}
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
                                <tr className="border border-gray-400 h-12 bg-white">
                                    <td
                                        colSpan={7}
                                        className="px-2 text-center font-bold text-sm border-r border-gray-400"
                                    >
                                        Tổng
                                    </td>
                                    <td className="px-2 text-right font-bold text-sm border-r border-gray-400">
                                        {calculateTotal()}
                                    </td>
                                    <td className="border-r border-gray-400" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="border border-black bg-gray-100 p-6 rounded mb-6">
                        <h3 className="text-base font-bold mb-4">
                            Hợp đồng / Ảnh đính kèm
                        </h3>

                        <div className="mb-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                                disabled={uploadingImages}
                            >
                                {uploadingImages ? 'Đang tải...' : 'Chọn ảnh'}
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleUploadImages}
                            />
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            {attachmentImages.length === 0 && (
                                <p className="text-gray-600">Chưa có ảnh</p>
                            )}

                            {attachmentImages.map((url, idx) => (
                                <div
                                    key={idx}
                                    className="w-[180px] h-[240px] bg-white border rounded shadow flex items-center justify-center relative"
                                >
                                    <img
                                        src={buildImageUrl(url)}
                                        alt={`Ảnh ${idx + 1}`}
                                        className="w-full h-full object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(url)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-sm flex items-center justify-center hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-6">
                        <button
                            className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors"
                            onClick={() =>
                                router.push('/dashboard/products/import/import-receipts')
                            }
                        >
                            Hủy
                        </button>
                        <button
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-60"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>

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
