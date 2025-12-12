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

import { getProduct } from '@/services/product.service';

import {
    getImportById,
    updateImport,
    type UnifiedImportCreateRequest,
    type SupplierImportDetail,
} from '@/services/inventory.service';

import { useAllStocks } from '@/hooks/useAllStocks';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStores } from '@/hooks/useStores';
import { useProducts } from '@/hooks/useProducts';

import type { Product as BaseProduct } from '@/types/product';

import { buildImageUrl } from '@/lib/utils';

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
    discount: number;
    total: number;
    storeId: number | null; // Kho nhập cho dòng này
    supplierId?: number | null; // NCC chính của sản phẩm
    supplierIds?: number[] | null; // Danh sách NCC của sản phẩm
}

/* ============================================================
   UTILS
============================================================ */
const formatMoney = (v: number) =>
    new Intl.NumberFormat('vi-VN').format(v || 0);

/* ============================================================
   COMPONENT PHỤ: INFO LINE
============================================================ */
interface InfoLineProps {
    label: string;
    value?: string;
    multi?: boolean;
    children?: ReactNode;
    isTextArea?: boolean;
}

function InfoLine({ label, value, multi, children, isTextArea = false }: InfoLineProps) {
    return (
        <div className="flex gap-3 items-start">
            <label className="w-32 pt-1">{label}</label>
            <div className="flex-1">
                {children ? (
                    children
                ) : isTextArea ? (
                    <textarea
                        readOnly={!multi}
                        value={value ?? ''}
                        className={`w-full border rounded px-3 py-1.5 h-16 ${multi ? '' : 'bg-gray-100'}`}
                    />
                ) : (
                    <input
                        readOnly={!multi}
                        value={value ?? ''}
                        className={`w-full border rounded px-3 py-1.5 ${multi ? '' : 'bg-gray-100'}`}
                    />
                )}
            </div>
        </div>
    );
}

