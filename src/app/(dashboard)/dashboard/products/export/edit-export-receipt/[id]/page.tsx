/* eslint-disable @next/next/no-img-element */
'use client';

import {
    useEffect,
    useState,
    useRef,
    useMemo,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import { useRouter, useParams } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';

import { getCustomers, updateCustomer, type Customer } from '@/services/customer.service';
import { getProducts, getProduct, uploadProductImage } from '@/services/product.service';
import type { Product } from '@/types/product';
import { getAllStock } from '@/services/stock.service';
import { getStores, type Store } from '@/services/store.service';

import {
    getExportById,
    updateExport,
    type UnifiedExportCreateRequest,
    type SupplierExportDetail,
} from '@/services/inventory.service';

import { buildImageUrl } from '@/lib/utils';
import RichTextEditor from '@/components/common/RichTextEditor';

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
    availableQuantity: number;
}

export default function EditExportReceiptPage() {
    const router = useRouter();
    const params = useParams();
    const exportId = Number(
        Array.isArray(params?.id) ? params.id[0] : params?.id,
    );

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<ProductItem[]>([]);

    const [customerId, setCustomerId] = useState<number | ''>('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement | null>(null);

    const [reason, setReason] = useState('');
    const [attachmentImages, setAttachmentImages] = useState<string[]>([]);

    const fileRef = useRef<HTMLInputElement | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    type ProductWithStock = Product & { quantity?: number; unit?: string | null };

    const [productList, setProductList] = useState<ProductWithStock[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>>(new Map());
    const [stores, setStores] = useState<Store[]>([]);

    // Load receipt và stocks trước (quan trọng)
    useEffect(() => {
        if (!exportId) return;

        (async () => {
            try {
                setLoading(true);
                const [receipt, allStocks, storeList] = await Promise.all([
                    getExportById(exportId),
                    getAllStock().catch(() => []),
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

                setCustomerId(receipt.customerId ?? '');
                setReason(receipt.note ?? '');
                setAttachmentImages(receipt.attachmentImages ?? []);

                const rawItems = receipt.items ?? [];

                const mapped: ProductItem[] = await Promise.all(
                    rawItems.map(async (it: SupplierExportDetail, idx) => {
                        let code = '';
                        let name = '';
                        let unit = 'Cái';
                        let availableQuantity = 0;

                        if (it.productCode && it.productName) {
                            code = it.productCode;
                            name = it.productName;
                            unit = it.unit || it.unitName || 'Cái';
                        }

                        if (it.productId) {
                            try {
                                const product = await getProduct(it.productId);
                                if (!code) code = product.code;
                                if (!name) name = product.name;

                                // Tính tổng tồn kho từ tất cả kho
                                const productStocks = stocksMap.get(it.productId);
                                if (productStocks) {
                                    let totalStock = 0;
                                    productStocks.forEach((stockInfo) => {
                                        totalStock += stockInfo.quantity ?? 0;
                                    });
                                    availableQuantity = totalStock;
                                } else {
                                    availableQuantity = product.quantity ?? 0;
                                }
                            } catch (err) {
                                console.error('Failed to fetch product:', it.productId, err);
                            }
                        }

                        // Backend đã trả về unitPrice là giá gốc (chưa trừ chiết khấu)
                        const discount = it.discountPercent || 0;
                        const originalPrice = it.unitPrice ?? 0;

                        // Tính thành tiền: giá gốc * số lượng * (100 - discount) / 100
                        const itemTotal = discount > 0
                            ? Math.round(originalPrice * it.quantity * (100 - discount) / 100)
                            : originalPrice * it.quantity;

                        return {
                            rowId: idx + 1,
                            productId: it.productId,
                            code,
                            name,
                            unit,
                            unitPrice: originalPrice, // Giá gốc từ backend
                            quantity: it.quantity,
                            discount: discount,
                            total: itemTotal, // Tính lại thành tiền với chiết khấu
                            availableQuantity,
                        };
                    })
                );

                setItems(mapped);

                // Load customer của receipt nếu có customerId
                if (receipt.customerId) {
                    try {
                        const { getCustomer } = await import('@/services/customer.service');
                        const customer = await getCustomer(receipt.customerId);
                        setCustomers([customer]); // Set customer hiện tại
                        setCustomerPhone(customer.phone ?? receipt.customerPhone ?? '');
                        setCustomerAddress(customer.address ?? receipt.customerAddress ?? '');
                        setCustomerSearchTerm(`${customer.name ?? customer.fullName ?? ''} ${customer.code ? `(${customer.code})` : ''}`);
                    } catch (e) {
                        console.error('Lỗi khi tải customer:', e);
                        // Fallback: dùng thông tin từ receipt
                        setCustomerPhone(receipt.customerPhone ?? '');
                        setCustomerAddress(receipt.customerAddress ?? '');
                        setCustomerSearchTerm(receipt.customerName ?? '');
                    }
                } else {
                    // Fallback: dùng thông tin từ receipt
                    setCustomerPhone(receipt.customerPhone ?? '');
                    setCustomerAddress(receipt.customerAddress ?? '');
                    setCustomerSearchTerm(receipt.customerName ?? '');
                }
            } catch (err) {
                console.error(err);
                setError('Không tải được phiếu xuất');
            } finally {
                setLoading(false);
            }
        })();
    }, [exportId]);

    // Lazy load danh sách customers khi cần (khi mở dropdown)
    const fetchCustomers = async () => {
        if (customers.length > 1) return; // Đã load đủ
        try {
            const customerList = await getCustomers();
            // Merge với customer hiện tại nếu có
            const existingCustomer = customers[0];
            if (existingCustomer) {
                const filtered = customerList.filter(c => c.id !== existingCustomer.id);
                setCustomers([existingCustomer, ...filtered]);
            } else {
                setCustomers(customerList);
            }
        } catch (e) {
            console.error('Lỗi khi tải danh sách customers:', e);
        }
    };

    // Cập nhật availableQuantity cho các sản phẩm đã có khi allStocksMap thay đổi (tổng từ tất cả kho)
    useEffect(() => {
        if (allStocksMap.size === 0) return;

        setItems((prev) =>
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

    // Lọc customers theo search term
    const filteredCustomers = useMemo(() => {
        if (!customerSearchTerm.trim()) return customers;
        const searchLower = customerSearchTerm.toLowerCase();
        return customers.filter((c) => {
            const nameMatch = (c.name ?? c.fullName ?? '').toLowerCase().includes(searchLower);
            const codeMatch = (c.code ?? '').toLowerCase().includes(searchLower);
            const phoneMatch = (c.phone ?? '').includes(searchLower);
            return nameMatch || codeMatch || phoneMatch;
        });
    }, [customers, customerSearchTerm]);

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

    const changeCustomer = (v: string) => {
        if (!v) {
            setCustomerId('');
            setCustomerPhone('');
            setCustomerAddress('');
            setCustomerSearchTerm('');
            return;
        }

        const id = Number(v);
        const customer = customers.find((c) => c.id === id);
        setCustomerId(id);

        if (customer) {
            setCustomerPhone(customer.phone ?? '');
            setCustomerAddress(customer.address ?? '');
            setCustomerSearchTerm(`${customer.name ?? customer.fullName ?? ''} ${customer.code ? `(${customer.code})` : ''}`);
        }

        setShowCustomerDropdown(false);
    };

    const handleUploadImages = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;

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
            prev.map((it) => {
                if (it.rowId !== rowId) return it;

                // Validate không được vượt quá tổng tồn kho
                if (q > it.availableQuantity) {
                    setError(`Số lượng xuất vượt quá tổng tồn kho (${it.availableQuantity.toLocaleString('vi-VN')}). Số lượng có thể xuất tối đa: ${it.availableQuantity.toLocaleString('vi-VN')}`);
                    return { ...it, quantity: it.availableQuantity, total: calculateTotal(it.unitPrice, it.availableQuantity, it.discount) };
                }

                return { ...it, quantity: q, total: calculateTotal(it.unitPrice, q, it.discount) };
            }),
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
        setSelectedProductIds([]); // Không pre-select

        // Luôn reload sản phẩm
        try {
            setLoadingProducts(true);
            const list = await getProducts();
            setProductList(list as ProductWithStock[]);
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
        // Lọc sản phẩm có thể chọn (không bao gồm sản phẩm đã có trong phiếu và tồn kho = 0)
        const existingProductIds = new Set(items.map((p) => p.productId));
        const availableProducts = productList.filter((p) => {
            // Chỉ hiển thị sản phẩm có tổng tồn kho > 0
            const productStocks = allStocksMap.get(p.id);
            let totalStock = 0;
            if (productStocks) {
                productStocks.forEach((stockInfo) => {
                    totalStock += stockInfo.quantity ?? 0;
                });
            } else {
                totalStock = p.quantity ?? 0;
            }
            if (totalStock <= 0) return false;

            // Không bao gồm sản phẩm đã có trong phiếu
            if (existingProductIds.has(p.id)) return false;

            // Lọc theo search term
            if (!productSearchTerm.trim()) return true;
            const searchLower = productSearchTerm.toLowerCase();
            const matchesSearch = p.name?.toLowerCase().includes(searchLower) ||
                p.code?.toLowerCase().includes(searchLower);
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

        setItems((prev) => {
            const existingProductIds = new Set(prev.map((p) => p.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((p) => p.rowId)) : 0;

            const newRows: ProductItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p) => p.id === pid);
                if (!prod) return;

                // Tính tổng tồn kho từ tất cả kho
                const productStocks = allStocksMap.get(prod.id);
                let totalStock = 0;
                if (productStocks) {
                    productStocks.forEach((stockInfo) => {
                        totalStock += stockInfo.quantity ?? 0;
                    });
                } else {
                    totalStock = prod.quantity ?? 0;
                }

                // Chỉ thêm sản phẩm có tồn kho > 0
                if (totalStock <= 0) return;

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
                    availableQuantity: totalStock,
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (items.length === 0) {
            setError('Vui lòng thêm ít nhất 1 sản phẩm');
            return;
        }

        // Xác định customerName từ customer được chọn hoặc từ search term
        const selectedCustomer = customerId ? customers.find((c) => c.id === customerId) : null;
        const finalCustomerName = selectedCustomer
            ? (selectedCustomer.name ?? selectedCustomer.fullName ?? '')
            : customerSearchTerm.trim();

        if (!finalCustomerName) {
            setError('Vui lòng chọn khách hàng hoặc nhập tên khách hàng');
            return;
        }

        const payload: UnifiedExportCreateRequest = {
            storeId: 1, // TODO: Get from receipt or first item
            customerId: customerId !== '' ? (customerId as number) : undefined,
            customerName: finalCustomerName,
            customerPhone: customerPhone || undefined,
            customerAddress: customerAddress || undefined,
            note: reason || undefined,
            description: undefined,
            attachmentImages: attachmentImages.length > 0 ? attachmentImages : undefined,
            items: items.map((it) => {
                // Gửi giá gốc lên backend, backend sẽ tự tính chiết khấu
                // it.unitPrice đã là giá gốc (tính ngược lại khi load data)
                // Tự động phân bổ lại storeId cho mỗi item (giống create page)
                const qty = it.quantity;
                const basePrice = it.unitPrice;
                const discountPercent = it.discount;

                // Tự động phân bổ từ các kho có hàng
                const productStocks = allStocksMap.get(it.productId);
                const allocatedItems: Array<{ storeId: number; quantity: number }> = [];
                let remainingQty = qty;

                if (productStocks) {
                    // Sắp xếp kho theo storeId
                    const sortedStores = Array.from(productStocks.entries())
                        .filter(([_, stockInfo]) => (stockInfo.quantity ?? 0) > 0)
                        .sort(([a], [b]) => a - b);

                    for (const [storeId, stockInfo] of sortedStores) {
                        if (remainingQty <= 0) break;
                        const available = stockInfo.quantity ?? 0;
                        const qtyToTake = Math.min(remainingQty, available);

                        allocatedItems.push({
                            storeId,
                            quantity: qtyToTake,
                        });

                        remainingQty -= qtyToTake;
                    }
                }

                // Nếu không đủ hàng, dùng storeId đầu tiên (fallback)
                if (allocatedItems.length === 0) {
                    allocatedItems.push({
                        storeId: 1, // Fallback
                        quantity: qty,
                    });
                }

                // Trả về mảng items (mỗi item có storeId riêng)
                return allocatedItems.map(alloc => ({
                    productId: it.productId,
                    quantity: alloc.quantity,
                    unitPrice: Math.round(basePrice), // Giá gốc, không tính chiết khấu ở đây
                    discountPercent,
                    storeId: alloc.storeId,
                }));
            }).flat(), // Flatten array of arrays
        };

        console.log('📤 Payload gửi lên:', JSON.stringify(payload, null, 2));

        try {
            setSaving(true);

            // Nếu có customerId và thông tin khách hàng thay đổi, cập nhật customer
            if (customerId && selectedCustomer) {
                const customerChanged =
                    selectedCustomer.phone !== customerPhone ||
                    selectedCustomer.address !== customerAddress;

                if (customerChanged) {
                    try {
                        await updateCustomer(customerId as number, {
                            name: selectedCustomer.name ?? selectedCustomer.fullName,
                            phone: customerPhone || undefined,
                            address: customerAddress || undefined,
                        });
                    } catch (customerErr) {
                        console.error('Failed to update customer:', customerErr);
                        // Không block việc lưu phiếu xuất nếu cập nhật customer thất bại
                    }
                }
            }

            await updateExport(exportId, payload);
            router.push('/dashboard/products/export/export-receipts');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Lỗi cập nhật');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="ml-[264px] mt-6 text-xl">
                Đang tải...
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Sidebar />

            <main className="ml-[264px] mt-6 p-6 pr-12">
                {error && (
                    <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                        {error}
                    </div>
                )}



                <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                                CẬP NHẬT PHIẾU XUẤT KHO
                            </h2>
                            <button
                                onClick={() => router.back()}
                                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-blue-700 rounded-full"></div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* THÔNG TIN CHUNG */}
                        <div className="border border-gray-300 bg-gradient-to-br from-gray-50 to-white p-6 mb-6 rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                <div className="w-1 h-5 bg-blue-600 rounded"></div>
                                Thông tin chung
                            </h3>

                            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                {/* Cột trái: Khách hàng */}
                                <div className="space-y-4">
                                    <InfoRow label="Khách hàng" required>
                                        <div className="relative" ref={customerDropdownRef}>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                placeholder="Tìm kiếm và chọn khách hàng..."
                                                value={customerSearchTerm}
                                                onChange={(e) => {
                                                    setCustomerSearchTerm(e.target.value);
                                                    setShowCustomerDropdown(true);
                                                }}
                                                onFocus={() => {
                                                    fetchCustomers();
                                                    setShowCustomerDropdown(true);
                                                }}
                                            />
                                            {showCustomerDropdown && (
                                                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                    <div
                                                        className="px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                                                        onClick={() => {
                                                            changeCustomer('');
                                                        }}
                                                    >
                                                        -- Chọn khách hàng --
                                                    </div>
                                                    {filteredCustomers.length === 0 ? (
                                                        <div className="px-3 py-2 text-sm text-gray-500">
                                                            Không tìm thấy
                                                        </div>
                                                    ) : (
                                                        filteredCustomers.map((c) => (
                                                            <div
                                                                key={c.id}
                                                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${customerId === c.id ? 'bg-blue-100 font-semibold' : ''}`}
                                                                onClick={() => changeCustomer(String(c.id))}
                                                            >
                                                                <div className="font-medium">{c.name ?? c.fullName ?? '-'}</div>
                                                                {c.code && (
                                                                    <div className="text-xs text-gray-500">Mã: {c.code}</div>
                                                                )}
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </InfoRow>

                                    {/* Hiển thị thông tin khách hàng khi đã chọn */}
                                    {customerId && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                <span className="font-semibold text-blue-800">Thông tin khách hàng</span>
                                            </div>

                                            <div className="text-sm">
                                                <div>
                                                    <span className="text-gray-600">Mã KH:</span>
                                                    <span className="ml-2 font-medium text-gray-800">
                                                        {customers.find((c) => c.id === customerId)?.code ?? '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <InfoRow label="Số điện thoại">
                                                <input
                                                    type="text"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    className="w-full px-3 py-2 border border-blue-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                                                    placeholder="Tự động điền từ hệ thống"
                                                />
                                            </InfoRow>

                                            <InfoRow label="Địa chỉ">
                                                <textarea
                                                    value={customerAddress}
                                                    onChange={(e) => setCustomerAddress(e.target.value)}
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

                                    <InfoRow label="Lý do xuất">
                                        <RichTextEditor
                                            value={reason}
                                            onChange={setReason}
                                            placeholder="Nhập lý do xuất kho (tùy chọn)"
                                            height="h-32"
                                        />
                                    </InfoRow>
                                </div>
                            </div>
                        </div>



                        {/* BẢNG SẢN PHẨM */}
                        <div className="border border-gray-300 mb-6 overflow-hidden rounded-lg shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white h-12">
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
                                    {items.map((row, idx) => (
                                        <tr key={row.rowId} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                                            <td className="text-center py-3">{idx + 1}</td>
                                            <td className="px-2 py-3">{row.name}</td>
                                            <td className="text-center py-3">{row.code}</td>
                                            <td className="text-center py-3">{row.unit}</td>
                                            <td className="px-2 text-sm py-3">
                                                {(() => {
                                                    const productStocks = allStocksMap.get(row.productId);
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
                                                            {stocksList.map((stock, idx) => (
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
                                            <td className="text-center py-3">{row.availableQuantity.toLocaleString('vi-VN')}</td>
                                            <td className="text-right py-3">
                                                <input
                                                    className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-right text-gray-700 cursor-not-allowed"
                                                    value={row.unitPrice.toLocaleString('vi-VN')}
                                                    readOnly
                                                />
                                            </td>
                                            <td className="text-center relative py-3">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                        value={row.quantity}
                                                        onChange={(e) =>
                                                            changeQty(row.rowId, e.target.value)
                                                        }
                                                    />
                                                    {(() => {
                                                        const qty = row.quantity;
                                                        const totalStock = row.availableQuantity;
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
                                                    className="w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                    value={row.discount}
                                                    onChange={(e) =>
                                                        changeDiscount(row.rowId, e.target.value)
                                                    }
                                                />
                                            </td>
                                            <td className="text-right font-semibold text-gray-800 py-3">
                                                {row.total.toLocaleString('vi-VN')}
                                            </td>
                                            <td className="text-center py-3">
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
                                        <td colSpan={9} className="text-center text-gray-800">
                                            Tổng
                                        </td>
                                        <td className="text-right px-4 text-lg text-blue-700">
                                            {totalAll.toLocaleString('vi-VN')}
                                        </td>
                                        <td />
                                    </tr>
                                </tbody>
                            </table>
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

                        {/* HÌNH ẢNH */}
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

                        {/* NÚT */}
                        <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => router.back()}
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
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Cập nhật
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

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
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
                                        value={productSearchTerm}
                                        onChange={(e) => setProductSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingProducts ? (
                                    <div className="text-center py-8 text-gray-500">Đang tải...</div>
                                ) : productError ? (
                                    <div className="text-center py-8 text-red-600">{productError}</div>
                                ) : productList.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">Không có sản phẩm nào</div>
                                ) : (() => {
                                    // Lọc sản phẩm theo search term (không lọc theo supplier/customer)
                                    const filteredProducts = productList.filter((product) => {
                                        // Chỉ hiển thị sản phẩm có tổng tồn kho > 0
                                        const productStocks = allStocksMap.get(product.id);
                                        let totalStock = 0;
                                        if (productStocks) {
                                            productStocks.forEach((stockInfo) => {
                                                totalStock += stockInfo.quantity ?? 0;
                                            });
                                        } else {
                                            totalStock = product.quantity ?? 0;
                                        }
                                        if (totalStock <= 0) return false;

                                        // Lọc theo search term
                                        if (!productSearchTerm.trim()) return true;
                                        const searchLower = productSearchTerm.toLowerCase();
                                        return (
                                            product.name?.toLowerCase().includes(searchLower) ||
                                            product.code?.toLowerCase().includes(searchLower)
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
                                                                Mã: {product.code} | Tồn: {product.quantity ?? 0}
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
