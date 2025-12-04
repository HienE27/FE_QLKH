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

import Sidebar from '@/components/layout/Sidebar';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { getProducts, getProduct } from '@/services/product.service';
import { getStores, type Store } from '@/services/store.service';

import {
    getImportById,
    updateImport,
    type UnifiedImportCreateRequest,
    type SupplierImportDetail,
} from '@/services/inventory.service';

import { getAllStock } from '@/services/stock.service';

import type { Product as BaseProduct } from '@/types/product';

import { buildImageUrl } from '@/lib/utils';
import RichTextEditor from '@/components/common/RichTextEditor';

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
   TRANG EDIT PHIẾU NHẬP NCC
============================================================ */
export default function EditImportReceiptPage() {
    const router = useRouter();
    const params = useParams();
    const importId = Number(
        Array.isArray(params?.id) ? params.id[0] : params?.id,
    );

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
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
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

    /* ============================================================
       LOAD DỮ LIỆU PHIẾU NHẬP
    ============================================================ */
    // Load receipt và stocks trước (quan trọng)
    useEffect(() => {
        if (!importId) return;

        (async () => {
            try {
                setLoading(true);
                const [receipt, allStocks, storeList] = await Promise.all([
                    getImportById(importId),
                    getAllStock().catch(() => []), // Load tồn kho từ tất cả các kho
                    getStores(),
                ]);

                setStores(storeList);

                // Tạo map: productId -> Map<storeId, {quantity, maxStock, minStock}>
                const stocksMap = new Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>();
                allStocks.forEach((stock) => {
                    if (!stocksMap.has(stock.productId)) {
                        stocksMap.set(stock.productId, new Map());
                    }
                    stocksMap.get(stock.productId)!.set(stock.storeId, {
                        quantity: stock.quantity,
                        maxStock: stock.maxStock,
                        minStock: stock.minStock,
                    });
                });
                setAllStocksMap(stocksMap);

                /* --- NCC --- */
                setSupplierId(receipt.supplierId);

                // Load supplier của receipt nếu có supplierId
                if (receipt.supplierId) {
                    try {
                        const supplier = await getSuppliers().then(list => list.find(s => s.id === receipt.supplierId));
                        if (supplier) {
                            setSuppliers([supplier]); // Set supplier hiện tại
                            setSupplierPhone(supplier.phone ?? receipt.supplierPhone ?? '');
                            setSupplierAddress(supplier.address ?? receipt.supplierAddress ?? '');
                            setSupplierSearchTerm(`${supplier.name} ${supplier.type ? `(${supplier.type})` : ''}`);
                        } else {
                            // Fallback: dùng thông tin từ receipt
                            setSupplierPhone(receipt.supplierPhone ?? '');
                            setSupplierAddress(receipt.supplierAddress ?? '');
                            setSupplierSearchTerm('');
                        }
                    } catch (e) {
                        console.error('Lỗi khi tải supplier:', e);
                        // Fallback: dùng thông tin từ receipt
                        setSupplierPhone(receipt.supplierPhone ?? '');
                        setSupplierAddress(receipt.supplierAddress ?? '');
                        setSupplierSearchTerm('');
                    }
                } else {
                    // Fallback: dùng thông tin từ receipt
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

    // Lazy load danh sách suppliers khi cần (khi mở dropdown)
    const fetchSuppliers = async () => {
        if (suppliers.length > 1) return; // Đã load đủ
        try {
            const supplierList = await getSuppliers();
            // Merge với supplier hiện tại nếu có
            const existingSupplier = suppliers[0];
            if (existingSupplier) {
                const filtered = supplierList.filter(s => s.id !== existingSupplier.id);
                setSuppliers([existingSupplier, ...filtered]);
            } else {
                setSuppliers(supplierList);
            }
        } catch (e) {
            console.error('Lỗi khi tải danh sách suppliers:', e);
        }
    };

    /* ============================================================
       HANDLE NCC
    ============================================================ */
    const changeSupplier = (v: string) => {
        if (!v) {
            setSupplierId('');
            setSupplierPhone('');
            setSupplierAddress('');
            setSupplierSearchTerm('');
            // Clear danh sách sản phẩm khi không chọn NCC
            setProductList([]);
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

        // Luôn reload sản phẩm để đảm bảo lọc đúng theo NCC hiện tại
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
            <div className="ml-[264px] mt-6 text-lg">Đang tải dữ liệu…</div>
        );

    return (
        <div className="min-h-screen">
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                        {error}
                    </div>
                )}



                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ======================================================================
                       THÔNG TIN CHUNG
                    ====================================================================== */}
                    <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                CẬP NHẬT PHIẾU NHẬP KHO
                            </h2>
                            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
                        </div>

                        <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 mb-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-600 rounded"></div>
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
                                                onFocus={() => {
                                                    fetchSuppliers();
                                                    setShowSupplierDropdown(true);
                                                }}
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
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                                    placeholder="Tự động điền từ hệ thống"
                                                />
                                            </InfoLine>

                                            <InfoLine label="Địa chỉ" isTextArea>
                                                <textarea
                                                    value={supplierAddress}
                                                    onChange={(e) => setSupplierAddress(e.target.value)}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-md h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                                                    placeholder="Tự động điền từ hệ thống"
                                                />
                                            </InfoLine>
                                        </div>
                                    )}
                                </div>

                                {/* Cột phải: Lý do nhập */}
                                <div className="space-y-4">
                                    <InfoLine label="Lý do nhập">
                                        <RichTextEditor
                                            value={note}
                                            onChange={setNote}
                                            placeholder="Nhập lý do nhập kho (tùy chọn)"
                                            height="h-32"
                                        />
                                    </InfoLine>
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* ======================================================================
                       BẢNG SẢN PHẨM
                    ====================================================================== */}
                    <div className="border border-gray-300 mb-6 rounded-lg shadow-sm overflow-visible">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white h-12">
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

                                    <tr className="bg-gradient-to-r from-gray-100 to-gray-50 font-bold h-12 border-t-2 border-gray-300">
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
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2"
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
                    <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-sm mb-6">
                        <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded"></div>
                            Hợp đồng / Ảnh đính kèm
                        </h3>

                        <div className="mb-3">
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
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
                                    '/dashboard/products/import/import-receipts',
                                )
                            }
                            className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Chọn sản phẩm
                                    </h3>
                                    <button
                                        onClick={closeProductModal}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {/* Search box */}
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên sản phẩm..."
                                    value={productSearchTerm}
                                    onChange={(e) => setProductSearchTerm(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingProducts ? (
                                    <div className="text-center py-8 text-gray-500">Đang tải...</div>
                                ) : productError ? (
                                    <div className="text-center py-8 text-red-600">{productError}</div>
                                ) : productList.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Không có sản phẩm nào</div>
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
                                            <div className="text-center py-8 text-gray-500">
                                                {productSearchTerm.trim()
                                                    ? 'Không tìm thấy sản phẩm nào'
                                                    : 'Không có sản phẩm nào'}
                                            </div>
                                        );
                                    }

                                    // Tính toán sản phẩm có thể chọn và trạng thái "chọn tất cả"
                                    const existingProductIds = new Set(items.map((p) => p.productId));
                                    const availableProducts = filteredProducts.filter((p) => !existingProductIds.has(p.id));
                                    const availableProductIds = availableProducts.map((p) => p.id);
                                    const allAvailableSelected = availableProductIds.length > 0 &&
                                        availableProductIds.every((id) => selectedProductIds.includes(id));
                                    const someAvailableSelected = availableProductIds.some((id) => selectedProductIds.includes(id));

                                    return (
                                        <div className="space-y-2">
                                            {/* Header với checkbox "Chọn tất cả" */}
                                            {availableProducts.length > 0 && (
                                                <div className="sticky top-0 bg-white border-b border-gray-200 pb-2 mb-2 z-10">
                                                    <label className="flex items-center gap-3 p-3 rounded border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={allAvailableSelected}
                                                            onChange={handleToggleSelectAll}
                                                            className="w-4 h-4"
                                                        />
                                                        <div className="flex-1 font-semibold text-blue-800">
                                                            Chọn tất cả ({availableProducts.length} sản phẩm)
                                                            {someAvailableSelected && !allAvailableSelected && (
                                                                <span className="ml-2 text-sm font-normal text-gray-600">
                                                                    ({selectedProductIds.filter(id => availableProductIds.includes(id)).length} đã chọn)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                </div>
                                            )}

                                            {/* Danh sách sản phẩm */}
                                            {filteredProducts.map((product) => {
                                                const alreadyAdded = existingProductIds.has(product.id);
                                                const isSelected = selectedProductIds.includes(product.id);
                                                return (
                                                    <label
                                                        key={product.id}
                                                        className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${alreadyAdded
                                                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                                                            : isSelected
                                                                ? 'bg-blue-100 border-blue-300 hover:bg-blue-150'
                                                                : 'hover:bg-blue-50 border-gray-200'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            disabled={alreadyAdded}
                                                            onChange={() => toggleSelectProduct(product.id)}
                                                            className="w-4 h-4"
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium">{product.name}</div>
                                                            <div className="text-sm text-gray-500">
                                                                Mã: {product.code}
                                                                {alreadyAdded && <span className="ml-2 text-orange-600">(Đã có trong phiếu)</span>}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeProductModal}
                                    className="px-6 py-2.5 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddSelectedProducts}
                                    disabled={loadingProducts || selectedProductIds.length === 0}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Thêm ({selectedProductIds.length})
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
