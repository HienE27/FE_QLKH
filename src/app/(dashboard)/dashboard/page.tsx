'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import PieChart from '@/components/charts/PieChart';
import { getProducts } from '@/services/product.service';
import { getAllImports, getAllExports, type SupplierImport, type SupplierExport } from '@/services/inventory.service';
import { getSuppliers } from '@/services/supplier.service';
import { getDashboardAlerts, DashboardAlert } from '@/services/ai.service';
import SmartInventoryAlertPopup from '@/components/ai/SmartInventoryAlertPopup';
import AlertProductsPopup from '@/components/ai/AlertProductsPopup';
import { getAllStock } from '@/services/stock.service';
import { formatPrice } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Statistics
  const [totalProducts, setTotalProducts] = useState(0);
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
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showSmartAlertPopup, setShowSmartAlertPopup] = useState(false);
  const [showAlertProductsPopup, setShowAlertProductsPopup] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<DashboardAlert | null>(null);

  useEffect(() => {
    loadDashboardData();
    // Không tự động load AI alerts, chỉ load khi user nhấn nút
  }, []);

  const loadAiAlerts = async () => {
    try {
      setAlertsLoading(true);
      const response = await getDashboardAlerts();
      setAiAlerts(response.alerts || []);
      setAiSummary(response.summary || '');
    } catch (err) {
      console.error('Error loading AI alerts:', err);
      setAiAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200';
      case 'SUCCESS':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-[#0099FF]/10 border-[#0099FF]/30';
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [products, , imports, exports] = await Promise.all([
        getProducts(),
        getSuppliers('NCC'),
        getAllImports({}),
        getAllExports({}),
      ]);

      setTotalProducts(products.length);

      const stockList = await getAllStock().catch(() => []);
      const stockMap = new Map<number, number>();
      stockList.forEach((stock) => {
        const current = stockMap.get(stock.productId) || 0;
        stockMap.set(stock.productId, current + stock.quantity);
      });

      const inventoryValue = products.reduce(
        (sum, p) => {
          const qty = stockMap.get(p.id) || 0;
          return sum + qty * (p.unitPrice || 0);
        },
        0
      );
      setTotalInventoryValue(inventoryValue);

      const lowStock = products.filter(p => {
        const qty = stockMap.get(p.id) || 0;
        return qty > 0 && qty <= 10;
      }).length;
      setLowStockCount(lowStock);

      const outStock = products.filter(p => (stockMap.get(p.id) || 0) === 0).length;
      setOutOfStockCount(outStock);

      const importedItems = imports.filter(i => i.status === 'IMPORTED');
      setTotalImports(importedItems.length);
      const importValue = importedItems.reduce((sum, i) => sum + (i.totalValue || 0), 0);
      setTotalImportValue(importValue);
      setImportedCount(importedItems.length);
      const pendingImp = imports.filter(i => i.status === 'PENDING').length;
      setPendingImports(pendingImp);

      const sortedImports = [...imports]
        .sort((a, b) => {
          const dateA = new Date(a.importsDate || 0).getTime();
          const dateB = new Date(b.importsDate || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 3);
      setRecentImports(sortedImports);

      const exportedItems = exports.filter(e => e.status === 'EXPORTED');
      setTotalExports(exportedItems.length);
      const exportValue = exportedItems.reduce((sum, e) => sum + (e.totalValue || 0), 0);
      setTotalExportValue(exportValue);
      setExportedCount(exportedItems.length);
      const pendingExp = exports.filter(e => e.status === 'PENDING').length;
      setPendingExports(pendingExp);

      const sortedExports = [...exports]
        .sort((a, b) => {
          const dateA = new Date(a.exportsDate || 0).getTime();
          const dateB = new Date(b.exportsDate || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 3);
      setRecentExports(sortedExports);

    } catch (err) {
      console.error('Error loading dashboard:', err);
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
      PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
      IMPORTED: { label: 'Đã nhập', color: 'bg-blue-100 text-blue-800' },
      EXPORTED: { label: 'Đã xuất', color: 'bg-green-100 text-green-800' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-blue-gray-100 text-blue-gray-800' },
      APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
      REJECTED: { label: 'Đã từ chối', color: 'bg-red-100 text-red-800' },
    };
    const config = statusMap[status] || { label: status || 'N/A', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' };
    return (
      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

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
      <div className="min-h-screen bg-blue-gray-50/50">
        <Sidebar />
        <main className="p-4 xl:ml-80">
          <div className="text-center py-20">
            <div className="text-xl text-blue-gray-600">Đang tải dữ liệu...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-gray-50/50">
      <Sidebar />
      <main className="p-4 xl:ml-80">
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-blue-gray-800 mb-1">
            Tổng quan
          </h2>
          <p className="text-sm text-blue-gray-600 uppercase">
            Dashboard quản lý kho hàng
          </p>
        </div>

        {/* Main Statistics Cards */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Products */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-gray-600 font-bold mb-1">Tổng hàng hóa</p>
                  <p className="text-2xl font-bold text-blue-gray-800">{totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Inventory Value */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-gray-600 font-bold mb-1">Giá trị tồn kho</p>
                  <p className="text-2xl font-bold text-blue-gray-800">{formatPrice(totalInventoryValue)}</p>
                </div>
                <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Low Stock */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-gray-600 font-bold mb-1">Sắp hết hàng</p>
                  <p className="text-2xl font-bold text-blue-gray-800">{lowStockCount}</p>
                </div>
                <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Out of Stock */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-gray-600 font-bold mb-1">Hết hàng</p>
                  <p className="text-2xl font-bold text-blue-gray-800">{outOfStockCount}</p>
                </div>
                <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Alerts Section */}
          <div className="mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
                    <span className="text-white text-lg">🤖</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0099FF]">
                    Cảnh báo AI
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSmartAlertPopup(true)}
                    className="px-3 py-1.5 bg-[#0099FF] text-white text-sm font-bold rounded-lg hover:bg-[#0088EE] transition-colors flex items-center gap-1 shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Cảnh báo tồn kho
                  </button>
                  <button
                    onClick={loadAiAlerts}
                  disabled={alertsLoading}
                  className="px-3 py-1.5 bg-[#0099FF] text-white text-sm font-bold rounded-lg hover:bg-[#0088EE] transition-colors flex items-center gap-1 shadow-md disabled:opacity-60"
                  >
                  {alertsLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Đang tải...</span>
                    </>
                  ) : (
                    <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                      Tải cảnh báo AI
                    </>
                  )}
                  </button>
                </div>
              </div>

              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0099FF]"></div>
                  <p className="text-sm text-blue-gray-600 ml-3">
                    Đang phân tích dữ liệu...
                  </p>
                </div>
            ) : aiAlerts.length > 0 ? (
                <>
                  {aiSummary && (
                    <div className="mb-4 p-3 bg-[#0099FF]/10 border-2 border-[#0099FF] rounded-lg">
                      <p className="text-sm text-blue-gray-900 font-semibold">
                        {aiSummary}
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {aiAlerts.map((alert, index) => {
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
                          className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow border ${getAlertStyles(alert.type)}`}
                          onClick={handleAlertClick}
                        >
                          <span className="text-2xl">{getIconEmoji(alert.icon)}</span>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-blue-gray-800">
                              {alert.title}
                            </p>
                            <p className="text-xs text-blue-gray-600 mt-1">
                              {alert.message}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-blue-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-blue-gray-600 mb-4">
                  Nhấn nút "Tải cảnh báo AI" để xem các cảnh báo thông minh
                </p>
              </div>
              )}
            </div>
          </div>

        {/* Import/Export Statistics */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-gray-800">
                  Thống kê nhập kho
                </h3>
                <div className="w-10 h-10 bg-[#0099FF]/10 rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                    <path d="M12 5V19M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Tổng phiếu nhập
                  </p>
                  <p className="text-lg font-bold text-blue-gray-800">
                    {totalImports}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Tổng giá trị
                  </p>
                  <p className="text-lg font-bold text-[#0099FF]">
                    {formatPrice(totalImportValue)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Chờ xử lý
                  </p>
                  <p className="text-lg font-bold text-yellow-600">
                    {pendingImports}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/reports/import-report')}
                className="w-full px-4 py-2 bg-transparent border border-[#0099FF] text-[#0099FF] text-sm font-bold rounded-lg hover:bg-[#0099FF]/10 transition-colors"
              >
                Xem báo cáo chi tiết →
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-700 dark:text-white">
                  Thống kê xuất kho
                </h3>
                <div className="w-10 h-10 bg-[#0099FF]/10 rounded-xl flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                    <path d="M12 19V5M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Tổng phiếu xuất
                  </p>
                  <p className="text-lg font-bold text-blue-gray-800">
                    {totalExports}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Tổng giá trị
                  </p>
                  <p className="text-lg font-bold text-[#0099FF]">
                    {formatPrice(totalExportValue)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs uppercase text-blue-gray-600 font-bold">
                    Chờ xử lý
                  </p>
                  <p className="text-lg font-bold text-yellow-600">
                    {pendingExports}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/reports/export-report')}
                className="w-full px-4 py-2 bg-transparent border border-[#0099FF] text-[#0099FF] text-sm font-bold rounded-lg hover:bg-[#0099FF]/10 transition-colors"
              >
                Xem danh sách phiếu xuất →
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <h3 className="text-lg font-bold text-blue-gray-800 mb-4">
                Tình trạng tồn kho
              </h3>
              <div className="flex justify-center">
                <PieChart
                  data={stockChartData}
                  size={220}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <h3 className="text-lg font-bold text-blue-gray-800 mb-4">
                Trạng thái phiếu nhập/xuất
              </h3>
              <div className="flex justify-center">
                <PieChart
                  data={statusChartData}
                  size={220}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-gray-800">
                  Phiếu nhập gần đây
                </h3>
                <button
                  type="button"
                  onClick={() => router.push('/reports/import-report')}
                  className="text-sm font-bold text-[#0099FF] hover:text-[#0088EE]"
                >
                  Xem thêm →
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {recentImports.length === 0 ? (
                  <div className="py-8 flex justify-center">
                    <p className="text-sm text-blue-gray-600">
                      Chưa có phiếu nhập nào
                    </p>
                  </div>
                ) : (
                  recentImports.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0099FF]/10 hover:bg-[#0099FF]/20 transition-colors cursor-pointer border border-[#0099FF]/30"
                      onClick={() => router.push(`/dashboard/products/import/view-import-receipt/${item.id}`)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-gray-800">
                          {item.code}
                        </p>
                        <p className="text-xs text-blue-gray-600 mt-1">
                          {item.supplierName || 'N/A'} • {formatDate(item.importsDate)}
                        </p>
                      </div>
                      <div className="ml-3 text-right">
                        <p className="text-sm font-bold text-[#0099FF]">
                          {formatPrice(item.totalValue)}
                        </p>
                        <div className="mt-1">{getStatusBadge(item.status)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-blue-gray-800">
                  Phiếu xuất gần đây
                </h3>
                <button
                  type="button"
                  onClick={() => router.push('/reports/export-report')}
                  className="text-sm font-bold text-[#0099FF] hover:text-[#0088EE]"
                >
                  Xem thêm →
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {recentExports.length === 0 ? (
                  <div className="py-8 flex justify-center">
                    <p className="text-sm text-blue-gray-600">
                      Chưa có phiếu xuất nào
                    </p>
                  </div>
                ) : (
                  recentExports.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#0099FF]/10 hover:bg-[#0099FF]/20 transition-colors cursor-pointer border border-[#0099FF]/30"
                      onClick={() => router.push(`/dashboard/products/export/view-export-receipt/${item.id}`)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-gray-800">
                          {item.code}
                        </p>
                        <p className="text-xs text-blue-gray-600 mt-1">
                          {item.customerName || 'N/A'} • {formatDate(item.exportsDate)}
                        </p>
                      </div>
                      <div className="ml-3 text-right">
                        <p className="text-sm font-bold text-[#0099FF]">
                          {formatPrice(item.totalValue)}
                        </p>
                        <div className="mt-1">{getStatusBadge(item.status)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
          <h3 className="text-lg font-bold text-blue-gray-800 mb-4">
            Thao tác nhanh
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <button
              onClick={() => router.push('/dashboard/products/import/create-import-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group"
            >
              <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 5V19M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs uppercase text-blue-gray-800 font-bold">
                Tạo phiếu nhập
              </span>
            </button>

            <button
              onClick={() => router.push('/dashboard/products/export/create-export-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group"
            >
              <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 19V5M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs uppercase text-blue-gray-800 font-bold">
                Tạo phiếu xuất
              </span>
            </button>

            <button
              onClick={() => router.push('/inventory/inventory-checks')}
              className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group"
            >
              <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-xs uppercase text-blue-gray-800 font-bold">
                Kiểm kê kho
              </span>
            </button>

            <button
              onClick={() => router.push('/reports/inventory-report')}
              className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group"
            >
              <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <rect x="3" y="10" width="4" height="11" fill="currentColor" />
                  <rect x="10" y="6" width="4" height="15" fill="currentColor" />
                  <rect x="17" y="3" width="4" height="18" fill="currentColor" />
                </svg>
              </div>
              <span className="text-xs uppercase text-blue-gray-800 font-bold">
                Báo cáo tồn kho
              </span>
            </button>

            <button
              onClick={() => router.push('/reports')}
              className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group"
            >
              <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl text-white">📊</span>
              </div>
              <span className="text-xs uppercase text-blue-gray-800 font-bold">
                Báo cáo AI
              </span>
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
