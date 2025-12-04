'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/services/product.service';
import { getAllStock } from '@/services/stock.service';
import type { Product } from '@/types/product';

interface AlertProductsPopupProps {
  alertType: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';
  alertTitle: string;
  onClose: () => void;
}

export default function AlertProductsPopup({ alertType, alertTitle, onClose }: AlertProductsPopupProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    loadProducts();
  }, [alertType]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const [productList, stockList] = await Promise.all([
        getProducts(),
        getAllStock().catch(() => [])
      ]);

      // Tổng hợp tồn kho theo productId
      const stockMapData = new Map<number, number>();
      stockList.forEach((stock) => {
        const current = stockMapData.get(stock.productId) || 0;
        stockMapData.set(stock.productId, current + stock.quantity);
      });
      setStockMap(stockMapData);

      // Filter sản phẩm theo loại alert
      let filteredProducts: Product[] = [];

      if (alertType === 'CRITICAL') {
        // Hết hàng (quantity = 0)
        filteredProducts = productList.filter(p => (stockMapData.get(p.id) || 0) === 0);
      } else if (alertType === 'WARNING') {
        // Sắp hết hàng (quantity > 0 và <= 10)
        filteredProducts = productList.filter(p => {
          const qty = stockMapData.get(p.id) || 0;
          return qty > 0 && qty <= 10;
        });
      } else if (alertType === 'INFO') {
        // Tồn kho cao (quantity > 100)
        filteredProducts = productList.filter(p => (stockMapData.get(p.id) || 0) > 100);
      } else if (alertType === 'SUCCESS') {
        // Không có filter đặc biệt cho SUCCESS, hiển thị tất cả
        filteredProducts = productList;
      }

      setProducts(filteredProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

  const getStockQuantity = (productId: number) => {
    return stockMap.get(productId) || 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{alertTitle}</h2>
            <p className="text-purple-100 mt-1">
              Tổng cộng {products.length} sản phẩm
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-xl text-gray-600">Không có sản phẩm nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const quantity = getStockQuantity(product.id);
                return (
                  <div
                    key={product.id}
                    className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-800">{product.name}</h3>
                          <span className="text-sm text-gray-500">({product.code})</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Tồn kho: </span>
                            <span className={`font-bold ${quantity === 0 ? 'text-red-600' :
                              quantity <= 10 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                              {quantity.toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Giá bán: </span>
                            <span className="font-bold text-blue-600">
                              {formatCurrency(product.unitPrice || 0)} VNĐ
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Đơn vị: </span>
                            <span className="text-gray-800">{product.unitName || 'Cái'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Giá trị tồn kho: </span>
                            <span className="font-bold text-purple-600">
                              {formatCurrency(quantity * (product.unitPrice || 0))} VNĐ
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
