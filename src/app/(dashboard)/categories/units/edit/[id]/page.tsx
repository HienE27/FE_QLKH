'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center">
        <p className="text-sm text-blue-gray-600">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 p-8 text-center space-y-4">
        <p className="text-sm text-red-500">
          {error ?? 'Không tìm thấy đơn vị'}
        </p>
        <button
          type="button"
          onClick={() => router.push('/categories/units')}
          className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Chỉnh sửa đơn vị tính</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Cập nhật thông tin đơn vị tính</p>
      </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-center mb-2 text-blue-gray-800">
                CHỈNH SỬA ĐƠN VỊ TÍNH
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
                  Tên đơn vị <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="col-span-2 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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

              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
                <button
                  type="button"
                  onClick={() => router.push('/categories/units')}
                  className="px-8 py-3 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
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
                      Cập nhật
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


