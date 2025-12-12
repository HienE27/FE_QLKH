'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FilterSection from '@/components/common/FilterSection';
import VirtualTable from '@/components/common/VirtualTable';
import ActionButtons from '@/components/common/ActionButtons';
import Pagination from '@/components/common/Pagination';
import { PAGE_SIZE } from '@/constants/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';
import { deleteStore, searchStores } from '@/services/store.service';
import type { Store } from '@/services/store.service';

export default function StoreManagementPage() {
    const router = useRouter();
    const { confirm } = useConfirm();
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchCode, setSearchCode] = useState('');
    const [searchName, setSearchName] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // Debounce search inputs (500ms)
    const debouncedSearchCode = useDebounce(searchCode, 500);
    const debouncedSearchName = useDebounce(searchName, 500);

    const loadStores = async (page: number = 1) => {
        try {
            setError(null);
            setLoading(true);
            const result = await searchStores({
                code: debouncedSearchCode || undefined,
                name: debouncedSearchName || undefined,
                page: page - 1,
                size: PAGE_SIZE,
            });
            setStores(result.content);
            setTotalPages(result.totalPages);
            setTotalItems(result.totalElements);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'Không thể tải danh sách kho hàng';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStores(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchCode, debouncedSearchName]);

    // Sử dụng hook usePagination với scroll preservation
    const { currentPage, handlePageChange, resetPage } = usePagination({
        itemsPerPage: PAGE_SIZE,
        totalItems,
        totalPages,
        onPageChange: loadStores,
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
                const response = await searchStores({
                    code: undefined,
                    name: undefined,
                    page: page - 1,
                    size: PAGE_SIZE,
                });
                setStores(response.content);
                setTotalPages(response.totalPages);
                setTotalItems(response.totalElements);
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Không thể tải danh sách kho hàng';
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
        confirm({
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa kho hàng này?',
            variant: 'danger',
            confirmText: 'Xóa',
            cancelText: 'Hủy',
            onConfirm: async () => {
                try {
                    setDeletingId(id);
                    await deleteStore(id);
                    showToast.success('Xóa kho hàng thành công');
                    await loadStores(currentPage);
                } catch (err) {
                    const message =
                        err instanceof Error ? err.message : 'Xóa kho hàng thất bại';
                    showToast.error(message);
                    setError(message);
                } finally {
                    setDeletingId(null);
                }
            },
        });
    };

    const handleSearch = () => {
        loadStores(1);
    };

    return (
        <>
            <div className="mb-12">
                <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Kho hàng</h1>
                <p className="text-sm text-blue-gray-600 uppercase">Quản lý kho hàng</p>
            </div>

            {/* Content Container */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
                    {/* Filter Section */}
                        <FilterSection
                error={error}
                onClearFilter={handleResetFilter}
                onCreateNew={() => router.push('/categories/stores/create')}
                createButtonText="Thêm kho hàng"
            >
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-blue-gray-800 mb-2">
                            Mã kho
                        </label>
                        <input
                            type="text"
                            placeholder="Nhập mã kho..."
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
                            Tên kho
                    </label>
                    <input
                        type="text"
                            placeholder="Nhập tên kho..."
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
                        <VirtualTable
                columns={[
                    { key: 'stt', label: 'STT', align: 'left' },
                    { key: 'code', label: 'Mã kho', align: 'left' },
                    { key: 'name', label: 'Tên kho', align: 'left' },
                    { key: 'description', label: 'Mô tả', align: 'left' },
                    { key: 'actions', label: 'Thao tác', align: 'center' },
                ]}
                data={stores}
                loading={loading}
                emptyMessage="Không có kho hàng nào phù hợp"
                startIndex={(currentPage - 1) * PAGE_SIZE}
                rowHeight={48}
                viewportHeight={560}
                renderRow={(store, index) => (
                    <>
                        <td className="px-4 text-sm text-blue-gray-800">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="px-4 text-sm text-blue-gray-800">
                            {store.code || '—'}
                        </td>
                        <td className="px-4 text-sm text-blue-gray-800">
                            {store.name}
                        </td>
                        <td className="px-4 text-sm text-blue-gray-400">
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
