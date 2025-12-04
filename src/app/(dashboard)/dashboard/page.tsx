'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import PieChart from '@/components/charts/PieChart';
import { getDashboardStats, type DashboardStats, type SupplierImport, type SupplierExport } from '@/services/inventory.service';
import { getDashboardAlerts, DashboardAlert } from '@/services/ai.service';
import SmartInventoryAlertPopup from '@/components/ai/SmartInventoryAlertPopup';
import AlertProductsPopup from '@/components/ai/AlertProductsPopup';

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Statistics
  const [totalProducts, setTotalProducts] = useState(0);
  // const [totalSuppliers, setTotalSuppliers] = useState(0); // Unused
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  // Import/Export stats
  const [totalImports, setTotalImports] = useState(0);
  const [totalImportValue, setTotalImportValue] = useState(0);
  const [totalExports, setTotalExports] = useState(0);
  const [totalExportValue, setTotalExportValue] = useState(0);
  const [pendingImports, setPendingImports] = useState(0);
  const [pendingExports, setPendingExports] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [exportedCount, setExportedCount] = useState(0);

  // Recent activities
  const [recentImports, setRecentImports] = useState<SupplierImport[]>([]);
  const [recentExports, setRecentExports] = useState<SupplierExport[]>([]);

  // AI Alerts
  const [aiAlerts, setAiAlerts] = useState<DashboardAlert[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [showSmartAlertPopup, setShowSmartAlertPopup] = useState(false);
  const [showAlertProductsPopup, setShowAlertProductsPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<DashboardAlert | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Load AI alerts bất đồng bộ (không block UI)
    loadAiAlerts();
  }, []);

  const loadAiAlerts = async () => {
    try {
      setAlertsLoading(true);
      const response = await getDashboardAlerts();
      setAiAlerts(response.alerts || []);
      setAiSummary(response.summary || '');
    } catch (err) {
      // Không log lỗi nếu là lỗi từ external service (Gemini timeout, 503, etc.)
      // Các lỗi này thường xảy ra khi:
      // - Gemini API timeout (30s)
      // - Backend service không khả dụng (503)
      // - Network issues
      const errorMessage = (err as Error)?.message || '';
      const isExternalServiceError = 
        errorMessage.includes('503') ||
        errorMessage.includes('Gemini') ||
        errorMessage.includes('Timeout') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('NANOSECONDS');
      
      if (!isExternalServiceError) {
        console.error('Error loading AI alerts:', err);
      }
      // Set empty state để không hiển thị lỗi cho người dùng
      setAiAlerts([]);
      setAiSummary('');
    } finally {
      setAlertsLoading(false);
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-blue-50 border-blue-300 text-blue-800';
      case 'WARNING':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'SUCCESS':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Gọi API tối ưu từ backend
      const stats: DashboardStats = await getDashboardStats();

      // Set tất cả statistics từ API response
      setTotalProducts(stats.totalProducts);
      setTotalInventoryValue(stats.totalInventoryValue);
      setLowStockCount(stats.lowStockCount);
      setOutOfStockCount(stats.outOfStockCount);
      setTotalImports(stats.totalImports);
      setTotalImportValue(stats.totalImportValue);
      setPendingImports(stats.pendingImports);
      setImportedCount(stats.importedCount);
      setTotalExports(stats.totalExports);
      setTotalExportValue(stats.totalExportValue);
      setPendingExports(stats.pendingExports);
      setExportedCount(stats.exportedCount);
      setRecentImports(stats.recentImports || []);
      setRecentExports(stats.recentExports || []);

    } catch (err) {
      console.error('Error loading dashboard:', err);
      // Set default values to prevent crashes
      setTotalProducts(0);
      setTotalInventoryValue(0);
      setLowStockCount(0);
      setOutOfStockCount(0);
      setTotalImports(0);
      setTotalImportValue(0);
      setTotalExports(0);
      setTotalExportValue(0);
      setPendingImports(0);
      setPendingExports(0);
      setImportedCount(0);
      setExportedCount(0);
      setRecentImports([]);
      setRecentExports([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Chờ xử lý', color: 'bg-blue-100 text-blue-800' },
      IMPORTED: { label: 'Đã nhập', color: 'bg-blue-100 text-blue-800' },
      EXPORTED: { label: 'Đã xuất', color: 'bg-blue-100 text-blue-800' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-slate-100 text-slate-800' },
      APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
      REJECTED: { label: 'Đã từ chối', color: 'bg-slate-100 text-slate-800' },
    };
    const config = statusMap[status] || { label: status || 'N/A', color: 'bg-slate-100 text-slate-800' };
    return (
      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Memoize chart data to prevent unnecessary re-renders
  const stockChartData = useMemo(() => {
    const inStock = Math.max(0, totalProducts - lowStockCount - outOfStockCount);
    return [
      { label: 'Còn hàng', value: inStock, color: '#10B981' },
      { label: 'Sắp hết', value: lowStockCount, color: '#F59E0B' },
      { label: 'Hết hàng', value: outOfStockCount, color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [totalProducts, lowStockCount, outOfStockCount]);

  const statusChartData = useMemo(() => {
    return [
      { label: 'Đã nhập kho', value: importedCount, color: '#3B82F6' },
      { label: 'Đã xuất kho', value: exportedCount, color: '#F97316' },
      { label: 'Chờ xử lý', value: pendingImports + pendingExports, color: '#F59E0B' },
    ].filter(item => item.value > 0);
  }, [importedCount, exportedCount, pendingImports, pendingExports]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <main className="ml-[264px] mt-6 p-6 pr-12">
          <div className="text-center py-20">
            <div className="text-xl text-gray-600">Đang tải dữ liệu...</div>
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
          <h1 className="text-2xl font-bold text-slate-800">Tổng quan</h1>
          <p className="text-slate-600 mt-1">Dashboard quản lý kho hàng</p>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Total Products */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white backdrop-blur-sm border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tổng hàng hóa</p>
                <p className="text-3xl font-bold mt-2">{totalProducts}</p>
                <p className="text-xs opacity-75 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="white" strokeWidth="2" />
                  <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="white" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Giá trị tồn kho</p>
                <p className="text-3xl font-bold mt-2 text-slate-800">{formatCurrency(totalInventoryValue)}</p>
                <p className="text-xs text-slate-500 mt-1">VNĐ</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Sắp hết hàng</p>
                <p className="text-3xl font-bold mt-2 text-slate-800">{lowStockCount}</p>
                <p className="text-xs text-slate-500 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Out of Stock */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Hết hàng</p>
                <p className="text-3xl font-bold mt-2 text-slate-800">{outOfStockCount}</p>
                <p className="text-xs text-slate-500 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* AI Alerts Section */}
        {(aiAlerts.length > 0 || alertsLoading) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Cảnh báo AI</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSmartAlertPopup(true)}
                  className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Cảnh báo tồn kho
                </button>
                <button
                  onClick={loadAiAlerts}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Làm mới
                </button>
              </div>
            </div>

            {alertsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-slate-600">Đang phân tích dữ liệu...</span>
              </div>
            ) : (
              <>
                {aiSummary && (
                  <p className="text-sm text-slate-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">{aiSummary}</p>
                )}
                <div className="space-y-3">
                  {aiAlerts.map((alert, index) => {
                    // Chuyển đổi icon name thành emoji hoặc icon thực sự
                    const getIconEmoji = (iconName: string | undefined) => {
                      if (!iconName) return '📋';
                      switch (iconName) {
                        case 'alert-circle':
                          return '🔴';
                        case 'alert-triangle':
                          return '⚠️';
                        case 'package':
                          return '📦';
                        default:
                          return '📋';
                      }
                    };
                    const handleAlertClick = () => {
                      setSelectedAlert(alert);
                      setShowAlertProductsPopup(true);
                    };

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-3 p-4 rounded-xl border ${getAlertStyles(alert.type)} cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={handleAlertClick}
                      >
                        <span className="text-2xl">{getIconEmoji(alert.icon)}</span>
                        <div className="flex-1">
                          <p className="font-semibold">{alert.title}</p>
                          <p className="text-sm opacity-90 mt-1">{alert.message}</p>
                        </div>
                        <svg className="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Import/Export Statistics */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Import Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Thống kê nhập kho</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12L12 5L19 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tổng phiếu nhập</span>
                <span className="text-lg font-bold text-slate-800">{totalImports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tổng giá trị</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(totalImportValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Chờ xử lý</span>
                <span className="text-lg font-bold text-blue-500">{pendingImports}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/reports/import-report')}
              className="w-full mt-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors text-sm font-medium border border-blue-200"
            >
              Xem báo cáo chi tiết →
            </button>
          </div>

          {/* Export Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Thống kê xuất kho</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M5 12L12 19L19 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tổng phiếu xuất</span>
                <span className="text-lg font-bold text-slate-800">{totalExports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Tổng giá trị</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(totalExportValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Chờ xử lý</span>
                <span className="text-lg font-bold text-blue-500">{pendingExports}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/reports/export-report')}
              className="w-full mt-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-colors text-sm font-medium border border-blue-200"
            >
              Xem danh sách phiếu xuất →
            </button>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Stock Status Pie Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Tình trạng tồn kho</h3>
            <PieChart
              data={stockChartData}
              size={220}
            />
          </div>

          {/* Import/Export Status Pie Chart */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Trạng thái phiếu nhập/xuất</h3>
            <PieChart
              data={statusChartData}
              size={220}
            />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Recent Imports */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Phiếu nhập gần đây</h3>
            </div>
            <div className="space-y-3">
              {recentImports.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Chưa có phiếu nhập nào</p>
              ) : (
                recentImports.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100"
                    onClick={() => router.push(`/dashboard/products/import/view-import-receipt/${item.id}`)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.code}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.supplierName || 'N/A'} • {formatDate(item.importsDate)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(item.totalValue)}</p>
                      <div className="mt-1">{getStatusBadge(item.status)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Exports */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">Phiếu xuất gần đây</h3>
            </div>
            <div className="space-y-3">
              {recentExports.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Chưa có phiếu xuất nào</p>
              ) : (
                recentExports.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer border border-blue-100"
                    onClick={() => router.push(`/dashboard/products/export/view-export-receipt/${item.id}`)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.code}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {item.supplierName || 'N/A'} • {formatDate(item.exportsDate)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(item.totalValue)}</p>
                      <div className="mt-1">{getStatusBadge(item.status)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-5 gap-4">
            <button
              onClick={() => router.push('/dashboard/products/import/create-import-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12L12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Tạo phiếu nhập</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/products/export/create-export-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M5 12L12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Tạo phiếu xuất</span>
            </button>

            <button
              onClick={() => router.push('/inventory/inventory-checks')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Kiểm kê kho</span>
            </button>

            <button
              onClick={() => router.push('/reports/inventory-report')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="10" width="4" height="11" fill="white" />
                  <rect x="10" y="6" width="4" height="15" fill="white" />
                  <rect x="17" y="3" width="4" height="18" fill="white" />
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-800">Báo cáo tồn kho</span>
            </button>

            <button
              onClick={() => router.push('/reports')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group border border-blue-100"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl">📊</span>
              </div>
              <span className="text-sm font-medium text-slate-800">Báo cáo AI</span>
            </button>
          </div>
        </div>
      </main>

      {/* Smart Inventory Alert Popup */}
      {showSmartAlertPopup && (
        <SmartInventoryAlertPopup onClose={() => setShowSmartAlertPopup(false)} />
      )}

      {/* Alert Products Popup */}
      {showAlertProductsPopup && selectedAlert && (
        <AlertProductsPopup
          alertType={selectedAlert.type}
          alertTitle={selectedAlert.title}
          onClose={() => {
            setShowAlertProductsPopup(false);
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
}
