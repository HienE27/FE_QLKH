'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { createOrUpdateSetting } from '@/services/settings.service';

export default function CreateSettingPage() {
  const router = useRouter();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await createOrUpdateSetting({
        key: key.trim(),
        value: value.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push('/settings');
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tạo cài đặt';
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
            Hệ thống &gt; Cài đặt &gt; Thêm cài đặt
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h2 className="text-xl font-bold text-center mb-6">
            THÊM MỚI CÀI ĐẶT
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
              <div className="col-span-2">
                <input
                  id="key"
                  type="text"
                  className="w-full px-4 py-2 border border-blue-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập key (ví dụ: site_name, email_support)"
                  value={key}
                  onChange={(e) => setKey(e.target.value.replace(/\s+/g, '_').toLowerCase())}
                  maxLength={100}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Key chỉ chứa chữ thường, số và dấu gạch dưới. Tối đa 100 ký tự.
                </p>
              </div>
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
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={5000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {value.length}/5000 ký tự
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {description.length}/1000 ký tự
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

