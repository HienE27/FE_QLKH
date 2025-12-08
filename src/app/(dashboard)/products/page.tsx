// src/app/(dashboard)/dashboard/products/page.tsx
'use client';

import {
  useState,
  useEffect,
  type SyntheticEvent,
} from 'react';
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
import { getAllStock, type StockByStore } from '@/services/stock.service';
import { usePagination } from '@/hooks/usePagination';
import { useFilterReset } from '@/hooks/useFilterReset';
import { useDebounce } from '@/hooks/useDebounce';

type SortKey = 'name' | 'code' | 'unitPrice';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const router = useRouter();

  const [data, setData] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map()); // Map productId -> total quantity
  const [stockDetailsMap, setStockDetailsMap] = useState<Map<number, StockByStore[]>>(new Map()); // Map productId -> list of stocks by store
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

  // pagination state (backend)
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = PAGE_SIZE;
  const supplierMap = new Map<number, string>();
  suppliers.forEach((s) => supplierMap.set(s.id, s.name));

  // ===========================
  // LOAD SUPPLIERS & STOCKS (chỉ load 1 lần khi mount)
  // ===========================
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        // Load suppliers và stocks song song, chỉ 1 lần khi mount
        const [supplierList, stockList] = await Promise.all([
          getSuppliers(),
          getAllStock().catch(() => []),
        ]);

        setSuppliers(supplierList);

        // Tính tổng tồn kho cho mỗi sản phẩm (từ tất cả các kho)
        const stockMap = new Map<number, number>();
        const stockDetailsMap = new Map<number, StockByStore[]>();

        stockList.forEach((stock) => {
          // Tính tổng
          const current = stockMap.get(stock.productId) || 0;
          stockMap.set(stock.productId, current + stock.quantity);

          // Lưu chi tiết theo từng kho
          if (!stockDetailsMap.has(stock.productId)) {
            stockDetailsMap.set(stock.productId, []);
          }
          stockDetailsMap.get(stock.productId)!.push(stock);
        });

        setStockMap(stockMap);
        setStockDetailsMap(stockDetailsMap);
      } catch (err) {
        console.error('Error loading suppliers/stocks:', err);
      }
    };

    loadStaticData();
  }, []); // Chỉ chạy 1 lần khi mount

  // ===========================
  // LOAD PRODUCTS (chỉ load products khi chuyển trang hoặc search)
  // ===========================
  const loadProducts = async (page: number = 1, isPagination: boolean = false) => {
    try {
      // Nếu là pagination thì dùng paginationLoading, nếu không thì dùng loading chính
      if (isPagination) {
        setPaginationLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Chỉ load products, không load lại suppliers và stocks
      const productPage = await searchProducts({
        code: debouncedSearchCode || undefined,
        name: debouncedSearchName || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        page: page - 1, // Backend dùng 0-based
        size: pageSize,
      });

      setData(productPage.content);
      setTotalPages(productPage.totalPages);
      setTotalItems(productPage.totalElements);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Lỗi tải dữ liệu hàng hóa';
      setError(message);
    } finally {
      if (isPagination) {
        setPaginationLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchCode, debouncedSearchName, fromDate, toDate]);

  // ===========================
  // HANDLERS
  // ===========================
  const handleSearchClick = () => {
    loadProducts(1);
  };

  const handleResetFilter = async () => {
    setSearchCode('');
    setSearchName('');
    setFromDate('');
    setToDate('');
    resetPage(); // Reset về trang 1 thông qua hook
    // Chỉ load products, không load lại suppliers và stocks
    await loadProducts(1);
  };

  // Sử dụng hook usePagination với scroll preservation
  const { currentPage, handlePageChange, resetPage } = usePagination({
    itemsPerPage: pageSize,
    totalItems,
    totalPages,
    onPageChange: (page: number) => loadProducts(page, true), // Chỉ load products khi chuyển trang, dùng paginationLoading
  });


  // ===========================
  // DELETE
  // ===========================
  const handleDelete = async (id: number, name: string) => {
    const ok = window.confirm(
      `Bạn có chắc chắn muốn xóa hàng hóa "${name}" không?`,
    );
    if (!ok) return;

    try {
      await deleteProduct(id);
      await loadProducts(currentPage); // Reload products sau khi xóa, giữ nguyên trang hiện tại
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Xóa hàng hóa thất bại';
      setError(message);
    }
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
            <DataTable<Product>
              columns={[
                { key: 'stt', label: 'STT', align: 'center' },
                { key: 'image', label: 'Hình ảnh', align: 'center' },
                { key: 'name', label: 'Tên hàng', align: 'center' },
                { key: 'code', label: 'Mã hàng', align: 'center' },
                { key: 'category', label: 'Nhóm hàng', align: 'center' },
                { key: 'supplier', label: 'Nguồn hàng', align: 'center' },
                { key: 'unit', label: 'Đơn vị tính', align: 'center' },
                { key: 'stock', label: 'Tồn kho', align: 'center' },
                { key: 'stores', label: 'Kho hàng', align: 'left' },
                { key: 'price', label: 'Đơn giá', align: 'center' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={data}
              loading={loading || paginationLoading} // Hiển thị loading khi search hoặc pagination
              emptyMessage="Không có dữ liệu"
              startIndex={(currentPage - 1) * pageSize}
              renderRow={(product: Product, index: number) => {
                const imageUrl = buildImageUrl(product.image ?? null);
                return (
                  <>
                    <td className="px-4 text-center text-sm text-blue-gray-800">
                      {(currentPage - 1) * pageSize + index + 1}
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
                            target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';
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
                  </>
                );
              }}
            />
            {!error && totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
    </>
  );
}
