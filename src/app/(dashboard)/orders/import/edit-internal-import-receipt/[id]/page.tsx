/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
    getInternalImportById,
    updateInternalImport,
    type InternalImport,
    type InternalImportCreateRequest
} from '@/services/inventory.service';
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

export default function EditInternalImportReceipt() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [data, setData] = useState<InternalImport | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [sourceStoreId, setSourceStoreId] = useState<number | ''>('');
    const [reason, setReason] = useState('');
    const [products, setProducts] = useState<ProductItem[]>([]);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const [internalSuppliers, setInternalSuppliers] = useState<any[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    useEffect(() => {
        loadSuppliers();
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadSuppliers = async () => {
        try {
            setLoadingSuppliers(true);
            const { getSuppliers } = await import('@/services/supplier.service');
            const list = await getSuppliers('INTERNAL');
            setInternalSuppliers(list);
        } catch (e) {
            console.error('Lỗi khi tải danh sách kho nội bộ:', e);
        } finally {
            setLoadingSuppliers(false);
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const result = await getInternalImportById(id);
            setData(result);
            setSourceStoreId(result.sourceStoreId);
            setReason(result.note || '');
            setAttachmentImages(result.attachmentImages || []);

            if (result.items) {
                // Fetch thông tin sản phẩm nếu thiếu
                const { getProduct } = await import('@/services/product.service');
                const itemsWithDetails = await Promise.all(
                    result.items.map(async (item, idx) => {
                        let productName = item.productName || '';
                        let productCode = item.productCode || '';
                        let unit = item.unitName || item.unit || '';

                        // Nếu thiếu thông tin, fetch từ API
                        if (!productName || !productCode) {
                            try {
                                const product = await getProduct(item.productId);
                                productName = product.name;
                                productCode = product.code;
                                unit = unit || 'Cái';
                            } catch (err) {
                                console.error('Failed to fetch product:', item.productId, err);
                                productName = productName || `Sản phẩm #${item.productId}`;
                                productCode = productCode || `ID: ${item.productId}`;
                            }
                        }

                        return {
                            id: item.id || Date.now() + idx,
                            productId: item.productId,
                            name: productName,
                            code: productCode,
                            unit: unit,
                            price: formatCurrency(item.unitPrice),
                            quantity: item.quantity.toString(),
                            discount: '',
                            total: formatCurrency(item.quantity * item.unitPrice),
                        };
                    })
                );
                setProducts(itemsWithDetails);
            }
        } catch (error) {
            console.error('Lỗi khi tải chi tiết phiếu nhập:', error);
            alert('Không thể tải chi tiết phiếu nhập');
        } finally {
            setLoading(false);
        }
    };

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

        const newItems: ProductItem[] = selectedProducts.map((p, idx) => ({
            id: Date.now() + idx,
            productId: p.id,
            name: p.name,
            code: p.code || '',
            unit: 'Cái', // Default unit
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
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Tải ảnh thất bại');
        } finally {
            setUploadingImages(false);
            e.target.value = '';
        }
    };

    const removeImage = (url: string) => {
        setAttachmentImages((prev) => prev.filter((u) => u !== url));
    };

    const handleSave = async () => {
        if (!sourceStoreId) {
            alert('Vui lòng chọn kho nguồn');
            return;
        }

        if (products.length === 0) {
            alert('Vui lòng thêm ít nhất một sản phẩm');
            return;
        }

        const invalidProducts = products.filter(
            (p) => !p.quantity || parseNumber(p.quantity) <= 0 || !p.price || parseNumber(p.price) <= 0
        );

        if (invalidProducts.length > 0) {
            alert('Vui lòng nhập đầy đủ số lượng và đơn giá cho tất cả sản phẩm');
            return;
        }

        try {
            setSaving(true);
            const payload: InternalImportCreateRequest = {
                storeId: data?.storeId || 1,
                sourceStoreId: Number(sourceStoreId),
                note: reason || undefined,
                attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
                items: products.map((p) => ({
                    productId: p.productId,
                    quantity: parseNumber(p.quantity),
                    unitPrice: parseNumber(p.price),
                })),
            };

            await updateInternalImport(id, payload);
            alert('Cập nhật phiếu nhập nội bộ thành công!');
            router.push(`/orders/import/view-internal-import-receipt/${id}`);
        } catch (error) {
            console.error('Lỗi khi cập nhật phiếu nhập:', error);
            alert(error instanceof Error ? error.message : 'Không thể cập nhật phiếu nhập');
        } finally {
            setSaving(false);
        }
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

            <main className="ml-[377px] mt-[113px] p-6 pr-12">
                <div className="mb-4">
                    <p className="text-base font-bold text-gray-800">
                        Xuất - nhập với Nội bộ &gt; Chỉnh sửa phiếu nhập kho
                    </p>
                </div>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={handleOpenProductModal}
                        disabled={loadingProducts}
                        className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-all"
                    >
                        + Thêm hàng<br />từ hệ thống
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-center mb-6">PHIẾU NHẬP KHO NỘI BỘ</h2>

                    {/* Thông tin chung */}
                    <div className="border border-black bg-gray-100 p-6 mb-6 rounded">
                        <h3 className="text-base font-bold mb-4">Thông tin chung</h3>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Nguồn xuất</label>
                                    <select
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-white"
                                        disabled={loadingSuppliers}
                                        value={sourceStoreId === '' ? '' : String(sourceStoreId)}
                                        onChange={(e) => setSourceStoreId(e.target.value ? Number(e.target.value) : '')}
                                    >
                                        <option value="">Chọn nguồn xuất</option>
                                        {internalSuppliers.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Mã nguồn</label>
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100"
                                        value={
                                            sourceStoreId
                                                ? internalSuppliers.find((s) => s.id === sourceStoreId)?.code ?? ''
                                                : ''
                                        }
                                        readOnly
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Số điện thoại</label>
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100"
                                        value={
                                            sourceStoreId
                                                ? internalSuppliers.find((s) => s.id === sourceStoreId)?.phone ?? ''
                                                : ''
                                        }
                                        readOnly
                                    />
                                </div>

                                <div className="flex items-start gap-3">
                                    <label className="w-28 text-sm pt-2">Địa chỉ</label>
                                    <textarea
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100 h-14 resize-none"
                                        value={
                                            sourceStoreId
                                                ? internalSuppliers.find((s) => s.id === sourceStoreId)?.address ?? ''
                                                : ''
                                        }
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Mã phiếu</label>
                                    <input
                                        type="text"
                                        value={data.code}
                                        readOnly
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Xuất tại kho</label>
                                    <input
                                        type="text"
                                        value="Kho tổng"
                                        readOnly
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100"
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="w-28 text-sm">Mã kho</label>
                                    <input
                                        type="text"
                                        value="KT_5467"
                                        readOnly
                                        className="flex-1 px-3 py-1.5 border border-black rounded bg-gray-100"
                                    />
                                </div>

                                <div className="flex items-start gap-3">
                                    <label className="w-28 text-sm pt-2">Lý do</label>
                                    <textarea
                                        className="flex-1 px-3 py-1.5 border border-black rounded h-14 resize-none"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Table */}
                    <div className="border-4 border-gray-400 mb-6 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#0046ff] text-white h-12">
                                    <th className="px-2 text-center font-bold text-sm w-12">STT</th>
                                    <th className="px-2 text-center font-bold text-sm w-40">Tên hàng hóa</th>
                                    <th className="px-2 text-center font-bold text-sm w-24">Mã hàng</th>
                                    <th className="px-2 text-center font-bold text-sm w-20">Đơn vị tính</th>
                                    <th className="px-2 text-center font-bold text-sm w-28">Đơn giá</th>
                                    <th className="px-2 text-center font-bold text-sm w-20">Số lượng</th>
                                    <th className="px-2 text-center font-bold text-sm w-24">Chiết khấu (%)</th>
                                    <th className="px-2 text-center font-bold text-sm w-28">Thành tiền</th>
                                    <th className="px-2 text-center font-bold text-sm w-16">Xóa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product, index) => (
                                    <tr key={product.id} className="border border-gray-400 h-12 hover:bg-gray-50">
                                        <td className="px-2 text-center text-sm border-r border-gray-400">{index + 1}</td>
                                        <td className="px-2 text-left text-sm border-r border-gray-400">{product.name}</td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">{product.code}</td>
                                        <td className="px-2 text-center text-sm border-r border-gray-400">{product.unit}</td>
                                        <td className="px-2 border-r border-gray-400">
                                            <input
                                                type="text"
                                                value={product.price}
                                                onChange={(e) => handleChangeProductField(product.id, 'price', e.target.value)}
                                                className="w-full text-right px-2 py-1 border-0 bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-2 border-r border-gray-400">
                                            <input
                                                type="text"
                                                value={product.quantity}
                                                onChange={(e) => handleChangeProductField(product.id, 'quantity', e.target.value)}
                                                className="w-full text-center px-2 py-1 border-0 bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-2 border-r border-gray-400">
                                            <input
                                                type="text"
                                                value={product.discount}
                                                onChange={(e) => handleChangeProductField(product.id, 'discount', e.target.value)}
                                                className="w-full text-center px-2 py-1 border-0 bg-transparent focus:outline-none"
                                            />
                                        </td>
                                        <td className="px-2 text-right text-sm font-medium border-r border-gray-400">{product.total}</td>
                                        <td className="px-2 text-center border-r border-gray-400">
                                            <button onClick={() => deleteProduct(product.id)} className="hover:scale-110 transition-transform">
                                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                                                    <path d="M3 6H19M8 6V4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4V6M17 6V18C17 18.5523 16.5523 19 16 19H6C5.44772 19 5 18.5523 5 18V6H17Z" stroke="#f90606" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="border border-gray-400 h-12 bg-white">
                                    <td colSpan={7} className="px-2 text-center font-bold text-sm border-r border-gray-400">Tổng</td>
                                    <td className="px-2 text-right font-bold text-sm border-r border-gray-400">{formatCurrency(calculateTotal())}</td>
                                    <td className="border-r border-gray-400"></td>
                                </tr>
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
