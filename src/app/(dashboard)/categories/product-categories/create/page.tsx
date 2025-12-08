'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCategory } from '@/services/category.service';

export default function CreateCategoryPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createCategory({
        code: '', // Mã sẽ được tự động tạo ở backend
        name: name.trim(),
        description: description.trim() || null,
      });
      router.push('/categories/product-categories');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tạo danh mục';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Thêm danh mục</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Tạo mới danh mục hàng hóa</p>
      </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                THÊM MỚI DANH MỤC
              </h2>
              <div className="h-1 w-24 bg-[#0099FF] mx-auto rounded-full"></div>
            </div>

            {error && (
              <div className="max-w-3xl mx-auto mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-3 gap-4 items-center">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Nhập tên danh mục"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4 items-start">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-gray-700 pt-2"
                >
                  Mô tả
                </label>
                <textarea
                  id="description"
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24 resize-none transition-all"
                  placeholder="Nhập mô tả"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => router.push('/categories/categories')}
                  className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
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
                      Lưu
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
    </>
  );
}


