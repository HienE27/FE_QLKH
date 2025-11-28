'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getSettingById, createOrUpdateSetting } from '@/services/settings.service';
import type { Setting } from '@/types/setting';

export default function EditSettingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const settingId = Number(params?.id);

  const [initialData, setInitialData] = useState<Setting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSetting = async () => {
      if (!Number.isFinite(settingId)) {
        setError('ID cài đặt không hợp lệ');
        setLoading(false);
        return;
      }
      try {
        const data = await getSettingById(settingId);
        if (!cancelled) {
          setInitialData(data);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : 'Không thể tải thông tin cài đặt';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSetting();

    return () => {
      cancelled = true;
    };
  }, [settingId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!initialData) return;

    setError(null);
    setSaving(true);
    try {
      await createOrUpdateSetting({
        key: initialData.settingKey,
        value: initialData.value || undefined,
        description: initialData.description || undefined,
      });
      router.push('/settings');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể cập nhật cài đặt';
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

  if (!initialData) {
    return (
      <div className="min-h-screen">
        <Header />
        <Sidebar />
        <main className="ml-[377px] mt-[113px] p-6 pr-12">
          <div className="bg-white rounded-lg shadow-2xl p-8 text-center space-y-4">
            <p className="text-sm text-red-600">
              {error ?? 'Không tìm thấy cài đặt'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/settings')}
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
            Hệ thống &gt; Cài đặt &gt; Chỉnh sửa cài đặt
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
            CHỈNH SỬA CÀI ĐẶT
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
                htmlFor="key"
                className="text-sm font-medium text-gray-700"
              >
                Key <span className="text-red-500">*</span>
              </label>
              <input
                id="key"
                type="text"
                className="col-span-2 px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                value={initialData.settingKey}
                readOnly
                disabled
              />
            </div>

            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="value"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Giá trị
              </label>
              <div className="col-span-2">
                <textarea
                  id="value"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-y"
                  placeholder="Nhập giá trị cài đặt"
                  value={initialData.value ?? ''}
                  onChange={(e) =>
                    setInitialData((prev) =>
                      prev ? { ...prev, value: e.target.value } : prev,
                    )
                  }
                  maxLength={5000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(initialData.value ?? '').length}/5000 ký tự
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-start">
              <label
                htmlFor="description"
                className="text-sm font-medium text-gray-700 pt-2"
              >
                Mô tả
              </label>
              <div className="col-span-2">
                <textarea
                  id="description"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-y"
                  placeholder="Nhập mô tả cho cài đặt này"
                  value={initialData.description ?? ''}
                  onChange={(e) =>
                    setInitialData((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev,
                    )
                  }
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {(initialData.description ?? '').length}/1000 ký tự
                </p>
              </div>
            </div>

            <div className="flex justify-center gap-6 pt-4">
              <button
                type="button"
                onClick={() => router.push('/settings')}
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

