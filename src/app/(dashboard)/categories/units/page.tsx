'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { deleteUnit, getUnits } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

export default function UnitManagementPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUnits = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getUnits();
      setUnits(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh sách đơn vị';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const filteredUnits = useMemo(() => {
    if (!searchTerm.trim()) return units;
    const keyword = searchTerm.toLowerCase();
    return units.filter(
      (unit) =>
        unit.name.toLowerCase().includes(keyword) ||
        (unit.description ?? '').toLowerCase().includes(keyword),
    );
  }, [units, searchTerm]);

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa đơn vị này?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      await deleteUnit(id);
      await loadUnits();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Xóa đơn vị thất bại';
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
            Danh mục &gt; Đơn vị tính &gt; Quản lý đơn vị
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">QUẢN LÝ ĐƠN VỊ TÍNH</h2>
              <p className="text-sm text-gray-500">
                Thêm mới, chỉnh sửa hoặc xóa đơn vị để dùng lại trong các biểu
                mẫu hàng hóa.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => router.push('/categories/units/create')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
              >
                + Thêm đơn vị
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
              Đang tải danh sách đơn vị...
            </p>
          ) : filteredUnits.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              Không có đơn vị nào phù hợp.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full overflow-hidden border border-gray-200 rounded-xl shadow-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-semibold">STT</th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Tên đơn vị
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Mô tả
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Trạng thái
                      </th>
                      <th className="px-4 py-3 text-center font-semibold">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredUnits.map((unit, index) => (
                      <tr key={unit.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-4 text-gray-700 font-semibold">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 text-gray-900 font-semibold">
                          {unit.name}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {unit.description || '—'}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              unit.active === false
                                ? 'bg-red-100 text-red-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {unit.active === false
                              ? 'Không hoạt động'
                              : 'Hoạt động'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/categories/units/edit/${unit.id}`)}
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
                              onClick={() => handleDelete(unit.id)}
                              disabled={deletingId === unit.id}
                              className="hover:scale-110 transition-transform disabled:opacity-60"
                              title="Xóa"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                                  stroke={deletingId === unit.id ? '#a1a1aa' : '#ee4b3d'}
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
                    Hiển thị 1 - {filteredUnits.length} / {filteredUnits.length}{' '}
                    bản ghi
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
