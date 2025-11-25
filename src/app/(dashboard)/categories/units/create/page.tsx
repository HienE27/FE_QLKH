'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createUnit } from '@/services/unit.service';

export default function CreateUnitPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createUnit({
        name: name.trim(),
        description: description.trim() || null,
        active,
      });
      router.push('/categories/units');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tạo đơn vị';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Đơn vị tính &gt; Thêm đơn vị
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
            THÊM MỚI ĐƠN VỊ TÍNH
          </h2>

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
                Tên đơn vị <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ví dụ: Cái, Thùng, Bộ..."
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
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                placeholder="Ghi chú thêm cho đơn vị tính"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <span className="text-sm font-medium text-gray-700">
                Trạng thái
              </span>
              <div className="col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={active === true}
                    onChange={() => setActive(true)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Hoạt động</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={active === false}
                    onChange={() => setActive(false)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Không hoạt động</span>
                </label>
              </div>
            </div>

            <div className="flex justify-center gap-6 pt-4">
              <button
                type="button"
                onClick={() => router.push('/categories/units')}
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


