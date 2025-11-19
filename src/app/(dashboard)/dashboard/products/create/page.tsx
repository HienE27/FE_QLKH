'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createProduct, uploadProductImage } from '@/services/product.service';
import { getCategories } from '@/services/category.service';
import type { ProductPayload } from '@/types/product';
import type { Category } from '@/types/category';

const UNIT_OPTIONS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng'];

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
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [price, setPrice] = useState('');
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

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const list = await getCategories();
        if (!cancelled) {
          setCategories(list);
        }
      } catch (err) {
        console.error('Lỗi tải nhóm hàng', err);
      }
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

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

      const payload: ProductPayload = {
        code,
        name,
        shortDescription: description,
        image: imagePath, // Lưu relative path vào DB
        unitPrice: parseMoney(price),
        quantity: 0,
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        supplierId: null,
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

            {/* Đơn vị tính (chỉ lưu ở FE) */}
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
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
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

            {/* Mô tả */}
            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="description"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Mô tả
              </label>
              <textarea
                id="description"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder="Nhập mô tả sản phẩm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
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
