'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { deleteCategory, getCategories } from '@/services/category.service';
import type { Category } from '@/types/category';

export default function CategoryManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh mục';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const keyword = searchTerm.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.code.toLowerCase().includes(keyword) ||
        cat.name.toLowerCase().includes(keyword) ||
        (cat.description ?? '').toLowerCase().includes(keyword),
    );
  }, [categories, searchTerm]);

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa danh mục này?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Xóa danh mục thất bại';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Nhóm hàng &gt; Quản lý danh mục
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">QUẢN LÝ DANH MỤC HÀNG HÓA</h2>
              <p className="text-sm text-gray-500">
                Thêm mới, chỉnh sửa hoặc xóa danh mục để tổ chức hàng hóa của
                bạn.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Tìm theo mã, tên hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => router.push('/categories/categories/create')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
              >
                + Thêm danh mục
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-center text-sm text-gray-500 py-10">
              Đang tải danh sách danh mục...
            </p>
          ) : filteredCategories.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              Không có danh mục nào phù hợp.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full overflow-hidden border border-gray-200 rounded-xl shadow-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-semibold">STT</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Tên danh mục
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Mã danh mục
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Mô tả
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredCategories.map((cat, index) => (
                      <tr key={cat.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-4 text-gray-700 font-semibold">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-semibold">
                          {cat.name}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{cat.code}</td>
                        <td className="px-4 py-4 text-gray-600">
                          {cat.description || '—'}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/categories/categories/edit/${cat.id}`)
                              }
                              className="hover:scale-110 transition-transform"
                              title="Chỉnh sửa"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13"
                                  stroke="#0046ff"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                  stroke="#0046ff"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(cat.id)}
                              disabled={deletingId === cat.id}
                              className="hover:scale-110 transition-transform disabled:opacity-60"
                              title="Xóa"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                                  stroke={deletingId === cat.id ? '#a1a1aa' : '#ee4b3d'}
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 flex items-center justify-between">
                  <span>
                    Hiển thị 1 - {filteredCategories.length} /{' '}
                    {filteredCategories.length} bản ghi
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 border border-gray-300 rounded-md text-gray-500 bg-white cursor-not-allowed"
                      disabled
                    >
                      Trước
                    </button>
                    <span className="text-sm text-gray-700">Trang 1 / 1</span>
                    <button
                      type="button"
                      className="px-3 py-1 border border-gray-300 rounded-md text-gray-500 bg-white cursor-not-allowed"
                      disabled
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

    </div>
  );
}
