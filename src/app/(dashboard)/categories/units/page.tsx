'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import { deleteUnit, searchUnits } from '@/services/unit.service';
import type { Unit } from '@/types/unit';

export default function UnitManagementPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadUnits = async (page: number = 1) => {
    try {
      setError(null);
      setLoading(true);
      const result = await searchUnits({
        name: searchName || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      });
      setUnits(result.content);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalElements);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh sách đơn vị';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchName]);

  // Sử dụng hook usePagination với scroll preservation
  const { currentPage, handlePageChange, resetPage } = usePagination({
    itemsPerPage: PAGE_SIZE,
    totalItems,
    totalPages,
    onPageChange: loadUnits,
  });

  // Sử dụng hook useFilterReset để tái sử dụng logic reset filter
  const { handleResetFilter } = useFilterReset({
    resetFilters: () => {
      setSearchName('');
    },
    loadData: async (page = 1) => {
      try {
        setError(null);
        setLoading(true);
        const response = await searchUnits({
          name: undefined,
          page: page - 1,
        size: PAGE_SIZE,
      });
      setUnits(response.content);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalElements);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh sách đơn vị';
      setError(message);
    } finally {
      setLoading(false);
    }
    },
    resetPage,
    setLoading,
    setError,
  });

  const handleDelete = async (id: number) => {
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa đơn vị này?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      await deleteUnit(id);
      await loadUnits(currentPage);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Xóa đơn vị thất bại';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = () => {
    loadUnits(1);
  };

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Đơn vị tính</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Quản lý đơn vị tính</p>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          <FilterSection
        error={error}
        onClearFilter={handleResetFilter}
        onCreateNew={() => router.push('/categories/units/create')}
        createButtonText="Thêm đơn vị"
      >
        <div>
          <label className="block text-sm font-medium text-blue-gray-800 mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
          />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={handleSearch}
            className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M11 11L14 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Tìm kiếm
          </button>
        </div>
            </FilterSection>

          {/* Table */}
          <div className="px-6 pb-6">
            <DataTable
              columns={[
                { key: 'stt', label: 'STT', align: 'left' },
                { key: 'name', label: 'Tên đơn vị', align: 'left' },
                { key: 'description', label: 'Mô tả', align: 'left' },
                { key: 'status', label: 'Trạng thái', align: 'left' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={units}
              loading={loading}
              emptyMessage="Không có đơn vị nào phù hợp"
              startIndex={(currentPage - 1) * PAGE_SIZE}
              renderRow={(unit: Unit, index: number) => (
                <>
                  <td className="px-4 text-sm text-blue-gray-800">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 text-sm text-blue-gray-800">{String(unit.name)}</td>
                  <td className="px-4 text-sm text-blue-gray-600">{String(unit.description || '—')}</td>
                  <td className="px-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-semibold ${unit.active === false
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                        }`}
                    >
                      {unit.active === false ? 'Không hoạt động' : 'Hoạt động'}
                    </span>
                  </td>
                  <td className="px-4">
                    <ActionButtons
                      onEdit={() => router.push(`/categories/units/edit/${Number(unit.id)}`)}
                      onDelete={() => handleDelete(Number(unit.id))}
                      disabled={deletingId === Number(unit.id)}
                    />
                  </td>
                </>
              )}
            />
            {totalItems > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        </div>
    </>
  );
}
