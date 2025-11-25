'use client';

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from 'react';
import { useRouter, useParams } from 'next/navigation';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

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
import { getUnits, type Unit } from '@/services/unit.service';

// ===== BASE URL cho ảnh từ BE (qua API Gateway) =====
const API_BASE_URL = 'http://localhost:8080';

// Build full URL để hiển thị ảnh
function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${clean}`;
}

// Bỏ dấu . , khoảng trắng rồi convert sang số
function parseMoney(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[.,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();

  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const productId = Number(rawId);

  // form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [importPrice, setImportPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stockMin, setStockMin] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== STATE ẢNH =====
  const [imageFile, setImageFile] = useState<File | null>(null);      // file mới nếu user chọn
  const [imagePreview, setImagePreview] = useState<string | null>(null); // URL để show <img>
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null); // path lưu trong DB, ví dụ /uploads/products/xxx.jpg

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | ''>('');

  // 👉 danh sách Units từ BE
  const [units, setUnits] = useState<Unit[]>([]);

  // ===== LOAD DATA BAN ĐẦU =====
  useEffect(() => {
    if (!rawId || Number.isNaN(productId)) {
      setError('ID hàng hóa không hợp lệ');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setError(null);
        setLoading(true);

        const [product, catList, supplierList, unitList] = await Promise.all([
          getProduct(productId),
          getCategories(),
          getSuppliers(),
          getUnits(),
        ]);

        if (cancelled) return;

        setCategories(catList);
        setSuppliers(supplierList);
        setUnits(unitList);

        // fill form từ product
        setCode(product.code);
        setName(product.name);
        setCategoryId(product.categoryId ?? '');
        setUnitId(product.unitId ?? '');
        setPrice(
          product.unitPrice != null ? String(product.unitPrice) : '',
        );
        setQuantity(
          product.quantity != null ? String(product.quantity) : '',
        );
        setStockMin(
          product.minStock != null ? String(product.minStock) : '',
        );
        setStockMax(
          product.maxStock != null ? String(product.maxStock) : '',
        );
        setDescription(product.shortDescription ?? '');
        setStatus(
          (product.status as 'active' | 'inactive') || 'active',
        );
        setSupplierId(product.supplierId ?? '');

        // ===== ẢNH HIỆN TẠI =====
        const originalPath = product.image ?? null;  // ví dụ "/uploads/products/abc.jpg"
        setCurrentImagePath(originalPath);
        setImagePreview(buildImageUrl(originalPath)); // build full url để show
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Không tải được thông tin hàng hóa';
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, rawId]);

  // ===== SUBMIT =====
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code || !name) {
      setError('Vui lòng nhập Mã hàng hóa và Tên hàng hóa');
      return;
    }

    try {
      setSaving(true);

      let imagePath: string | null = currentImagePath;

      // Nếu user chọn ảnh mới -> upload lên BE, path mới ghi đè ảnh cũ
      if (imageFile) {
        imagePath = await uploadProductImage(imageFile); // BE trả về "/uploads/products/xxx.jpg"
      }

      const payload: ProductPayload = {
        code,
        name,
        shortDescription: description,
        image: imagePath, // gửi path ảnh lên BE
        unitPrice: parseMoney(price),
        quantity: quantity === '' ? 0 : Number(quantity),
        minStock: stockMin === '' ? null : Number(stockMin),
        maxStock: stockMax === '' ? null : Number(stockMax),
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        supplierId: supplierId === '' ? null : Number(supplierId),
        unitId: unitId === '' ? null : Number(unitId),
      };

      await updateProduct(productId, payload);
      router.push('/dashboard/products');
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
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        {/* Breadcrumb */}
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Danh mục hàng hóa &gt; Chỉnh sửa hàng hóa
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
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

            {/* Nhà cung cấp */}
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

            {/* Đơn giá */}
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

            {/* Các field phụ (để sau dùng) */}
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
                disabled={saving}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-60"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      </main>

    </div>
  );
}
