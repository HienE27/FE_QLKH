'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createProduct, uploadProductImage } from '@/services/product.service';
import type { ProductPayload } from '@/types/product';
import { Category } from '@/types/category';
import { getCategories } from '@/services/category.service';

// 👉 import NCC
import { getSuppliers, type Supplier } from '@/services/supplier.service';

// 👉 import Units
import { getUnits, type Unit } from '@/services/unit.service';
import { aiProductDescription } from '@/services/ai.service';

// Bỏ dấu . , khoảng trắng rồi convert sang số
function parseMoney(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[.,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function CreateProductPage() {
  const router = useRouter();

  // form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(''); // số lượng tồn ban đầu
  const [importPrice, setImportPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // danh mục từ BE
  const [categories, setCategories] = useState<Category[]>([]);

  // 👉 danh sách NCC + supplierId được chọn
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');

  // 👉 danh sách Units từ BE
  const [units, setUnits] = useState<Unit[]>([]);

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
        const [catList, supplierList, unitList] = await Promise.all([
          getCategories(),
          getSuppliers(),
          getUnits(),
        ]);
        if (!cancelled) {
          setCategories(catList);
          setSuppliers(supplierList);
          setUnits(unitList);
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

      const payload: ProductPayload = {
        code,
        name,
        shortDescription: trimmedDescription,
        image: imagePath, // Lưu relative path vào DB
        unitPrice: parseMoney(price),
        quantity: quantity === '' ? 0 : Number(quantity),
        minStock: stockMin === '' ? null : Number(stockMin),
        maxStock: stockMax === '' ? null : Number(stockMax),
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        // 👉 map supplierId đã chọn, nếu không chọn thì null
        supplierId: supplierId === '' ? null : Number(supplierId),
        // 👉 map unitId
        unitId: unitId === '' ? null : Number(unitId),
      };

      await createProduct(payload);
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
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
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

            {/* 👉 Nhà cung cấp */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="supplier"
                className="text-sm font-medium text-gray-700"
              >
                Nguồn hàng / Nhà cung cấp
              </label>
              <div className="col-span-2 relative">
                <select
                  id="supplier"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  value={supplierId}
                  onChange={(e) =>
                    setSupplierId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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

            {/* Số lượng tồn */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="quantity"
                className="text-sm font-medium text-gray-700"
              >
                Số lượng tồn
              </label>
              <input
                id="quantity"
                type="number"
                min={0}
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số lượng tồn ban đầu"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            {/* Các field phụ – tạm lưu ở FE */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="importPrice"
                className="text-sm font-medium text-gray-700"
              >
                Giá nhập
              </label>
              <input
                id="importPrice"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập giá nhập"
                value={importPrice}
                onChange={(e) => setImportPrice(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="salePrice"
                className="text-sm font-medium text-gray-700"
              >
                Giá bán
              </label>
              <input
                id="salePrice"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập giá bán"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="stockMin"
                className="text-sm font-medium text-gray-700"
              >
                Tồn kho tối thiểu
              </label>
              <input
                id="stockMin"
                type="number"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số lượng tồn kho tối thiểu"
                value={stockMin}
                onChange={(e) => setStockMin(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <label
                htmlFor="stockMax"
                className="text-sm font-medium text-gray-700"
              >
                Tồn kho tối đa
              </label>
              <input
                id="stockMax"
                type="number"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập số lượng tồn kho tối đa"
                value={stockMax}
                onChange={(e) => setStockMax(e.target.value)}
              />
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
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          selectedDescriptionType === 'short'
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
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          selectedDescriptionType === 'seo'
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
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          selectedDescriptionType === 'long'
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

              <textarea
                id="description"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  placeholder="Nhập hoặc chỉnh sửa mô tả sản phẩm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
