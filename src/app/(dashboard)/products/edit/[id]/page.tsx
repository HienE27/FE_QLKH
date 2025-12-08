'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
  useRef,
  useMemo,
} from 'react';
import { useRouter, useParams } from 'next/navigation';

import {
  getProduct,
  updateProduct,
  uploadProductImage,
} from '@/services/product.service';
import type { ProductPayload } from '@/types/product';

import { Category } from '@/types/category';
import { getCategories } from '@/services/category.service';
import { getSuppliers, type Supplier } from '@/services/supplier.service';
// 👉 import Units
import { getUnits } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

// 👉 import Stores và Stock
import { getStockByProduct, createOrUpdateStock, type StockByStore } from '@/services/stock.service';

import { aiProductDescription } from '@/services/ai.service';

import { buildImageUrl, parseMoney } from '@/lib/utils';
import RichTextEditor from '@/components/editor/RichTextEditor';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = Number(
    Array.isArray(params?.id) ? params.id[0] : params?.id,
  );

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<number[]>([]);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [stocks, setStocks] = useState<StockByStore[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ===== LOAD DATA =====
  useEffect(() => {
    if (!productId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [product, cats, supplierList, unts, stockList] = await Promise.all([
          getProduct(productId),
          getCategories(),
          getSuppliers(),
          getUnits(),
          getStockByProduct(productId).catch(() => []),
        ]);

        setCode(product.code);
        setName(product.name);
        setCategoryId(product.categoryId || '');
        
        // Load nhiều NCC từ product.supplierIds hoặc product.supplierId (tương thích ngược)
        const prodSupplierIds = product.supplierIds && product.supplierIds.length > 0
          ? product.supplierIds
          : (product.supplierId ? [product.supplierId] : []);
        setSelectedSupplierIds(prodSupplierIds);
        setSupplierId(prodSupplierIds.length > 0 ? prodSupplierIds[0] : '');
        setUnitId(product.unitId || '');
        setUnitPrice(product.unitPrice ? String(product.unitPrice) : '');
        setDescription(product.shortDescription || '');
        setCurrentImagePath(product.image || null);
        setImagePreview(product.image ? (buildImageUrl(product.image) || null) : null);

        setCategories(cats);
        setSuppliers(supplierList);
        setUnits(unts);
        setStocks(stockList);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi tải thông tin hàng hóa';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

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

  // ===== HANDLE SUBMIT =====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!code || !name) {
      setError('Vui lòng nhập mã và tên hàng hóa');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let imagePath = currentImagePath;

      // Upload ảnh mới nếu có
      if (imageFile) {
        imagePath = await uploadProductImage(imageFile);
      }

      // Lấy NCC đầu tiên làm NCC chính (tương thích với backend hiện tại)
      const mainSupplierId = selectedSupplierIds.length > 0 
        ? selectedSupplierIds[0] 
        : (supplierId === '' ? null : Number(supplierId));
      
      // Danh sách NCC (many-to-many)
      const supplierIdsList = selectedSupplierIds.length > 0 
        ? selectedSupplierIds 
        : (supplierId !== '' ? [Number(supplierId)] : null);

      const payload: ProductPayload = {
        code,
        name,
        status: 'ACTIVE', // Mặc định ACTIVE
        categoryId: categoryId !== '' ? Number(categoryId) : undefined, // Backend sẽ giữ nguyên nếu undefined
        supplierId: mainSupplierId,
        supplierIds: supplierIdsList, // Danh sách NCC (many-to-many)
        unitId: unitId !== '' ? Number(unitId) : undefined,
        unitPrice: unitPrice ? parseMoney(unitPrice) : 0,
        shortDescription: description || undefined,
        image: imagePath || undefined,
      };

      await updateProduct(productId, payload);
      router.push('/products');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi cập nhật hàng hóa';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ===== HANDLE CHỌN ẢNH =====
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      // preview ảnh mới (blob local)
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      // nếu bỏ chọn -> quay lại ảnh cũ từ server
      setImagePreview(buildImageUrl(currentImagePath));
    }
  };

  if (loading) {
    return <p className="p-6">Đang tải...</p>;
  }

  if (error && !code && !name) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa hàng hóa</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin hàng hóa</p>
      </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          <div className="p-6">
            <h2 className="text-xl font-bold text-center mb-6 text-blue-gray-800">
              CHỈNH SỬA HÀNG HÓA
            </h2>

          {error && (
            <div className="max-w-4xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto space-y-6"
          >
            {/* Mã hàng hóa */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="code"
                className="text-sm font-medium text-gray-700"
              >
                Mã hàng hóa <span className="text-red-500">*</span>
              </label>
              <input
                id="code"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mã hàng hóa"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

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
                Nhóm hàng
              </label>
              <select
                id="category"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- Chọn nhóm hàng --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
                Đơn vị tính
              </label>
              <select
                id="unit"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={unitId}
                onChange={(e) => setUnitId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">-- Chọn đơn vị tính --</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Đơn giá */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="unitPrice"
                className="text-sm font-medium text-gray-700"
              >
                Đơn giá
              </label>
              <input
                id="unitPrice"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập đơn giá"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>

            {/* Hình ảnh */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-2">
                Hình ảnh
              </label>
              <div className="col-span-2 space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Tồn kho theo từng kho */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-2">
                Tồn kho theo từng kho
              </label>
              <div className="col-span-2">
                {stocks.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có tồn kho</p>
                ) : (
                  <table className="w-full border border-gray-300 rounded">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                          Kho hàng
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                          Mã kho
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                          Số lượng tồn
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                          Tồn tối thiểu
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                          Tồn tối đa
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((stock) => (
                        <StockRow
                          key={`${stock.productId}-${stock.storeId}`}
                          stock={stock}
                          productId={productId}
                          onUpdate={() => {
                            // Reload stocks sau khi cập nhật
                            getStockByProduct(productId).then(setStocks).catch(console.error);
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tồn kho được quản lý trong shop_stocks. Để cập nhật tồn kho, vui lòng sử dụng phiếu nhập/xuất kho. Bạn có thể chỉnh sửa tồn kho tối thiểu và tối đa cho từng kho bằng cách click vào giá trị.
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
                  className="min-h-[200px]"
                />
                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push('/dashboard/products')}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </form>
          </div>
        </div>
    </>
  );
}

// Component để chỉnh sửa minStock và maxStock
function StockRow({
  stock,
  productId,
  onUpdate
}: {
  stock: StockByStore;
  productId: number;
  onUpdate: () => void;
}) {
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [minValue, setMinValue] = useState(stock.minStock?.toString() || '');
  const [maxValue, setMaxValue] = useState(stock.maxStock?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSaveMin = async () => {
    try {
      setSaving(true);
      await createOrUpdateStock({
        productId,
        storeId: stock.storeId,
        quantity: stock.quantity,
        minStock: minValue ? Number(minValue) : undefined,
        maxStock: stock.maxStock,
      });
      setEditingMin(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update minStock:', err);
      alert('Không thể cập nhật tồn kho tối thiểu');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMax = async () => {
    try {
      setSaving(true);
      await createOrUpdateStock({
        productId,
        storeId: stock.storeId,
        quantity: stock.quantity,
        minStock: stock.minStock,
        maxStock: maxValue ? Number(maxValue) : undefined,
      });
      setEditingMax(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to update maxStock:', err);
      alert('Không thể cập nhật tồn kho tối đa');
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900">
        {stock.storeName || `Kho #${stock.storeId}`}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600">
        {stock.storeCode || '-'}
      </td>
      <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">
        {stock.quantity.toLocaleString('vi-VN')}
      </td>
      <td className="px-3 py-2 text-sm text-right text-gray-600">
        {editingMin ? (
          <div className="flex items-center gap-2 justify-end">
            <input
              type="number"
              min={0}
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
              className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleSaveMin}
              disabled={saving}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditingMin(false);
                setMinValue(stock.minStock?.toString() || '');
              }}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className="cursor-pointer hover:text-blue-600"
            onClick={() => setEditingMin(true)}
            title="Click để chỉnh sửa"
          >
            {stock.minStock != null
              ? stock.minStock.toLocaleString('vi-VN')
              : '-'}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-sm text-right text-gray-600">
        {editingMax ? (
          <div className="flex items-center gap-2 justify-end">
            <input
              type="number"
              min={0}
              value={maxValue}
              onChange={(e) => setMaxValue(e.target.value)}
              className="w-20 px-2 py-1 border border-blue-500 rounded text-sm"
              autoFocus
            />
            <button
              onClick={handleSaveMax}
              disabled={saving}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
            >
              ✓
            </button>
            <button
              onClick={() => {
                setEditingMax(false);
                setMaxValue(stock.maxStock?.toString() || '');
              }}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
            >
              ✕
            </button>
          </div>
        ) : (
          <div
            className="cursor-pointer hover:text-blue-600"
            onClick={() => setEditingMax(true)}
            title="Click để chỉnh sửa"
          >
            {stock.maxStock != null
              ? stock.maxStock.toLocaleString('vi-VN')
              : '-'}
          </div>
        )}
      </td>
    </tr>
  );
}
