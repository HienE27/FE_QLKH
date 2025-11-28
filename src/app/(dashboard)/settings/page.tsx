'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { deleteSetting, getSettings, getSettingById } from '@/services/settings.service';
import type { Setting } from '@/types/setting';

export default function SettingsManagementPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [viewingSetting, setViewingSetting] = useState<Setting | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadSettings = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await getSettings();
      setSettings(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải cài đặt';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const filteredSettings = useMemo(() => {
    if (!searchTerm.trim()) return settings;
    const keyword = searchTerm.toLowerCase();
    return settings.filter(
      (setting) =>
        setting.settingKey.toLowerCase().includes(keyword) ||
        (setting.value ?? '').toLowerCase().includes(keyword) ||
        (setting.description ?? '').toLowerCase().includes(keyword),
    );
  }, [settings, searchTerm]);

  const paginatedSettings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSettings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSettings, currentPage]);

  const totalPages = Math.ceil(filteredSettings.length / itemsPerPage);

  const handleViewDetail = async (id: number) => {
    try {
      const setting = await getSettingById(id);
      setViewingSetting(setting);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể tải chi tiết';
      setError(message);
    }
  };

  const handleDelete = async (id: number) => {
    const setting = settings.find(s => s.id === id);
    const confirmDelete = window.confirm(
      `Bạn có chắc muốn xóa cài đặt "${setting?.settingKey}"?\n\nHành động này không thể hoàn tác.`
    );
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      await deleteSetting(id);
      await loadSettings();
      // Reset to first page if current page becomes empty
      if (paginatedSettings.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Xóa cài đặt thất bại';
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
            Hệ thống &gt; Cài đặt
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                    fill="#2563eb"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  💡 Settings giúp bạn làm gì?
                </h3>
                <p className="text-xs text-blue-700 mb-2">
                  Thay đổi nội dung hệ thống mà <strong>KHÔNG CẦN sửa code</strong>:
                </p>
                <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
                  <li>Tên công ty, thông tin liên hệ (đã tích hợp vào Header)</li>
                  <li>Giới hạn hệ thống (số lượng tối đa, ngưỡng cảnh báo...)</li>
                  <li>Thông báo, banner, nội dung động</li>
                  <li>Cấu hình tích hợp (API keys, URLs...)</li>
                </ul>
                <a
                  href="/SETTINGS_USAGE_EXAMPLES.md"
                  target="_blank"
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                >
                  📖 Xem ví dụ sử dụng chi tiết →
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold">QUẢN LÝ CÀI ĐẶT HỆ THỐNG</h2>
              <p className="text-sm text-gray-500">
                Quản lý các cài đặt cấu hình của hệ thống. Tạo mới, chỉnh sửa hoặc xóa cài đặt.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                placeholder="Tìm theo key, value hoặc mô tả..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => router.push('/settings/create')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors"
              >
                + Thêm cài đặt
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
              Đang tải danh sách cài đặt...
            </p>
          ) : filteredSettings.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">
              {searchTerm ? 'Không có cài đặt nào phù hợp với từ khóa tìm kiếm.' : 'Chưa có cài đặt nào. Hãy tạo cài đặt mới.'}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full overflow-hidden border border-gray-200 rounded-xl shadow-md">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-blue-600 text-white text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-semibold">STT</th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Key
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Giá trị
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Mô tả
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Cập nhật
                        </th>
                        <th className="px-4 py-3 text-center font-semibold">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedSettings.map((setting, index) => {
                        const displayIndex = (currentPage - 1) * itemsPerPage + index + 1;
                        const valuePreview = setting.value && setting.value.length > 50 
                          ? `${setting.value.substring(0, 50)}...` 
                          : setting.value;
                        return (
                          <tr key={setting.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-4 text-gray-700 font-semibold">
                              {displayIndex}
                            </td>
                            <td className="px-4 py-4 text-gray-900 font-semibold">
                              {setting.settingKey}
                            </td>
                            <td className="px-4 py-4 text-gray-700 max-w-md">
                              <div className="flex items-center gap-2">
                                <span className="truncate" title={setting.value || ''}>
                                  {valuePreview || '—'}
                                </span>
                                {setting.value && setting.value.length > 50 && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewDetail(setting.id)}
                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                    title="Xem chi tiết"
                                  >
                                    Xem
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-gray-600">
                              {setting.description || '—'}
                            </td>
                            <td className="px-4 py-4 text-gray-500 text-xs">
                              {setting.updatedAt ? new Date(setting.updatedAt).toLocaleString('vi-VN') : '—'}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetail(setting.id)}
                                  className="hover:scale-110 transition-transform"
                                  title="Xem chi tiết"
                                >
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path
                                      d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"
                                      stroke="#2563eb"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <circle cx="12" cy="12" r="3" stroke="#2563eb" strokeWidth="2" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/settings/edit/${setting.id}`)
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
                                  onClick={() => handleDelete(setting.id)}
                                  disabled={deletingId === setting.id}
                                  className="hover:scale-110 transition-transform disabled:opacity-60"
                                  title="Xóa"
                                >
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path
                                      d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                                      stroke={deletingId === setting.id ? '#a1a1aa' : '#ee4b3d'}
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 text-sm text-gray-600 bg-gray-50 flex items-center justify-between">
                    <span>
                      Hiển thị {paginatedSettings.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredSettings.length)} /{' '}
                      {filteredSettings.length} bản ghi
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Trước
                      </button>
                      <span className="text-sm text-gray-700">
                        Trang {currentPage} / {totalPages || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal xem chi tiết */}
      {viewingSetting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-blue-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
              <h3 className="text-lg font-bold">Chi tiết cài đặt</h3>
              <button
                type="button"
                onClick={() => setViewingSetting(null)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700">Key</label>
                <div className="mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-900 font-mono">
                  {viewingSetting.settingKey}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Giá trị</label>
                <div className="mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                  {viewingSetting.value || <span className="text-gray-400">(Trống)</span>}
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Mô tả</label>
                <div className="mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                  {viewingSetting.description || <span className="text-gray-400">(Không có mô tả)</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Ngày tạo</label>
                  <div className="mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 text-sm">
                    {viewingSetting.createdAt ? new Date(viewingSetting.createdAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Cập nhật lần cuối</label>
                  <div className="mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 text-sm">
                    {viewingSetting.updatedAt ? new Date(viewingSetting.updatedAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setViewingSetting(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingSetting(null);
                    router.push(`/settings/edit/${viewingSetting.id}`);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

