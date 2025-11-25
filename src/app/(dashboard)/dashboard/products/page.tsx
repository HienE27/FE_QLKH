// src/app/(dashboard)/dashboard/products/page.tsx
'use client';

import {
  useState,
  useEffect,
  type SyntheticEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getProducts, deleteProduct } from '@/services/product.service';
import type { Product } from '@/types/product';

// 👇 import thêm supplier
import {
  getSuppliers,
  type Supplier,
} from '@/services/supplier.service';

const API_BASE_URL = 'http://localhost:8080';

function formatPrice(value: Product['unitPrice']) {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN').format(num);
}

// Build full URL from relative path
function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // đã là full URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

type SortKey = 'name' | 'code' | 'unitPrice';
type SortDirection = 'asc' | 'desc';

export default function ProductsPage() {
  const router = useRouter();

  const [data, setData] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]); // 👈 thêm state NCC
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search state
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

  // sort state
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // pagination state (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ===========================
  // LOAD DATA (products + suppliers)
  // ===========================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // 👇 gọi song song 2 API
        const [productList, supplierList] = await Promise.all([
          getProducts(),
          getSuppliers(),
        ]);

        setData(productList);
        setSuppliers(supplierList);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Lỗi tải dữ liệu hàng hóa / nguồn hàng';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ===========================
  // FILTER + SORT + PAGINATION
  // ===========================
  const handleSearchClick = () => {
    setCurrentPage(1);
  };

  const handleResetFilter = () => {
    setSearchCode('');
    setSearchName('');
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    setCurrentPage(1);
    setSortKey((prevKey) => {
      if (prevKey === key) {
        // toggle asc/desc nếu click lại cùng cột
        setSortDirection((prevDir) => (prevDir === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDirection('asc');
      return key;
    });
  };

  const filtered = data.filter((p) => {
    const codeMatch = searchCode.trim()
      ? p.code.toLowerCase().includes(searchCode.trim().toLowerCase())
      : true;

    const nameMatch = searchName.trim()
      ? p.name.toLowerCase().includes(searchName.trim().toLowerCase())
      : true;

    return codeMatch && nameMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aValue: string | number | null = null;
    let bValue: string | number | null = null;

    if (sortKey === 'name') {
      aValue = a.name;
      bValue = b.name;
    } else if (sortKey === 'code') {
      aValue = a.code;
      bValue = b.code;
    } else {
      aValue = a.unitPrice ?? 0;
      bValue = b.unitPrice ?? 0;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aStr = String(aValue);
    const bStr = String(bValue);
    const cmp = aStr.localeCompare(bStr, 'vi');
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const totalItems = sorted.length;
  const totalPages = totalItems === 0 ? 1 : Math.ceil(totalItems / pageSize);

  const currentPageSafe =
    currentPage > totalPages ? totalPages : currentPage;

  const startIndex = (currentPageSafe - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = sorted.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) =>
      prev < totalPages ? prev + 1 : prev,
    );
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
      setData((prev) => prev.filter((p) => p.id !== id));
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
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
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
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleResetFilter}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
            >
              Xóa lọc
            </button>

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

            <button
              type="button"
              onClick={() => router.push('/dashboard/products/create')}
              className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Thêm hàng hóa
            </button>
          </div>
        </div>

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
                      {/* 👇 cột mới: Nguồn hàng */}
                      <th className="px-4 text-center font-bold text-sm">
                        Nguồn hàng
                      </th>
                      <th className="px-4 text-center font-bold text-sm">
                        Đơn vị tính
                      </th>
                      <th className="px-4 text-center font-bold text-sm">
                        Tồn kho
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

                      // 👇 map supplierId -> tên nguồn
                      const supplierName =
                        suppliers.find(
                          (s) => s.id === (product as Product).supplierId,
                        )?.name ?? '-';

                      return (
                        <tr
                          key={product.id}
                          className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                        >
                          <td className="px-4 text-center text-sm">
                            {startIndex + index + 1}
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
                          {/* 👇 hiển thị tên nguồn hàng */}
                          <td className="px-4 text-center text-sm">
                            {supplierName}
                          </td>
                          <td className="px-4 text-center text-sm">Cái</td>
                          <td className="px-4 text-center text-sm font-semibold">
                            {product.quantity ?? 0}
                          </td>
                          <td className="px-4 text-center text-sm">
                            {formatPrice(product.unitPrice)}
                          </td>
                          <td className="px-4">
                            <div className="flex items-center justify-center gap-3">
                              {/* Sửa */}
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/products/edit/${product.id}`,
                                  )
                                }
                                className="hover:scale-110 transition-transform"
                                title="Chỉnh sửa"
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13"
                                    stroke="#0046ff"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                  />
                                  <path
                                    d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                                    stroke="#0046ff"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>

                              {/* Xem chi tiết */}
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/products/detail/${product.id}`,
                                  )
                                }
                                className="hover:scale-110 transition-transform"
                                title="Xem chi tiết"
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
                                    stroke="#0046ff"
                                    strokeWidth="2"
                                  />
                                  <circle
                                    cx="12"
                                    cy="12.5"
                                    r="3"
                                    stroke="#0046ff"
                                    strokeWidth="2"
                                  />
                                </svg>
                              </button>

                              {/* Xóa */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(product.id, product.name)
                                }
                                className="hover:scale-110 transition-transform"
                                title="Xóa"
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                >
                                  <path
                                    d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                                    stroke="#ee4b3d"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pageItems.length === 0 && (
                      <tr>
                        <td
                          colSpan={10} // 👈 10 cột (thêm cột Tồn kho)
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
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm">
                <div>
                  Hiển thị{' '}
                  {totalItems === 0 ? 0 : startIndex + 1}{' '}
                  -{' '}
                  {endIndex > totalItems ? totalItems : endIndex}{' '}
                  / {totalItems} bản ghi
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrevPage}
                    disabled={currentPageSafe <= 1}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span>
                    Trang {currentPageSafe} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextPage}
                    disabled={currentPageSafe >= totalPages}
                    className="px-3 py-1 border rounded disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
