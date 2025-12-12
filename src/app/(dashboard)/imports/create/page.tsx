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


import {
    createImport,
    type UnifiedImportCreateRequest,
} from '@/services/inventory.service';

import {
    getProducts,
    uploadProductImage,
} from '@/services/product.service';
import type { Product } from '@/types/product';

import { useAllStocks } from '@/hooks/useAllStocks';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStores } from '@/hooks/useStores';

import { buildImageUrl, formatPrice, parseNumber } from '@/lib/utils';
import { ocrReceipt } from '@/services/ai.service';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

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

// Sử dụng formatPrice và parseNumber từ utils.ts

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
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.IMPORT_CREATE);

    // Redirect nếu không có quyền
    useEffect(() => {
        if (!userLoading && !canCreate) {
            alert('Bạn không có quyền tạo phiếu nhập kho');
            router.push('/imports');
        }
    }, [userLoading, canCreate, router]);

    // Load suppliers và stores với React Query cache
    const { data: suppliers = [], isLoading: loadingSuppliers } = useSuppliers();
    const { data: stores = [] } = useStores();

    const [selectedSupplierId, setSelectedSupplierId] = useState<number | ''>('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

    const [reason, setReason] = useState('');

    const [products, setProducts] = useState<ProductItem[]>([]);
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

    // Load stocks với React Query cache
    const { data: allStocks = [], isLoading: stocksLoading } = useAllStocks();

    // Tạo map stocks từ cached data
    useEffect(() => {
        if (allStocks.length === 0) return;

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
    }, [allStocks]);

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
            total: total > 0 ? formatPrice(total) : '',
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
        return formatPrice(sum);
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
                    price: formatPrice(prod.unitPrice ?? 0),
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

            // Tính lại total cho các sản phẩm đã có quantity
            const updatedRows = newRows.map(row => {
                if (row.quantity && parseNumber(row.quantity) > 0) {
                    return recalcRowTotal(row);
                }
                return row;
            });

            return [...prev, ...updatedRows];
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

            // Convert file sang base64
            const imageBase64 = await fileToBase64(file);

            // Gọi API OCR
            const ocrResult = await ocrReceipt({
                imageBase64,
                receiptType: 'IMPORT',
            });

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
                // Debug: Available stores (commented for production)
                // console.log('🏪 Available stores:', stores.map(s => ({ id: s.id, name: s.name, code: s.code })));
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
                // Debug: Warehouse map keys (commented for production)
                // console.log('🗺️ Warehouse map keys:', Array.from(warehouseMap.keys()));

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
                        // Debug: Matching warehouse (commented for production)
                        // console.log('🔍 Matching warehouse:', extractedProduct.warehouse, '->', warehouseLower);

                        // Thử match trực tiếp với các format khác nhau
                        const foundStoreId = warehouseMap.get(warehouseLower);
                        if (foundStoreId) {
                            matchedStoreId = foundStoreId;
                            // Debug: Matched directly (commented for production)
                            // console.log('✅ Matched directly:', foundStoreId);
                        } else {
                            // Nếu không match, thử extract mã từ ngoặc (ưu tiên nhất)
                            const codeMatch = extractedProduct.warehouse.match(/\(([^)]+)\)/);
                            if (codeMatch) {
                                const code = codeMatch[1].trim();
                                // Debug: Trying to match by code (commented for production)
                                // console.log('🔍 Trying to match by code:', code);
                                const storeByCode = stores.find(s => s.code === code);
                                if (storeByCode) {
                                    matchedStoreId = storeByCode.id;
                                    // Debug: Matched by code (commented for production)
                                    // console.log('✅ Matched by code:', storeByCode.id, storeByCode.name);
                                }
                            }

                            // Nếu vẫn chưa match, thử match theo số kho (ví dụ: "Kho 3" -> tìm kho có id = 3 hoặc name chứa "3")
                            if (!matchedStoreId) {
                                const numberMatch = warehouseLower.match(/kho\s*(\d+)/);
                                if (numberMatch) {
                                    const khoNumber = numberMatch[1];
                                    // Debug: Trying to match by number (commented for production)
                                    // console.log('🔍 Trying to match by number:', khoNumber);
                                    // Thử tìm theo id
                                    const storeById = stores.find(s => s.id === Number(khoNumber));
                                    if (storeById) {
                                        matchedStoreId = storeById.id;
                                        // Debug: Matched by id (commented for production)
                                        // console.log('✅ Matched by id:', storeById.id);
                                    } else {
                                        // Thử tìm theo name chứa số
                                        const storeByName = stores.find(s =>
                                            s.name.toLowerCase().includes(khoNumber) ||
                                            s.name.toLowerCase().includes(`kho ${khoNumber}`)
                                        );
                                        if (storeByName) {
                                            matchedStoreId = storeByName.id;
                                            // Debug: Matched by name (commented for production)
                                            // console.log('✅ Matched by name:', storeByName.id, storeByName.name);
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
                                    // Debug: Matched by name only (commented for production)
                                    // console.log('✅ Matched by name only:', storeByNameOnly.id);
                                }
                            }
                        }
                    }

                    // Nếu không match được warehouse từ AI, dùng kho đầu tiên làm mặc định
                    if (!matchedStoreId && stores.length > 0) {
                        matchedStoreId = stores[0].id;
                        // Debug: Using default store (commented for production)
                        // console.log('⚠️ Using default store:', matchedStoreId);
                    }

                    // Debug: Final matchedStoreId (commented for production)
                    // console.log('📦 Final matchedStoreId for product:', extractedProduct.name, '->', matchedStoreId);

                    if (matchedProduct) {
                        const newProduct: ProductItem = {
                            id: nextId++,
                            productId: matchedProduct.id,
                            name: matchedProduct.name,
                            code: matchedProduct.code || '',
                            unit: extractedProduct.unit || matchedProduct.unitName || '',
                            price: formatPrice(extractedProduct.unitPrice || 0),
                            quantity: extractedProduct.quantity.toString(),
                            discount: extractedProduct.discount ? extractedProduct.discount.toString() : '0',
                            total: formatPrice(extractedProduct.totalPrice || 0),
                            availableQuantity: 0,
                            storeId: matchedStoreId, // Đảm bảo storeId được set
                            supplierId: matchedProduct.supplierId,
                            supplierIds: matchedProduct.supplierIds,
                        };
                        // Debug: Created product with storeId (commented for production)
                        // console.log('✅ Created product with storeId:', newProduct.name, '-> storeId:', newProduct.storeId);
                        newProducts.push(newProduct);
                    } else {
                        // Nếu không tìm thấy sản phẩm, vẫn thêm vào với tên từ OCR
                        const newProduct: ProductItem = {
                            id: nextId++,
                            productId: 0, // Sẽ cần chọn sản phẩm sau
                            name: extractedProduct.name,
                            code: extractedProduct.code || '',
                            unit: extractedProduct.unit || '',
                            price: formatPrice(extractedProduct.unitPrice || 0),
                            quantity: extractedProduct.quantity.toString(),
                            discount: extractedProduct.discount ? extractedProduct.discount.toString() : '0',
                            total: formatPrice(extractedProduct.totalPrice || 0),
                            availableQuantity: 0,
                            storeId: matchedStoreId, // Đảm bảo storeId được set
                        };
                        // Debug: Created product (no match) with storeId (commented for production)
                        // console.log('✅ Created product (no match) with storeId:', newProduct.name, '-> storeId:', newProduct.storeId);
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
                router.push('/imports');
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
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Tạo phiếu nhập kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Tạo phiếu nhập kho mới</p>
            </div>

                {/* Thông báo ở ngoài container chính để không bị che */}
                {(error || success) && (
                    <div className="mb-4">
                        {error && (
                            <div className="text-sm text-red-500 whitespace-pre-line bg-red-50 border border-red-200 rounded-lg px-4 py-3 shadow-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="text-sm text-green-500 bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-sm">
                                {success}
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                                PHIẾU NHẬP KHO
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
                                                onFocus={() => setShowSupplierDropdown(true)}
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
                                                    disabled={true}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                    placeholder="Tự động điền từ hệ thống"
                                                />
                                            </InfoRow>

                                            <InfoRow label="Địa chỉ">
                                                <textarea
                                                    value={supplierAddress}
                                                    onChange={(e) => setSupplierAddress(e.target.value)}
                                                    disabled={true}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-md h-16 resize-none bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
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
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Nhập lý do nhập kho (tùy chọn)"
                                        />
                                    </InfoRow>
                                </div>
                            </div>
                        </div>



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
                                        <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
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
                                className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Thêm hàng từ hệ thống
                            </button>
                            <button
                                type="button"
                                onClick={() => ocrFileInputRef.current?.click()}
                                className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2 disabled:opacity-60"
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

                        <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 rounded-lg shadow-sm mb-6">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                Hợp đồng / Ảnh đính kèm
                            </h3>

                            <div className="mb-3 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-5 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg disabled:opacity-60 shadow-sm transition-colors font-medium flex items-center gap-2"
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
                                    router.push('/imports')
                                }
                            >
                                Hủy
                            </button>
                            <button
                                className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                                        className="w-full px-3 py-2 border border-blue-gray-300 rounded-lg text-sm bg-white placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto p-6">
                                    {loadingProducts || stocksLoading ? (
                                        <div className="text-center py-8 text-blue-gray-400">Đang tải...</div>
                                    ) : productError ? (
                                        <div className="text-center py-8 text-red-400">{productError}</div>
                                    ) : productList.length === 0 ? (
                                        <div className="text-center py-8 text-blue-gray-400">Không có sản phẩm nào</div>
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
                                                <div className="text-center py-8 text-blue-gray-400">
                                                    Không có sản phẩm phù hợp với từ khóa hiện tại
                                                </div>
                                            );
                                        }

                                        // Tính toán sản phẩm có thể chọn và trạng thái "chọn tất cả"
                                        const existingProductIds = new Set(products.map((p) => p.productId));
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
        </>
    );
}
