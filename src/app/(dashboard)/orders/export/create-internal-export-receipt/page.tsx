/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createInternalExport, type InternalExportCreateRequest } from '@/services/inventory.service';
import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProducts, uploadProductImage } from '@/services/product.service';
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
}

const formatCurrency = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });
const parseNumber = (value: string): number => {
    const cleaned = value.replace(/[^\d]/g, '');
    return cleaned ? Number(cleaned) : 0;
};

function InfoRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-28 text-sm pt-1">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export default function TaoPhieuXuatKhoNoiBo() {
    const router = useRouter();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [sourceStoreId, setSourceStoreId] = useState<number | ''>('');
    const [sourceCode, setSourceCode] = useState('');
    const [sourcePhone, setSourcePhone] = useState('');
    const [sourceAddress, setSourceAddress] = useState('');
    const [reason, setReason] = useState('');

    const [products, setProducts] = useState<ProductItem[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                setLoadingSuppliers(true);
                const list = await getSuppliers('INTERNAL');
                setSuppliers(list);
            } catch (e) {
                console.error(e);
                setError('Có lỗi xảy ra khi tải danh sách kho nội bộ');
            } finally {
                setLoadingSuppliers(false);
            }
        };

        fetchSuppliers();
    }, []);

    useEffect(() => {
        if (!sourceStoreId) return;
        const supplier = suppliers.find((s) => s.id === sourceStoreId);
        if (!supplier) return;
        setSourceCode(supplier.code ?? '');
        setSourcePhone(supplier.phone ?? '');
        setSourceAddress(supplier.address ?? '');
    }, [sourceStoreId, suppliers]);

    const recalcRowTotal = (item: ProductItem): ProductItem => {
        const price = parseNumber(item.price);
        const qty = parseNumber(item.quantity);
        const discountPercent = parseNumber(item.discount);

        let total = price * qty;
        if (discountPercent > 0) {
            total = (total * (100 - discountPercent)) / 100;
        }

        return { ...item, total: total > 0 ? formatCurrency(total) : '' };
    };

    const handleChangeProductField = (
        id: number,
        field: keyof ProductItem,
        value: string
    ) => {
        setProducts((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const updated = { ...item, [field]: value };
                return recalcRowTotal(updated);
            })
        );
    };

    const deleteProduct = (id: number) => {
        setProducts(products.filter((p) => p.id !== id));
    };

    const calculateTotal = () => {
        return products.reduce((sum, item) => {
            const total = item.total ? parseNumber(item.total) : 0;
            return sum + total;
        }, 0);
    };

    const handleOpenProductModal = async () => {
        try {
            setLoadingProducts(true);
            const list = await getProducts();
            setProductList(list);
            setShowProductModal(true);
        } catch (error) {
            console.error('Lỗi khi tải danh sách sản phẩm:', error);
            alert('Không thể tải danh sách sản phẩm');
        } finally {
            setLoadingProducts(false);
        }
    };

    const handleAddProducts = () => {
        const selectedProducts = productList.filter((p) =>
            (document.getElementById(`product-${p.id}`) as HTMLInputElement)?.checked
        );

        const baseTime = Date.now();
        const newItems: ProductItem[] = selectedProducts.map((p, idx) => ({
            id: baseTime + idx * 1000,
            productId: p.id,
            name: p.name,
            code: p.code || '',
            unit: 'Cái',
            price: formatCurrency(p.unitPrice ?? 0),
            quantity: '',
            discount: '',
            total: '',
        }));

        setProducts([...products, ...newItems]);
        setShowProductModal(false);
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
            setError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
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

            if (!sourceStoreId) {
                setError('Vui lòng chọn kho nguồn');
                return;
            }

            if (products.length === 0) {
                setError('Vui lòng thêm ít nhất 1 hàng hóa');
                return;
            }

            const items = products
                .filter((p) => parseNumber(p.quantity) > 0 && parseNumber(p.price) > 0)
                .map((p) => {
                    const discountPercent = parseNumber(p.discount);
                    const basePrice = parseNumber(p.price);
                    const finalPrice = discountPercent > 0
                        ? basePrice * (100 - discountPercent) / 100
                        : basePrice;

                    return {
                        productId: p.productId,
                        quantity: parseNumber(p.quantity),
                        unitPrice: Math.round(finalPrice), // Gửi giá sau chiết khấu
                        discountPercent: discountPercent, // Gửi % chiết khấu
                    };
                });

            if (items.length === 0) {
                setError('Vui lòng nhập ít nhất 1 hàng hóa có số lượng > 0');
                return;
            }

            // Backend logic: targetStoreId sẽ được lưu vào supplierId (kho nguồn)
            // storeId = kho đích (kho nhận hàng)
            const payload: InternalExportCreateRequest = {
                storeId: 1, // Kho đích (kho tổng)
                targetStoreId: Number(sourceStoreId), // Kho nguồn (backend sẽ lưu vào supplierId)
                note: reason || undefined,
                attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
                items,
            };

            console.log('Creating internal export with payload:', payload);

            setSaving(true);
            const created = await createInternalExport(payload);

            setSuccess(`Tạo phiếu xuất nội bộ thành công (Mã: ${created.code ?? created.id})`);

            setTimeout(() => {
                router.push('/orders/export/internal-export-receipts');
            }, 800);
        } catch (e) {
            console.error(e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tạo phiếu xuất nội bộ',
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
                        onClick={handleOpenProductModal}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                    >
                        + Thêm hàng từ hệ thống
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-2xl p-8 border border-black">
                    <h2 className="text-xl font-bold text-center mb-6">PHIẾU XUẤT KHO NỘI BỘ</h2>

                    <div className="border border-black bg-gray-100 p-6 mb-6 rounded">
                        <h3 className="text-base font-bold mb-4">Thông tin chung</h3>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                            <div className="space-y-4">
                                <InfoRow label="Kho nguồn">
                                    <select
                                        className="w-full px-3 py-1.5 border border-black rounded bg-white"
                                        disabled={loadingSuppliers}
                                        value={sourceStoreId === '' ? '' : String(sourceStoreId)}
                                        onChange={(e) => setSourceStoreId(e.target.value ? Number(e.target.value) : '')}
                                    >
                                        <option value="">Chọn kho nguồn</option>
                                        {suppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </InfoRow>

                                <InfoRow label="Mã kho">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        value={sourceCode}
                                        readOnly
                                    />
                                </InfoRow>

                                <InfoRow label="Số điện thoại">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100"
                                        value={sourcePhone}
                                        readOnly
                                    />
                                </InfoRow>

                                <InfoRow label="Địa chỉ">
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-black rounded bg-gray-100 h-14 resize-none"
                                        value={sourceAddress}
                                        readOnly
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

                                <InfoRow label="Lý do">
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-black rounded h-14 resize-none"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </InfoRow>
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
                                    <th className="px-4 py-3 text-center font-semibold text-sm">Xóa</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
                                            Chưa có sản phẩm nào. Vui lòng thêm sản phẩm từ hệ thống.
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((product, index) => (
                                        <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center text-sm text-gray-700 font-semibold">{index + 1}</td>
                                            <td className="px-4 py-3 text-left text-sm text-gray-900 font-medium">{product.name}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-700">{product.code}</td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-700">{product.unit}</td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={product.price}
                                                    onChange={(e) => handleChangeProductField(product.id, 'price', e.target.value)}
                                                    className="w-full text-right px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={product.quantity}
                                                    onChange={(e) => handleChangeProductField(product.id, 'quantity', e.target.value)}
                                                    className="w-full text-center px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={product.discount}
                                                    onChange={(e) => handleChangeProductField(product.id, 'discount', e.target.value)}
                                                    className="w-full text-center px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{product.total || '0'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={() => deleteProduct(product.id)} 
                                                    className="hover:scale-110 transition-transform p-1 rounded hover:bg-red-50"
                                                    title="Xóa sản phẩm"
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                                                        <path d="M3 6H19M8 6V4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4V6M17 6V18C17 18.5523 16.5523 19 16 19H6C5.44772 19 5 18.5523 5 18V6H17Z" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {products.length > 0 && (
                                    <tr className="bg-blue-50 border-t-2 border-blue-600">
                                        <td colSpan={7} className="px-4 py-3 text-right font-bold text-sm text-gray-900">Tổng</td>
                                        <td className="px-4 py-3 text-right font-bold text-sm text-blue-600">{formatCurrency(calculateTotal())}</td>
                                        <td className="px-4 py-3"></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Hợp đồng / Ảnh đính kèm */}
                    <div className="border border-black bg-gray-100 p-6 rounded mb-6">
                        <h3 className="text-base font-bold mb-4">Hợp đồng / Ảnh đính kèm</h3>
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

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-6">
                        <button
                            onClick={() => router.back()}
                            className="px-8 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
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
                                        const alreadyAdded = products.some(p => p.productId === product.id);
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
                                                    id={`product-${product.id}`}
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
                                onClick={() => setShowProductModal(false)}
                                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleAddProducts}
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
