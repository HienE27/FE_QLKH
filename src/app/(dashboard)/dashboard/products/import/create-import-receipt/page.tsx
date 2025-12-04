/* eslint-disable @next/next/no-img-element */
'use client';

import {
    useEffect,
    useState,
    useRef,
    useMemo,
    type ChangeEvent,
} from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';

import {
    getSuppliers,
    type Supplier,
} from '@/services/supplier.service';

import {
    getStores,
    type Store,
} from '@/services/store.service';

import {
    createImport,
    type UnifiedImportCreateRequest,
} from '@/services/inventory.service';

import {
    getProducts,
    uploadProductImage,
} from '@/services/product.service';
import type { Product } from '@/types/product';

import { getAllStock } from '@/services/stock.service';

import { buildImageUrl } from '@/lib/utils';
import { ocrReceipt, type SimilarReceipt } from '@/services/ai.service';
import RichTextEditor from '@/components/common/RichTextEditor';

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
    storeId: number | ''; // Kho nhập cho dòng này (nếu '' thì dùng kho mặc định từ header)
    supplierId?: number | null; // NCC chính của sản phẩm
    supplierIds?: number[] | null; // Danh sách NCC của sản phẩm
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
    required,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <div className="flex items-center gap-3">
            <label className="w-36 text-sm font-medium text-gray-700 whitespace-nowrap">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export default function TaoPhieuNhapKho() {
    const router = useRouter();

    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

    const [stores, setStores] = useState<Store[]>([]);

    const [reason, setReason] = useState('');

    const [products, setProducts] = useState<ProductItem[]>([]);

    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>>(new Map()); // Map productId -> Map<storeId, {quantity, maxStock, minStock}>
    const [productSearchTerm, setProductSearchTerm] = useState(''); // Tìm kiếm sản phẩm
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const ocrFileInputRef = useRef<HTMLInputElement | null>(null);
    const [processingOCR, setProcessingOCR] = useState(false);
    const [similarReceipts, setSimilarReceipts] = useState<SimilarReceipt[]>([]);

    // Load stocks trước (quan trọng cho validation)
    useEffect(() => {
        const loadStocks = async () => {
            try {
                const allStocks = await getAllStock().catch(() => []);
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
            } catch (e) {
                console.error('Lỗi khi tải tồn kho:', e);
            }
        };
        loadStocks();
    }, []);

    // Lazy load suppliers/stores (load song song, không block UI)
    const fetchSuppliersAndStores = async () => {
        if (suppliers.length > 0 && stores.length > 0) return;
        try {
            setLoadingSuppliers(true);
            const [supplierList, storeList] = await Promise.all([
                getSuppliers(), // Không filter theo type, lấy tất cả
                getStores(),
            ]);
            setSuppliers(supplierList);
            setStores(storeList);
        } catch (e) {
            console.error('Lỗi khi tải suppliers/stores:', e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải dữ liệu',
            );
        } finally {
            setLoadingSuppliers(false);
        }
    };

    useEffect(() => {
        // Load suppliers/stores sau khi component mount (không block)
        fetchSuppliersAndStores();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Lọc suppliers theo search term
    const filteredSuppliers = useMemo(() => {
        if (!supplierSearchTerm.trim()) return suppliers;
        const searchLower = supplierSearchTerm.toLowerCase();
        return suppliers.filter((s) => {
            const nameMatch = s.name.toLowerCase().includes(searchLower);
            const codeMatch = s.code?.toLowerCase().includes(searchLower);
            const typeMatch = s.type?.toLowerCase().includes(searchLower);
            return nameMatch || codeMatch || typeMatch;
        });
    }, [suppliers, supplierSearchTerm]);

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

    // Hàm xử lý chọn NCC
    const changeSupplier = async (v: string) => {
        const oldSupplierId = selectedSupplierId;

        if (!v) {
            setSelectedSupplierId('');
            setSupplierPhone('');
            setSupplierAddress('');
            setSupplierSearchTerm('');
            setProductList([]);
            // Xóa tất cả sản phẩm khi bỏ chọn NCC
            if (products.length > 0) {
                setProducts([]);
                setError('Đã xóa tất cả sản phẩm vì không có nhà cung cấp được chọn');
                setTimeout(() => setError(null), 3000);
            }
            return;
        }

        const newSupplierId = Number(v);
        const sp = suppliers.find((s) => s.id === newSupplierId);

        // Nếu đổi NCC và đã có sản phẩm trong danh sách, kiểm tra và xóa sản phẩm không thuộc NCC mới
        if (oldSupplierId && oldSupplierId !== newSupplierId && products.length > 0) {
            // Kiểm tra và lọc sản phẩm không thuộc NCC mới
            (async () => {
                try {
                    // Load lại danh sách sản phẩm để có thông tin supplierIds đầy đủ
                    const allProducts = await getProducts();
                    const productMap = new Map(allProducts.map(p => [p.id, p]));

                    // Kiểm tra từng sản phẩm và xóa những sản phẩm không thuộc NCC mới
                    setProducts((prevProducts) => {
                        const productsToRemove: ProductItem[] = [];
                        const productsToKeep: ProductItem[] = [];

                        prevProducts.forEach((item) => {
                            const product = productMap.get(item.productId);
                            if (!product) {
                                // Nếu không tìm thấy sản phẩm trong danh sách mới, giữ lại
                                productsToKeep.push(item);
                                return;
                            }

                            // Kiểm tra sản phẩm có thuộc NCC mới không
                            const hasMainSupplier = product.supplierId === newSupplierId;
                            const hasInSupplierIds = product.supplierIds && product.supplierIds.includes(newSupplierId);

                            if (hasMainSupplier || hasInSupplierIds) {
                                // Cập nhật thông tin supplier và giữ lại
                                productsToKeep.push({
                                    ...item,
                                    supplierId: product.supplierId,
                                    supplierIds: product.supplierIds,
                                });
                            } else {
                                // Sản phẩm không thuộc NCC mới, xóa
                                productsToRemove.push(item);
                            }
                        });

                        // Hiển thị thông báo nếu có sản phẩm bị xóa
                        if (productsToRemove.length > 0) {
                            const removedNames = productsToRemove.map(p => p.name).join(', ');
                            setTimeout(() => {
                                setError(`Đã xóa ${productsToRemove.length} sản phẩm không thuộc NCC mới: ${removedNames}`);
                                setTimeout(() => setError(null), 5000);
                            }, 100);
                        }

                        return productsToKeep;
                    });
                } catch (e) {
                    console.error('Lỗi khi kiểm tra sản phẩm:', e);
                    // Nếu có lỗi, vẫn cho phép đổi NCC
                }
            })();
        }

        setSelectedSupplierId(newSupplierId);

        if (sp) {
            setSupplierPhone(sp.phone ?? '');
            setSupplierAddress(sp.address ?? '');
            setSupplierSearchTerm(`${sp.name} ${sp.type ? `(${sp.type})` : ''}`);
        }

        setShowSupplierDropdown(false);
        setProductList([]);
    };

    // Tính số lượng có thể nhập thêm cho một sản phẩm
    const getRemainingQuantity = (item: ProductItem): string => {
        const storeId = (item.storeId !== '' && item.storeId !== null && item.storeId !== undefined)
            ? (typeof item.storeId === 'number' ? item.storeId : Number(item.storeId))
            : null;

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
        const currentQtyNum = parseNumber(item.quantity);
        const remaining = maxCanImport - currentQtyNum;

        if (remaining < 0) {
            return `Vượt quá ${Math.abs(remaining).toLocaleString('vi-VN')} sản phẩm`;
        }

        if (remaining === 0) {
            return 'Đã đạt giới hạn tối đa';
        }

        return `Có thể nhập thêm: ${remaining.toLocaleString('vi-VN')} sản phẩm`;
    };

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
        value: string | number | '',
    ) => {
        setProducts((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                const updated: ProductItem = { ...p, [field]: value } as ProductItem;

                // Nếu thay đổi storeId, cập nhật availableQuantity
                if (field === 'storeId') {
                    const storeId = (value === '' || value === null || value === undefined)
                        ? null
                        : (typeof value === 'number' ? value : Number(value));
                    const productStocks = allStocksMap.get(p.productId);
                    if (productStocks && storeId !== null) {
                        const stockInfo = productStocks.get(Number(storeId));
                        updated.availableQuantity = stockInfo?.quantity ?? 0;
                    } else {
                        updated.availableQuantity = 0;
                    }
                }

                // Nếu thay đổi quantity, validate không được vượt quá maxStock
                if (field === 'quantity') {
                    const qty = parseNumber(String(value));
                    const storeId = (p.storeId !== '' && p.storeId !== null && p.storeId !== undefined)
                        ? (typeof p.storeId === 'number' ? p.storeId : Number(p.storeId))
                        : null;

                    if (storeId !== null) {
                        const productStocks = allStocksMap.get(p.productId);
                        if (productStocks) {
                            const stockInfo = productStocks.get(storeId);
                            const currentQty = stockInfo?.quantity ?? 0;
                            const maxStock = stockInfo?.maxStock;

                            // Tính số lượng tối đa có thể nhập
                            if (maxStock !== undefined && maxStock !== null) {
                                const maxCanImport = maxStock - currentQty;

                                // Nếu nhập vượt quá, giới hạn ở mức tối đa
                                if (qty > maxCanImport) {
                                    setError(`Số lượng nhập vượt quá tồn kho tối đa (${maxStock.toLocaleString('vi-VN')}). Tồn kho hiện tại: ${currentQty.toLocaleString('vi-VN')}, số lượng có thể nhập tối đa: ${maxCanImport.toLocaleString('vi-VN')}`);
                                    // Giới hạn ở mức tối đa có thể nhập
                                    updated.quantity = maxCanImport > 0 ? String(maxCanImport) : '0';
                                    return recalcRowTotal(updated);
                                }
                            }
                        }
                    }
                }

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
        const product = products.find((p) => p.id === id);
        if (product && window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}" khỏi danh sách?`)) {
            setProducts((prev) => prev.filter((p) => p.id !== id));
        }
    };

    const openProductModal = async () => {
        if (!selectedSupplierId) {
            setError('Vui lòng chọn nhà cung cấp trước khi thêm sản phẩm');
            return;
        }

        setShowProductModal(true);
        setProductError(null);

        // Không set selectedProductIds từ products - để người dùng chọn lại từ đầu
        setSelectedProductIds([]);

        // Luôn reload sản phẩm để đảm bảo lọc đúng theo NCC hiện tại
        try {
            setLoadingProducts(true);
            // Lấy tất cả sản phẩm (tồn kho sẽ được tính theo kho được chọn trong mỗi dòng)
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
                if (selectedSupplierId) {
                    const supplierIdNum = typeof selectedSupplierId === 'number'
                        ? selectedSupplierId
                        : Number(selectedSupplierId);

                    const hasMainSupplier = product.supplierId === supplierIdNum;
                    const hasInSupplierIds = product.supplierIds && product.supplierIds.includes(supplierIdNum);

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
            const existingProductIds = new Set(products.map((p) => p.productId));
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

        // Kiểm tra NCC đã chọn
        if (!selectedSupplierId) {
            setError('Vui lòng chọn nhà cung cấp trước khi thêm sản phẩm');
            closeProductModal();
            return;
        }

        const supplierIdNum = typeof selectedSupplierId === 'number'
            ? selectedSupplierId
            : Number(selectedSupplierId);

        setProducts((prev) => {
            const existingProductIds = new Set(prev.map((p) => p.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((p) => p.id)) : 0;

            const newRows: ProductItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p) => p.id === pid);
                if (!prod) return;

                // Kiểm tra lại sản phẩm có thuộc NCC đã chọn không
                const hasMainSupplier = prod.supplierId === supplierIdNum;
                const hasInSupplierIds = prod.supplierIds && prod.supplierIds.includes(supplierIdNum);

                if (!hasMainSupplier && !hasInSupplierIds) {
                    console.warn(`Sản phẩm ${prod.name} không thuộc NCC đã chọn, bỏ qua`);
                    return;
                }

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
                    availableQuantity: 0, // Sẽ được cập nhật khi chọn kho
                    storeId: '', // Bắt buộc phải chọn kho cho mỗi dòng
                    supplierId: prod.supplierId ?? null, // Lưu NCC chính
                    supplierIds: prod.supplierIds ?? null, // Lưu danh sách NCC
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

    // Hàm chuyển đổi File sang base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data URL prefix
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Hàm xử lý OCR từ ảnh
    const handleOCRImage = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const file = files[0]; // Chỉ xử lý ảnh đầu tiên
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh');
            e.target.value = '';
            return;
        }

        try {
            setProcessingOCR(true);
            setError(null);
            setSuccess('Đang xử lý ảnh bằng AI...');

            // XÓA DỮ LIỆU CŨ TRƯỚC KHI ĐỌC DỮ LIỆU MỚI
            setProducts([]);
            setSelectedSupplierId('');
            setSupplierSearchTerm('');
            setSupplierPhone('');
            setSupplierAddress('');
            setReason('');
            setSimilarReceipts([]);

            // Convert file sang base64
            const imageBase64 = await fileToBase64(file);

            // Gọi API OCR
            const ocrResult = await ocrReceipt({
                imageBase64,
                receiptType: 'IMPORT',
            });

            // Lưu danh sách phiếu tương tự từ Milvus (nếu có)
            if (ocrResult.similarReceipts && ocrResult.similarReceipts.length > 0) {
                setSimilarReceipts(ocrResult.similarReceipts);
            }

            // Điền thông tin vào form
            if (ocrResult.supplierName) {
                // Tìm supplier theo tên
                const matchedSupplier = suppliers.find(
                    (s) => s.name.toLowerCase().includes(ocrResult.supplierName!.toLowerCase()) ||
                        ocrResult.supplierName!.toLowerCase().includes(s.name.toLowerCase())
                );
                if (matchedSupplier) {
                    setSelectedSupplierId(matchedSupplier.id);
                    setSupplierSearchTerm(matchedSupplier.name);
                    if (ocrResult.supplierPhone) {
                        setSupplierPhone(ocrResult.supplierPhone);
                    }
                    if (ocrResult.supplierAddress) {
                        setSupplierAddress(ocrResult.supplierAddress);
                    }
                } else {
                    // Nếu không tìm thấy supplier, vẫn điền thông tin
                    if (ocrResult.supplierPhone) {
                        setSupplierPhone(ocrResult.supplierPhone);
                    }
                    if (ocrResult.supplierAddress) {
                        setSupplierAddress(ocrResult.supplierAddress);
                    }
                }
            }

            if (ocrResult.note) {
                setReason(ocrResult.note);
            }

            // Điền sản phẩm
            if (ocrResult.products && ocrResult.products.length > 0) {
                const allProducts = await getProducts();
                const productMap = new Map(allProducts.map(p => [p.name.toLowerCase(), p]));
                const productCodeMap = new Map(allProducts.map(p => [p.code?.toLowerCase() || '', p]));

                // Tạo map để match warehouse với stores
                const warehouseMap = new Map<string, number>();
                console.log('🏪 Available stores:', stores.map(s => ({ id: s.id, name: s.name, code: s.code })));
                stores.forEach(store => {
                    // Match theo nhiều format khác nhau
                    const storeDisplayName = `${store.name} (${store.code})`;
                    warehouseMap.set(storeDisplayName.toLowerCase(), store.id);
                    warehouseMap.set(store.name.toLowerCase(), store.id);

                    // Format với số kho và mã
                    warehouseMap.set(`kho ${store.id} (${store.code})`.toLowerCase(), store.id);
                    if (store.name.toLowerCase().includes('kho')) {
                        warehouseMap.set(store.name.toLowerCase(), store.id);
                    }

                    // Format chỉ có số kho
                    const khoNumberMatch = store.name.match(/kho\s*(\d+)/i);
                    if (khoNumberMatch) {
                        const khoNum = khoNumberMatch[1];
                        warehouseMap.set(`kho ${khoNum}`.toLowerCase(), store.id);
                        warehouseMap.set(`kho ${khoNum} (${store.code})`.toLowerCase(), store.id);
                    }

                    // Format với mã code
                    if (store.code) {
                        warehouseMap.set(`(${store.code})`.toLowerCase(), store.id);
                        warehouseMap.set(`kho (${store.code})`.toLowerCase(), store.id);
                    }
                });
                console.log('🗺️ Warehouse map keys:', Array.from(warehouseMap.keys()));

                const newProducts: ProductItem[] = [];
                let nextId = 1;

                for (const extractedProduct of ocrResult.products) {
                    // Tìm sản phẩm trong hệ thống
                    let matchedProduct: Product | undefined;

                    // Tìm theo suggestedProductId trước
                    if (extractedProduct.suggestedProductId) {
                        matchedProduct = allProducts.find(p => p.id === extractedProduct.suggestedProductId);
                    }

                    // Nếu không tìm thấy, tìm theo tên hoặc mã
                    if (!matchedProduct) {
                        matchedProduct = productMap.get(extractedProduct.name.toLowerCase()) ||
                            productCodeMap.get(extractedProduct.code?.toLowerCase() || '');
                    }

                    // Match warehouse từ AI với stores
                    let matchedStoreId: number | '' = '';
                    if (extractedProduct.warehouse) {
                        const warehouseLower = extractedProduct.warehouse.toLowerCase().trim();
                        console.log('🔍 Matching warehouse:', extractedProduct.warehouse, '->', warehouseLower);

                        // Thử match trực tiếp với các format khác nhau
                        const foundStoreId = warehouseMap.get(warehouseLower);
                        if (foundStoreId) {
                            matchedStoreId = foundStoreId;
                            console.log('✅ Matched directly:', foundStoreId);
                        } else {
                            // Nếu không match, thử extract mã từ ngoặc (ưu tiên nhất)
                            const codeMatch = extractedProduct.warehouse.match(/\(([^)]+)\)/);
                            if (codeMatch) {
                                const code = codeMatch[1].trim();
                                console.log('🔍 Trying to match by code:', code);
                                const storeByCode = stores.find(s => s.code === code);
                                if (storeByCode) {
                                    matchedStoreId = storeByCode.id;
                                    console.log('✅ Matched by code:', storeByCode.id, storeByCode.name);
                                }
                            }

                            // Nếu vẫn chưa match, thử match theo số kho (ví dụ: "Kho 3" -> tìm kho có id = 3 hoặc name chứa "3")
                            if (!matchedStoreId) {
                                const numberMatch = warehouseLower.match(/kho\s*(\d+)/);
                                if (numberMatch) {
                                    const khoNumber = numberMatch[1];
                                    console.log('🔍 Trying to match by number:', khoNumber);
                                    // Thử tìm theo id
                                    const storeById = stores.find(s => s.id === Number(khoNumber));
                                    if (storeById) {
                                        matchedStoreId = storeById.id;
                                        console.log('✅ Matched by id:', storeById.id);
                                    } else {
                                        // Thử tìm theo name chứa số
                                        const storeByName = stores.find(s =>
                                            s.name.toLowerCase().includes(khoNumber) ||
                                            s.name.toLowerCase().includes(`kho ${khoNumber}`)
                                        );
                                        if (storeByName) {
                                            matchedStoreId = storeByName.id;
                                            console.log('✅ Matched by name:', storeByName.id, storeByName.name);
                                        }
                                    }
                                }
                            }

                            // Nếu vẫn chưa match, thử match theo tên kho (không có mã)
                            if (!matchedStoreId) {
                                const storeByNameOnly = stores.find(s =>
                                    warehouseLower.includes(s.name.toLowerCase()) ||
                                    s.name.toLowerCase().includes(warehouseLower.replace(/kho\s*/i, '').trim())
                                );
                                if (storeByNameOnly) {
                                    matchedStoreId = storeByNameOnly.id;
                                    console.log('✅ Matched by name only:', storeByNameOnly.id);
                                }
                            }
                        }
                    }

                    // Nếu không match được warehouse từ AI, dùng kho đầu tiên làm mặc định
                    if (!matchedStoreId && stores.length > 0) {
                        matchedStoreId = stores[0].id;
                        console.log('⚠️ Using default store:', matchedStoreId);
                    }

                    console.log('📦 Final matchedStoreId for product:', extractedProduct.name, '->', matchedStoreId);

                    if (matchedProduct) {
                        const newProduct: ProductItem = {
                            id: nextId++,
                            productId: matchedProduct.id,
                            name: matchedProduct.name,
                            code: matchedProduct.code || '',
                            unit: extractedProduct.unit || matchedProduct.unitName || '',
                            price: formatCurrency(extractedProduct.unitPrice || 0),
                            quantity: extractedProduct.quantity.toString(),
                            discount: extractedProduct.discount ? extractedProduct.discount.toString() : '0',
                            total: formatCurrency(extractedProduct.totalPrice || 0),
                            availableQuantity: 0,
                            storeId: matchedStoreId, // Đảm bảo storeId được set
                            supplierId: matchedProduct.supplierId,
                            supplierIds: matchedProduct.supplierIds,
                        };
                        console.log('✅ Created product with storeId:', newProduct.name, '-> storeId:', newProduct.storeId);
                        newProducts.push(newProduct);
                    } else {
                        // Nếu không tìm thấy sản phẩm, vẫn thêm vào với tên từ OCR
                        const newProduct: ProductItem = {
                            id: nextId++,
                            productId: 0, // Sẽ cần chọn sản phẩm sau
                            name: extractedProduct.name,
                            code: extractedProduct.code || '',
                            unit: extractedProduct.unit || '',
                            price: formatCurrency(extractedProduct.unitPrice || 0),
                            quantity: extractedProduct.quantity.toString(),
                            discount: extractedProduct.discount ? extractedProduct.discount.toString() : '0',
                            total: formatCurrency(extractedProduct.totalPrice || 0),
                            availableQuantity: 0,
                            storeId: matchedStoreId, // Đảm bảo storeId được set
                        };
                        console.log('✅ Created product (no match) with storeId:', newProduct.name, '-> storeId:', newProduct.storeId);
                        newProducts.push(newProduct);
                    }
                }

                setProducts(newProducts);
                setSuccess(`Đã đọc ${newProducts.length} sản phẩm từ ảnh. Vui lòng kiểm tra và chỉnh sửa nếu cần.`);
            } else {
                setSuccess('Đã đọc ảnh nhưng không tìm thấy sản phẩm. Vui lòng kiểm tra lại ảnh.');
            }

            // KHÔNG thêm ảnh vào attachmentImages khi upload qua OCR (ẩn preview)
            // const uploadedUrl = await uploadProductImage(file);
            // setAttachmentImages((prev) => [...prev, uploadedUrl]);

        } catch (err) {
            console.error('OCR error:', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể đọc ảnh. Vui lòng thử lại.',
            );
        } finally {
            setProcessingOCR(false);
            e.target.value = '';
        }
    };

    const handleSave = async () => {
        try {
            setError(null);
            setSuccess(null);

            if (!selectedSupplierId) {
                setError('Vui lòng chọn nguồn hàng');
                return;
            }

            if (products.length === 0) {
                setError('Vui lòng thêm ít nhất 1 hàng hóa');
                return;
            }

            const items = products
                .filter((p) => parseNumber(p.quantity) > 0 && parseNumber(p.price) > 0)
                .map((p) => {
                    // Xác định storeId: bắt buộc phải có từ dòng
                    if (p.storeId === '' || p.storeId === null || p.storeId === undefined) {
                        throw new Error(`Sản phẩm "${p.name}" chưa chọn kho nhập`);
                    }
                    const finalStoreId = typeof p.storeId === 'number' ? p.storeId : Number(p.storeId);

                    return {
                        productId: p.productId,
                        storeId: finalStoreId, // Có thể là number hoặc undefined
                        quantity: parseNumber(p.quantity),
                        unitPrice: parseNumber(p.price),
                        discountPercent: parseNumber(p.discount) > 0 ? parseNumber(p.discount) : undefined,
                    };
                });

            if (items.length === 0) {
                setError('Vui lòng nhập ít nhất 1 hàng hóa có số lượng > 0');
                return;
            }

            // Lấy storeId từ item đầu tiên làm storeId mặc định cho header
            const defaultStoreId = items[0]?.storeId || stores[0]?.id;
            if (!defaultStoreId) {
                setError('Vui lòng chọn kho nhập cho ít nhất một sản phẩm');
                return;
            }

            const payload: UnifiedImportCreateRequest = {
                storeId: defaultStoreId,
                supplierId: selectedSupplierId as number,
                note: reason || undefined,
                description: undefined,
                attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
                items,
            };

            setSaving(true);
            const created = await createImport(payload);

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
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
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

                <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                            PHIẾU NHẬP KHO
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
                                <InfoRow label="Nguồn nhập" required>
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
                                                fetchSuppliersAndStores();
                                                setShowSupplierDropdown(true);
                                            }}
                                            disabled={loadingSuppliers}
                                        />
                                        {showSupplierDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                <div
                                                    className="px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        changeSupplier('');
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
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${selectedSupplierId === s.id ? 'bg-blue-100 font-semibold' : ''}`}
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
                                </InfoRow>

                                {/* Hiển thị thông tin NCC khi đã chọn */}
                                {selectedSupplierId && (
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
                                                    {suppliers.find((s) => s.id === selectedSupplierId)?.code ?? '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Loại:</span>
                                                <span className="ml-2 font-medium text-gray-800">
                                                    {suppliers.find((s) => s.id === selectedSupplierId)?.type ?? '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <InfoRow label="Số điện thoại">
                                            <input
                                                type="text"
                                                value={supplierPhone}
                                                onChange={(e) => setSupplierPhone(e.target.value)}
                                                className="w-full px-3 py-2 border border-blue-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                                placeholder="Tự động điền từ hệ thống"
                                            />
                                        </InfoRow>

                                        <InfoRow label="Địa chỉ">
                                            <textarea
                                                value={supplierAddress}
                                                onChange={(e) => setSupplierAddress(e.target.value)}
                                                className="w-full px-3 py-2 border border-blue-200 rounded-md h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm bg-white"
                                                placeholder="Tự động điền từ hệ thống"
                                            />
                                        </InfoRow>
                                    </div>
                                )}
                            </div>

                            {/* Cột phải: Mã phiếu và lý do */}
                            <div className="space-y-4">
                                <InfoRow label="Mã phiếu">
                                    <input
                                        type="text"
                                        value="Tự động tạo"
                                        readOnly
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                                    />
                                </InfoRow>

                                <InfoRow label="Lý do nhập">
                                    <RichTextEditor
                                        value={reason}
                                        onChange={setReason}
                                        placeholder="Nhập lý do nhập kho (tùy chọn)"
                                        height="h-32"
                                    />
                                </InfoRow>
                            </div>
                        </div>
                    </div>



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
                                    {products.map((product, index) => (
                                        <tr key={product.id} className="border-b border-gray-200 h-12 hover:bg-blue-50 transition-colors">
                                            <td className="text-center">{index + 1}</td>
                                            <td className="px-2">{product.name}</td>
                                            <td className="text-center">{product.code}</td>
                                            <td className="text-center">{product.unit}</td>
                                            <td className="px-2">
                                                <select
                                                    value={product.storeId === '' || product.storeId === undefined ? '' : String(product.storeId)}
                                                    onChange={(e) => {
                                                        const value = e.target.value === '' ? '' : Number(e.target.value);
                                                        handleChangeProductField(
                                                            product.id,
                                                            'storeId',
                                                            value,
                                                        );
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
                                                    const storeIdToCheck = (product.storeId !== '' && product.storeId !== null && product.storeId !== undefined)
                                                        ? (typeof product.storeId === 'number' ? product.storeId : Number(product.storeId))
                                                        : null;

                                                    if (!storeIdToCheck) return '-';

                                                    const productStocks = allStocksMap.get(product.productId);
                                                    const stockInfo = productStocks?.get(storeIdToCheck);
                                                    return stockInfo ? stockInfo.quantity.toLocaleString('vi-VN') : 0;
                                                })()}
                                            </td>
                                            <td className="text-right">
                                                <input
                                                    type="text"
                                                    value={product.price}
                                                    readOnly
                                                    className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-right text-gray-700 cursor-not-allowed"
                                                />
                                            </td>
                                            <td className="text-center">
                                                {(() => {
                                                    // Tính max có thể nhập
                                                    const storeIdToCheck = (product.storeId !== '' && product.storeId !== null && product.storeId !== undefined)
                                                        ? (typeof product.storeId === 'number' ? product.storeId : Number(product.storeId))
                                                        : null;

                                                    let maxQuantity = undefined;
                                                    const minQuantity = 10; // Mặc định min = 10
                                                    if (storeIdToCheck !== null) {
                                                        const productStocks = allStocksMap.get(product.productId);
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

                                                    const remainingMsg = getRemainingQuantity(product);
                                                    const hasQuantity = product.quantity && parseNumber(product.quantity) > 0;
                                                    return (
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={maxQuantity}
                                                                value={product.quantity}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    const numValue = parseNumber(value);
                                                                    // Chỉ giới hạn nếu vượt quá max, không tự động thay đổi khi nhỏ hơn min
                                                                    if (maxQuantity !== undefined && numValue > maxQuantity) {
                                                                        handleChangeProductField(
                                                                            product.id,
                                                                            'quantity',
                                                                            String(maxQuantity),
                                                                        );
                                                                    } else {
                                                                        // Cho phép nhập bất kỳ giá trị nào (validation sẽ được thực hiện khi submit)
                                                                        handleChangeProductField(
                                                                            product.id,
                                                                            'quantity',
                                                                            value,
                                                                        );
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    // Khi blur, nếu giá trị < min và > 0, hiển thị cảnh báo nhưng không tự động thay đổi
                                                                    const value = e.target.value;
                                                                    const numValue = parseNumber(value);
                                                                    if (numValue > 0 && numValue < minQuantity) {
                                                                        setError(`Số lượng tối thiểu là ${minQuantity}. Vui lòng nhập lại.`);
                                                                    }
                                                                }}
                                                                className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                                placeholder="0"
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
                                                    value={product.discount}
                                                    onChange={(e) =>
                                                        handleChangeProductField(
                                                            product.id,
                                                            'discount',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </td>
                                            <td className="text-right font-semibold text-gray-800">{product.total}</td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteProduct(product.id)}
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
                                        <td className="text-right px-4 text-lg text-blue-700">{calculateTotal()}</td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Nút thêm hàng từ hệ thống và Đọc ảnh bằng AI */}
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
                        <button
                            type="button"
                            onClick={() => ocrFileInputRef.current?.click()}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-60"
                            disabled={uploadingImages || processingOCR}
                        >
                            {processingOCR ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang xử lý AI...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Đọc ảnh bằng AI
                                </>
                            )}
                        </button>
                    </div>

                    {/* Gợi ý từ các phiếu nhập tương tự (Milvus) */}
                    {similarReceipts.length > 0 && (
                        <div className="border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 rounded-lg shadow-sm mb-6">
                            <h3 className="text-base font-semibold mb-3 text-purple-800 flex items-center gap-2">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs">
                                    AI
                                </span>
                                Gợi ý từ các phiếu nhập tương tự
                            </h3>
                            <p className="text-xs text-gray-600 mb-3">
                                Dựa trên Milvus, hệ thống tìm các phiếu nhập có nội dung gần giống để bạn tham khảo nhanh.
                            </p>
                            <div className="grid gap-3 md:grid-cols-2">
                                {similarReceipts.slice(0, 4).map((s, idx) => (
                                    <div
                                        key={`${s.id ?? idx}-${s.receiptCode ?? ''}-${idx}`}
                                        className="rounded-md border border-purple-100 bg-white px-3 py-2 text-xs shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-semibold text-gray-800">
                                                {s.receiptCode || `Phiếu tương tự #${idx + 1}`}
                                            </div>
                                            {typeof s.score === 'number' && (
                                                <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                                                    Độ tương tự: {s.score.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-0.5 text-gray-600">
                                            {s.supplierName && (
                                                <div>
                                                    <span className="font-medium">Nhà cung cấp:</span> {s.supplierName}
                                                </div>
                                            )}
                                            {s.receiptDate && (
                                                <div>
                                                    <span className="font-medium">Ngày phiếu:</span> {s.receiptDate}
                                                </div>
                                            )}
                                            {typeof s.totalAmount === 'number' && (
                                                <div>
                                                    <span className="font-medium">Tổng tiền:</span>{' '}
                                                    {s.totalAmount.toLocaleString('vi-VN', {
                                                        maximumFractionDigits: 0,
                                                    })}
                                                </div>
                                            )}
                                            {s.noteSummary && (
                                                <div className="text-[11px] text-gray-500">
                                                    <span className="font-medium">Ghi chú:</span> {s.noteSummary}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 rounded-lg shadow-sm mb-6">
                        <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                            <div className="w-1 h-5 bg-blue-600 rounded"></div>
                            Hợp đồng / Ảnh đính kèm
                        </h3>

                        <div className="mb-3 flex gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-60 shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
                                disabled={uploadingImages || processingOCR}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
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
                            <input
                                type="file"
                                accept="image/*"
                                ref={ocrFileInputRef}
                                className="hidden"
                                onChange={handleOCRImage}
                            />
                        </div>

                        <div className="flex gap-4 flex-wrap">
                            {attachmentImages.length === 0 && (
                                <p className="text-gray-600">Chưa có ảnh</p>
                            )}

                            {attachmentImages.map((url, idx) => (
                                <div
                                    key={idx}
                                    className="w-[180px] h-[240px] bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden group"
                                >
                                    {url && buildImageUrl(url) && (
                                        <img
                                            src={buildImageUrl(url)!}
                                            alt={`Ảnh ${idx + 1}`}
                                            className="w-full h-full object-contain"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(url)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 text-sm flex items-center justify-center hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button
                            className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                            onClick={() =>
                                router.push('/dashboard/products/import/import-receipts')
                            }
                        >
                            Hủy
                        </button>
                        <button
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Lưu
                                </>
                            )}
                        </button>
                    </div>
                </div>

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
                                ) : (() => {
                                    // Lọc sản phẩm theo NCC đã chọn và search term
                                    const filteredProducts = productList.filter((product) => {
                                        // Lọc theo NCC đã chọn
                                        if (selectedSupplierId) {
                                            const supplierIdNum = typeof selectedSupplierId === 'number'
                                                ? selectedSupplierId
                                                : Number(selectedSupplierId);

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
                                    const existingProductIds = new Set(products.map((p) => p.productId));
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
