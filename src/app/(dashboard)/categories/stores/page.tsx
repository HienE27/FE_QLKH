'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { deleteStore, getStores } from '@/services/store.service';
import type { Store } from '@/services/store.service';

export default function StoreManagementPage() {
    const router = useRouter();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadStores = useCallback(async () => {
        try {
            setError(null);
            setLoading(true);
            const data = await getStores();
            setStores(data);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Không thể tải danh sách kho hàng';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStores();
    }, [loadStores]);

    const filteredStores = useMemo(() => {
        if (!searchTerm.trim()) return stores;
        const keyword = searchTerm.toLowerCase();
        return stores.filter(
            (store) =>
                (store.code ?? '').toLowerCase().includes(keyword) ||
                store.name.toLowerCase().includes(keyword) ||
                (store.description ?? '').toLowerCase().includes(keyword),
        );
    }, [stores, searchTerm]);

    const {
        currentData,
        currentPage,
        totalPages,
        paginationInfo,
        goToPage,
    } = usePagination(filteredStores, PAGE_SIZE);

    const handleDelete = async (id: number) => {
        const confirmDelete = window.confirm('Bạn có chắc muốn xóa kho hàng này?');
        if (!confirmDelete) return;

        try {
            setDeletingId(id);
            await deleteStore(id);
            await loadStores();
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Xóa kho hàng thất bại';
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
                onCreateNew={() => router.push('/categories/stores/create')}
                createButtonText="Thêm kho hàng"
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
                    { key: 'code', label: 'Mã kho', align: 'left' },
                    { key: 'name', label: 'Tên kho', align: 'left' },
                    { key: 'description', label: 'Mô tả', align: 'left' },
                    { key: 'actions', label: 'Thao tác', align: 'center' },
                ]}
                data={currentData}
                loading={loading}
                emptyMessage="Không có kho hàng nào phù hợp"
                startIndex={(currentPage - 1) * PAGE_SIZE}
                renderRow={(store, index) => (
                    <>
                        <td className="px-4 text-sm">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-4 text-sm">
                            {store.code || '—'}
                        </td>
                        <td className="px-4 text-sm">
                            {store.name}
                        </td>
                        <td className="px-4 text-sm">
                            {store.description || '—'}
                        </td>
                        <td className="px-4">
                            <ActionButtons
                                onView={() => router.push(`/categories/stores/view/${store.id}`)}
                                onEdit={() => router.push(`/categories/stores/edit/${store.id}`)}
                                onDelete={() => handleDelete(store.id)}
                                disabled={deletingId === store.id}
                            />
                        </td>
                    </>
                )}
            />

            {!loading && filteredStores.length > 0 && (
                <div className="mt-4">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={paginationInfo.totalItems}
                        itemsPerPage={paginationInfo.itemsPerPage}
                        onPageChange={goToPage}
                    />
                </div>
            )}
        </PageLayout>
    );
}

