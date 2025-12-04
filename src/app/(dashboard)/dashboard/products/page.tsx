// src/app/(dashboard)/dashboard/products/page.tsx
'use client';

import {
  useState,
  useEffect,
  type SyntheticEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import FilterSection from '@/components/common/FilterSection';
import ActionButtons from '@/components/common/ActionButtons';
import { searchProducts, deleteProduct, type ProductPage } from '@/services/product.service';
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

  const [productPage, setProductPage] = useState<ProductPage | null>(null);
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

  // sort state
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1);
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

      // Build sort string for backend (Spring Data format: "field,direction")
      const sortField = sortKey === 'unitPrice' ? 'unitPrice' : sortKey;
      const sortStr = `${sortField},${sortDirection}`;

      // Gọi API với pagination, search, sort từ backend
      const [pageResult, supplierList, stockList] = await Promise.all([
        searchProducts({
          code: searchCode.trim() || undefined,
          name: searchName.trim() || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page: currentPage - 1, // Backend dùng 0-based
          size: pageSize,
          sort: sortStr,
        }).catch((err) => {
          console.error('Error calling searchProducts:', err);
          // Fallback: trả về empty page nếu lỗi
          return {
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: pageSize,
          };
        }),
          getSuppliers(),
          getAllStock().catch(() => []), // Nếu lỗi thì trả về mảng rỗng
        ]);

      console.log('Page result:', pageResult); // Debug log
      setProductPage(pageResult);
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

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load data when pagination or sort changes
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortKey, sortDirection]);

  // Reset to page 1 when search/filter changes (loadData sẽ được gọi bởi useEffect của currentPage)
  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchCode, searchName, fromDate, toDate]);

  // ===========================
  // HANDLERS
  // ===========================
  const handleSearchClick = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleResetFilter = () => {
    setSearchCode('');
    setSearchName('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        // toggle asc/desc nếu click lại cùng cột
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('asc');
      return key;
    });
    setCurrentPage(1);
  };

  // Get data from backend pagination result
  const pageItems = productPage?.content || [];
  const totalItems = productPage?.totalElements || 0;
  const totalPages = productPage?.totalPages || 1;
  const currentPageSafe = currentPage > totalPages ? totalPages : currentPage;


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
      // Reload data after delete
      loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Xóa hàng hóa thất bại';
      setError(message);
    }
  };

  // ===========================
  // RENDER
  // ===========================
  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? '▲' : '▼';
  };

  return (
    <PageLayout>
      {/* Filter Section */}
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
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mã hàng hóa
            </label>
            <input
              id="productCode"
              type="text"
              className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập mã hàng hóa"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
          </div>

          {/* Tên hàng hóa */}
          <div>
            <label
              htmlFor="productName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tên hàng hóa
            </label>
            <input
              id="productName"
              type="text"
              className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nhập tên hàng hóa"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </div>

        {/* Từ ngày / Đến ngày – để đó sau tích hợp BE search */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="fromDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Từ ngày
            </label>
            <input
              id="fromDate"
              type="date"
              className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="toDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Đến ngày
            </label>
            <input
              id="toDate"
              type="date"
              className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleSearchClick}
            className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2"
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
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <p className="p-4 text-sm text-gray-500">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="p-4 text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0046ff] text-white">
                  <tr className="h-[48px]">
                    <th className="px-4 text-center font-bold text-sm">
                      STT
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Hình ảnh
                    </th>
                    <th
                      className="px-4 text-center font-bold text-sm cursor-pointer select-none"
                      onClick={() => handleSort('name')}
                    >
                      Tên hàng {renderSortIcon('name')}
                    </th>
                    <th
                      className="px-4 text-center font-bold text-sm cursor-pointer select-none"
                      onClick={() => handleSort('code')}
                    >
                      Mã hàng {renderSortIcon('code')}
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Nhóm hàng
                    </th>
                  <th className="px-4 text-center font-bold text-sm">
                    Nguồn hàng
                  </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Đơn vị tính
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Tồn kho
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Kho hàng
                    </th>
                    <th
                      className="px-4 text-center font-bold text-sm cursor-pointer select-none"
                      onClick={() => handleSort('unitPrice')}
                    >
                      Đơn giá {renderSortIcon('unitPrice')}
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((product, index) => {
                    const imageUrl = buildImageUrl(product.image);

                    return (
                      <tr
                        key={product.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                      >
                        <td className="px-4 text-center text-sm">
                          {(currentPageSafe - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 text-center">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-10 w-10 object-cover rounded mx-auto"
                              onError={(
                                e: SyntheticEvent<HTMLImageElement>,
                              ) => {
                                const target = e.currentTarget;
                                target.src =
                                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 rounded mx-auto flex items-center justify-center text-gray-400 text-xs">
                              N/A
                            </div>
                          )}
                        </td>
                        <td className="px-4 text-center text-sm">
                          {product.name}
                        </td>
                        <td className="px-4 text-center text-sm">
                          {product.code}
                        </td>
                        <td className="px-4 text-center text-sm">
                          {product.categoryName ?? '-'}
                        </td>
                      <td className="px-4 text-center text-sm">
                        {product.supplierId != null
                          ? supplierMap.get(product.supplierId) ?? `NCC #${product.supplierId}`
                          : '-'}
                      </td>
                        <td className="px-4 text-center text-sm">Cái</td>
                        <td className="px-4 text-center text-sm font-semibold">
                          {stockMap.get(product.id) ?? 0}
                        </td>
                        <td className="px-4 text-center text-sm">
                          {(() => {
                            const stocks = stockDetailsMap.get(product.id) || [];
                            if (stocks.length === 0) {
                              return <span className="text-gray-400">-</span>;
                            }
                            return (
                              <div className="space-y-1">
                                {stocks.map((stock) => (
                                  <div key={stock.storeId} className="text-xs">
                                    <button
                                      onClick={() =>
                                        router.push(`/categories/stores/view/${stock.storeId}`)
                                      }
                                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {stock.storeName || `Kho #${stock.storeId}`}
                                    </button>
                                    {stock.storeCode && (
                                      <span className="text-gray-500 ml-1">
                                        ({stock.storeCode})
                                      </span>
                                    )}
                                    : <span className="font-semibold text-blue-600">
                                      {stock.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 text-center text-sm">
                          {formatPrice(product.unitPrice)}
                        </td>
                        <td className="px-4">
                          <ActionButtons
                            onView={() =>
                              router.push(`/dashboard/products/detail/${product.id}`)
                            }
                            onEdit={() =>
                              router.push(`/dashboard/products/edit/${product.id}`)
                            }
                            onDelete={() => handleDelete(product.id, product.name)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {pageItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={11}
                        className="px-4 py-4 text-center text-sm text-gray-500"
                      >
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPageSafe}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={pageSize}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}
