/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    createInventoryCheck,
    type InventoryCheckCreateRequest,
} from '@/services/inventory.service';
import { getProducts } from '@/services/product.service';
import type { Product } from '@/types/product';
import { getStores, type Store } from '@/services/store.service';
import { getStockByStore, type StockByStore } from '@/services/stock.service';
import { useUser } from '@/hooks/useUser';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { showToast } from '@/lib/toast';
import { formatPrice, parseNumber } from '@/lib/utils';

interface CheckItem {
    id: number;
    productId: number;
    productName: string;
    productCode: string;
    unit: string;
    systemQuantity: string;
    actualQuantity: string;
    differenceQuantity: number;
    unitPrice: string;
    totalValue: number;
    note: string;
}

// Sử dụng formatPrice và parseNumber từ utils.ts

function InfoRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3">
            <label className="w-28 text-sm pt-1 text-blue-gray-800">{label}</label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export default function CreateInventoryCheckPage() {
    const router = useRouter();
    const { user, loading: userLoading } = useUser();
    const userRoles = user?.roles || [];

    // Kiểm tra quyền
    const canCreate = hasPermission(userRoles, PERMISSIONS.INVENTORY_CHECK_CREATE);

    // Redirect nếu không có quyền
    useEffect(() => {
        if (!userLoading && !canCreate) {
            showToast.error('Bạn không có quyền tạo phiếu kiểm kê');
            router.push('/inventory/inventory-checks');
        }
    }, [userLoading, canCreate, router]);

    const [checkDate, setCheckDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [description, setDescription] = useState('');
    const [note, setNote] = useState('');

    const [items, setItems] = useState<CheckItem[]>([]);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [showProductModal, setShowProductModal] = useState(false);
    const [productList, setProductList] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

    // Store selection
    const [stores, setStores] = useState<Store[]>([]);
    const [storeLoading, setStoreLoading] = useState(false);
    const [storeId, setStoreId] = useState<number | ''>('');
    const [storeKeyword, setStoreKeyword] = useState('');
    const [showStoreDropdown, setShowStoreDropdown] = useState(false);
    const storeDropdownRef = useRef<HTMLDivElement | null>(null);
    const [storeStocks, setStoreStocks] = useState<StockByStore[]>([]);
    const [productKeyword, setProductKeyword] = useState('');

    const visibleProducts = useMemo(() => {
        if (!storeId) return [];
        const kw = productKeyword.trim().toLowerCase();
        return productList.filter((product) => {
            // Chỉ hiển thị sản phẩm có trong kho đã chọn và có tồn kho > 0
            const stock = storeStocks.find((s) => s.productId === product.id);
            if (!stock || (stock.quantity ?? 0) <= 0) return false;
            
            // Lọc theo từ khóa tìm kiếm
            if (!kw) return true;
            return (
                product.name.toLowerCase().includes(kw) ||
                product.code.toLowerCase().includes(kw)
            );
        });
    }, [productList, storeStocks, storeId, productKeyword]);

    const recalcRowValues = (item: CheckItem): CheckItem => {
        const systemQty = parseNumber(item.systemQuantity);
        const actualQty = parseNumber(item.actualQuantity);
        const unitPrice = parseNumber(item.unitPrice);

        const difference = actualQty - systemQty;
        const totalValue = difference * unitPrice;

        return {
            ...item,
            differenceQuantity: difference,
            totalValue,
        };
    };

    const handleChangeItemField = (
        id: number,
        field: keyof CheckItem,
        value: string,
    ) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                const updated: CheckItem = { ...item, [field]: value } as CheckItem;
                return recalcRowValues(updated);
            }),
        );
    };

    const calculateTotalDifference = () => {
        const sum = items.reduce((acc, item) => acc + item.totalValue, 0);
        return formatPrice(sum);
    };

    const deleteItem = (id: number) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const openProductModal = async () => {
        setProductError(null);

        if (!storeId) {
            setError('Vui lòng chọn kho kiểm kê trước khi thêm hàng hóa');
            return;
        }

        setShowProductModal(true);

        const idsFromCurrent = items.map((item) => item.productId);
        setSelectedProductIds(idsFromCurrent);

        try {
            setLoadingProducts(true);

            if (productList.length === 0) {
            const list = await getProducts();
            setProductList(list);
            }

            const stocks = await getStockByStore(storeId);
            setStoreStocks(stocks);
        } catch (e) {
            console.error(e);
            setProductError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tải danh sách hàng hóa hoặc tồn kho',
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

        setItems((prev) => {
            const existingProductIds = new Set(prev.map((item) => item.productId));
            let runningRowId = prev.length > 0 ? Math.max(...prev.map((item) => item.id)) : 0;

            const newRows: CheckItem[] = [];

            selectedProductIds.forEach((pid) => {
                if (existingProductIds.has(pid)) return;

                const prod = productList.find((p) => p.id === pid);
                if (!prod) return;

                const stock = storeStocks.find((s) => s.productId === pid);
                const systemQty = stock?.quantity ?? 0;

                runningRowId += 1;

                const row: CheckItem = {
                    id: runningRowId,
                    productId: prod.id,
                    productName: prod.name,
                    productCode: prod.code,
                    unit: 'Cái',
                    systemQuantity: formatPrice(systemQty),
                    actualQuantity: '',
                    differenceQuantity: 0,
                    unitPrice: formatPrice(prod.unitPrice ?? 0),
                    totalValue: 0,
                    note: '',
                };

                newRows.push(row);
            });

            return [...prev, ...newRows];
        });

        closeProductModal();
    };

    const handleToggleSelectAllProducts = () => {
        const visibleIds = visibleProducts.map((p) => p.id);
        if (visibleIds.length === 0) return;

        const allSelected = visibleIds.every((id) =>
            selectedProductIds.includes(id),
        );

        if (allSelected) {
            // Bỏ chọn tất cả sản phẩm đang hiển thị
            setSelectedProductIds((prev) =>
                prev.filter((id) => !visibleIds.includes(id)),
            );
        } else {
            // Chọn thêm tất cả sản phẩm đang hiển thị
            setSelectedProductIds((prev) => {
                const set = new Set(prev);
                visibleIds.forEach((id) => set.add(id));
                return Array.from(set);
            });
        }
    };

    // Load store list on mount
    useEffect(() => {
        const loadStores = async () => {
            try {
                setStoreLoading(true);
                const list = await getStores();
                setStores(list);
            } catch (e) {
                console.error('Lỗi khi tải danh sách kho:', e);
            } finally {
                setStoreLoading(false);
            }
        };

        loadStores();
    }, []);

    const filteredStores = useMemo(() => {
        if (!storeKeyword.trim()) return stores;
        const keyword = storeKeyword.toLowerCase();
        return stores
            .filter(
                (s) =>
                    s.name.toLowerCase().includes(keyword) ||
                    (s.code ?? '').toLowerCase().includes(keyword),
            )
            .slice(0, 20);
    }, [storeKeyword, stores]);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
                setShowStoreDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        try {
            setError(null);
            setSuccess(null);

            if (!storeId) {
                setError('Vui lòng chọn kho kiểm kê');
                return;
            }

            if (items.length === 0) {
                setError('Vui lòng thêm ít nhất 1 hàng hóa để kiểm kê');
                return;
            }

            const checkItems = items
                .filter((item) => parseNumber(item.systemQuantity) >= 0)
                .map((item) => ({
                    productId: item.productId,
                    systemQuantity: parseNumber(item.systemQuantity),
                    actualQuantity: parseNumber(item.actualQuantity),
                    unitPrice: parseNumber(item.unitPrice),
                    note: item.note || undefined,
                }));

            if (checkItems.length === 0) {
                setError('Vui lòng nhập ít nhất 1 hàng hóa hợp lệ');
                return;
            }

            // Convert checkDate (YYYY-MM-DD) to full datetime with current time
            const checkDateObj = new Date(checkDate);
            const now = new Date();
            checkDateObj.setHours(now.getHours());
            checkDateObj.setMinutes(now.getMinutes());
            checkDateObj.setSeconds(now.getSeconds());
            checkDateObj.setMilliseconds(now.getMilliseconds());

            const payload: InventoryCheckCreateRequest = {
                storeId: storeId,
                description: description || undefined,
                checkDate: checkDateObj.toISOString(),
                note: note || undefined,
                items: checkItems,
            };

            setSaving(true);
            const created = await createInventoryCheck(payload);

            setSuccess(`Tạo phiếu kiểm kê thành công (Mã: ${created.checkCode ?? created.id})`);

            setTimeout(() => {
                router.push('/inventory/inventory-checks');
            }, 800);
        } catch (e) {
            console.error(e);
            setError(
                e instanceof Error
                    ? e.message
                    : 'Có lỗi xảy ra khi tạo phiếu kiểm kê',
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
                <div className="mb-12">
                    <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Tạo phiếu kiểm kê</h1>
                    <p className="text-sm text-blue-gray-600 uppercase">Tạo phiếu kiểm kê kho hàng</p>
                </div>

                {/* Content Container */}
                <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    <div className="p-6">
                        {error && (
                            <div className="mb-4 text-sm text-red-500 whitespace-pre-line bg-red-50 border border-red-200 rounded-lg px-4 py-2 relative z-10">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="mb-4 text-sm text-green-500 bg-green-50 border border-green-200 rounded-lg px-4 py-2 relative z-10">
                                {success}
                            </div>
                        )}

                <div className="bg-white rounded-lg shadow-sm p-8 border border-blue-gray-200">
                    <h2 className="text-xl font-bold text-center mb-6 text-blue-gray-800">PHIẾU KIỂM KÊ KHO</h2>

                    <div className="border border-blue-gray-200 bg-blue-gray-50 p-6 mb-6 rounded-lg">
                        <h3 className="text-base font-bold mb-4 text-blue-gray-800">Thông tin chung</h3>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                            <div className="space-y-4">
                                <InfoRow label="Mã phiếu">
                                    <input
                                        type="text"
                                        value="Tự động tạo"
                                        readOnly
                                        className="w-full px-3 py-1.5 border border-blue-gray-300 rounded-lg bg-blue-gray-50 text-blue-gray-400"
                                    />
                                </InfoRow>

                                <InfoRow label="Kho kiểm kê">
                                    <div className="relative" ref={storeDropdownRef}>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            placeholder="Tìm kiếm và chọn kho kiểm kê..."
                                            value={storeKeyword}
                                            onChange={(e) => {
                                                setStoreKeyword(e.target.value);
                                                setShowStoreDropdown(true);
                                                setStoreId('');
                                            }}
                                            onFocus={() => setShowStoreDropdown(true)}
                                            disabled={storeLoading}
                                        />
                                        {showStoreDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                                <div
                                                    className="px-3 py-2 text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        setStoreId('');
                                                        setStoreKeyword('');
                                                        setShowStoreDropdown(false);
                                                    }}
                                                >
                                                    -- Chọn kho kiểm kê --
                                                </div>
                                                {filteredStores.length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-gray-500">
                                                        Không tìm thấy
                                                    </div>
                                                ) : (
                                                    filteredStores.map((s) => (
                                                        <div
                                                            key={s.id}
                                                            className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${storeId === s.id ? 'bg-blue-100 font-semibold' : ''}`}
                                                            onClick={() => {
                                                                setStoreId(s.id);
                                                                setStoreKeyword(`${s.code ? s.code + ' - ' : ''}${s.name}`);
                                                                setShowStoreDropdown(false);
                                                            }}
                                                        >
                                                            <div className="font-medium">{s.name}</div>
                                                            {s.code && (
                                                                <div className="text-xs text-gray-500">Mã: {s.code}</div>
                                                            )}
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </InfoRow>

                                <InfoRow label="Mã kho">
                                    <input
                                        type="text"
                                                value={stores.find((s) => s.id === storeId)?.code ?? ''}
                                        readOnly
                                        className="w-full px-3 py-1.5 border border-blue-gray-300 rounded-lg bg-blue-gray-50 text-blue-gray-400"
                                    />
                                </InfoRow>
                            </div>

                            <div className="space-y-4">
                                <InfoRow label="Ngày kiểm kê">
                                    <input
                                        type="date"
                                        className="w-full px-3 py-1.5 border border-blue-gray-300 rounded-lg bg-blue-gray-50 text-blue-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                        value={checkDate}
                                        onChange={(e) => setCheckDate(e.target.value)}
                                    />
                                </InfoRow>

                                <InfoRow label="Mô tả">
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-blue-gray-300 rounded-lg h-14 resize-none bg-blue-gray-50 text-blue-gray-800 placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Nhập mô tả..."
                                    />
                                </InfoRow>

                                <InfoRow label="Ghi chú">
                                    <textarea
                                        className="w-full px-3 py-1.5 border border-blue-gray-300 rounded-lg h-14 resize-none bg-blue-gray-50 text-blue-gray-800 placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Nhập ghi chú..."
                                    />
                                </InfoRow>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-300 mb-6 rounded-xl shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[#0099FF] text-white h-12">
                                    <th className="px-2 text-center font-bold w-12">STT</th>
                                    <th className="px-2 text-center font-bold w-40">Tên hàng hóa</th>
                                    <th className="px-2 text-center font-bold w-24">Mã hàng</th>
                                    <th className="px-2 text-center font-bold w-20">Đơn vị</th>
                                    <th className="px-2 text-center font-bold w-24">SL Hệ thống</th>
                                    <th className="px-2 text-center font-bold w-24">SL Thực tế</th>
                                    <th className="px-2 text-center font-bold w-24">Chênh lệch</th>
                                    <th className="px-2 text-center font-bold w-28">Đơn giá</th>
                                    <th className="px-2 text-center font-bold w-28">Giá trị CL</th>
                                    <th className="px-2 text-center font-bold w-32">Ghi chú</th>
                                    <th className="px-2 text-center font-bold w-16">Xóa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className="border border-blue-gray-200 h-12 hover:bg-blue-gray-50"
                                    >
                                        <td className="px-2 text-center text-sm text-blue-gray-800 border-r border-blue-gray-200">
                                            {index + 1}
                                        </td>
                                        <td className="px-2 text-left text-sm text-blue-gray-800 border-r border-blue-gray-200">
                                            {item.productName}
                                        </td>
                                        <td className="px-2 text-center text-sm text-blue-gray-800 border-r border-blue-gray-200">
                                            {item.productCode}
                                        </td>
                                        <td className="px-2 text-center text-sm text-blue-gray-800 border-r border-blue-gray-200">
                                            {item.unit}
                                        </td>
                                        <td className="px-2 text-right text-sm border-r border-blue-gray-200">
                                            <input
                                                className="w-full text-right bg-gray-50 text-gray-600 cursor-not-allowed focus:outline-none"
                                                value={item.systemQuantity}
                                                disabled={true}
                                                readOnly
                                            />
                                        </td>
                                        <td className="px-2 text-right text-sm border-r border-blue-gray-200">
                                            <input
                                                className="w-full text-right bg-transparent focus:outline-none text-blue-gray-800"
                                                value={item.actualQuantity}
                                                onChange={(e) =>
                                                    handleChangeItemField(
                                                        item.id,
                                                        'actualQuantity',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className={`px-2 text-right text-sm font-medium border-r border-blue-gray-200 ${item.differenceQuantity > 0 ? 'text-green-500' : item.differenceQuantity < 0 ? 'text-red-500' : 'text-blue-gray-400'}`}>
                                            {formatPrice(item.differenceQuantity)}
                                        </td>
                                        <td className="px-2 text-right text-sm border-r border-blue-gray-200">
                                            <input
                                                className="w-full text-right bg-transparent focus:outline-none text-blue-gray-800 placeholder:text-blue-gray-400"
                                                value={item.unitPrice}
                                                onChange={(e) =>
                                                    handleChangeItemField(
                                                        item.id,
                                                        'unitPrice',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td className={`px-2 text-right text-sm font-medium border-r border-blue-gray-200 ${item.totalValue > 0 ? 'text-green-500' : item.totalValue < 0 ? 'text-red-500' : 'text-blue-gray-400'}`}>
                                            {formatPrice(item.totalValue)}
                                        </td>
                                        <td className="px-2 text-center text-sm border-r border-blue-gray-200">
                                            <input
                                                className="w-full text-center bg-transparent focus:outline-none text-blue-gray-800 placeholder:text-blue-gray-400"
                                                value={item.note}
                                                onChange={(e) =>
                                                    handleChangeItemField(
                                                        item.id,
                                                        'note',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Ghi chú..."
                                            />
                                        </td>
                                        <td className="px-2 text-center border-r border-blue-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => deleteItem(item.id)}
                                                className="text-red-400 hover:text-red-500"
                                            >
                                                <svg
                                                    width="22"
                                                    height="22"
                                                    viewBox="0 0 22 22"
                                                    fill="none"
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
                                <tr className="border border-blue-gray-200 h-12 bg-blue-gray-100">
                                    <td
                                        colSpan={8}
                                        className="px-2 text-center font-bold text-sm border-r border-blue-gray-200 text-blue-gray-800"
                                    >
                                        Tổng giá trị chênh lệch
                                    </td>
                                    <td className="px-2 text-right font-bold text-sm border-r border-blue-gray-200 text-blue-gray-800">
                                        {calculateTotalDifference()}
                                    </td>
                                    <td colSpan={2} className="border-r border-blue-gray-200" />
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Actions under table */}
                    <div className="flex justify-between items-center mb-6">
                        <button
                            type="button"
                            onClick={openProductModal}
                            className="px-6 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                        >
                            + Thêm hàng hóa kiểm kê
                        </button>
                    </div>

                    <div className="flex justify-end gap-6">
                        <button
                            className="px-8 py-2.5 bg-red-400 hover:bg-red-500 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                            onClick={() => router.push('/inventory/inventory-checks')}
                        >
                            Hủy
                        </button>
                        <button
                            className="px-8 py-2.5 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-60"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu'}
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
                                    value={productKeyword}
                                    onChange={(e) => setProductKeyword(e.target.value)}
                                    placeholder="Tìm theo tên hoặc mã hàng..."
                                    className="w-full px-3 py-2 border border-blue-gray-300 rounded-lg text-sm bg-white placeholder:text-blue-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                {loadingProducts ? (
                                    <div className="text-center py-8 text-blue-gray-400">Đang tải...</div>
                                ) : productError ? (
                                    <div className="text-center py-8 text-red-400">{productError}</div>
                                ) : productList.length === 0 ? (
                                    <div className="text-center py-8 text-blue-gray-400">Không có sản phẩm nào</div>
                                ) : visibleProducts.length === 0 ? (
                                    <div className="text-center py-8 text-blue-gray-400">
                                        Không có sản phẩm phù hợp với kho hoặc từ khóa hiện tại
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs text-blue-gray-500">
                                                Đã chọn {selectedProductIds.length} sản phẩm
                                            </span>
                                            <button
                                                type="button"
                                                onClick={handleToggleSelectAllProducts}
                                                className="px-3 py-1 text-xs font-semibold rounded-md border border-blue-gray-300 text-blue-gray-700 hover:bg-blue-gray-50"
                                            >
                                                Chọn/Bỏ chọn tất cả
                                            </button>
                                        </div>
                                    <div className="space-y-2">
                                            {visibleProducts.map((product) => {
                                                const stock = storeStocks.find((s) => s.productId === product.id);
                                                if (!stock) return null;

                                            const alreadyAdded = selectedProductIds.includes(product.id);
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
                                                                Mã: {product.code} | Tồn kho tại kho này:{' '}
                                                                {stock.quantity}
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
                                )}
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
