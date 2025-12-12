// src/app/(dashboard)/products/page.tsx
'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type SyntheticEvent,
} from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import FilterSection from '@/components/common/FilterSection';
import DataTable from '@/components/common/DataTable';
import ActionButtons from '@/components/common/ActionButtons';
import { searchProducts, deleteProduct } from '@/services/product.service';
import type { Product } from '@/types/product';

import { getSuppliers, type Supplier } from '@/services/supplier.service';
import { formatPrice, buildImageUrl } from '@/lib/utils';
import { PAGE_SIZE } from '@/constants/pagination';
import Pagination from '@/components/common/Pagination';
import { useAllStocks } from '@/hooks/useAllStocks';
import type { StockByStore } from '@/services/stock.service';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import { useDebounce } from '@/hooks/useDebounce';
import { useConfirm } from '@/hooks/useConfirm';
import { showToast } from '@/lib/toast';
import { TableSkeleton } from '@/components/common/TableSkeleton';

type SortKey = 'name' | 'code' | 'unitPrice';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const router = useRouter();
  const { confirm } = useConfirm();

  const [data, setData] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false); // Loading riêng cho pagination
  const [error, setError] = useState<string | null>(null);

  // search state
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Debounced values để giảm số lần gọi API
  const debouncedSearchCode = useDebounce(searchCode, 500);
  const debouncedSearchName = useDebounce(searchName, 500);

  // pagination state
  const [page, setPage] = useState(1);
  const [virtualScrollTop, setVirtualScrollTop] = useState(0);
  const pageSize = PAGE_SIZE;
  const supplierMap = useMemo(() => {
    const map = new Map<number, string>();
    suppliers.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  const VIRTUAL_ROW_HEIGHT = 72;
  const VIRTUAL_VIEWPORT_HEIGHT = 560;
  const VIRTUAL_OVERSCAN = 8;

  // ===========================
  // LOAD SUPPLIERS (chỉ load 1 lần khi mount)
  // ===========================
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const supplierList = await getSuppliers();
        setSuppliers(supplierList);
      } catch (err) {
        console.error('Error loading suppliers:', err);
      }
    };

    loadSuppliers();
  }, []); // Chỉ chạy 1 lần khi mount

  // ===========================
  // LOAD STOCKS với React Query cache
  // ===========================
  const { data: stockList = [] } = useAllStocks();

  // Tính tổng tồn kho cho mỗi sản phẩm (từ tất cả các kho) - dùng useMemo thay vì useState + useEffect
  const stockMap = useMemo(() => {
    const map = new Map<number, number>();
    stockList.forEach((stock) => {
      const current = map.get(stock.productId) || 0;
      map.set(stock.productId, current + stock.quantity);
    });
    return map;
  }, [stockList]);

  const stockDetailsMap = useMemo(() => {
    const map = new Map<number, StockByStore[]>();
    stockList.forEach((stock) => {
      if (!map.has(stock.productId)) {
        map.set(stock.productId, []);
      }
      map.get(stock.productId)!.push(stock);
    });
    return map;
  }, [stockList]);

  const queryClient = useQueryClient();

  // ===========================
  // LOAD PRODUCTS (React Query)
  // ===========================
  const productsQuery = useQuery({
    queryKey: ['products', debouncedSearchCode, debouncedSearchName, fromDate, toDate, page],
    queryFn: () =>
      searchProducts({
        code: debouncedSearchCode || undefined,
        name: debouncedSearchName || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: page - 1, // Backend dùng 0-based
        size: pageSize,
      }),
    keepPreviousData: true,
    staleTime: 60_000,
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Lỗi tải dữ liệu hàng hóa';
      setError(message);
    },
  });

  useEffect(() => {
    if (productsQuery.isError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPaginationLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(productsQuery.isFetching && page === 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaginationLoading(productsQuery.isFetching && page > 1);
    if (productsQuery.data) {
      setData(productsQuery.data.content);
      setError(null);
    }
  }, [productsQuery.isFetching, productsQuery.data, productsQuery.isError, page]);

  const totalPages = productsQuery.data?.totalPages ?? 1;
  const totalItems = productsQuery.data?.totalElements ?? 0;

  const totalVirtualHeight = useMemo(
    () => data.length * VIRTUAL_ROW_HEIGHT,
    [data.length],
  );

  const startVirtualIndex = useMemo(
    () => Math.max(0, Math.floor(virtualScrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN),
    [virtualScrollTop],
  );

  const endVirtualIndex = useMemo(
    () =>
      Math.min(
        data.length,
        Math.ceil((virtualScrollTop + VIRTUAL_VIEWPORT_HEIGHT) / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN,
      ),
    [virtualScrollTop, data.length],
  );

  const visibleRows = useMemo(
    () => data.slice(startVirtualIndex, endVirtualIndex),
    [data, startVirtualIndex, endVirtualIndex],
  );

  const paddingTop = startVirtualIndex * VIRTUAL_ROW_HEIGHT;
  const paddingBottom = Math.max(0, totalVirtualHeight - endVirtualIndex * VIRTUAL_ROW_HEIGHT);

  // ===========================
  // HANDLERS
  // ===========================
  const handleSearchClick = () => {
    setPage(1);
  };

  const handleResetFilter = async () => {
    setSearchCode('');
    setSearchName('');
    setFromDate('');
    setToDate('');
    resetPage(); // Reset về trang 1 thông qua hook
    setPage(1);
  };

  // Sử dụng hook usePagination với scroll preservation
  const { currentPage, handlePageChange, resetPage } = usePagination({
    itemsPerPage: pageSize,
    totalItems,
    totalPages,
    onPageChange: (nextPage: number) => setPage(nextPage), // React Query sẽ tự fetch
  });


  // ===========================
  // DELETE
  // ===========================
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast.success('Xóa hàng hóa thành công');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Xóa hàng hóa thất bại';
      showToast.error(message);
      setError(message);
    },
  });

  const handleDelete = async (id: number, name: string) => {
    confirm({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa hàng hóa "${name}" không?`,
      variant: 'danger',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: () => {
        deleteMutation.mutate(id);
      },
    });
  };

  // ===========================
  // RENDER
  // ===========================
  // const renderSortIcon = (key: SortKey) => {
  //   if (sortKey !== key) return null;
  //   return sortDirection === 'asc' ? '▲' : '▼';
  // };

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
              onCreateNew={() => router.push('/products/create')}
              createButtonText="Thêm hàng hóa"
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Mã hàng hóa */}
                <div>
                  <label
                    htmlFor="productCode"
                    className="block text-sm font-medium text-blue-gray-800 mb-2"
                  >
                    Mã hàng hóa
                  </label>
                  <input
                    id="productCode"
                    type="text"
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                    placeholder="Nhập mã hàng hóa"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchClick();
                      }
                    }}
                  />
                </div>

                {/* Tên hàng hóa */}
                <div>
                  <label
                    htmlFor="productName"
                    className="block text-sm font-medium text-blue-gray-800 mb-2"
                  >
                    Tên hàng hóa
                  </label>
                  <input
                    id="productName"
                    type="text"
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800 placeholder:text-blue-gray-400"
                    placeholder="Nhập tên hàng hóa"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchClick();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Từ ngày / Đến ngày – để đó sau tích hợp BE search */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    htmlFor="fromDate"
                    className="block text-sm font-medium text-blue-gray-800 mb-2"
                  >
                    Từ ngày
                  </label>
                  <input
                    id="fromDate"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                  />
                </div>

                <div>
                  <label
                    htmlFor="toDate"
                    className="block text-sm font-medium text-blue-gray-800 mb-2"
                  >
                    Đến ngày
                  </label>
                  <input
                    id="toDate"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF] text-blue-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSearchClick}
                  className="px-6 py-2 bg-blue-gray-100 hover:bg-blue-gray-200 text-blue-gray-800 rounded-lg transition-colors flex items-center gap-2"
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
            <div className="rounded-xl border border-blue-gray-100 overflow-hidden">
              {loading || paginationLoading ? (
                <TableSkeleton columns={10} rows={8} />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <div
                      className="max-h-[560px] overflow-auto"
                      onScroll={(e) => setVirtualScrollTop(e.currentTarget.scrollTop)}
                      style={{ height: VIRTUAL_VIEWPORT_HEIGHT }}
                    >
                      <table className="w-full min-w-[1100px]">
                        <thead>
                          <tr className="bg-[#0099FF] text-white h-[48px] text-sm font-bold sticky top-0 z-10">
                            <th className="px-4 text-center w-[70px]">STT</th>
                            <th className="px-4 text-center w-[110px]">Hình ảnh</th>
                            <th className="px-4 text-center w-[200px]">Tên hàng</th>
                            <th className="px-4 text-center w-[150px]">Mã hàng</th>
                            <th className="px-4 text-center w-[170px]">Nhóm hàng</th>
                            <th className="px-4 text-center w-[170px]">Nguồn hàng</th>
                            <th className="px-4 text-center w-[120px]">Đơn vị tính</th>
                            <th className="px-4 text-center w-[120px]">Tồn kho</th>
                            <th className="px-4 text-left w-[260px]">Kho hàng</th>
                            <th className="px-4 text-center w-[150px]">Đơn giá</th>
                            <th className="px-4 text-center w-[140px]">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="text-center py-8 text-blue-gray-500">
                                Không có dữ liệu
                              </td>
                            </tr>
                          ) : (
                            <>
                              <tr style={{ height: paddingTop }} aria-hidden />
                              {visibleRows.map((product, index) => {
                                const actualIndex = (currentPage - 1) * pageSize + startVirtualIndex + index + 1;
                                const imageUrl = buildImageUrl(product.image ?? null);
                                return (
                                  <tr
                                    key={product.id ?? `${startVirtualIndex}-${index}`}
                                    className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[72px]"
                                  >
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                      {actualIndex}
                                    </td>
                                    <td className="px-4 text-center">
                                      {imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={imageUrl}
                                          alt={product.name}
                                          className="h-10 w-10 object-cover rounded mx-auto"
                                          onError={(e: SyntheticEvent<HTMLImageElement>) => {
                                            const target = e.currentTarget;
                                            target.src =
                                              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';
                                          }}
                                        />
                                      ) : (
                                        <div className="h-10 w-10 bg-blue-gray-200 rounded mx-auto flex items-center justify-center text-blue-gray-600 text-xs">
                                          N/A
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                      {product.name}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                      {product.code}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                      {product.categoryName ?? '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">
                                      {product.supplierId != null
                                        ? supplierMap.get(product.supplierId) ?? `NCC #${product.supplierId}`
                                        : '-'}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-600">Cái</td>
                                    <td className="px-4 text-center text-sm font-semibold text-blue-gray-800">
                                      {stockMap.get(product.id) ?? 0}
                                    </td>
                                    <td className="px-4 text-left text-sm">
                                      {(() => {
                                        const stocks = stockDetailsMap.get(product.id) || [];
                                        if (stocks.length === 0) {
                                          return <span className="text-blue-gray-400">-</span>;
                                        }
                                        return (
                                          <div className="space-y-1.5">
                                            {stocks.map((stock) => (
                                              <div key={stock.storeId} className="flex items-center justify-between gap-2">
                                                <button
                                                  onClick={() => router.push(`/categories/stores/view/${stock.storeId}`)}
                                                  className="text-left font-medium text-[#0099FF] hover:text-[#0088EE] hover:underline transition-colors truncate flex-1"
                                                  title={stock.storeName || `Kho #${stock.storeId}`}
                                                >
                                                  {stock.storeName || `Kho #${stock.storeId}`}
                                                </button>
                                                <span className="font-semibold text-blue-gray-800 whitespace-nowrap">
                                                  {stock.quantity}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        );
                                      })()}
                                    </td>
                                    <td className="px-4 text-center text-sm text-blue-gray-800">
                                      {formatPrice(product.unitPrice)}
                                    </td>
                                    <td className="px-4">
                                      <ActionButtons
                                        onView={() => router.push(`/products/detail/${product.id}`)}
                                        onEdit={() => router.push(`/products/edit/${product.id}`)}
                                        onDelete={() => handleDelete(product.id, product.name)}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr style={{ height: paddingBottom }} aria-hidden />
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!error && totalItems > 0 && (
                    <div className="p-4">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={pageSize}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
    </>
  );
}
