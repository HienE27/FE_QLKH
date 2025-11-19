'use client';
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import {
  getProduct,
  updateProduct,
  uploadProductImage,
} from '@/services/product.service';
import type { Product, ProductPayload } from '@/types/product';

const CATEGORY_OPTIONS = [
  { id: 1, label: 'Điện thoại' },
  { id: 2, label: 'Tai nghe' },
  { id: 3, label: 'Cáp sạc - Củ sạc' },
  { id: 4, label: 'Phụ kiện' },
];

const UNIT_OPTIONS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng'];

const API_BASE_URL = 'http://localhost:8080';

function parseMoney(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[.,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ✅ Hàm build full URL từ relative path
function buildImageUrl(path: string | null): string | null {
  if (!path) return null;
  
  // Nếu đã là full URL thì giữ nguyên
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Nếu là relative path thì thêm base URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

type RouteParams = { id: string };

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<RouteParams>();
  const productId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // ✅ Image state
  const [currentImagePath, setCurrentImagePath] = useState<string | null>(null); // Relative path từ DB
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load product data
  useEffect(() => {
    if (!productId || Number.isNaN(productId)) {
      setError('ID sản phẩm không hợp lệ');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      try {
        const p: Product = await getProduct(productId);
        if (cancelled) return;

        setCode(p.code);
        setName(p.name);
        setDescription(p.shortDescription ?? '');
        setPrice(p.unitPrice != null ? String(p.unitPrice) : '');
        setCategoryId(p.categoryId ?? '');
        setStatus(p.status === 'inactive' ? 'inactive' : 'active');

        // ✅ Lưu relative path và build preview URL
        const imagePath = p.image ?? null;
        setCurrentImagePath(imagePath);
        setPreviewUrl(buildImageUrl(imagePath));
        
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu sản phẩm';
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProduct();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Handle form submit
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let finalImagePath = currentImagePath;

      // ✅ Chỉ upload nếu có file mới
      if (newImageFile) {
        try {
          const uploadedPath = await uploadProductImage(newImageFile);
          finalImagePath = uploadedPath; // Backend trả về relative path
          console.log('✅ Uploaded new image:', uploadedPath);
        } catch (uploadErr) {
          console.error('❌ Upload failed:', uploadErr);
          throw new Error('Không thể upload hình ảnh mới');
        }
      }

      const payload: ProductPayload = {
        code,
        name,
        shortDescription: description,
        image: finalImagePath, // Lưu relative path vào DB
        unitPrice: parseMoney(price),
        quantity: 0,
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        supplierId: null,
      };

      console.log('📤 Sending payload:', payload);

      await updateProduct(productId, payload);
      
      console.log('✅ Product updated successfully');
      router.push('/dashboard/products');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi cập nhật hàng hóa';
      setError(message);
      console.error('❌ Update failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Handle image file change
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    
    // ✅ Cleanup previous blob URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setNewImageFile(file);

    if (file) {
      // Tạo blob URL cho preview
      const blobUrl = URL.createObjectURL(file);
      setPreviewUrl(blobUrl);
      console.log('🖼️ New image selected:', file.name);
    } else {
      // Nếu bỏ chọn file, quay về ảnh cũ
      setPreviewUrl(buildImageUrl(currentImagePath));
      console.log('↩️ Reverted to current image');
    }
  };

  // ✅ Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Danh mục hàng hóa &gt; Chỉnh sửa hàng hóa
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
            CHỈNH SỬA HÀNG HÓA
          </h2>

          {loading ? (
            <p className="text-center text-sm text-gray-500">
              Đang tải dữ liệu...
            </p>
          ) : (
            <>
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
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
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

                {/* ✅ Hình ảnh */}
                <div className="grid grid-cols-3 gap-4 items-start">
                  <label
                    htmlFor="image"
                    className="text-sm font-medium text-gray-700 pt-2"
                  >
                    Hình ảnh
                  </label>
                  <div className="col-span-2 space-y-3">
                    <input
                      id="image"
                      type="file"
                      title="Chọn hình ảnh sản phẩm"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {/* Preview image */}
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="Xem trước hình ảnh"
                          className="h-32 w-32 rounded border object-cover"
                          onError={(e) => {
                            console.error('❌ Image load error:', previewUrl);
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect fill="%23ddd" width="128" height="128"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                          }}
                        />
                        {newImageFile && (
                          <span className="text-xs text-green-600 mt-1 block">
                            ✓ Đã chọn ảnh mới
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-32 w-32 rounded border bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        Chưa có ảnh
                      </div>
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

                {/* Buttons */}
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
            </>
          )}
        </div>
      </main>
    </div>
  );
}