'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getProduct, updateProduct } from '@/services/product.service';
import type { Product, ProductPayload } from '@/types/product';

type Props = {
  params: { id: string };
};

const CATEGORY_OPTIONS = [
  { id: 1, label: 'Điện thoại' },
  { id: 2, label: 'Tai nghe' },
  { id: 3, label: 'Cáp sạc - Củ sạc' },
  { id: 4, label: 'Phụ kiện' },
];

const UNIT_OPTIONS = ['Cái', 'Chiếc', 'Bộ', 'Hộp', 'Thùng'];

export default function EditProductPage({ params }: Props) {
  const router = useRouter();
  const productId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unit, setUnit] = useState(UNIT_OPTIONS[0]);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const product: Product = await getProduct(productId);

        if (!mounted) return;

        setCode(product.code);
        setName(product.name);
        setCategoryId(product.categoryId ?? '');
        setPrice(String(product.unitPrice ?? ''));
        setDescription(product.shortDescription ?? '');
        setStatus(
          (product.status as 'active' | 'inactive') ?? 'active',
        );
      } catch (error: unknown) {
        if (!mounted) return;
        const message =
          error instanceof Error
            ? error.message
            : 'Không tải được dữ liệu sản phẩm';
        setError(message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [productId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSaving(true);

    try {
      const payload: ProductPayload = {
        code,
        name,
        shortDescription: description,
        image: null,
        unitPrice: Number(price || 0),
        quantity: 0,
        status,
        categoryId: categoryId === '' ? null : Number(categoryId),
        supplierId: null,
      };

      await updateProduct(productId, payload);
      router.push('/dashboard/categories/products');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra khi cập nhật hàng hóa';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
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

        {loading && (
          <p className="text-center text-sm text-gray-500">
            Đang tải dữ liệu...
          </p>
        )}

        {!loading && (
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
              {/* Các field giống create, chỉ khác value/onChange – em reuse y chang */}
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
                  onChange={e => setCode(e.target.value)}
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
                  onChange={e => setName(e.target.value)}
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
                    onChange={e =>
                      setCategoryId(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    required
                  >
                    <option value="">Chọn nhóm hàng</option>
                    {CATEGORY_OPTIONS.map(opt => (
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

              {/* Đơn vị tính – FE only */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <label
                  htmlFor="unit"
                  className="text-sm font-medium text-gray-700"
                >
                  Đơn vị tính
                </label>
                <div className="col-span-2 relative">
                  <select
                    id="unit"
                    className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                  >
                    {UNIT_OPTIONS.map(u => (
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
                  onChange={e => setPrice(e.target.value)}
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
                  onChange={e => setDescription(e.target.value)}
                />
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

              {/* Nút */}
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
  );
}