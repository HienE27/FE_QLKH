'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getUnit, updateUnit } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

export default function EditUnitPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const unitId = Number(params?.id);

  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUnit = async () => {
      if (!Number.isFinite(unitId)) {
        setError('ID đơn vị không hợp lệ');
        setLoading(false);
        return;
      }
      try {
        const data = await getUnit(unitId);
        if (!cancelled) {
          setUnit(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin đơn vị';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUnit();

    return () => {
      cancelled = true;
    };
  }, [unitId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!unit) return;

    setError(null);
    setSaving(true);
    try {
      await updateUnit(unit.id, {
        name: unit.name,
        description: unit.description ?? null,
        active: unit.active !== false,
      });
      router.push('/categories/units');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể cập nhật đơn vị';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <Sidebar />
        <main className="ml-[377px] mt-[113px] p-6 pr-12">
          <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
            <p className="text-sm text-gray-500">Đang tải dữ liệu...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-screen">
        <Header />
        <Sidebar />
        <main className="ml-[377px] mt-[113px] p-6 pr-12">
          <div className="bg-white rounded-lg shadow-2xl p-8 text-center space-y-4">
            <p className="text-sm text-red-600">
              {error ?? 'Không tìm thấy đơn vị'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/categories/units')}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Quay lại danh sách
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        <div className="mb-4">
          <p className="text-base font-bold text-gray-800">
            Danh mục &gt; Đơn vị tính &gt; Chỉnh sửa đơn vị
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
            CHỈNH SỬA ĐƠN VỊ TÍNH
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
                value={unit.name}
                onChange={(e) =>
                  setUnit((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                }
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
                value={unit.description ?? ''}
                onChange={(e) =>
                  setUnit((prev) =>
                    prev ? { ...prev, description: e.target.value } : prev,
                  )
                }
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
                    checked={unit.active !== false}
                    onChange={() =>
                      setUnit((prev) =>
                        prev ? { ...prev, active: true } : prev,
                      )
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Hoạt động</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={unit.active === false}
                    onChange={() =>
                      setUnit((prev) =>
                        prev ? { ...prev, active: false } : prev,
                      )
                    }
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


