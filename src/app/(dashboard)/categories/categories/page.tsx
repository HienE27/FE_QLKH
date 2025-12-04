'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
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
    <PageLayout>
      <FilterSection
        error={error}
        onClearFilter={() => setSearchTerm('')}
        onCreateNew={() => router.push('/categories/categories/create')}
        createButtonText="Thêm danh mục"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo mã, tên hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </FilterSection>

      <DataTable
        columns={[
          { key: 'stt', label: 'STT', align: 'left' },
          { key: 'name', label: 'Tên danh mục', align: 'left' },
          { key: 'code', label: 'Mã danh mục', align: 'left' },
          { key: 'description', label: 'Mô tả', align: 'left' },
          { key: 'actions', label: 'Thao tác', align: 'center' },
        ]}
        data={filteredCategories}
        loading={loading}
        emptyMessage="Không có danh mục nào phù hợp"
        renderRow={(cat, index) => (
          <>
            <td className="px-4 text-sm">{index + 1}</td>
            <td className="px-4 text-sm">{cat.name}</td>
            <td className="px-4 text-sm">{cat.code}</td>
            <td className="px-4 text-sm">{cat.description || '—'}</td>
            <td className="px-4">
              <ActionButtons
                onEdit={() => router.push(`/categories/categories/edit/${cat.id}`)}
                onDelete={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
              />
            </td>
          </>
        )}
      />
    </PageLayout>
  );
}