/* ============================================================
   TRANG EDIT PHIẾU NHẬP NCC
============================================================ */
export default function EditImportReceiptPage() {
    const router = useRouter();
    const params = useParams();
    const importId = Number(
        Array.isArray(params?.id) ? params.id[0] : params?.id,
    );

    // Load suppliers, stores, products với React Query cache
    const { data: suppliers = [] } = useSuppliers();
    const { data: stores = [] } = useStores();
    const { data: productList = [] } = useProducts();

    const [items, setItems] = useState<ProductItem[]>([]);
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>>(new Map()); // Map productId -> Map<storeId, {quantity, maxStock, minStock}>

    const [supplierId, setSupplierId] = useState<number | ''>('');
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
    // productList được lấy từ useProducts hook
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

    // Load stocks với React Query cache
    const { data: allStocks = [] } = useAllStocks();

    // Tạo map stocks từ cached data
    useEffect(() => {
        if (allStocks.length === 0) return;

        const allStocksMap = new Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>();
        allStocks.forEach((stock) => {
            if (!allStocksMap.has(stock.productId)) {
                allStocksMap.set(stock.productId, new Map());
            }
            allStocksMap.get(stock.productId)!.set(stock.storeId, {
                quantity: stock.quantity,
                maxStock: stock.maxStock,
                minStock: stock.minStock,
            });
        });
        setAllStocksMap(allStocksMap);
    }, [allStocks]);

    /* ============================================================
       LOAD DỮ LIỆU PHIẾU NHẬP
    ============================================================ */
    useEffect(() => {
        if (!importId || suppliers.length === 0) return;

        (async () => {
            try {
                const receipt = await getImportById(importId);

                /* --- NCC --- */
                setSupplierId(receipt.supplierId);

                // ⭐ Tự động fill thông tin NCC từ danh sách suppliers
                const selectedSupplier = suppliers.find((s) => s.id === receipt.supplierId);
                if (selectedSupplier) {
                    setSupplierPhone(selectedSupplier.phone ?? '');
                    setSupplierAddress(selectedSupplier.address ?? '');
                    setSupplierSearchTerm(`${selectedSupplier.name} ${selectedSupplier.type ? `(${selectedSupplier.type})` : ''}`);
                } else {
                    // Fallback: dùng thông tin từ receipt nếu không tìm thấy supplier
                    setSupplierPhone(receipt.supplierPhone ?? '');
                    setSupplierAddress(receipt.supplierAddress ?? '');
                    setSupplierSearchTerm('');
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
                        let code = it.productCode ?? '';
                        let name = it.productName ?? '';
                        let unit = it.unit || it.unitName || 'Cái';

                        let supplierId: number | null = null;
                        let supplierIds: number[] | null = null;

                        // Nếu có productId, gọi API để lấy thông tin (bao gồm tồn kho và NCC)
                        if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                if (!code) code = product.code;
                                if (!name) name = product.name;
                                unit = unit || product.unitName || 'Cái';
                                // Lấy thông tin NCC từ sản phẩm
                                supplierId = product.supplierId ?? null;
                                supplierIds = product.supplierIds ?? null;
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                            }
                        }

                        // Lấy tồn kho từ kho được chọn (hoặc kho mặc định từ receipt)
                        return {
                            rowId: idx + 1,
                            productId: it.productId,
                            code,
                            name,
                            unit,
                            unitPrice: it.unitPrice,
                            quantity: it.quantity,
                            discount: it.discountPercent ?? 0,
                            total: (() => {
                                const price = it.unitPrice;
                                const qty = it.quantity;
                                const discount = it.discountPercent ?? 0;
                                let total = price * qty;
                                if (discount > 0) {
                                    total = (total * (100 - discount)) / 100;
                                }
                                return total;
                            })(),
                            storeId: it.storeId ?? receipt.storeId ?? null,
                            supplierId,
                            supplierIds,
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
            setSupplierPhone('');
            setSupplierAddress('');
            setSupplierSearchTerm('');
            return;
        }

        const id = Number(v);
        const sp = suppliers.find((s) => s.id === id);
        setSupplierId(id);

        if (sp) {
            setSupplierPhone(sp.phone ?? '');
            setSupplierAddress(sp.address ?? '');
            setSupplierSearchTerm(`${sp.name} ${sp.type ? `(${sp.type})` : ''}`);
        }

        setShowSupplierDropdown(false);
    };

    // Tính toán danh sách NCC mà TẤT CẢ sản phẩm trong phiếu đều thuộc
    const availableSupplierIds = useMemo(() => {
        if (items.length === 0) return [];

        // Tạo mảng các tập hợp NCC cho mỗi sản phẩm
        const productSupplierSets: Set<number>[] = items.map((item) => {
            const supplierSet = new Set<number>();
            // Thêm NCC chính
            if (item.supplierId) {
                supplierSet.add(item.supplierId);
            }
            // Thêm danh sách NCC
            if (item.supplierIds && Array.isArray(item.supplierIds)) {
                item.supplierIds.forEach((id) => {
                    if (id) supplierSet.add(id);
                });
            }
            return supplierSet;
        });

        // Tìm giao (intersection) của tất cả các tập hợp - chỉ lấy NCC có trong TẤT CẢ sản phẩm
        if (productSupplierSets.length === 0) return [];

        // Bắt đầu với tập hợp đầu tiên
        const commonSuppliers = new Set(productSupplierSets[0]);

        // Giao với từng tập hợp còn lại
        for (let i = 1; i < productSupplierSets.length; i++) {
            const currentSet = productSupplierSets[i];
            // Chỉ giữ lại các NCC có trong cả hai tập hợp
            commonSuppliers.forEach((supplierId) => {
                if (!currentSet.has(supplierId)) {
                    commonSuppliers.delete(supplierId);
                }
            });
        }

        return Array.from(commonSuppliers);
    }, [items]);

    // Lọc suppliers: chỉ hiển thị các NCC mà TẤT CẢ sản phẩm đều thuộc, và filter theo search term
    const filteredSuppliers = useMemo(() => {
        // Nếu có items, chỉ hiển thị các NCC mà TẤT CẢ sản phẩm đều thuộc
        let filtered = suppliers;
        if (items.length > 0 && availableSupplierIds.length > 0) {
            filtered = suppliers.filter((s) => availableSupplierIds.includes(s.id));
        }

        // Filter theo search term
        if (!supplierSearchTerm.trim()) return filtered;
        const searchLower = supplierSearchTerm.toLowerCase();
        return filtered.filter((s) => {
            const nameMatch = s.name.toLowerCase().includes(searchLower);
            const codeMatch = s.code?.toLowerCase().includes(searchLower);
            const typeMatch = s.type?.toLowerCase().includes(searchLower);
            return nameMatch || codeMatch || typeMatch;
        });
    }, [suppliers, supplierSearchTerm, items, availableSupplierIds]);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(event.target as Node)) {
                setShowSupplierDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        setItems((prev) => {
            const item = prev.find((it) => it.rowId === rowId);
            if (!item) return prev;

            // Validate không được vượt quá maxStock
            const storeId = typeof item.storeId === 'number' ? item.storeId : null;

            let finalQty = q;

            // Validate min = 10 nếu sản phẩm chưa có trong kho
            if (q > 0 && q < 10) {
                finalQty = 10;
            }
            if (storeId !== null) {
                const productStocks = allStocksMap.get(item.productId);
                let maxCanImport = 1000; // Mặc định nếu chưa có trong kho

                if (productStocks) {
                    const stockInfo = productStocks.get(storeId);
                    const currentQty = stockInfo?.quantity ?? 0;
                    const maxStock = stockInfo?.maxStock;

                    // Tính số lượng tối đa có thể nhập
                    if (maxStock !== undefined && maxStock !== null) {
                        maxCanImport = Math.max(0, maxStock - currentQty);
                    }
                }

                // Nếu nhập vượt quá, giới hạn ở mức tối đa
                if (q > maxCanImport) {
                    finalQty = Math.max(0, maxCanImport);
                }
            } else {
                // Nếu chưa chọn kho, max = 1000
                if (q > 1000) {
                    finalQty = 1000;
                }
            }

            return prev.map((it) =>
                it.rowId === rowId
                    ? { ...it, quantity: finalQty, total: finalQty * it.unitPrice }
                    : it,
            );
        });
    };

    // Tính số lượng có thể nhập thêm cho một sản phẩm
    const getRemainingQuantity = (item: ProductItem): string => {
        const storeId = typeof item.storeId === 'number' ? item.storeId : null;
        if (!storeId) return 'Chưa chọn kho';

        const productStocks = allStocksMap.get(item.productId);
        if (!productStocks) {
            return 'Có thể nhập tối đa: 1.000';
        }

        const stockInfo = productStocks.get(storeId);
        if (!stockInfo) {
            return 'Có thể nhập tối đa: 1.000';
        }

        const currentQty = stockInfo.quantity ?? 0;
        const maxStock = stockInfo.maxStock;

        if (maxStock === undefined || maxStock === null) {
            return 'Có thể nhập tối đa: 1.000';
        }

        const maxCanImport = Math.max(0, maxStock - currentQty);
        const remaining = maxCanImport - item.quantity;

        if (remaining < 0) {
            return `Vượt quá ${Math.abs(remaining).toLocaleString('vi-VN')} sản phẩm`;
        }

        if (remaining === 0) {
            return 'Đã đạt giới hạn tối đa';
        }

        return `Có thể nhập thêm: ${remaining.toLocaleString('vi-VN')} sản phẩm`;
    };

    const changeDiscount = (rowId: number, v: string) => {
        const discount = Number(v) || 0;
        setItems((prev) =>
            prev.map((it) => {
                if (it.rowId !== rowId) return it;
                const total = it.quantity * it.unitPrice;
                const discountedTotal = discount > 0 ? (total * (100 - discount)) / 100 : total;
                return { ...it, discount, total: discountedTotal };
            }),
        );
    };

    const deleteRow = (rowId: number) =>
        setItems((prev) => prev.filter((it) => it.rowId !== rowId));

    const totalAll = useMemo(
        () => items.reduce((s, it) => s + it.total, 0),
        [items],
    );

    const openProductModal = async () => {
        if (!supplierId) {
            setError('Vui lòng chọn nhà cung cấp trước khi thêm sản phẩm');
            return;
        }

        setShowProductModal(true);
        setProductError(null);

        // Không set selectedProductIds từ items - để người dùng chọn lại từ đầu
        setSelectedProductIds([]);
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setSelectedProductIds([]); // Reset khi đóng modal
    };

    const toggleSelectProduct = (productId: number) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
        );
    };

    // Hàm chọn/bỏ chọn tất cả sản phẩm
    const handleToggleSelectAll = () => {
        // Lọc sản phẩm có thể chọn (không bao gồm sản phẩm đã có trong phiếu)
        const availableProducts = (() => {
            const filteredProducts = productList.filter((product) => {
                // Lọc theo NCC đã chọn
                if (supplierId) {
                    const supplierIdNum = typeof supplierId === 'number'
                        ? supplierId
                        : Number(supplierId);

                    // Kiểm tra supplierId (NCC chính)
                    const hasMainSupplier = product.supplierId === supplierIdNum;

                    // Kiểm tra supplierIds (danh sách NCC)
                    const hasInSupplierIds = product.supplierIds && product.supplierIds.includes(supplierIdNum);

                    // Chỉ hiển thị nếu sản phẩm thuộc NCC đã chọn
                    if (!hasMainSupplier && !hasInSupplierIds) {
                        return false;
                    }
                }

                // Lọc theo search term
                if (!productSearchTerm.trim()) return true;
                const searchLower = productSearchTerm.toLowerCase();
                return (
                    product.name.toLowerCase().includes(searchLower) ||
                    product.code.toLowerCase().includes(searchLower)
                );
            });

            // Lọc bỏ các sản phẩm đã có trong phiếu
            const existingProductIds = new Set(items.map((p) => p.productId));
            return filteredProducts.filter((p) => !existingProductIds.has(p.id));
        })();

        const availableProductIds = availableProducts.map((p) => p.id);
        const allSelected = availableProductIds.length > 0 &&
            availableProductIds.every((id) => selectedProductIds.includes(id));

        if (allSelected) {
            // Bỏ chọn tất cả
            setSelectedProductIds((prev) =>
                prev.filter((id) => !availableProductIds.includes(id))
            );
        } else {
            // Chọn tất cả (giữ lại các sản phẩm đã chọn khác)
            setSelectedProductIds((prev) => {
                const newIds = new Set(prev);
                availableProductIds.forEach((id) => newIds.add(id));
                return Array.from(newIds);
            });
        }
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
                    discount: 0,
                    total: 0,
                    storeId: null, // Bắt buộc phải chọn kho cho mỗi dòng
                    supplierId: prod.supplierId ?? null, // Lưu NCC chính
                    supplierIds: prod.supplierIds ?? null, // Lưu danh sách NCC
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

        // Validate: mỗi dòng phải có storeId
        for (const it of items) {
            if (typeof it.storeId !== 'number') {
                setError(`Sản phẩm "${it.name}" chưa chọn kho nhập`);
                return;
            }
        }

        // Lấy storeId từ item đầu tiên làm storeId mặc định cho header
        const firstStoreId = items[0]?.storeId;
        const defaultStoreId = typeof firstStoreId === 'number' ? firstStoreId : undefined;
        if (defaultStoreId === undefined) {
            setError('Vui lòng chọn kho nhập cho ít nhất một sản phẩm');
            return;
        }

        const payload: UnifiedImportCreateRequest = {
            storeId: defaultStoreId,
            supplierId: supplierId as number,
            note,
            description: `${contractContent}\n${evidenceContent}`.trim(),
            attachmentImages,
            items: items.map((it) => {
                if (typeof it.storeId !== 'number') {
                    throw new Error(`Sản phẩm "${it.name}" chưa chọn kho nhập`);
                }

                return {
                    productId: it.productId,
                    storeId: it.storeId,
                    quantity: it.quantity,
                    unitPrice: it.unitPrice,
                    discountPercent: it.discount > 0 ? it.discount : undefined,
                };
            }),
        };

        try {
            setSaving(true);
            await updateImport(importId, payload);
            router.push('/imports');
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
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                <p className="text-lg text-blue-gray-600">Đang tải dữ liệu…</p>
            </div>
        );

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa phiếu nhập kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin phiếu nhập kho</p>
            </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded px-4 py-2">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ======================================================================
                               THÔNG TIN CHUNG
                            ====================================================================== */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                                    CẬP NHẬT PHIẾU NHẬP KHO
                                </h2>
                                <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                            </div>

                            <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                    Thông tin chung
                                </h3>

                                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                    {/* Cột trái: Nguồn nhập */}
                                    <div className="space-y-4">
                                        <InfoLine label="Nguồn nhập">
                                            <div className="relative" ref={supplierDropdownRef}>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Tìm kiếm và chọn nguồn nhập..."
                                                    value={supplierSearchTerm}
                                                    onChange={(e) => {
                                                        setSupplierSearchTerm(e.target.value);
                                                        setShowSupplierDropdown(true);
                                                    }}
                                                    onFocus={() => setShowSupplierDropdown(true)}
                                                />
                                                {showSupplierDropdown && (
                                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                        <div
                                                            className="px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                                                            onClick={() => {
                                                                changeSupplier('');
                                                                setSupplierSearchTerm('');
                                                            }}
                                                        >
                                                            -- Chọn nguồn nhập --
                                                        </div>
                                                        {filteredSuppliers.length === 0 ? (
                                                            <div className="px-3 py-2 text-sm text-gray-500">
                                                                Không tìm thấy
                                                            </div>
                                                        ) : (
                                                            filteredSuppliers.map((s) => (
                                                                <div
                                                                    key={s.id}
                                                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${supplierId === s.id ? 'bg-blue-100 font-semibold' : ''}`}
                                                                    onClick={() => changeSupplier(String(s.id))}
                                                                >
                                                                    <div className="font-medium">{s.name}</div>
                                                                    {s.code && (
                                                                        <div className="text-xs text-gray-500">Mã: {s.code}</div>
                                                                    )}
                                                                    {s.type && (
                                                                        <div className="text-xs text-gray-500">Loại: {s.type}</div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </InfoLine>

                                        {/* Hiển thị thông tin NCC khi đã chọn */}
                                        {supplierId && (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                    <span className="font-semibold text-blue-800">Thông tin nhà cung cấp</span>
                                                </div>

                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-600">Mã NCC:</span>
                                                        <span className="ml-2 font-medium text-gray-800">
                                                            {suppliers.find((s) => s.id === supplierId)?.code ?? '-'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-600">Loại:</span>
                                                        <span className="ml-2 font-medium text-gray-800">
                                                            {suppliers.find((s) => s.id === supplierId)?.type ?? '-'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <InfoLine label="Số điện thoại">
                                                    <input
                                                        type="text"
                                                        value={supplierPhone}
                                                        onChange={(e) => setSupplierPhone(e.target.value)}
                                                        disabled={true}
                                                        className="w-full px-3 py-2 border border-blue-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        placeholder="Tự động điền từ hệ thống"
                                                    />
                                                </InfoLine>

                                                <InfoLine label="Địa chỉ" isTextArea>
                                                    <textarea
                                                        value={supplierAddress}
                                                        onChange={(e) => setSupplierAddress(e.target.value)}
                                                        disabled={true}
                                                        className="w-full px-3 py-2 border border-blue-200 rounded-md h-16 resize-none bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        placeholder="Tự động điền từ hệ thống"
                                                    />
                                                </InfoLine>
                                            </div>
                                        )}
                                    </div>

                                    {/* Cột phải: Lý do nhập */}
                                    <div className="space-y-4">
                                        <InfoLine label="Lý do nhập">
                                            <textarea
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="Nhập lý do nhập kho (tùy chọn)"
                                            />
                                        </InfoLine>
                                    </div>
                                </div>
                            </div>

                            {/* ======================================================================
                       BẢNG SẢN PHẨM
                    ====================================================================== */}
                            <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-[#0099FF] text-white h-12">
                                                <th className="px-4 w-12 font-semibold">STT</th>
                                                <th className="px-4 w-40 font-semibold">Tên hàng hóa</th>
                                                <th className="px-4 w-28 font-semibold">Mã hàng</th>
                                                <th className="px-4 w-20 font-semibold">ĐVT</th>
                                                <th className="px-4 w-32 font-semibold">Kho nhập</th>
                                                <th className="px-4 w-24 font-semibold">Tồn kho</th>
                                                <th className="px-4 w-28 font-semibold">Đơn giá</th>
                                                <th className="px-4 w-32 font-semibold">SL</th>
                                                <th className="px-4 w-24 font-semibold">Chiết khấu (%)</th>
                                                <th className="px-4 w-28 font-semibold">Thành tiền</th>
                                                <th className="px-4 w-16 font-semibold">Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((row, idx) => (
                                                <tr key={row.rowId} className="border-b border-gray-200 h-12 hover:bg-blue-50 transition-colors">
                                                    <td className="text-center">{idx + 1}</td>
                                                    <td className="px-2">{row.name}</td>
                                                    <td className="text-center">{row.code}</td>
                                                    <td className="text-center">{row.unit}</td>
                                                    <td className="px-2">
                                                        <select
                                                            value={row.storeId === null ? '' : String(row.storeId)}
                                                            onChange={(e) => {
                                                                const value = e.target.value === '' ? null : Number(e.target.value);
                                                                setItems(prev => prev.map(item =>
                                                                    item.rowId === row.rowId
                                                                        ? { ...item, storeId: value }
                                                                        : item,
                                                                ));
                                                            }}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                        >
                                                            <option value="">Chọn kho (bắt buộc)</option>
                                                            {stores.map((store) => (
                                                                <option key={store.id} value={store.id}>
                                                                    {store.name} {store.code ? `(${store.code})` : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="text-center">
                                                        {(() => {
                                                            // Lấy tồn kho từ kho được chọn trong dropdown
                                                            const storeIdToCheck = typeof row.storeId === 'number' ? row.storeId : null;

                                                            if (!storeIdToCheck) return '-';

                                                            const productStocks = allStocksMap.get(row.productId);
                                                            const stockInfo = productStocks?.get(storeIdToCheck);
                                                            return stockInfo ? stockInfo.quantity.toLocaleString('vi-VN') : 0;
                                                        })()}
                                                    </td>
                                                    <td className="text-right">
                                                        <input
                                                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-right text-gray-700 cursor-not-allowed"
                                                            value={formatMoney(row.unitPrice)}
                                                            readOnly
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        {(() => {
                                                            // Tính max có thể nhập
                                                            const storeIdToCheck = typeof row.storeId === 'number' ? row.storeId : null;

                                                            let maxQuantity = undefined;
                                                            const minQuantity = 10; // Mặc định min = 10
                                                            if (storeIdToCheck !== null) {
                                                                const productStocks = allStocksMap.get(row.productId);
                                                                if (productStocks) {
                                                                    const stockInfo = productStocks.get(storeIdToCheck);
                                                                    const currentQty = stockInfo?.quantity ?? 0;
                                                                    const maxStock = stockInfo?.maxStock;

                                                                    if (maxStock !== undefined && maxStock !== null) {
                                                                        maxQuantity = Math.max(0, maxStock - currentQty);
                                                                    }
                                                                } else {
                                                                    // Nếu sản phẩm chưa có trong kho, max = 1000
                                                                    maxQuantity = 1000;
                                                                }
                                                            } else {
                                                                // Nếu chưa chọn kho, max = 1000
                                                                maxQuantity = 1000;
                                                            }

                                                            const remainingMsg = getRemainingQuantity(row);
                                                            const hasQuantity = row.quantity > 0;
                                                            return (
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={maxQuantity}
                                                                        className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                                        value={row.quantity}
                                                                        onChange={(e) => {
                                                                            const value = e.target.value;
                                                                            const numValue = Number(value);
                                                                            // Chỉ giới hạn nếu vượt quá max, không tự động thay đổi khi nhỏ hơn min
                                                                            if (maxQuantity !== undefined && numValue > maxQuantity) {
                                                                                changeQty(row.rowId, String(maxQuantity));
                                                                            } else {
                                                                                // Cho phép nhập bất kỳ giá trị nào (validation sẽ được thực hiện khi submit)
                                                                                changeQty(row.rowId, value);
                                                                            }
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            // Khi blur, nếu giá trị < min và > 0, hiển thị cảnh báo nhưng không tự động thay đổi
                                                                            const value = e.target.value;
                                                                            const numValue = Number(value);
                                                                            if (numValue > 0 && numValue < minQuantity) {
                                                                                setError(`Số lượng tối thiểu là ${minQuantity}. Vui lòng nhập lại.`);
                                                                            }
                                                                        }}
                                                                    />
                                                                    {/* Hiển thị thông báo số lượng có thể nhập thêm - absolute để không làm layout nhảy */}
                                                                    {hasQuantity && (
                                                                        <div className="absolute left-0 right-0 top-full mt-0.5 text-[10px] text-blue-600 font-medium whitespace-nowrap z-30 pointer-events-none">
                                                                            {remainingMsg}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="text-center">
                                                        <input
                                                            type="text"
                                                            value={row.discount}
                                                            onChange={(e) => changeDiscount(row.rowId, e.target.value)}
                                                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                        />
                                                    </td>
                                                    <td className="text-right font-semibold text-gray-800">
                                                        {formatMoney(row.total)}
                                                    </td>
                                                    <td className="text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${row.name}" khỏi danh sách?`)) {
                                                                    deleteRow(row.rowId);
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1 rounded hover:bg-red-50"
                                                            title="Xóa sản phẩm"
                                                        >
                                                            <svg
                                                                width="22"
                                                                height="22"
                                                                viewBox="0 0 22 22"
                                                                fill="none"
                                                                className="cursor-pointer"
                                                            >
                                                                <path
                                                                    d="M3 6H19M8 6V4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4V6M17 6V18C17 18.5523 16.5523 19 16 19H6C5.44772 19 5 18.5523 5 18V6H17Z"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}

                                            <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
                                                <td colSpan={9} className="text-center text-gray-800">Tổng</td>
                                                <td className="text-right px-4 text-lg text-blue-700">
                                                    {formatMoney(totalAll)}
                                                </td>
                                                <td />
                                            </tr>

                                            {items.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={11}
                                                        className="px-2 py-3 text-center text-gray-500"
                                                    >
                                                        Chưa có sản phẩm nào.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>



                            {/* Nút thêm hàng từ hệ thống */}
                            <div className="flex gap-4 mb-6">
                                <button
                                    type="button"
                                    onClick={openProductModal}
                                    className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Thêm hàng từ hệ thống
                                </button>
                            </div>

                            {/* ======================================================================
                       HỢP ĐỒNG / ẢNH ĐÍNH KÈM
                    ====================================================================== */}
                            <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 rounded-lg shadow-sm mb-6">
                                <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                    Hợp đồng / Ảnh đính kèm
                                </h3>

                                <div className="mb-3">
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="px-5 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg disabled:opacity-60 shadow-sm transition-colors font-medium flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
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
                                                className="w-[180px] h-[240px] bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden group"
                                            >
                                                {url ? (
                                                    <img
                                                        src={url}
                                                        className="w-full h-full object-contain"
                                                        alt={`Ảnh ${idx + 1}`}
                                                    />
                                                ) : (
                                                    <span className="text-gray-400">No Image</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(img)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
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
                            <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.push(
                                            '/imports',
                                        )
                                    }
                                    className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Đang lưu…
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Cập nhật phiếu nhập
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {/* MODAL CHỌN HÀNG HÓA */}
                        {showProductModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-lg w-[600px] max-h-[80vh] flex flex-col border border-blue-gray-200 shadow-lg">
                                    <div className="px-6 py-4 border-b border-blue-gray-200">
                                        <h3 className="text-lg font-bold text-blue-gray-800">Chọn sản phẩm kiểm kê</h3>
                                        </div>

                                    <div className="px-6 pt-4 pb-2 border-b border-blue-gray-200">
                                        <input
                                            type="text"
                                            value={productSearchTerm}
                                            onChange={(e) => setProductSearchTerm(e.target.value)}
                                            placeholder="Tìm theo tên hoặc mã hàng..."
                                            className="w-full px-3 py-2 border border-blue-gray-300 rounded-lg text-sm bg-white placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6">
                                        {loadingProducts ? (
                                            <div className="text-center py-8 text-blue-gray-400">Đang tải...</div>
                                        ) : productError ? (
                                            <div className="text-center py-8 text-red-400">{productError}</div>
                                        ) : productList.length === 0 ? (
                                            <div className="text-center py-8 text-blue-gray-400">Không có sản phẩm nào</div>
                                        ) : (() => {
                                            // Lọc sản phẩm theo NCC đã chọn và search term (giống create)
                                            const filteredProducts = productList.filter((product) => {
                                                // Lọc theo NCC đã chọn
                                                if (supplierId) {
                                                    const supplierIdNum = typeof supplierId === 'number'
                                                        ? supplierId
                                                        : Number(supplierId);

                                                    // Kiểm tra supplierId (NCC chính)
                                                    const hasMainSupplier = product.supplierId === supplierIdNum;

                                                    // Kiểm tra supplierIds (danh sách NCC)
                                                    const hasInSupplierIds = product.supplierIds && product.supplierIds.includes(supplierIdNum);

                                                    // Chỉ hiển thị nếu sản phẩm thuộc NCC đã chọn
                                                    if (!hasMainSupplier && !hasInSupplierIds) {
                                                        return false;
                                                    }
                                                }

                                                // Lọc theo search term
                                                if (!productSearchTerm.trim()) return true;
                                                const searchLower = productSearchTerm.toLowerCase();
                                                return (
                                                    product.name.toLowerCase().includes(searchLower) ||
                                                    product.code.toLowerCase().includes(searchLower)
                                                );
                                            });

                                            if (filteredProducts.length === 0) {
                                                return (
                                                    <div className="text-center py-8 text-blue-gray-400">
                                                        Không có sản phẩm phù hợp với từ khóa hiện tại
                                                    </div>
                                                );
                                            }

                                            // Tính toán sản phẩm có thể chọn và trạng thái "chọn tất cả"
                                            const existingProductIds = new Set(items.map((p) => p.productId));
                                            const availableProducts = filteredProducts.filter((p) => !existingProductIds.has(p.id));
                                            const availableProductIds = availableProducts.map((p) => p.id);
                                            const allAvailableSelected = availableProductIds.length > 0 &&
                                                availableProductIds.every((id) => selectedProductIds.includes(id));

                                            return (
                                                <>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs text-blue-gray-500">
                                                            Đã chọn {selectedProductIds.length} sản phẩm
                                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={handleToggleSelectAll}
                                                            className="px-3 py-1 text-xs font-semibold rounded-md border border-blue-gray-300 text-blue-gray-700 hover:bg-blue-gray-50"
                                                        >
                                                            Chọn/Bỏ chọn tất cả
                                                        </button>
                                                                </div>
                                                    <div className="space-y-2">
                                                    {filteredProducts.map((product) => {
                                                        const alreadyAdded = existingProductIds.has(product.id);
                                                        // Tính tổng tồn kho từ tất cả các kho
                                                        const productStocks = allStocksMap.get(product.id);
                                                        let totalStock = 0;
                                                        if (productStocks) {
                                                            productStocks.forEach((stockInfo) => {
                                                                totalStock += stockInfo.quantity ?? 0;
                                                            });
                                                        }
                                                        return (
                                                            <label
                                                                key={product.id}
                                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                                    alreadyAdded
                                                                        ? 'bg-blue-gray-100 border-blue-gray-200'
                                                                        : 'hover:bg-blue-gray-50 border-blue-gray-200'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedProductIds.includes(product.id)}
                                                                    onChange={() => toggleSelectProduct(product.id)}
                                                                    className="w-4 h-4"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-blue-gray-800">
                                                                        {product.name}
                                                                    </div>
                                                                    <div className="text-sm text-blue-gray-400">
                                                                        Mã: {product.code} | Tồn kho: {totalStock.toLocaleString('vi-VN')}
                                                                        {alreadyAdded && (
                                                                            <span className="ml-2 text-yellow-600">
                                                                                (Đã có trong phiếu)
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                </>
                                            );
                                        })()}
                                    </div>

                                    <div className="px-6 py-4 border-t border-blue-gray-200 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={closeProductModal}
                                            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-blue-gray-800 rounded-lg transition-colors"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleAddSelectedProducts}
                                            disabled={loadingProducts}
                                            className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            Thêm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
        </>
    );
}
