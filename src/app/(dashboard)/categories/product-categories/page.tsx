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
import { deleteCategory, searchCategories } from '@/services/category.service';
import type { Category } from '@/types/category';

export default function CategoryManagementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadCategories = async (page: number = 1) => {
    try {
      setError(null);
      setLoading(true);
      const result = await searchCategories({
        code: searchCode || undefined,
        name: searchName || undefined,
        page: page - 1,
        size: PAGE_SIZE,
      });
      setCategories(result.content);
      setTotalPages(result.totalPages);
      setTotalItems(result.totalElements);
      // Note: currentPage được quản lý bởi usePagination hook
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh mục';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCode, searchName]);

  // Sử dụng hook usePagination với scroll preservation
  const { currentPage, handlePageChange, resetPage } = usePagination({
    itemsPerPage: PAGE_SIZE,
    totalItems,
    totalPages,
    onPageChange: loadCategories,
  });

  // Sử dụng hook useFilterReset để tái sử dụng logic reset filter
  const { handleResetFilter } = useFilterReset({
    resetFilters: () => {
      setSearchCode('');
      setSearchName('');
    },
    loadData: async (page = 1) => {
      try {
        setError(null);
        setLoading(true);
        const response = await searchCategories({
          code: undefined,
          name: undefined,
          page: page - 1,
        size: PAGE_SIZE,
      });
        setCategories(response.content);
        setTotalPages(response.totalPages);
        setTotalItems(response.totalElements);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Không thể tải danh mục';
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
    const confirmDelete = window.confirm('Bạn có chắc muốn xóa danh mục này?');
    if (!confirmDelete) return;

    try {
      setDeletingId(id);
      await deleteCategory(id);
      await loadCategories(currentPage);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Xóa danh mục thất bại';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearch = () => {
    loadCategories(1);
  };

  return (
    <>
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Danh mục hàng hóa</h1>
        <p className="text-sm text-blue-gray-600 uppercase">Quản lý danh mục hàng hóa</p>
      </div>

      {/* Content Container */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
      <FilterSection
        error={error}
            onClearFilter={handleResetFilter}
        onCreateNew={() => router.push('/categories/product-categories/create')}
        createButtonText="Thêm danh mục"
      >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-gray-800 mb-2">
              Mã danh mục
            </label>
            <input
              type="text"
              placeholder="Nhập mã danh mục..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
                  className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
            />
          </div>
        <div>
          <label className="block text-sm font-medium text-blue-gray-800 mb-2">
              Tên danh mục
          </label>
          <input
            type="text"
              placeholder="Nhập tên danh mục..."
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
            <DataTable<Category>
              columns={[
                { key: 'stt', label: 'STT', align: 'left' },
                { key: 'name', label: 'Tên danh mục', align: 'left' },
                { key: 'code', label: 'Mã danh mục', align: 'left' },
                { key: 'description', label: 'Mô tả', align: 'left' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={categories}
              loading={loading}
              emptyMessage="Không có danh mục nào phù hợp"
              startIndex={(currentPage - 1) * PAGE_SIZE}
              renderRow={(cat, index) => (
                <>
                  <td className="px-4 text-sm text-blue-gray-800">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                  <td className="px-4 text-sm text-blue-gray-800">{cat.name}</td>
                  <td className="px-4 text-sm text-blue-gray-800">{cat.code}</td>
                  <td className="px-4 text-sm text-blue-gray-600">{cat.description || '—'}</td>
                  <td className="px-4">
                    <ActionButtons
                      onEdit={() => router.push(`/categories/product-categories/edit/${cat.id}`)}
                      onDelete={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
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
