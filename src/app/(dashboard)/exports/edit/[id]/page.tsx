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

import { updateCustomer, type Customer } from '@/services/customer.service';
import { getProduct, uploadProductImage } from '@/services/product.service';
import type { Product } from '@/types/product';
import { useAllStocks } from '@/hooks/useAllStocks';
import { useStores } from '@/hooks/useStores';
import { useCustomers } from '@/hooks/useCustomers';
import { useProducts } from '@/hooks/useProducts';

import {
    getExportById,
    updateExport,
    type UnifiedExportCreateRequest,
    type SupplierExportDetail,
} from '@/services/inventory.service';

import { buildImageUrl } from '@/lib/utils';

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

    // Load stores, customers, products với React Query cache
    const { data: stores = [] } = useStores();
    const { data: customers = [] } = useCustomers();
    const { data: productList = [] } = useProducts();

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
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [allStocksMap, setAllStocksMap] = useState<Map<number, Map<number, { quantity: number; maxStock?: number; minStock?: number }>>>(new Map());

    // Load stocks với React Query cache
    const { data: allStocks = [], isLoading: stocksLoading } = useAllStocks();

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
        if (!exportId || customers.length === 0) return;

        (async () => {
            try {
                const receipt = await getExportById(exportId);

                setCustomerId(receipt.customerId ?? '');

                const selectedCustomer = receipt.customerId ? customers.find((c) => c.id === receipt.customerId) : null;
                if (selectedCustomer) {
                    setCustomerPhone(selectedCustomer.phone ?? receipt.customerPhone ?? '');
                    setCustomerAddress(selectedCustomer.address ?? receipt.customerAddress ?? '');
                    setCustomerSearchTerm(`${selectedCustomer.name ?? selectedCustomer.fullName ?? ''} ${selectedCustomer.code ? `(${selectedCustomer.code})` : ''}`);
                } else {
                    // Fallback: dùng thông tin từ receipt nếu không tìm thấy customer
                    setCustomerPhone(receipt.customerPhone ?? '');
                    setCustomerAddress(receipt.customerAddress ?? '');
                    setCustomerSearchTerm(receipt.customerName ?? '');
                }

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

                                // Tính tổng tồn kho từ tất cả kho (nếu allStocksMap đã có data)
                                const productStocks = allStocksMap.get(it.productId);
                                if (productStocks && productStocks.size > 0) {
                                    let totalStock = 0;
                                    productStocks.forEach((stockInfo) => {
                                        totalStock += stockInfo.quantity ?? 0;
                                    });
                                    availableQuantity = totalStock;
                                } else {
                                    // Fallback: dùng quantity từ product nếu allStocksMap chưa có data
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
            } catch (err) {
                console.error(err);
                setError('Không tải được phiếu xuất');
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportId, allStocksMap]);

    // Cập nhật availableQuantity cho các sản phẩm đã có khi allStocksMap thay đổi (tổng từ tất cả kho)
    useEffect(() => {
        if (allStocksMap.size === 0 || items.length === 0) return;

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

                // Luôn cập nhật để đảm bảo giá trị đúng
                return { ...p, availableQuantity: totalStock };
            }),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // const changePrice = (rowId: number, v: string) => {
    //     const p = Number(v.replace(/[^\d]/g, '')) || 0;
    //     setItems((prev) =>
    //         prev.map((it) =>
    //             it.rowId === rowId
    //                 ? { ...it, unitPrice: p, total: calculateTotal(p, it.quantity, it.discount) }
    //                 : it,
    //         ),
    //     );
    // };

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
                        .filter(([, stockInfo]) => (stockInfo.quantity ?? 0) > 0)
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

        // Debug: Payload gửi lên (commented for production)
        // console.log('📤 Payload gửi lên:', JSON.stringify(payload, null, 2));

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
            router.push('/exports');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Lỗi cập nhật');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
                <p className="text-xl text-blue-gray-600">Đang tải...</p>
            </div>
        );
    }

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa phiếu xuất kho</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin phiếu xuất kho</p>
            </div>

                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded px-4 py-2">
                                {error}
                            </div>
                        )}

                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-2xl font-bold text-blue-gray-800">
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
                            <div className="h-1 w-24 bg-[#0099FF] rounded-full"></div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* THÔNG TIN CHUNG */}
                            <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg shadow-sm">
                                <h3 className="text-lg font-semibold mb-5 text-gray-800 flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[#0099FF] rounded"></div>
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
                                                    onFocus={() => setShowCustomerDropdown(true)}
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
                                                        disabled={true}
                                                        className="w-full px-3 py-2 border border-blue-200 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed transition-all text-sm"
                                                        placeholder="Tự động điền từ hệ thống"
                                                    />
                                                </InfoRow>

                                                <InfoRow label="Địa chỉ">
                                                    <textarea
                                                        value={customerAddress}
                                                        onChange={(e) => setCustomerAddress(e.target.value)}
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

                                        <tr className="bg-blue-gray-100 font-bold h-12 border-t-2 border-blue-gray-200">
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
                                    className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Thêm hàng từ hệ thống
                                </button>
                            </div>

                            {/* HÌNH ẢNH */}
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
                                    className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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
                                    {loadingProducts || stocksLoading ? (
                                        <div className="text-center py-8 text-blue-gray-400">Đang tải...</div>
                                    ) : productError ? (
                                        <div className="text-center py-8 text-red-400">{productError}</div>
                                    ) : productList.length === 0 ? (
                                        <div className="text-center py-8 text-blue-gray-400">Không có sản phẩm nào</div>
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
                                                    } else {
                                                        totalStock = product.quantity ?? 0;
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
