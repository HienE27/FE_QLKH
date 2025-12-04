'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import { createProduct, uploadProductImage } from '@/services/product.service';
import type { ProductPayload } from '@/types/product';
import { Category } from '@/types/category';
import { getCategories } from '@/services/category.service';

// 👉 import NCC
import { getSuppliers, type Supplier } from '@/services/supplier.service';
// 👉 import Units
import { getUnits } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

// 👉 import Stores và Stock
import { getStores, type Store } from '@/services/store.service';
import { createOrUpdateStock } from '@/services/stock.service';

import { aiProductDescription } from '@/services/ai.service';

import { parseMoney } from '@/lib/utils';
import RichTextEditor from '@/components/common/RichTextEditor';

export default function CreateProductPage() {
  const router = useRouter();

  // form state (mã sẽ tự động tạo)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // danh mục từ BE
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement | null>(null);

  // 👉 danh sách Units từ BE
  const [units, setUnits] = useState<Unit[]>([]);

  // 👉 danh sách Stores và tồn kho ban đầu
  const [stores, setStores] = useState<Store[]>([]);
  const [initialStoreId, setInitialStoreId] = useState<number | ''>('');
  const [initialQuantity, setInitialQuantity] = useState('');
  const [initialMinStock, setInitialMinStock] = useState('');
  const [initialMaxStock, setInitialMaxStock] = useState('');

  // AI mô tả sản phẩm
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDescriptions, setAiDescriptions] = useState<{
    short?: string;
    seo?: string;
    long?: string;
    attributes?: string[];
  } | null>(null);
  const [selectedDescriptionType, setSelectedDescriptionType] = useState<'short' | 'seo' | 'long'>('long');

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [catList, supplierList, unitList, storeList] = await Promise.all([
          getCategories(),
          getSuppliers(),
          getUnits(),
          getStores(),
        ]);
        if (!cancelled) {
          setCategories(catList);
          setSuppliers(supplierList);
          setUnits(unitList);
          setStores(storeList);
          // Set default unit nếu có và chưa có unit nào được chọn
          if (unitList.length > 0 && unitId === '') {
            const activeUnit = unitList.find((u) => u.active !== false) || unitList[0];
            if (activeUnit) {
              setUnitId(activeUnit.id);
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu', err);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy một lần khi mount

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

  // Xử lý chọn/bỏ chọn NCC
  const toggleSupplier = (supplierIdNum: number) => {
    setSelectedSupplierIds((prev) => {
      if (prev.includes(supplierIdNum)) {
        const newIds = prev.filter((id) => id !== supplierIdNum);
        // Cập nhật supplierId chính (NCC đầu tiên)
        setSupplierId(newIds.length > 0 ? newIds[0] : '');
        return newIds;
      } else {
        const newIds = [...prev, supplierIdNum];
        // Cập nhật supplierId chính (NCC đầu tiên)
        setSupplierId(newIds[0]);
        return newIds;
      }
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let imagePath: string | null = null;

      if (imageFile) {
        // BE trả về relative path: /uploads/products/xxx.jpg
        imagePath = await uploadProductImage(imageFile);
      }

      // Cắt ngắn mô tả nếu quá dài (giới hạn 2000 ký tự để an toàn với database)
      const trimmedDescription = description && description.length > 2000
        ? description.substring(0, 2000) + '...'
        : description;

      // Lấy NCC đầu tiên làm NCC chính (tương thích với backend hiện tại)
      const mainSupplierId = selectedSupplierIds.length > 0 
        ? selectedSupplierIds[0] 
        : (supplierId === '' ? null : Number(supplierId));
      
      // Danh sách NCC (many-to-many)
      const supplierIdsList = selectedSupplierIds.length > 0 
        ? selectedSupplierIds 
        : (supplierId !== '' ? [Number(supplierId)] : null);

      const payload: ProductPayload = {
        name,
        shortDescription: trimmedDescription,
        image: imagePath, // Lưu relative path vào DB
        unitPrice: parseMoney(price),
        status,
        supplierId: mainSupplierId,
        supplierIds: supplierIdsList, // Danh sách NCC (many-to-many)
        categoryId: categoryId === '' ? null : Number(categoryId),
        // 👉 map unitId
        unitId: unitId === '' ? null : Number(unitId),
      };

      const createdProduct = await createProduct(payload);

      // Nếu có chọn kho và nhập số lượng tồn ban đầu, tạo stock record
      if (initialStoreId && initialQuantity && Number(initialQuantity) > 0) {
        try {
          await createOrUpdateStock({
            productId: createdProduct.id,
            storeId: Number(initialStoreId),
            quantity: Number(initialQuantity),
            minStock: initialMinStock ? Number(initialMinStock) : undefined,
            maxStock: initialMaxStock ? Number(initialMaxStock) : undefined,
          });
        } catch (stockErr) {
          console.error('Lỗi tạo tồn kho ban đầu:', stockErr);
          // Không throw error, chỉ log vì sản phẩm đã tạo thành công
        }
      }

      router.push('/dashboard/products');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi lưu hàng hóa';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Sidebar />

      <main className="ml-[264px] mt-6 p-6 pr-12">
        {/* Breadcrumb */}
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Danh mục hàng hóa &gt; Thêm hàng hóa
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">THÊM HÀNG HÓA</h2>

          {error && (
            <div className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Tên hàng hóa */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Tên hàng hóa <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập tên hàng hóa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Nhóm hàng */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="category"
                className="text-sm font-medium text-gray-700"
              >
                Nhóm hàng <span className="text-red-500">*</span>
              </label>
              <div className="col-span-2 relative">
                <select
                  id="category"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  required
                >
                  <option value="">Chọn nhóm hàng</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Nhà cung cấp - Multi-select */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="supplier"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Nhà cung cấp <span className="text-gray-400 text-xs">(tùy chọn, có thể chọn nhiều)</span>
              </label>
              <div className="col-span-2 space-y-2">
                <div className="relative" ref={supplierDropdownRef}>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="Tìm kiếm và chọn nhà cung cấp..."
                    value={supplierSearchTerm}
                    onChange={(e) => {
                      setSupplierSearchTerm(e.target.value);
                      setShowSupplierDropdown(true);
                    }}
                    onFocus={() => setShowSupplierDropdown(true)}
                  />
                  {showSupplierDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredSuppliers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Không tìm thấy
                        </div>
                      ) : (
                        filteredSuppliers.map((s) => {
                          const isSelected = selectedSupplierIds.includes(s.id);
                          return (
                            <div
                              key={s.id}
                              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 flex items-center gap-2 ${
                                isSelected ? 'bg-blue-100 font-semibold' : ''
                              }`}
                              onClick={() => toggleSupplier(s.id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSupplier(s.id)}
                                className="w-4 h-4"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span>
                                {s.name} {s.type ? `(${s.type})` : ''}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
                {/* Hiển thị các NCC đã chọn */}
                {selectedSupplierIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSupplierIds.map((id) => {
                      const supplier = suppliers.find((s) => s.id === id);
                      if (!supplier) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {supplier.name} {supplier.type ? `(${supplier.type})` : ''}
                          {id === selectedSupplierIds[0] && (
                            <span className="text-xs text-blue-600 font-semibold">(Chính)</span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleSupplier(id)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                {selectedSupplierIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    💡 NCC đầu tiên sẽ được lưu làm NCC chính. Các NCC khác sẽ được hiển thị trong hệ thống.
                  </p>
                )}
              </div>
            </div>

            {/* Đơn vị tính */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="unit"
                className="text-sm font-medium text-gray-700"
              >
                Đơn vị tính <span className="text-red-500">*</span>
              </label>
              <div className="col-span-2 relative">
                <select
                  id="unit"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={unitId}
                  onChange={(e) =>
                    setUnitId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  required
                >
                  <option value="">Chọn đơn vị tính</option>
                  {units
                    .filter((u) => u.active !== false)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            {/* Đơn giá (map sang unitPrice) */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="price"
                className="text-sm font-medium text-gray-700"
              >
                Đơn giá <span className="text-red-500">*</span>
              </label>
              <input
                id="price"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập đơn giá"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {/* Tồn kho ban đầu (tùy chọn) */}
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Tồn kho ban đầu (tùy chọn)
              </h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                <label
                  htmlFor="initialStore"
                  className="text-sm font-medium text-gray-700"
                >
                  Kho hàng
                </label>
                <div className="col-span-2 relative">
                  <select
                    id="initialStore"
                    className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    value={initialStoreId}
                    onChange={(e) =>
                      setInitialStoreId(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">-- Chọn kho (để trống nếu không cần) --</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
              {initialStoreId && (
                <>
                  <div className="grid grid-cols-3 gap-4 items-center mt-3">
                    <label
                      htmlFor="initialQuantity"
                      className="text-sm font-medium text-gray-700"
                    >
                      Số lượng tồn
                    </label>
                    <input
                      id="initialQuantity"
                      type="number"
                      min={0}
                      className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập số lượng tồn ban đầu"
                      value={initialQuantity}
                      onChange={(e) => setInitialQuantity(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center mt-3">
                    <label
                      htmlFor="initialMinStock"
                      className="text-sm font-medium text-gray-700"
                    >
                      Tồn kho tối thiểu
                    </label>
                    <input
                      id="initialMinStock"
                      type="number"
                      min={0}
                      className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tồn kho tối thiểu (tùy chọn)"
                      value={initialMinStock}
                      onChange={(e) => setInitialMinStock(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center mt-3">
                    <label
                      htmlFor="initialMaxStock"
                      className="text-sm font-medium text-gray-700"
                    >
                      Tồn kho tối đa
                    </label>
                    <input
                      id="initialMaxStock"
                      type="number"
                      min={0}
                      className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nhập tồn kho tối đa (tùy chọn)"
                      value={initialMaxStock}
                      onChange={(e) => setInitialMaxStock(e.target.value)}
                    />
                  </div>
                </>
              )}
              <p className="text-xs text-gray-500 mt-2">
                💡 Lưu ý: Nếu không nhập ở đây, tồn kho sẽ được tạo khi nhập hàng vào kho.
              </p>
            </div>

            {/* Mô tả + AI gợi ý */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="description"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Mô tả
              </label>
              <div className="col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Có thể nhập tay hoặc để AI gợi ý mô tả (3 phiên bản).
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!name.trim()) {
                        setAiError('Vui lòng nhập tên hàng hóa trước khi gọi AI.');
                        return;
                      }
                      setAiError(null);
                      setAiLoading(true);
                      try {
                        const data = await aiProductDescription(name);
                        setAiDescriptions({
                          short: data.shortDescription,
                          seo: data.seoDescription,
                          long: data.longDescription,
                          attributes: data.attributes,
                        });
                        // Mặc định chọn long description
                        setDescription(data.longDescription || data.seoDescription || data.shortDescription || '');
                        setSelectedDescriptionType('long');
                      } catch (err) {
                        console.error('AI mô tả sản phẩm lỗi:', err);
                        setAiError(
                          err instanceof Error ? err.message : 'Có lỗi khi gọi AI.',
                        );
                      } finally {
                        setAiLoading(false);
                      }
                    }}
                    disabled={aiLoading}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {aiLoading ? 'Đang sinh mô tả...' : 'Gợi ý mô tả bằng AI'}
                  </button>
                </div>

                {/* Hiển thị 3 phiên bản nếu có */}
                {aiDescriptions && (
                  <div className="border border-sky-200 rounded-md p-3 bg-sky-50 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDescriptionType('short');
                          setDescription(aiDescriptions.short || '');
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'short'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-sky-100'
                          }`}
                      >
                        Ngắn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDescriptionType('seo');
                          setDescription(aiDescriptions.seo || '');
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'seo'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-sky-100'
                          }`}
                      >
                        SEO
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDescriptionType('long');
                          setDescription(aiDescriptions.long || '');
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${selectedDescriptionType === 'long'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-sky-100'
                          }`}
                      >
                        Chi tiết
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {selectedDescriptionType === 'short' && aiDescriptions.short && (
                        <p className="font-medium">Mô tả ngắn:</p>
                      )}
                      {selectedDescriptionType === 'seo' && aiDescriptions.seo && (
                        <p className="font-medium">Mô tả SEO:</p>
                      )}
                      {selectedDescriptionType === 'long' && aiDescriptions.long && (
                        <p className="font-medium">Mô tả chi tiết:</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Gợi ý attributes */}
                {aiDescriptions?.attributes && aiDescriptions.attributes.length > 0 && (
                  <div className="border border-amber-200 rounded-md p-3 bg-amber-50">
                    <p className="text-xs font-medium text-amber-800 mb-2">
                      Gợi ý thuộc tính (attributes):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {aiDescriptions.attributes.map((attr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-white border border-amber-300 rounded text-xs text-amber-900"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Nhập hoặc chỉnh sửa mô tả sản phẩm"
                  height="h-48"
                />
                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}
              </div>
            </div>

            {/* Hình ảnh */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="image"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Hình ảnh
              </label>
              <div className="col-span-2 space-y-2">
                <input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Xem trước hình ảnh"
                    className="h-24 object-cover rounded border"
                  />
                )}
              </div>
            </div>

            {/* Trạng thái */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm font-medium text-gray-700">
                Trạng thái
              </span>
              <div className="col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Đang kinh doanh</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Ngừng kinh doanh</span>
                </label>
              </div>
            </div>

            {/* Nút action */}
            <div className="flex justify-center gap-6 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-12 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
