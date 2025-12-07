'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import {
  getSmartInventoryAlerts,
  getDemandForecast,
  getSalesInsights,
  getInventoryTurnover,
  getStockOptimization,
  type SmartInventoryAlertResponse,
  type DemandForecastResponse,
  type SalesInsightResponse,
  type InventoryTurnoverResponse,
  type StockOptimizationResponse
} from '@/services/ai.service';
import ProductDemandForecastReport from '@/components/ai/ProductDemandForecastReport';

const formatCurrency = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'forecast' | 'sales' | 'turnover' | 'optimization'>('alerts');
  const [loading, setLoading] = useState(false);

  // Data states
  const [inventoryAlerts, setInventoryAlerts] = useState<SmartInventoryAlertResponse | null>(null);
  const [demandForecast, setDemandForecast] = useState<DemandForecastResponse | null>(null);
  const [salesInsights, setSalesInsights] = useState<SalesInsightResponse | null>(null);
  const [inventoryTurnover, setInventoryTurnover] = useState<InventoryTurnoverResponse | null>(null);
  const [stockOptimization, setStockOptimization] = useState<StockOptimizationResponse | null>(null);

  const loadInventoryAlerts = async () => {
    try {
      setLoading(true);
      const data = await getSmartInventoryAlerts();
      setInventoryAlerts(data);
    } catch (err) {
      console.error('Error loading inventory alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDemandForecast = async () => {
    try {
      setLoading(true);
      const data = await getDemandForecast();
      setDemandForecast(data);
    } catch (err) {
      console.error('Error loading demand forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesInsights = async () => {
    try {
      setLoading(true);
      const data = await getSalesInsights(30);
      setSalesInsights(data);
    } catch (err) {
      console.error('Error loading sales insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryTurnover = async () => {
    try {
      setLoading(true);
      const data = await getInventoryTurnover(90);
      setInventoryTurnover(data);
    } catch (err) {
      console.error('Error loading inventory turnover:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStockOptimization = async () => {
    try {
      setLoading(true);
      const data = await getStockOptimization();
      setStockOptimization(data);
    } catch (err) {
      console.error('Error loading stock optimization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    // Load data when tab changes
    if (tab === 'alerts' && !inventoryAlerts) loadInventoryAlerts();
    else if (tab === 'forecast' && !demandForecast) loadDemandForecast();
    else if (tab === 'sales' && !salesInsights) loadSalesInsights();
    else if (tab === 'turnover' && !inventoryTurnover) loadInventoryTurnover();
    else if (tab === 'optimization' && !stockOptimization) loadStockOptimization();
  };

  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      <Sidebar />
      <main className="p-4 xl:ml-80">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-blue-gray-800 mb-1">📊 Báo cáo AI thông minh</h1>
          <p className="text-sm text-blue-gray-600 uppercase">Phân tích và dự đoán dựa trên AI</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
          <div className="flex gap-2 border-b border-blue-gray-100 mb-6">
            {[
              { id: 'alerts' as const, label: '🔔 Cảnh báo tồn kho', icon: '⚠️' },
              { id: 'forecast' as const, label: '📈 Dự đoán nhu cầu', icon: '🔮' },
              { id: 'sales' as const, label: '💰 Phân tích bán hàng', icon: '📊' },
              { id: 'turnover' as const, label: '🔄 Chu kỳ tồn kho', icon: '⚙️' },
              { id: 'optimization' as const, label: '🎯 Tối ưu kho', icon: '✨' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 font-medium transition-colors border-b-2 ${activeTab === tab.id
                  ? 'border-[#0099FF] text-[#0099FF]'
                  : 'border-transparent text-blue-gray-600 hover:text-blue-gray-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0099FF] mx-auto"></div>
                <p className="mt-4 text-blue-gray-600">Đang phân tích dữ liệu...</p>
              </div>
            ) : (
              <>
                {/* Inventory Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div>
                    {inventoryAlerts ? (
                      <div>
                        <div className="mb-4 p-4 bg-[#0099FF]/10 rounded-lg border-2 border-[#0099FF]">
                          <p className="text-sm font-semibold text-blue-gray-900">{inventoryAlerts.summary}</p>
                        </div>
                        <div className="space-y-4">
                          {inventoryAlerts.alerts.map((alert, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-lg p-4 ${alert.severity === 'CRITICAL'
                                ? 'bg-red-50 border-red-200'
                                : alert.severity === 'WARNING'
                                  ? 'bg-yellow-50 border-yellow-200'
                                  : 'bg-[#0099FF]/10 border-[#0099FF]/30'
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold text-blue-gray-800">{getAlertLabel(alert.type)}</span>
                                    <span className="text-xs px-2 py-1 bg-blue-gray-100 rounded text-blue-gray-800">{alert.severity}</span>
                                  </div>
                                  <p className="font-semibold text-blue-gray-800">{alert.productName} ({alert.productCode})</p>
                                  <p className="text-sm mt-1 text-blue-gray-600">{alert.message}</p>
                                  <div className="mt-2 text-sm text-blue-gray-600">
                                    <span className="font-medium">Tồn kho: </span>
                                    <span className="text-blue-gray-800">{alert.currentStock.toLocaleString('vi-VN')}</span>
                                    {alert.predictedDaysRemaining != null && (
                                      <>
                                        <span className="mx-2">|</span>
                                        <span className="font-medium">Còn lại: </span>
                                        <span className="text-blue-gray-800">{alert.predictedDaysRemaining} ngày</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2 p-3 bg-[#0099FF]/10 rounded-lg text-sm border-2 border-[#0099FF]">
                                    <span className="font-bold text-[#0099FF]">💡 Đề xuất: </span>
                                    <span className="text-blue-gray-900 font-semibold">{alert.recommendation}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <button
                          onClick={loadInventoryAlerts}
                          className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors"
                        >
                          Tải cảnh báo tồn kho
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Demand Forecast Tab */}
                {activeTab === 'forecast' && (
                  <div>
                    <div className="mb-4 p-4 bg-[#0099FF]/10 rounded-lg border-2 border-[#0099FF]">
                      <p className="text-sm text-blue-gray-900 font-semibold">
                        📊 Chọn sản phẩm để xem báo cáo dự báo nhu cầu chi tiết.
                        Hệ thống sẽ phân tích lịch sử xuất hàng và dự đoán số ngày còn lại trước khi hết hàng.
                      </p>
                    </div>
                    <ProductDemandForecastReport />
                  </div>
                )}

                {/* Sales Insights Tab */}
                {activeTab === 'sales' && (
                  <div>
                    {salesInsights ? (
                      <div className="space-y-6">
                        {/* Revenue Analysis */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
                          <h3 className="font-bold text-lg mb-3 text-blue-gray-800">📈 Phân tích doanh thu</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-blue-gray-600">Xu hướng</p>
                              <p className={`font-bold text-lg ${salesInsights.revenueAnalysis.trend === 'INCREASING' ? 'text-green-500' :
                                salesInsights.revenueAnalysis.trend === 'DECREASING' ? 'text-red-500' : 'text-[#0099FF]'
                                }`}>
                                {salesInsights.revenueAnalysis.trend === 'INCREASING' ? '↑ Tăng' :
                                  salesInsights.revenueAnalysis.trend === 'DECREASING' ? '↓ Giảm' : '→ Ổn định'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-blue-gray-600">Tỷ lệ tăng trưởng</p>
                              <p className={`font-bold text-lg ${salesInsights.revenueAnalysis.growthRate > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {salesInsights.revenueAnalysis.growthRate > 0 ? '+' : ''}
                                {salesInsights.revenueAnalysis.growthRate.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-blue-gray-600 mt-3">{salesInsights.revenueAnalysis.reason}</p>
                        </div>

                        {/* Top Products */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 text-blue-gray-800">🏆 Top sản phẩm bán chạy</h3>
                          <div className="space-y-2">
                            {salesInsights.topProducts.slice(0, 10).map((product, index) => (
                              <div key={index} className="border border-blue-gray-100 rounded-lg p-3 flex items-center justify-between bg-white hover:bg-blue-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 bg-[#0099FF] rounded-full flex items-center justify-center font-bold text-white shadow-md">
                                    {product.rank}
                                  </span>
                                  <div>
                                    <p className="font-semibold text-blue-gray-800">{product.productName}</p>
                                    <p className="text-xs text-blue-gray-600">{product.productCode}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-500">{formatCurrency(product.revenue)} VNĐ</p>
                                  <p className="text-xs text-blue-gray-600">{product.quantitySold} sản phẩm</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Overall Analysis */}
                        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-[#0099FF]">
                          <h3 className="font-bold text-lg mb-2 text-[#0099FF]">🤖 Phân tích tổng quan</h3>
                          <p className="text-sm text-blue-gray-900 leading-relaxed font-semibold">{salesInsights.overallAnalysis}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <button
                          onClick={loadSalesInsights}
                          className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors"
                        >
                          Tải phân tích bán hàng
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Inventory Turnover Tab */}
                {activeTab === 'turnover' && (
                  <div>
                    {inventoryTurnover ? (
                      <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-[#0099FF]">
                          <h3 className="font-bold text-lg mb-2 text-[#0099FF]">📊 Tỉ lệ vòng quay tổng thể</h3>
                          <p className="text-3xl font-bold text-[#0099FF]">{inventoryTurnover.overallTurnoverRate.toFixed(2)}</p>
                          <p className="text-sm text-blue-gray-900 mt-1 font-semibold">{inventoryTurnover.analysis}</p>
                        </div>

                        {/* Dead Stocks */}
                        {inventoryTurnover && inventoryTurnover.deadStocks.length > 0 && (
                          <div>
                            <h3 className="font-bold text-lg mb-3 text-red-500">📦 Hàng tồn kho lâu ({inventoryTurnover.deadStocks.length})</h3>
                            <div className="space-y-2">
                              {inventoryTurnover.deadStocks.map((item, index) => (
                                <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                                  <p className="font-semibold text-blue-gray-800">{item.productName} ({item.productCode})</p>
                                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                    <div>
                                      <span className="text-blue-gray-600">Số lượng: </span>
                                      <span className="font-medium text-blue-gray-800">{item.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-blue-gray-600">Không bán: </span>
                                      <span className="font-medium text-blue-gray-800">{item.daysSinceLastSale} ngày</span>
                                    </div>
                                    <div>
                                      <span className="text-blue-gray-600">Giá trị: </span>
                                      <span className="font-medium text-blue-gray-800">{formatCurrency(item.totalValue)} VNĐ</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-red-500 mt-2">💡 {item.recommendation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {inventoryTurnover && inventoryTurnover.recommendations.length > 0 && (
                          <div className="bg-white rounded-xl shadow-sm p-6 border-2 border-[#0099FF]">
                            <h3 className="font-bold text-lg mb-3 text-[#0099FF]">💡 Đề xuất</h3>
                            <ul className="space-y-2">
                              {inventoryTurnover.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-[#0099FF] font-bold">•</span>
                                  <span className="text-sm text-blue-gray-900 font-semibold">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <button
                          onClick={loadInventoryTurnover}
                          className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors"
                        >
                          Tải đánh giá chu kỳ tồn kho
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Stock Optimization Tab */}
                {activeTab === 'optimization' && (
                  <div>
                    {stockOptimization ? (
                      <div className="space-y-6">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm text-green-700">{stockOptimization.summary}</p>
                        </div>

                        {/* Product Optimizations */}
                        <div>
                          <h3 className="font-bold text-lg mb-3 text-[#0099FF]">📦 Tối ưu sản phẩm</h3>
                          <div className="space-y-3">
                            {stockOptimization.optimizations.slice(0, 20).map((opt, index) => (
                              <div key={index} className="bg-white rounded-xl shadow-sm p-6 border-2 border-[#0099FF]">
                                <p className="font-semibold text-blue-gray-900">{opt.productName} ({opt.productCode})</p>
                                <p className="text-xs text-blue-gray-800 mt-1 font-semibold">{opt.reasoning}</p>
                                <div className="grid grid-cols-4 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-blue-gray-600">Tồn kho hiện tại</p>
                                    <p className="font-bold text-blue-gray-800">{opt.currentStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-gray-600">Tồn tối thiểu</p>
                                    <p className="font-bold text-yellow-600">{opt.minStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-gray-600">Tồn tối đa</p>
                                    <p className="font-bold text-green-500">{opt.maxStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-blue-gray-600">Nhập lại tối ưu</p>
                                    <p className="font-bold text-[#0099FF]">{opt.optimalReorderQuantity}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <button
                          onClick={loadStockOptimization}
                          className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors"
                        >
                          Tải tối ưu kho hàng
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function getAlertIcon(type: string) {
  switch (type) {
    case 'LOW_STOCK': return '⚠️';
    case 'OUT_OF_STOCK': return '🔴';
    case 'SLOW_SELLING': return '🐌';
    case 'FAST_SELLING': return '⚡';
    default: return 'ℹ️';
  }
}

function getAlertLabel(type: string) {
  switch (type) {
    case 'LOW_STOCK': return 'Sắp hết hàng';
    case 'OUT_OF_STOCK': return 'Hết hàng';
    case 'SLOW_SELLING': return 'Bán chậm';
    case 'FAST_SELLING': return 'Bán nhanh';
    default: return type;
  }
}
