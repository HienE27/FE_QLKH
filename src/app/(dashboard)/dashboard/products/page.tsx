// src/app/(dashboard)/dashboard/products/page.tsx
'use client';

import {
  useState,
  useEffect,
  type SyntheticEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
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

type SortKey = 'name' | 'code' | 'unitPrice';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const router = useRouter();

  const [data, setData] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map()); // Map productId -> total quantity
  const [stockDetailsMap, setStockDetailsMap] = useState<Map<number, StockByStore[]>>(new Map()); // Map productId -> list of stocks by store
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search state
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // pagination state (backend)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = PAGE_SIZE;
  const supplierMap = new Map<number, string>();
  suppliers.forEach((s) => supplierMap.set(s.id, s.name));

  // ===========================
  // LOAD DATA (products + suppliers + stocks)
  // ===========================
  const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

      // 👇 gọi song song 3 API: products (với pagination), suppliers và stocks
      const [productPage, supplierList, stockList] = await Promise.all([
        searchProducts({
          code: searchCode || undefined,
          name: searchName || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: currentPage - 1, // Backend dùng 0-based
          size: pageSize,
        }),
          getSuppliers(),
          getAllStock().catch(() => []), // Nếu lỗi thì trả về mảng rỗng
        ]);

      setData(productPage.content);
      setTotalPages(productPage.totalPages);
      setTotalItems(productPage.totalElements);
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
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Lỗi tải dữ liệu hàng hóa / nguồn hàng';
        setError(message);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchCode, searchName, fromDate, toDate]);

  // ===========================
  // HANDLERS
  // ===========================
  const handleSearchClick = () => {
    setCurrentPage(1);
  };

  const handleResetFilter = async () => {
    setSearchCode('');
    setSearchName('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
    // Gọi loadData ngay sau khi reset với page = 1, giống logic ở các trang báo cáo
    // Tạm thời set currentPage = 1 trong scope này để loadData sử dụng
    try {
      setLoading(true);
      setError(null);
      const [productPage, supplierList, stockList] = await Promise.all([
        searchProducts({
          code: undefined,
          name: undefined,
          fromDate: undefined,
          toDate: undefined,
          page: 0, // Reset về trang đầu
          size: pageSize,
        }),
        getSuppliers(),
        getAllStock().catch(() => []),
      ]);
      setData(productPage.content);
      setTotalPages(productPage.totalPages);
      setTotalItems(productPage.totalElements);
      setSuppliers(supplierList);
      const stockMap = new Map<number, number>();
      const stockDetailsMap = new Map<number, StockByStore[]>();
      stockList.forEach((stock) => {
        const current = stockMap.get(stock.productId) || 0;
        stockMap.set(stock.productId, current + stock.quantity);
        if (!stockDetailsMap.has(stock.productId)) {
          stockDetailsMap.set(stock.productId, []);
        }
        stockDetailsMap.get(stock.productId)!.push(stock);
      });
      setStockMap(stockMap);
      setStockDetailsMap(stockDetailsMap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải dữ liệu hàng hóa / nguồn hàng';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


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
      await loadData(); // Reload data sau khi xóa
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
    <div className="min-h-screen bg-blue-gray-50/50">
      <Sidebar />
      <main className="p-4 xl:ml-80">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">Danh mục hàng hóa</h1>
          <p className="text-sm text-blue-gray-600 uppercase">Quản lý danh mục hàng hóa</p>
        </div>

        {/* Content Container */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100">
          {/* Filter Section */}
          <div className="p-6">
            <FilterSection
              error={error}
              onClearFilter={handleResetFilter}
              onCreateNew={() => router.push('/dashboard/products/create')}
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
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-blue-gray-800 placeholder:text-blue-gray-400"
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
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-blue-gray-800 placeholder:text-blue-gray-400"
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
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-blue-gray-800"
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
                    className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-blue-gray-800"
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
          </div>

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
                { key: 'stores', label: 'Kho hàng', align: 'center' },
                { key: 'price', label: 'Đơn giá', align: 'center' },
                { key: 'actions', label: 'Thao tác', align: 'center' },
              ]}
              data={data}
              loading={loading}
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
                    <td className="px-4 text-center text-sm">
                      {(() => {
                        const stocks = stockDetailsMap.get(product.id) || [];
                        if (stocks.length === 0) {
                          return <span className="text-blue-gray-400">-</span>;
                        }
                        return (
                          <div className="space-y-1">
                            {stocks.map((stock) => (
                              <div key={stock.storeId} className="text-xs">
                                <button
                                  onClick={() => router.push(`/categories/stores/view/${stock.storeId}`)}
                                  className="font-medium text-teal-300 hover:text-teal-400 hover:underline"
                                >
                                  {stock.storeName || `Kho #${stock.storeId}`}
                                </button>
                                {stock.storeCode && (
                                  <span className="text-blue-gray-400 ml-1">
                                    ({stock.storeCode})
                                  </span>
                                )}
                                : <span className="font-semibold text-teal-300">
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
                        onView={() => router.push(`/dashboard/products/detail/${product.id}`)}
                        onEdit={() => router.push(`/dashboard/products/edit/${product.id}`)}
                        onDelete={() => handleDelete(product.id, product.name)}
                      />
                    </td>
                  </>
                );
              }}
            />
            {!loading && !error && totalItems > 0 && (
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
      </main>
    </div>
  );
}
