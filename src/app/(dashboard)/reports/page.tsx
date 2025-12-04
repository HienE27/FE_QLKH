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
    <div className="min-h-screen">
      <Sidebar />
      <main className="ml-[264px] mt-6 p-6 pr-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">📊 Báo cáo AI thông minh</h1>
          <p className="text-slate-600 mt-1">Phân tích và dự đoán dựa trên AI</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
          <div className="flex gap-2 border-b border-slate-200">
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
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-600 hover:text-purple-600'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang phân tích dữ liệu...</p>
              </div>
            ) : (
              <>
                {/* Inventory Alerts Tab */}
                {activeTab === 'alerts' && (
                  <div>
                    {inventoryAlerts ? (
                      <div>
                        <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-purple-800">{inventoryAlerts.summary}</p>
                        </div>
                        <div className="space-y-4">
                          {inventoryAlerts.alerts.map((alert, index) => (
                            <div
                              key={index}
                              className={`border-2 rounded-lg p-4 ${alert.severity === 'CRITICAL'
                                ? 'bg-red-50 border-red-300'
                                : alert.severity === 'WARNING'
                                  ? 'bg-yellow-50 border-yellow-300'
                                  : 'bg-blue-50 border-blue-300'
                                }`}
                            >
                              <div className="flex items-start gap-4">
                                <div className="text-2xl">{getAlertIcon(alert.type)}</div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-bold">{getAlertLabel(alert.type)}</span>
                                    <span className="text-xs px-2 py-1 bg-white rounded">{alert.severity}</span>
                                  </div>
                                  <p className="font-semibold">{alert.productName} ({alert.productCode})</p>
                                  <p className="text-sm mt-1">{alert.message}</p>
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">Tồn kho: </span>
                                    <span>{alert.currentStock.toLocaleString('vi-VN')}</span>
                                    {alert.predictedDaysRemaining != null && (
                                      <>
                                        <span className="mx-2">|</span>
                                        <span className="font-medium">Còn lại: </span>
                                        <span>{alert.predictedDaysRemaining} ngày</span>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2 p-2 bg-white/50 rounded text-sm">
                                    <span className="font-medium">💡 Đề xuất: </span>
                                    {alert.recommendation}
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
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
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
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800 font-medium">
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
                        <div className="border border-slate-200 rounded-lg p-4">
                          <h3 className="font-bold text-lg mb-3">📈 Phân tích doanh thu</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-slate-500">Xu hướng</p>
                              <p className={`font-bold text-lg ${salesInsights.revenueAnalysis.trend === 'INCREASING' ? 'text-green-600' :
                                salesInsights.revenueAnalysis.trend === 'DECREASING' ? 'text-red-600' : 'text-blue-600'
                                }`}>
                                {salesInsights.revenueAnalysis.trend === 'INCREASING' ? '↑ Tăng' :
                                  salesInsights.revenueAnalysis.trend === 'DECREASING' ? '↓ Giảm' : '→ Ổn định'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-slate-500">Tỷ lệ tăng trưởng</p>
                              <p className={`font-bold text-lg ${salesInsights.revenueAnalysis.growthRate > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                {salesInsights.revenueAnalysis.growthRate > 0 ? '+' : ''}
                                {salesInsights.revenueAnalysis.growthRate.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 mt-3">{salesInsights.revenueAnalysis.reason}</p>
                        </div>

                        {/* Top Products */}
                        <div>
                          <h3 className="font-bold text-lg mb-3">🏆 Top sản phẩm bán chạy</h3>
                          <div className="space-y-2">
                            {salesInsights.topProducts.slice(0, 10).map((product, index) => (
                              <div key={index} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                                    {product.rank}
                                  </span>
                                  <div>
                                    <p className="font-semibold">{product.productName}</p>
                                    <p className="text-xs text-slate-500">{product.productCode}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-green-600">{formatCurrency(product.revenue)} VNĐ</p>
                                  <p className="text-xs text-slate-500">{product.quantitySold} sản phẩm</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Overall Analysis */}
                        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                          <h3 className="font-bold text-lg mb-2">🤖 Phân tích tổng quan</h3>
                          <p className="text-sm text-slate-700">{salesInsights.overallAnalysis}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <button
                          onClick={loadSalesInsights}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
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
                        <div className="border border-slate-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                          <h3 className="font-bold text-lg mb-2">📊 Tỉ lệ vòng quay tổng thể</h3>
                          <p className="text-3xl font-bold text-purple-600">{inventoryTurnover.overallTurnoverRate.toFixed(2)}</p>
                          <p className="text-sm text-slate-600 mt-1">{inventoryTurnover.analysis}</p>
                        </div>

                        {/* Dead Stocks */}
                        {inventoryTurnover.deadStocks.length > 0 && (
                          <div>
                            <h3 className="font-bold text-lg mb-3 text-red-600">📦 Hàng tồn kho lâu ({inventoryTurnover.deadStocks.length})</h3>
                            <div className="space-y-2">
                              {inventoryTurnover.deadStocks.map((item, index) => (
                                <div key={index} className="border border-red-200 rounded-lg p-3 bg-red-50">
                                  <p className="font-semibold">{item.productName} ({item.productCode})</p>
                                  <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                    <div>
                                      <span className="text-slate-500">Số lượng: </span>
                                      <span className="font-medium">{item.quantity}</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Không bán: </span>
                                      <span className="font-medium">{item.daysSinceLastSale} ngày</span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500">Giá trị: </span>
                                      <span className="font-medium">{formatCurrency(item.totalValue)} VNĐ</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-red-700 mt-2">💡 {item.recommendation}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {inventoryTurnover.recommendations.length > 0 && (
                          <div className="border border-slate-200 rounded-lg p-4">
                            <h3 className="font-bold text-lg mb-3">💡 Đề xuất</h3>
                            <ul className="space-y-2">
                              {inventoryTurnover.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <span className="text-purple-600">•</span>
                                  <span className="text-sm">{rec}</span>
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
                          className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium"
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
                          <p className="text-sm text-green-800">{stockOptimization.summary}</p>
                        </div>

                        {/* Product Optimizations */}
                        <div>
                          <h3 className="font-bold text-lg mb-3">📦 Tối ưu sản phẩm</h3>
                          <div className="space-y-3">
                            {stockOptimization.optimizations.slice(0, 20).map((opt, index) => (
                              <div key={index} className="border border-slate-200 rounded-lg p-4">
                                <p className="font-semibold">{opt.productName} ({opt.productCode})</p>
                                <p className="text-xs text-slate-500 mt-1">{opt.reasoning}</p>
                                <div className="grid grid-cols-4 gap-4 mt-3">
                                  <div>
                                    <p className="text-xs text-slate-500">Tồn kho hiện tại</p>
                                    <p className="font-bold">{opt.currentStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Tồn tối thiểu</p>
                                    <p className="font-bold text-yellow-600">{opt.minStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Tồn tối đa</p>
                                    <p className="font-bold text-green-600">{opt.maxStock}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Nhập lại tối ưu</p>
                                    <p className="font-bold text-blue-600">{opt.optimalReorderQuantity}</p>
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
                          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
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
