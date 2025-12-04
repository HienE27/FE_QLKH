'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { getProducts } from '@/services/product.service';
import { getAllStock } from '@/services/stock.service';
import { getAllExports } from '@/services/inventory.service';
import { getDemandForecast, type DemandForecastResponse, type ForecastItem } from '@/services/ai.service';
import type { Product } from '@/types/product';

const formatCurrency = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export default function DemandForecastPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [forecastData, setForecastData] = useState<DemandForecastResponse | null>(null);
  const [productForecast, setProductForecast] = useState<ForecastItem | null>(null);
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map());
  const [exportHistory, setExportHistory] = useState<Array<{
    status?: string;
    exportsDate?: string;
    items?: Array<{ productId: number; quantity: number }>;
  }>>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadProductForecast();
    }
  }, [selectedProductId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productList, stockList, exports] = await Promise.all([
        getProducts(),
        getAllStock().catch(() => []),
        getAllExports({}).catch(() => [])
      ]);

      setProducts(productList);
      setExportHistory(exports);

      // Tổng hợp tồn kho
      const stockMapData = new Map<number, number>();
      stockList.forEach((stock) => {
        const current = stockMapData.get(stock.productId) || 0;
        stockMapData.set(stock.productId, current + stock.quantity);
      });
      setStockMap(stockMapData);

      // Load forecast data tổng thể
      const forecast = await getDemandForecast();
      setForecastData(forecast);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductForecast = async () => {
    if (!selectedProductId) return;

    try {
      // Tìm forecast cho sản phẩm được chọn
      if (forecastData) {
        const item = forecastData.forecasts.find(f => f.productId === selectedProductId);
        if (item) {
          setProductForecast(item);
          generateProductAnalysis(item);
        } else {
          // Nếu không có trong forecast, tạo forecast đơn giản
          const product = products.find(p => p.id === selectedProductId);
          if (product) {
            const currentStock = stockMap.get(product.id) || 0;
            const productExports = exportHistory.filter(exp =>
              exp.items?.some((item) => item.productId === selectedProductId)
            );

            // Tính tốc độ bán trung bình - chỉ tính các phiếu đã xuất (EXPORTED)
            let totalSold = 0;
            const exportDates = new Set<string>();
            productExports.forEach(exp => {
              // Chỉ tính các phiếu xuất đã được xác nhận
              if (exp.status !== 'EXPORTED') {
                return;
              }
              if (exp.exportsDate) {
                exportDates.add(exp.exportsDate);
              }
              exp.items?.forEach((item) => {
                if (item.productId === selectedProductId) {
                  totalSold += item.quantity || 0;
                }
              });
            });

            // Tính số ngày thực tế có phiếu xuất
            const daysWithExports = Math.max(1, exportDates.size);
            const avgDailySales = daysWithExports > 0 ? totalSold / daysWithExports : 0;
            const daysUntilReorder = avgDailySales > 0 ? Math.ceil(currentStock / avgDailySales) : null;

            const simpleForecast: ForecastItem = {
              productId: product.id,
              productCode: product.code,
              productName: product.name,
              currentStock,
              predictedDaysUntilReorder: daysUntilReorder || 999,
              recommendedQuantity: avgDailySales > 0 ? Math.ceil(avgDailySales * 14) : 100,
              optimalStockLevel: avgDailySales > 0 ? Math.ceil(avgDailySales * 21) : 200,
              confidence: productExports.length > 0 ? 0.7 : 0.3,
              reasoning: avgDailySales > 0
                ? `Dựa trên tốc độ bán trung bình ${avgDailySales.toFixed(1)} sản phẩm/ngày. Tồn kho hiện tại: ${currentStock}.`
                : 'Chưa có đủ dữ liệu lịch sử bán hàng để dự đoán chính xác.'
            };

            setProductForecast(simpleForecast);
            generateProductAnalysis(simpleForecast);
          }
        }
      }
    } catch (err) {
      console.error('Error loading product forecast:', err);
    }
  };

  const generateProductAnalysis = async (forecast: ForecastItem) => {
    try {
      const product = products.find(p => p.id === forecast.productId);
      const currentStock = stockMap.get(forecast.productId) || 0;
      const productExports = exportHistory.filter(exp =>
        exp.items?.some((item) => item.productId === forecast.productId)
      );

      // Tính thống kê - chỉ tính các phiếu đã xuất (EXPORTED)
      let totalSold = 0;
      const exportDatesSet = new Set<string>();
      productExports.forEach(exp => {
        // Chỉ tính các phiếu xuất đã được xác nhận
        if (exp.status !== 'EXPORTED') {
          return;
        }
        if (exp.exportsDate) {
          exportDatesSet.add(exp.exportsDate);
        }
        exp.items?.forEach((item) => {
          if (item.productId === forecast.productId) {
            totalSold += item.quantity || 0;
          }
        });
      });

      // Tính số ngày thực tế có phiếu xuất
      const daysWithExports = Math.max(1, exportDatesSet.size);
      const avgDailySales = daysWithExports > 0 ? totalSold / daysWithExports : 0;
      const daysRemaining = avgDailySales > 0 ? Math.ceil(currentStock / avgDailySales) : null;

      const prompt = `Bạn là chuyên gia phân tích dự báo nhu cầu. Hãy phân tích và tạo báo cáo chi tiết cho sản phẩm:

Thông tin sản phẩm:
- Tên: ${forecast.productName}
- Mã: ${forecast.productCode}
- Tồn kho hiện tại: ${currentStock} sản phẩm
- Tốc độ bán trung bình: ${avgDailySales.toFixed(2)} sản phẩm/ngày
- Số ngày dự đoán còn lại: ${daysRemaining || 'Chưa xác định'} ngày
- Số lượng nhập đề xuất: ${forecast.recommendedQuantity} sản phẩm
- Mức tồn tối ưu: ${forecast.optimalStockLevel} sản phẩm
- Độ tin cậy: ${(forecast.confidence * 100).toFixed(0)}%

Lịch sử xuất hàng: ${productExports.length} phiếu xuất trong 30 ngày qua

Hãy tạo báo cáo chi tiết bao gồm:
1. Phân tích tình trạng tồn kho hiện tại
2. Dự đoán số ngày còn lại trước khi hết hàng
3. Đề xuất số lượng cần nhập và thời điểm nhập hàng
4. Đánh giá rủi ro và khuyến nghị hành động

Trả lời bằng tiếng Việt, ngắn gọn và cụ thể.`;

      // Sử dụng reasoning từ forecast làm phân tích
      // Có thể mở rộng để gọi AI service sau
      setAiAnalysis(forecast.reasoning);
    } catch (err) {
      console.error('Error generating analysis:', err);
      setAiAnalysis(forecast.reasoning);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-[264px] mt-6 p-6 pr-12">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div className="text-xl text-gray-600 mt-4">Đang tải dữ liệu...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[264px] mt-6 p-6 pr-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Báo cáo dự báo nhu cầu</h1>
          <p className="text-slate-600 mt-1">Dự đoán nhu cầu nhập hàng dựa trên lịch sử xuất hàng</p>
        </div>

        {/* Product Selection */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Chọn sản phẩm để xem báo cáo</h2>
          <select
            value={selectedProductId || ''}
            onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>
                {product.code} - {product.name} (Tồn: {stockMap.get(product.id) || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Forecast Summary */}
        {forecastData && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl shadow-lg p-6 mb-6 border border-blue-200">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Tóm tắt dự báo tổng thể</h2>
            <p className="text-slate-600 mb-4">{forecastData.summary}</p>
            {forecastData.analysis && (
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-slate-700">{forecastData.analysis}</p>
              </div>
            )}
          </div>
        )}

        {/* Product Forecast Detail */}
        {selectedProduct && productForecast && (
          <div className="space-y-6">
            {/* Product Info Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Thông tin sản phẩm</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tên sản phẩm</p>
                  <p className="font-semibold text-lg">{selectedProduct.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mã sản phẩm</p>
                  <p className="font-semibold">{selectedProduct.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tồn kho hiện tại</p>
                  <p className={`font-bold text-2xl ${productForecast.currentStock === 0 ? 'text-red-600' :
                    productForecast.currentStock <= 10 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                    {productForecast.currentStock.toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Giá bán</p>
                  <p className="font-semibold text-lg text-blue-600">
                    {formatCurrency(selectedProduct.unitPrice || 0)} VNĐ
                  </p>
                </div>
              </div>
            </div>

            {/* Forecast Predictions */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Dự báo nhu cầu</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
                  <p className="text-sm text-gray-600 mb-1">Số ngày còn lại trước khi hết hàng</p>
                  <p className={`text-3xl font-bold ${productForecast.predictedDaysUntilReorder <= 7 ? 'text-red-600' :
                    productForecast.predictedDaysUntilReorder <= 14 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                    {productForecast.predictedDaysUntilReorder <= 30
                      ? `${productForecast.predictedDaysUntilReorder} ngày`
                      : '> 30 ngày'}
                  </p>
                  {productForecast.predictedDaysUntilReorder <= 7 && (
                    <p className="text-xs text-red-600 mt-2">⚠️ Cần nhập hàng khẩn cấp!</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-gray-600 mb-1">Số lượng nhập đề xuất</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {productForecast.recommendedQuantity?.toLocaleString('vi-VN') || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Đủ cho ~14 ngày</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-gray-600 mb-1">Mức tồn tối ưu</p>
                  <p className="text-3xl font-bold text-green-600">
                    {productForecast.optimalStockLevel?.toLocaleString('vi-VN') || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">Đủ cho ~21 ngày</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <p className="text-sm text-gray-600 mb-1">Độ tin cậy dự đoán</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {(productForecast.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {productForecast.confidence >= 0.8 ? 'Rất cao' :
                      productForecast.confidence >= 0.6 ? 'Cao' :
                        productForecast.confidence >= 0.4 ? 'Trung bình' : 'Thấp'}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            {aiAnalysis && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl shadow-lg p-6 border border-purple-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">📊 Phân tích chi tiết (AI)</h2>
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiAnalysis}</p>
                </div>
              </div>
            )}

            {/* Reasoning */}
            {productForecast.reasoning && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-2">Lý do dự đoán</h2>
                <p className="text-sm text-slate-600">{productForecast.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {!selectedProductId && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 text-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <p className="text-xl text-gray-600">Vui lòng chọn sản phẩm để xem báo cáo dự báo</p>
          </div>
        )}
      </main>
    </div>
  );
}
