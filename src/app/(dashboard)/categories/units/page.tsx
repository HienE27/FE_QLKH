'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
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
    <PageLayout>
      <FilterSection
        error={error}
        onClearFilter={() => setSearchTerm('')}
        onCreateNew={() => router.push('/categories/units/create')}
        createButtonText="Thêm đơn vị"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tìm kiếm
          </label>
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </FilterSection>

      <DataTable
        columns={[
          { key: 'stt', label: 'STT', align: 'left' },
          { key: 'name', label: 'Tên đơn vị', align: 'left' },
          { key: 'description', label: 'Mô tả', align: 'left' },
          { key: 'status', label: 'Trạng thái', align: 'left' },
          { key: 'actions', label: 'Thao tác', align: 'center' },
        ]}
        data={filteredUnits}
        loading={loading}
        emptyMessage="Không có đơn vị nào phù hợp"
        renderRow={(unit, index) => (
          <>
            <td className="px-4 text-sm">{index + 1}</td>
            <td className="px-4 text-sm">{unit.name}</td>
            <td className="px-4 text-sm">{unit.description || '—'}</td>
            <td className="px-4 text-sm">
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  unit.active === false
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {unit.active === false ? 'Không hoạt động' : 'Hoạt động'}
              </span>
            </td>
            <td className="px-4">
              <ActionButtons
                onEdit={() => router.push(`/categories/units/edit/${unit.id}`)}
                onDelete={() => handleDelete(unit.id)}
                disabled={deletingId === unit.id}
              />
            </td>
          </>
        )}
      />
    </PageLayout>
  );
}
