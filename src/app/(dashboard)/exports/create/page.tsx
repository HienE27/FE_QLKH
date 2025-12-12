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
    createExport,
    searchExportsPaged,
    type UnifiedExportCreateRequest,
    type SupplierExport,
} from '@/services/inventory.service';

import {
    getProducts,
    searchProducts,
    uploadProductImage,
} from '@/services/product.service';
import type { Product } from '@/types/product';
import { useDebounce } from '@/hooks/useDebounce';

import { useAllStocks } from '@/hooks/useAllStocks';
import { useStores } from '@/hooks/useStores';
import { useCustomers } from '@/hooks/useCustomers';
import { buildImageUrl, formatPrice, parseNumber } from '@/lib/utils';
import { createCustomer, type Customer } from '@/services/customer.service';
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
    availableQuantity: number; // Tổng tồn kho từ tất cả kho
    storeId?: number; // StoreId từ AI OCR (nếu có)
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

export default function TaoPhieuXuatKho() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.EXPORT_CREATE);

    // Redirect nếu không có quyền
    useEffect(() => {
        if (!userLoading && !canCreate) {
            alert('Bạn không có quyền tạo phiếu xuất kho');
            router.push('/exports');
        }
    }, [userLoading, canCreate, router]);

    // Load stores và customers với React Query cache
    const { data: stores = [] } = useStores();
    const { data: customers = [], isLoading: loadingCustomers } = useCustomers();

    const [customerMode, setCustomerMode] = useState<'select' | 'new'>('new'); // 'select' = chọn từ danh sách, 'new' = nhập mới
    const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
    const [customerName, setCustomerName] = useState(''); // Tên khách hàng (dùng cho cả 2 mode)
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement | null>(null);
    const [customerLastExportMap, setCustomerLastExportMap] = useState<Map<number, string>>(new Map()); // Map customerId -> lastExportDate

    const [reason, setReason] = useState('');

    const [products, setProducts] = useState<ProductItem[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>>(new Map()); // Map productId -> Map<storeId, {quantity, maxStock, minStock}>
    const [productSearchTerm, setProductSearchTerm] = useState(''); // Tìm kiếm sản phẩm
    const debouncedProductSearchTerm = useDebounce(productSearchTerm, 300);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [productPage, setProductPage] = useState(0);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);
    const productModalScrollRef = useRef<HTMLDivElement | null>(null);

    // ⭐ Gộp tất cả ảnh vào 1 state
    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);
    const [uploadingImages, setUploadingImages] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const ocrFileInputRef = useRef<HTMLInputElement | null>(null);
    const [processingOCR, setProcessingOCR] = useState(false);

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

    useEffect(() => {
        const loadRecentExports = async () => {
            try {
                const exportsPage = await searchExportsPaged({ page: 0, size: 50 });
                const exportMap = new Map<number, string>();
                exportsPage.content.forEach((exp: SupplierExport) => {
                    if (exp.customerId) {
                        const existingDate = exportMap.get(exp.customerId);
                        if (!existingDate || new Date(exp.exportsDate) > new Date(existingDate)) {
                            exportMap.set(exp.customerId, exp.exportsDate);
                        }
                    }
                });
                setCustomerLastExportMap(exportMap);
            } catch (e) {
                console.error('Load recent exports failed', e);
            }
        };

        loadRecentExports();
    }, []);

    // Lọc và sắp xếp customers: sắp xếp theo đã đặt gần đây, sau đó lọc theo search term
    const filteredCustomers = useMemo(() => {
        let filtered = customers;

        // Lọc theo search term nếu có
        if (customerMode === 'select' && customerSearchTerm.trim()) {
            const searchLower = customerSearchTerm.toLowerCase();
            filtered = customers.filter((c) => {
                const nameMatch = (c.name ?? c.fullName ?? '').toLowerCase().includes(searchLower);
                const phoneMatch = (c.phone ?? '').includes(searchLower);
                return nameMatch || phoneMatch;
            });
        }

        // Sắp xếp: khách hàng đã đặt gần đây trước, sau đó đến khách hàng chưa đặt
        return [...filtered].sort((a, b) => {
            const aDate = customerLastExportMap.get(a.id);
            const bDate = customerLastExportMap.get(b.id);

            // Nếu cả 2 đều có ngày đặt, sắp xếp theo ngày mới nhất trước
            if (aDate && bDate) {
                return new Date(bDate).getTime() - new Date(aDate).getTime();
            }

            // Nếu chỉ a có ngày đặt, a đứng trước
            if (aDate && !bDate) {
                return -1;
            }

            // Nếu chỉ b có ngày đặt, b đứng trước
            if (!aDate && bDate) {
                return 1;
            }

            // Nếu cả 2 đều không có ngày đặt, giữ nguyên thứ tự
            return 0;
        });
    }, [customers, customerSearchTerm, customerMode, customerLastExportMap]);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
                setShowCustomerDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Hàm xử lý chọn khách hàng từ danh sách
    const changeCustomer = (v: string) => {
        if (!v) {
            setSelectedCustomerId('');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerSearchTerm('');
            return;
        }

        const newCustomerId = Number(v);
        const customer = customers.find((c) => c.id === newCustomerId);

        setSelectedCustomerId(newCustomerId);

        if (customer) {
            setCustomerName(customer.name ?? customer.fullName ?? '');
            setCustomerPhone(customer.phone ?? '');
            setCustomerAddress(customer.address ?? '');
            setCustomerSearchTerm(customer.name ?? customer.fullName ?? '');
        }

        setShowCustomerDropdown(false);
    };

    // Hàm chuyển đổi giữa chế độ chọn và nhập mới
    const switchCustomerMode = (mode: 'select' | 'new') => {
        setCustomerMode(mode);
        setSelectedCustomerId('');
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setCustomerSearchTerm('');
        setShowCustomerDropdown(false);
    };

    // Hàm tính tổng tồn kho từ tất cả kho cho một sản phẩm
    const calculateTotalStock = (productId: number): number => {
        const productStocks = allStocksMap.get(productId);
        if (!productStocks) return 0;

        let total = 0;
        productStocks.forEach((stockInfo) => {
            total += stockInfo.quantity ?? 0;
        });
        return total;
    };

    // Cập nhật availableQuantity cho các sản phẩm đã có khi allStocksMap thay đổi (tổng từ tất cả kho)
    useEffect(() => {
        if (allStocksMap.size === 0) return;

        setProducts((prev) =>
            prev.map((p) => {
                // Tính tổng tồn kho từ tất cả kho
                const productStocks = allStocksMap.get(p.productId);
                let totalStock = 0;
                if (productStocks) {
                    productStocks.forEach((stockInfo) => {
                        totalStock += stockInfo.quantity ?? 0;
                    });
                }

                if (p.availableQuantity !== totalStock) {
                    return { ...p, availableQuantity: totalStock };
                }
                return p;
            }),
        );
    }, [allStocksMap]);


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

                // Nếu thay đổi quantity, validate không được vượt quá tổng tồn kho từ tất cả kho
                if (field === 'quantity') {
                    const qty = parseNumber(String(value));
                    const totalStock = calculateTotalStock(p.productId);

                    // Nếu xuất vượt quá tổng tồn kho, giới hạn ở mức tổng tồn kho
                    if (qty > totalStock) {
                        setError(`Số lượng xuất vượt quá tổng tồn kho (${totalStock.toLocaleString('vi-VN')}). Số lượng có thể xuất tối đa: ${totalStock.toLocaleString('vi-VN')}`);
                        // Giới hạn ở mức tổng tồn kho
                        updated.quantity = totalStock > 0 ? String(totalStock) : '0';
                        return recalcRowTotal(updated);
                    }
                }

                return recalcRowTotal(updated);
            }),
        );
    };

    const calculateTotal = (list: ProductItem[]) => {
        const sum = list.reduce((acc, item) => {
            const total = parseNumber(item.total);
            return acc + total;
        }, 0);
        return formatPrice(sum);
    };

    const deleteProduct = (id: number) => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
    };

    const loadProductsPage = async (page: number = 0, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMoreProducts(true);
            } else {
            setLoadingProducts(true);
            }
            setProductError(null);

            const result = await searchProducts({
                page,
                size: 20, // Load 20 sản phẩm mỗi lần
                name: debouncedProductSearchTerm || undefined,
            });

            if (append) {
                setProductList((prev) => [...prev, ...result.content]);
            } else {
                setProductList(result.content);
            }

            // Kiểm tra xem còn trang nào không
            setHasMoreProducts(result.number < result.totalPages - 1);
            setProductPage(page);
        } catch (e) {
            console.error(e);
            setProductError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách hàng hóa',
            );
        } finally {
            setLoadingProducts(false);
            setLoadingMoreProducts(false);
        }
    };

    const openProductModal = async () => {
        setShowProductModal(true);
        setProductError(null);
        setSelectedProductIds([]);
        setProductPage(0);
        setHasMoreProducts(true);
        setProductSearchTerm('');
        await loadProductsPage(0, false);
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setSelectedProductIds([]);
        setProductList([]);
        setProductPage(0);
        setHasMoreProducts(true);
        setProductSearchTerm('');
    };

    // Load more products khi scroll đến cuối
    const handleProductModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const scrollBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
        
        if (scrollBottom < 100 && hasMoreProducts && !loadingMoreProducts && !loadingProducts) {
            loadProductsPage(productPage + 1, true);
        }
    };

    // Reload khi search term thay đổi (debounced)
    useEffect(() => {
        if (showProductModal) {
            setProductPage(0);
            setHasMoreProducts(true);
            loadProductsPage(0, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedProductSearchTerm]);

    const toggleSelectProduct = (productId: number) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId],
        );
    };

    // Hàm chọn/bỏ chọn tất cả sản phẩm
    const handleToggleSelectAll = () => {
        // Lọc sản phẩm có thể chọn (không bao gồm sản phẩm đã có trong phiếu và tồn kho = 0)
        const existingProductIds = new Set(products.map((p) => p.productId));
        const availableProducts = productList.filter((p) => {
            // Chỉ hiển thị sản phẩm có tổng tồn kho > 0
            const totalStock = calculateTotalStock(p.id);
            if (totalStock <= 0) return false;

            // Không bao gồm sản phẩm đã có trong phiếu
            if (existingProductIds.has(p.id)) return false;

            // Lọc theo search term
            if (!productSearchTerm.trim()) return true;
            const searchLower = productSearchTerm.toLowerCase();
            const matchesSearch = p.name.toLowerCase().includes(searchLower) ||
                p.code.toLowerCase().includes(searchLower);
            return matchesSearch;
        });

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

        setProducts((prev) => {
            const existingProductIds = new Set(prev.map((p) => p.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((p) => p.id)) : 0;

            const newRows: ProductItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p) => p.id === pid);
                if (!prod) return;

                // Chỉ thêm sản phẩm có tồn kho > 0
                const totalStock = calculateTotalStock(prod.id);
                if (totalStock <= 0) return;

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
                    availableQuantity: totalStock, // Tổng tồn kho từ tất cả kho
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    // ⭐ Upload ảnh (gộp chung)
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

        const file = files[0];
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
            setSelectedCustomerId('');
            setCustomerMode('new');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerSearchTerm('');
            setReason('');

            const imageBase64 = await fileToBase64(file);
            const ocrResult = await ocrReceipt({
                imageBase64,
                receiptType: 'EXPORT',
            });

            // Điền thông tin customer - Match theo tên, địa chỉ và SĐT
            if (ocrResult.customerName) {
                // Tìm customer match tốt nhất (tên + phone + address đều giống)
                let matchedCustomer: Customer | undefined = undefined;
                let bestMatchScore = 0;

                for (const customer of customers) {
                    if (!customer.name) continue;

                    let matchScore = 0;
                    const customerNameLower = customer.name.toLowerCase();
                    const ocrNameLower = ocrResult.customerName.toLowerCase();

                    // Match tên (quan trọng nhất)
                    const nameMatch = customerNameLower === ocrNameLower ||
                        customerNameLower.includes(ocrNameLower) ||
                        ocrNameLower.includes(customerNameLower);
                    if (nameMatch) {
                        matchScore += 3; // Tên match = 3 điểm
                    }

                    // Match phone (nếu có)
                    if (ocrResult.customerPhone && customer.phone) {
                        const phoneMatch = customer.phone.trim() === ocrResult.customerPhone.trim() ||
                            customer.phone.replace(/\s/g, '') === ocrResult.customerPhone.replace(/\s/g, '');
                        if (phoneMatch) {
                            matchScore += 2; // Phone match = 2 điểm
                        }
                    }

                    // Match address (nếu có)
                    if (ocrResult.customerAddress && customer.address) {
                        const addressMatch = customer.address.toLowerCase().trim() === ocrResult.customerAddress.toLowerCase().trim() ||
                            customer.address.toLowerCase().includes(ocrResult.customerAddress.toLowerCase()) ||
                            ocrResult.customerAddress.toLowerCase().includes(customer.address.toLowerCase());
                        if (addressMatch) {
                            matchScore += 1; // Address match = 1 điểm
                        }
                    }

                    // Chỉ chọn customer nếu match tốt (tên + ít nhất 1 trong 2: phone hoặc address)
                    // Hoặc match rất tốt (tên + phone + address)
                    if (matchScore >= 4 && matchScore > bestMatchScore) {
                        matchedCustomer = customer;
                        bestMatchScore = matchScore;
                    }
                }

                if (matchedCustomer && matchedCustomer.name) {
                    // Tìm thấy customer match tốt -> chọn từ danh sách
                    setSelectedCustomerId(matchedCustomer.id);
                    setCustomerMode('select');
                    setCustomerSearchTerm(matchedCustomer.name);
                    // Điền thông tin từ customer đã chọn (ưu tiên thông tin từ hệ thống)
                    setCustomerName(matchedCustomer.name);
                    setCustomerPhone(matchedCustomer.phone || ocrResult.customerPhone || '');
                    setCustomerAddress(matchedCustomer.address || ocrResult.customerAddress || '');
                } else {
                    // Không tìm thấy customer match tốt -> tạo mới
                    setCustomerMode('new');
                    setCustomerName(ocrResult.customerName);
                    setCustomerPhone(ocrResult.customerPhone || '');
                    setCustomerAddress(ocrResult.customerAddress || '');
                }
            } else {
                // Nếu không có customerName từ AI, vẫn điền phone và address nếu có
                if (ocrResult.customerPhone) {
                    setCustomerPhone(ocrResult.customerPhone);
                }
                if (ocrResult.customerAddress) {
                    setCustomerAddress(ocrResult.customerAddress);
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

                const newProducts: ProductItem[] = [];
                let nextId = 1;

                for (const extractedProduct of ocrResult.products) {
                    let matchedProduct: Product | undefined;

                    if (extractedProduct.suggestedProductId) {
                        matchedProduct = allProducts.find(p => p.id === extractedProduct.suggestedProductId);
                    }

                    if (!matchedProduct) {
                        matchedProduct = productMap.get(extractedProduct.name.toLowerCase()) ||
                            productCodeMap.get(extractedProduct.code?.toLowerCase() || '');
                    }

                    // Match warehouse từ AI với stores
                    let matchedStoreId: number | undefined;
                    if (extractedProduct.warehouse) {
                        const warehouseLower = extractedProduct.warehouse.toLowerCase().trim();

                        // Thử match trực tiếp với các format khác nhau
                        matchedStoreId = warehouseMap.get(warehouseLower);

                        // Nếu không match, thử extract mã từ ngoặc (ưu tiên nhất)
                        if (!matchedStoreId) {
                            const codeMatch = extractedProduct.warehouse.match(/\(([^)]+)\)/);
                            if (codeMatch) {
                                const code = codeMatch[1].trim();
                                const storeByCode = stores.find(s => s.code === code);
                                if (storeByCode) {
                                    matchedStoreId = storeByCode.id;
                                }
                            }
                        }

                        // Nếu vẫn chưa match, thử match theo số kho (ví dụ: "Kho 3" -> tìm kho có id = 3 hoặc name chứa "3")
                        if (!matchedStoreId) {
                            const numberMatch = warehouseLower.match(/kho\s*(\d+)/);
                            if (numberMatch) {
                                const khoNumber = numberMatch[1];
                                // Thử tìm theo id
                                const storeById = stores.find(s => s.id === Number(khoNumber));
                                if (storeById) {
                                    matchedStoreId = storeById.id;
                                } else {
                                    // Thử tìm theo name chứa số
                                    const storeByName = stores.find(s =>
                                        s.name.toLowerCase().includes(khoNumber) ||
                                        s.name.toLowerCase().includes(`kho ${khoNumber}`)
                                    );
                                    if (storeByName) {
                                        matchedStoreId = storeByName.id;
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
                            }
                        }
                    }

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
                            availableQuantity: calculateTotalStock(matchedProduct.id), // Tính tổng tồn kho từ tất cả kho
                        };
                        // Lưu storeId để sử dụng khi save (nếu có)
                        if (matchedStoreId) {
                            newProduct.storeId = matchedStoreId;
                        }
                        newProducts.push(newProduct);
                    } else {
                        const newProduct: ProductItem = {
                            id: nextId++,
                            productId: 0,
                            name: extractedProduct.name,
                            code: extractedProduct.code || '',
                            unit: extractedProduct.unit || '',
                            price: formatPrice(extractedProduct.unitPrice || 0),
                            quantity: extractedProduct.quantity.toString(),
                            discount: extractedProduct.discount ? extractedProduct.discount.toString() : '0',
                            total: formatPrice(extractedProduct.totalPrice || 0),
                            availableQuantity: 0, // Sản phẩm không có trong hệ thống nên tồn kho = 0
                        };
                        // Lưu storeId để sử dụng khi save (nếu có)
                        if (matchedStoreId) {
                            newProduct.storeId = matchedStoreId;
                        }
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

    // Hàm tự động phân bổ sản phẩm từ nhiều kho
    const allocateProductsFromStores = (productId: number, quantity: number, basePrice: number, discountPercent: number) => {
        const productStocks = allStocksMap.get(productId);
        if (!productStocks) return [];

        // Lấy danh sách kho có tồn kho > 0, sắp xếp theo storeId
        const storesWithStock: Array<{ storeId: number; quantity: number }> = [];
        productStocks.forEach((stockInfo, storeId) => {
            if ((stockInfo.quantity ?? 0) > 0) {
                storesWithStock.push({ storeId, quantity: stockInfo.quantity ?? 0 });
            }
        });

        // Sắp xếp theo storeId để có thứ tự nhất quán
        storesWithStock.sort((a, b) => a.storeId - b.storeId);

        const items: Array<{ productId: number; quantity: number; unitPrice: number; discountPercent: number; storeId: number }> = [];
        let remainingQty = quantity;

        // Phân bổ từ kho đầu tiên đến kho cuối
        for (const store of storesWithStock) {
            if (remainingQty <= 0) break;

            const qtyToTake = Math.min(remainingQty, store.quantity);
            if (qtyToTake > 0) {
                // Gửi giá gốc lên backend, backend sẽ tự tính chiết khấu
                items.push({
                    productId,
                    quantity: qtyToTake,
                    unitPrice: Math.round(basePrice), // Giá gốc, không tính chiết khấu ở đây
                    discountPercent,
                    storeId: store.storeId,
                });

                remainingQty -= qtyToTake;
            }
        }

        // Nếu còn thiếu, báo lỗi
        if (remainingQty > 0) {
            throw new Error(`Sản phẩm ${productId} không đủ tồn kho. Cần ${quantity}, chỉ có ${quantity - remainingQty}`);
        }

        return items;
    };

    const handleSave = async () => {
        try {
            setError(null);
            setSuccess(null);

            if (products.length === 0) {
                setError('Vui lòng thêm ít nhất 1 hàng hóa');
                return;
            }

            // Validation: Phiếu xuất bắt buộc phải có thông tin khách hàng
            if (!customerName?.trim()) {
                setError('Vui lòng nhập tên khách hàng');
                return;
            }

            // Tự động phân bổ sản phẩm từ nhiều kho
            const items: Array<{ productId: number; quantity: number; unitPrice: number; discountPercent: number; storeId: number }> = [];
            let defaultStoreId: number | null = null;

            for (const p of products) {
                const qty = parseNumber(p.quantity);
                const price = parseNumber(p.price);
                const discountPercent = parseNumber(p.discount);

                if (qty <= 0 || price <= 0) continue;

                const basePrice = price; // Giá gốc (chưa chiết khấu)
                const allocatedItems = allocateProductsFromStores(p.productId, qty, basePrice, discountPercent);

                // Lấy storeId đầu tiên làm default
                if (allocatedItems.length > 0 && defaultStoreId === null) {
                    defaultStoreId = allocatedItems[0].storeId;
                }

                items.push(...allocatedItems);
            }

            if (items.length === 0) {
                setError('Vui lòng nhập ít nhất 1 hàng hóa có số lượng > 0');
                return;
            }

            if (defaultStoreId === null) {
                setError('Không tìm thấy kho xuất');
                return;
            }

            // Xác định customerId: nếu chưa có (nhập mới), tự động tạo khách hàng mới
            let finalCustomerId: number | undefined = selectedCustomerId !== '' ? (selectedCustomerId as number) : undefined;

            // Nếu không có customerId (nhập mới), tạo khách hàng mới
            if (!finalCustomerId && customerName.trim()) {
                try {
                    const newCustomer = await createCustomer({
                        name: customerName.trim(),
                        phone: customerPhone.trim() || undefined,
                        address: customerAddress.trim() || undefined,
                    });
                    finalCustomerId = newCustomer.id;
                    // Cập nhật danh sách customers để lần sau có thể chọn
                    setCustomers((prev) => [...prev, newCustomer]);
                } catch (err) {
                    console.error('Failed to create customer:', err);
                    setError(err instanceof Error ? `Không thể tạo khách hàng: ${err.message}` : 'Không thể tạo khách hàng mới');
                    return;
                }
            }

            const payload: UnifiedExportCreateRequest = {
                storeId: defaultStoreId, // Dùng storeId từ item đầu tiên làm mặc định
                customerId: finalCustomerId,
                customerName: customerName.trim(),
                customerPhone: customerPhone.trim() || undefined,
                customerAddress: customerAddress.trim() || undefined,
                note: reason || undefined,
                description: undefined,
                attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
                items,
            };

            setSaving(true);
            const created = await createExport(payload);

            setSuccess(`Tạo phiếu xuất kho thành công (Mã: ${created.code ?? created.id})`);

            setTimeout(() => {
                router.push('/exports');
            }, 800);
        } catch (e) {
            console.error(e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tạo phiếu xuất kho',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Tạo phiếu xuất kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Tạo phiếu xuất kho mới</p>
            </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 text-sm text-red-500 whitespace-pre-line bg-red-50 border border-red-200 rounded px-4 py-2 relative z-10">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 text-sm text-green-500 bg-green-50 border border-green-200 rounded px-4 py-2 relative z-10">
                                {success}
                            </div>
                        )}

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                                PHIẾU XUẤT KHO
                            </h2>
                            <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
                        </div>

                        <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
                                Thông tin chung
                            </h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {/* Cột trái: Khách hàng */}
                                <div className="space-y-4">
                                    {/* Chọn chế độ */}
                                    <InfoRow label="Khách hàng" required>
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                type="button"
                                                onClick={() => switchCustomerMode('new')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${customerMode === 'new'
                                                    ? 'bg-[#0099FF] text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                Nhập mới
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => switchCustomerMode('select')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${customerMode === 'select'
                                                    ? 'bg-[#0099FF] text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                Chọn từ danh sách
                                            </button>
                                        </div>
                                    </InfoRow>

                                    {/* Mode: Nhập mới */}
                                    {customerMode === 'new' && (
                                        <div className="space-y-3">
                                            <InfoRow label="Tên khách hàng" required>
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Nhập tên khách hàng..."
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                />
                                            </InfoRow>
                                            <InfoRow label="Số điện thoại">
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Nhập số điện thoại..."
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                />
                                            </InfoRow>
                                            <InfoRow label="Địa chỉ">
                                                <textarea
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    placeholder="Nhập địa chỉ..."
                                                    value={customerAddress}
                                                    onChange={(e) => setCustomerAddress(e.target.value)}
                                                />
                                            </InfoRow>
                                        </div>
                                    )}

                                    {/* Mode: Chọn từ danh sách */}
                                    {customerMode === 'select' && (
                                        <>
                                            <InfoRow label="Tìm kiếm khách hàng">
                                                <div className="relative" ref={customerDropdownRef}>
                                                    <input
                                                        type="text"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                        placeholder="Tìm kiếm theo tên hoặc số điện thoại..."
                                                        value={customerSearchTerm}
                                                        onChange={(e) => {
                                                            setCustomerSearchTerm(e.target.value);
                                                            setShowCustomerDropdown(true);
                                                        }}
                                                        onFocus={() => setShowCustomerDropdown(true)}
                                                        disabled={loadingCustomers}
                                                    />
                                                    {showCustomerDropdown && (
                                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                            {filteredCustomers.length === 0 ? (
                                                                <div className="px-3 py-2 text-sm text-gray-500">
                                                                    {customerSearchTerm.trim() ? 'Không tìm thấy' : 'Nhập để tìm kiếm'}
                                                                </div>
                                                            ) : (
                                                                filteredCustomers.map((c) => {
                                                                    const lastExportDate = customerLastExportMap.get(c.id);
                                                                    const hasRecentOrder = !!lastExportDate;
                                                                    return (
                                                                        <div
                                                                            key={c.id}
                                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${selectedCustomerId === c.id ? 'bg-blue-100 font-semibold' : ''}`}
                                                                            onClick={() => changeCustomer(String(c.id))}
                                                                        >
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="font-medium">{c.name ?? c.fullName ?? '-'}</div>
                                                                                {hasRecentOrder && (
                                                                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                                                                        Đã đặt gần đây
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {c.phone && (
                                                                                <div className="text-xs text-gray-500 mt-0.5">SĐT: {c.phone}</div>
                                                                            )}
                                                                            {hasRecentOrder && lastExportDate && (
                                                                                <div className="text-xs text-gray-400 mt-0.5">
                                                                                    Lần cuối: {new Date(lastExportDate).toLocaleDateString('vi-VN')}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </InfoRow>

                                            {/* Hiển thị thông tin khách hàng đã chọn */}
                                            {selectedCustomerId && (
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span className="font-semibold text-blue-800">Thông tin khách hàng</span>
                                                    </div>

                                                    <InfoRow label="Tên khách hàng">
                                                        <input
                                                            type="text"
                                                            value={customerName}
                                                            onChange={(e) => setCustomerName(e.target.value)}
                                                            disabled={true}
                                                            className="w-full px-3 py-2 border border-blue-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        />
                                                    </InfoRow>

                                                    <InfoRow label="Số điện thoại">
                                                        <input
                                                            type="text"
                                                            value={customerPhone}
                                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                                            disabled={true}
                                                            className="w-full px-3 py-2 border border-blue-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        />
                                                    </InfoRow>

                                                    <InfoRow label="Địa chỉ">
                                                        <textarea
                                                            value={customerAddress}
                                                            onChange={(e) => setCustomerAddress(e.target.value)}
                                                            disabled={true}
                                                            className="w-full px-3 py-2 border border-blue-200 rounded-md h-20 resize-none bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        />
                                                    </InfoRow>
                                                </div>
                                            )}
                                        </>
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

                                    <InfoRow label="Lý do xuất">
                                        <textarea
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="Nhập lý do xuất kho (tùy chọn)"
                                        />
                                    </InfoRow>
                                </div>
                            </div>
                        </div>



                        {/* BẢNG SẢN PHẨM */}
                        <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[#0099FF] text-white h-12">
                                            <th className="px-4 w-12 font-semibold">STT</th>
                                            <th className="px-4 w-40 font-semibold">Tên hàng hóa</th>
                                            <th className="px-4 w-28 font-semibold">Mã hàng</th>
                                            <th className="px-4 w-20 font-semibold">ĐVT</th>
                                            <th className="px-4 w-48 font-semibold">Kho hàng</th>
                                            <th className="px-4 w-24 font-semibold">Tồn kho</th>
                                            <th className="px-4 w-28 font-semibold">Đơn giá</th>
                                            <th className="px-4 w-20 font-semibold">SL</th>
                                            <th className="px-4 w-24 font-semibold">Chiết khấu (%)</th>
                                            <th className="px-4 w-28 font-semibold">Thành tiền</th>
                                            <th className="px-4 w-16 font-semibold">Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.map((product, index) => (
                                            <tr key={product.id} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                                                <td className="text-center py-3">{index + 1}</td>
                                                <td className="px-2 py-3">{product.name}</td>
                                                <td className="text-center py-3">{product.code}</td>
                                                <td className="text-center py-3">{product.unit}</td>
                                                <td className="px-2 text-sm py-3">
                                                    {(() => {
                                                        const productStocks = allStocksMap.get(product.productId);
                                                        if (!productStocks || productStocks.size === 0) {
                                                            return <span className="text-gray-400">-</span>;
                                                        }

                                                        // Lấy danh sách kho có tồn kho > 0, sắp xếp theo storeId
                                                        const stocksList: Array<{ storeId: number; quantity: number; storeName: string }> = [];
                                                        productStocks.forEach((stockInfo, storeId) => {
                                                            if ((stockInfo.quantity ?? 0) > 0) {
                                                                const store = stores.find(s => s.id === storeId);
                                                                stocksList.push({
                                                                    storeId,
                                                                    quantity: stockInfo.quantity ?? 0,
                                                                    storeName: store?.name ?? `Kho ${storeId}`
                                                                });
                                                            }
                                                        });

                                                        // Sắp xếp theo storeId
                                                        stocksList.sort((a, b) => a.storeId - b.storeId);

                                                        if (stocksList.length === 0) {
                                                            return <span className="text-gray-400">-</span>;
                                                        }

                                                        return (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {stocksList.map((stock) => (
                                                                    <span
                                                                        key={stock.storeId}
                                                                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700"
                                                                    >
                                                                        <span className="font-medium">{stock.storeName}:</span>
                                                                        <span className="font-semibold">{stock.quantity.toLocaleString('vi-VN')}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="text-center py-3">{product.availableQuantity.toLocaleString('vi-VN')}</td>
                                                <td className="text-right py-3">
                                                    <input
                                                        type="text"
                                                        value={product.price}
                                                        readOnly
                                                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-right text-gray-700 cursor-not-allowed"
                                                    />
                                                </td>
                                                <td className="text-center relative py-3">
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={product.quantity}
                                                            onChange={(e) => handleChangeProductField(product.id, 'quantity', e.target.value)}
                                                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                        />
                                                        {(() => {
                                                            const qty = parseNumber(product.quantity);
                                                            const totalStock = product.availableQuantity;
                                                            const remaining = totalStock - qty;

                                                            if (qty > 0) {
                                                                if (remaining < 0) {
                                                                    return (
                                                                        <div className="absolute left-0 right-0 top-full mt-0.5 text-[10px] text-red-600 font-medium whitespace-nowrap z-30 pointer-events-none">
                                                                            Vượt quá: {Math.abs(remaining).toLocaleString('vi-VN')} sản phẩm
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div className="absolute left-0 right-0 top-full mt-0.5 text-[10px] text-blue-600 font-medium whitespace-nowrap z-30 pointer-events-none">
                                                                        Còn lại: {remaining.toLocaleString('vi-VN')} sản phẩm
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="text-center py-3">
                                                    <input
                                                        type="text"
                                                        value={product.discount}
                                                        onChange={(e) => handleChangeProductField(product.id, 'discount', e.target.value)}
                                                        className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    />
                                                </td>
                                                <td className="text-right font-semibold text-gray-800 py-3">{product.total}</td>
                                                <td className="text-center py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${product.name}" khỏi phiếu xuất này không?`)) {
                                                                deleteProduct(product.id);
                                                            }
                                                        }}
                                                        className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1 rounded hover:bg-red-50"
                                                        title="Xóa sản phẩm"
                                                    >
                                                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="cursor-pointer">
                                                            <path d="M3 6H19M8 6V4C8 3.44772 8.44772 3 9 3H13C13.5523 3 14 3.44772 14 4V6M17 6V18C17 18.5523 16.5523 19 16 19H6C5.44772 19 5 18.5523 5 18V6H17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
                                            <td colSpan={9} className="text-center text-gray-800">Tổng</td>
                                            <td className="text-right px-4 text-lg text-blue-700">{calculateTotal(products)}</td>
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

                        {/* HỢP ĐỒNG / ẢNH ĐÍNH KÈM */}
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

                                {attachmentImages.map((url, index) => (
                                    <div
                                        key={index}
                                        className="w-[180px] h-[240px] bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center justify-center relative overflow-hidden group"
                                    >
                                        {url && buildImageUrl(url) && (
                                            <img
                                                src={buildImageUrl(url)!}
                                                alt={`Ảnh ${index + 1}`}
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

                        {/* NÚT */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                            <button
                                className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                                onClick={() =>
                                    router.push('/exports')
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
                                        className="w-full px-3 py-2 border border-blue-gray-300 rounded-lg text-sm bg-white placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                        />
                                </div>

                                <div 
                                    ref={productModalScrollRef}
                                    className="flex-1 overflow-y-auto p-6"
                                    onScroll={handleProductModalScroll}
                                >
                                    {loadingProducts && productList.length === 0 ? (
                                        // Skeleton loading khi load lần đầu
                                        <div className="space-y-2">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-lg border border-blue-gray-200">
                                                    <div className="w-4 h-4 bg-blue-gray-200 rounded"></div>
                                                    <div className="flex-1">
                                                        <div className="h-4 bg-blue-gray-200 rounded w-3/4 mb-2"></div>
                                                        <div className="h-3 bg-blue-gray-100 rounded w-1/2"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : productError ? (
                                        <div className="text-center py-8 text-red-400">{productError}</div>
                                    ) : productList.length === 0 ? (
                                        <div className="text-center py-8 text-blue-gray-400">Không có sản phẩm nào</div>
                                    ) : (() => {
                                        // Lọc sản phẩm theo search term và chỉ hiển thị sản phẩm có tổng tồn kho > 0
                                        const filteredProducts = productList.filter((product) => {
                                            // Chỉ hiển thị sản phẩm có tổng tồn kho > 0
                                            const totalStock = calculateTotalStock(product.id);
                                            if (totalStock <= 0) return false;

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
                                                        const totalStock = calculateTotalStock(product.id);
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
                                            {/* Loading more indicator */}
                                            {loadingMoreProducts && (
                                                <div className="mt-4 flex justify-center">
                                                    <div className="flex items-center gap-2 text-blue-gray-500">
                                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        <span className="text-sm">Đang tải thêm...</span>
                                                    </div>
                                                </div>
                                            )}
                                            {/* Load more button (fallback nếu scroll không hoạt động) */}
                                            {hasMoreProducts && !loadingMoreProducts && productList.length > 0 && (
                                                <div className="mt-4 flex justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => loadProductsPage(productPage + 1, true)}
                                                        className="px-4 py-2 text-sm text-[#0099FF] hover:text-[#0088EE] border border-[#0099FF] rounded-lg hover:bg-blue-50 transition-colors"
                                                    >
                                                        Tải thêm sản phẩm
                                                    </button>
                                                </div>
                                            )}
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
