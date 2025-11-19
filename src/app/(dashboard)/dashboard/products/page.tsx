'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { getProducts } from '@/services/product.service';
import type { Product } from '@/types/product';

const API_BASE_URL = 'http://localhost:8080';

function formatPrice(value: Product['unitPrice']) {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('vi-VN').format(num);
}

// ✅ Hàm build full URL từ relative path
function buildImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  
  // Nếu đã là full URL thì giữ nguyên
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Nếu là relative path thì thêm base URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export default function ProductsPage() {
  const router = useRouter();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const res = await getProducts();

        // res có thể là Array hoặc ApiResponse
        const list = Array.isArray(res)
          ? res
          : ((res as { data?: Product[] }).data ?? []);

        setData(list);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Lỗi tải danh sách hàng hóa';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Từ ngày */}
            <div>
              <label
                htmlFor="fromDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Từ ngày
              </label>
              <div className="relative">
                <input
                  id="fromDate"
                  type="date"
                  className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
              </div>
            </div>

            {/* Đến ngày */}
            <div>
              <label
                htmlFor="toDate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Đến ngày
              </label>
              <div className="relative">
                <input
                  id="toDate"
                  type="date"
                  className="w-full px-4 py-2 bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
               
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button className="px-6 py-2 bg-[#97a2ff] hover:bg-[#8591ff] text-black rounded-md transition-colors flex items-center gap-2">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#0046ff] text-white">
                  <tr className="h-[48px]">
                    <th className="px-4 text-center font-bold text-sm">STT</th>
                    <th className="px-4 text-center font-bold text-sm">
                      Hình ảnh
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Tên hàng
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Mã hàng
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Nhóm hàng
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Đơn vị tính
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Đơn giá
                    </th>
                    <th className="px-4 text-center font-bold text-sm">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((product, index) => {
                    const imageUrl = buildImageUrl(product.image);
                    
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                      >
                        <td className="px-4 text-center text-sm">
                          {index + 1}
                        </td>
                        <td className="px-4 text-center">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="h-10 w-10 object-cover rounded mx-auto"
                              onError={(e) => {
                                // Nếu lỗi load ảnh, hiển thị placeholder
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect fill="%23ddd" width="40" height="40"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="10"%3ENo%3C/text%3E%3C/svg%3E';
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
                          {product.categoryId ?? '-'}
                        </td>
                        <td className="px-4 text-center text-sm">
                          Cái
                        </td>
                        <td className="px-4 text-center text-sm">
                          {formatPrice(product.unitPrice)}
                        </td>
                        <td className="px-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
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
                            <button
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}