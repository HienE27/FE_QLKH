'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import PieChart from '@/components/charts/PieChart';
import { getProducts } from '@/services/product.service';
import { getSupplierImports, getSupplierExports } from '@/services/inventory.service';
import { getSuppliers } from '@/services/supplier.service';
import { getDashboardAlerts, DashboardAlert } from '@/services/ai.service';

const formatCurrency = (value: number) =>
  value.toLocaleString('vi-VN', { maximumFractionDigits: 0 });

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Statistics
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalSuppliers, setTotalSuppliers] = useState(0);
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
  const [recentImports, setRecentImports] = useState<any[]>([]);
  const [recentExports, setRecentExports] = useState<any[]>([]);

  // AI Alerts
  const [aiAlerts, setAiAlerts] = useState<DashboardAlert[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [aiServiceAvailable, setAiServiceAvailable] = useState(true);

  const loadAiAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true);
      setAiServiceAvailable(true);
      const response = await getDashboardAlerts();
      setAiAlerts(response.alerts || []);
      setAiSummary(response.summary || '');
    } catch (err) {
      // AI alerts là tính năng optional, không làm crash dashboard
      console.warn('AI alerts service unavailable:', err);
      setAiAlerts([]);
      setAiSummary('');
      setAiServiceAvailable(false);
      // Không hiển thị error cho user vì đây là tính năng optional
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load dashboard data và AI alerts riêng biệt để lỗi AI không ảnh hưởng dashboard chính
    loadDashboardData().catch((err) => {
      console.error('Error loading dashboard data:', err);
    });
    
    // Load AI alerts riêng, lỗi sẽ được handle trong loadAiAlerts
    loadAiAlerts().catch((err) => {
      // Đã được handle trong loadAiAlerts, chỉ log để debug
      console.warn('Failed to load AI alerts:', err);
    });
  }, [loadAiAlerts]);

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'WARNING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'SUCCESS':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Map icon names to emoji/icons (Vietnamese-friendly) - memoized
  const getIconDisplay = useCallback((iconName?: string, type?: string) => {
    if (!iconName) {
      // Default icon based on type
      switch (type) {
        case 'CRITICAL':
          return '⚠️';
        case 'WARNING':
          return '⚠️';
        case 'SUCCESS':
          return '✅';
        default:
          return 'ℹ️';
      }
    }

    // Map common icon names to emoji
    const iconMap: Record<string, string> = {
      'alert-circle': '⚠️',
      'alert-triangle': '⚠️',
      'alert': '⚠️',
      'package': '📦',
      'box': '📦',
      'inventory': '📦',
      'check-circle': '✅',
      'check': '✅',
      'success': '✅',
      'info': 'ℹ️',
      'information': 'ℹ️',
      'exclamation': '❗',
      'warning': '⚠️',
      'error': '❌',
      'critical': '🚨',
      'low-stock': '📉',
      'high-stock': '📈',
      'out-of-stock': '❌',
    };

    const lowerIcon = iconName.toLowerCase().trim();
    
    // If it's already an emoji or special character, return as is
    if (/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(iconName)) {
      return iconName;
    }

    // Return mapped emoji or default
    return iconMap[lowerIcon] || '📋';
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [products, suppliers, imports, exports] = await Promise.all([
        getProducts(),
        getSuppliers('NCC'),
        getSupplierImports({}),
        getSupplierExports({}),
      ]);

      // Product statistics
      setTotalProducts(products.length);
      const inventoryValue = products.reduce(
        (sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0),
        0
      );
      setTotalInventoryValue(inventoryValue);

      const lowStock = products.filter(p => {
        const qty = p.quantity || 0;
        return qty > 0 && qty <= 10;
      }).length;
      setLowStockCount(lowStock);

      const outStock = products.filter(p => (p.quantity || 0) === 0).length;
      setOutOfStockCount(outStock);

      // Supplier statistics
      setTotalSuppliers(suppliers.length);

      // Import statistics
      setTotalImports(imports.length);
      const importedItems = imports.filter(i => i.status === 'IMPORTED');
      const importValue = importedItems.reduce((sum, i) => sum + (i.totalValue || 0), 0);
      setTotalImportValue(importValue);
      setImportedCount(importedItems.length);
      const pendingImp = imports.filter(i => i.status === 'PENDING').length;
      setPendingImports(pendingImp);

      // Recent imports (last 5)
      const sortedImports = [...imports]
        .sort((a, b) => {
          const dateA = new Date(a.importsDate || a.orderDate || 0).getTime();
          const dateB = new Date(b.importsDate || b.orderDate || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
      setRecentImports(sortedImports);

      // Export statistics
      setTotalExports(exports.length);
      const exportedItems = exports.filter(e => e.status === 'EXPORTED');
      const exportValue = exportedItems.reduce((sum, e) => sum + (e.totalValue || 0), 0);
      setTotalExportValue(exportValue);
      setExportedCount(exportedItems.length);
      const pendingExp = exports.filter(e => e.status === 'PENDING').length;
      setPendingExports(pendingExp);

      // Recent exports (last 5)
      const sortedExports = [...exports]
        .sort((a, b) => {
          const dateA = new Date(a.exportsDate || a.orderDate || 0).getTime();
          const dateB = new Date(b.exportsDate || b.orderDate || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);
      setRecentExports(sortedExports);

    } catch (err) {
      console.error('Error loading dashboard:', err);
      // Set default values to prevent crashes
      setTotalProducts(0);
      setTotalSuppliers(0);
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
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Chưa có';
    try {
    const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Chưa có';
    return date.toLocaleDateString('vi-VN');
    } catch {
      return 'Chưa có';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
      IMPORTED: { label: 'Đã nhập', color: 'bg-green-100 text-green-800' },
      EXPORTED: { label: 'Đã xuất', color: 'bg-blue-100 text-blue-800' },
      CANCELLED: { label: 'Đã hủy', color: 'bg-red-100 text-red-800' },
      APPROVED: { label: 'Đã duyệt', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Đã từ chối', color: 'bg-red-100 text-red-800' },
    };
    const config = statusMap[status] || { label: status || 'Không xác định', color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.color}`}>
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
        <Header />
        <Sidebar />
        <main className="ml-[377px] mt-[113px] p-6 pr-12">
          <div className="text-center py-20">
            <div className="text-xl text-gray-600">Đang tải dữ liệu...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />

      <main className="ml-[377px] mt-[113px] p-6 pr-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
          <p className="text-gray-600 mt-1">Bảng điều khiển quản lý kho hàng</p>
        </div>

        {/* Main Statistics Cards */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Total Products */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Tổng hàng hóa</p>
                <p className="text-3xl font-bold mt-2">{totalProducts}</p>
                <p className="text-xs opacity-75 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="white" strokeWidth="2" />
                  <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="white" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Giá trị tồn kho</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(totalInventoryValue)}</p>
                <p className="text-xs opacity-75 mt-1">VNĐ</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Sắp hết hàng</p>
                <p className="text-3xl font-bold mt-2">{lowStockCount}</p>
                <p className="text-xs opacity-75 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Out of Stock */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Hết hàng</p>
                <p className="text-3xl font-bold mt-2">{outOfStockCount}</p>
                <p className="text-xs opacity-75 mt-1">Mặt hàng</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* AI Alerts Section */}
        {aiServiceAvailable && (aiAlerts.length > 0 || alertsLoading) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cảnh báo AI</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Phân tích thông minh từ hệ thống</p>
                </div>
              </div>
              <button 
                onClick={loadAiAlerts}
                disabled={alertsLoading}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Làm mới
              </button>
            </div>
            
            {alertsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative w-10 h-10 mb-3">
                  <div className="absolute inset-0 border-3 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-3 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-sm text-gray-600 font-medium">Đang phân tích dữ liệu...</p>
                <p className="text-xs text-gray-500 mt-1">Vui lòng đợi trong giây lát</p>
              </div>
            ) : (
              <>
                {aiSummary && (
                  <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
                  </div>
                )}
                {aiAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {aiAlerts.map((alert, index) => {
                      const getIconColor = () => {
                        switch (alert.type) {
                          case 'CRITICAL':
                            return 'text-red-600';
                          case 'WARNING':
                            return 'text-yellow-600';
                          case 'SUCCESS':
                            return 'text-green-600';
                          default:
                            return 'text-blue-600';
                        }
                      };
                      
                      return (
                        <div 
                          key={index}
                          className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                            alert.type === 'CRITICAL' 
                              ? 'bg-red-50 border-red-200 hover:border-red-300 hover:shadow-sm' 
                              : alert.type === 'WARNING'
                              ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-300 hover:shadow-sm'
                              : alert.type === 'SUCCESS'
                              ? 'bg-green-50 border-green-200 hover:border-green-300 hover:shadow-sm'
                              : 'bg-blue-50 border-blue-200 hover:border-blue-300 hover:shadow-sm'
                          } ${alert.action ? 'cursor-pointer' : ''}`}
                          onClick={() => alert.action && router.push(alert.action)}
                        >
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            alert.type === 'CRITICAL' 
                              ? 'bg-red-100' 
                              : alert.type === 'WARNING'
                              ? 'bg-yellow-100'
                              : alert.type === 'SUCCESS'
                              ? 'bg-green-100'
                              : 'bg-blue-100'
                          }`}>
                            <span className="text-xl">{getIconDisplay(alert.icon, alert.type)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm mb-1.5 ${
                              alert.type === 'CRITICAL' 
                                ? 'text-red-900' 
                                : alert.type === 'WARNING'
                                ? 'text-yellow-900'
                                : alert.type === 'SUCCESS'
                                ? 'text-green-900'
                                : 'text-blue-900'
                            }`}>
                              {alert.title}
                            </p>
                            <p className={`text-sm leading-relaxed ${
                              alert.type === 'CRITICAL' 
                                ? 'text-red-700' 
                                : alert.type === 'WARNING'
                                ? 'text-yellow-700'
                                : alert.type === 'SUCCESS'
                                ? 'text-green-700'
                                : 'text-blue-700'
                            }`}>
                              {alert.message}
                            </p>
                          </div>
                          {alert.action && (
                            <div className="flex-shrink-0">
                              <svg className={`w-5 h-5 ${getIconColor()} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">Không có cảnh báo nào vào lúc này</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Import/Export Statistics */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Import Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Thống kê nhập kho</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12L12 5L19 12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng phiếu nhập</span>
                <span className="text-lg font-bold text-gray-800">{totalImports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng giá trị</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(totalImportValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chờ xử lý</span>
                <span className="text-lg font-bold text-yellow-600">{pendingImports}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/reports/import-report')}
              className="w-full mt-4 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-sm font-medium"
            >
              Xem báo cáo chi tiết →
            </button>
          </div>

          {/* Export Stats */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Thống kê xuất kho</h3>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M5 12L12 19L19 12" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng phiếu xuất</span>
                <span className="text-lg font-bold text-gray-800">{totalExports}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tổng giá trị</span>
                <span className="text-lg font-bold text-orange-600">{formatCurrency(totalExportValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chờ xử lý</span>
                <span className="text-lg font-bold text-yellow-600">{pendingExports}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/reports/export-report')}
              className="w-full mt-4 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors text-sm font-medium"
            >
              Xem danh sách phiếu xuất →
            </button>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Stock Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Tình trạng tồn kho</h3>
            <PieChart
              data={stockChartData}
              size={220}
            />
          </div>

          {/* Import/Export Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Trạng thái phiếu nhập/xuất</h3>
            <PieChart
              data={statusChartData}
              size={220}
            />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Recent Imports */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Phiếu nhập gần đây</h3>

            </div>
            <div className="space-y-3">
              {recentImports.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có phiếu nhập nào</p>
              ) : (
                recentImports.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/import/view-import-receipt/${item.id}`)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.code}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.supplierName || 'Chưa có'} • {formatDate(item.importsDate)}
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Phiếu xuất gần đây</h3>

            </div>
            <div className="space-y-3">
              {recentExports.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Chưa có phiếu xuất nào</p>
              ) : (
                recentExports.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/products/export/view-export-receipt/${item.id}`)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.code}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.supplierName || 'Chưa có'} • {formatDate(item.exportsDate)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-bold text-orange-600">{formatCurrency(item.totalValue)}</p>
                      <div className="mt-1">{getStatusBadge(item.status)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-5 gap-4">
            <button
              onClick={() => router.push('/dashboard/products/import/create-import-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12L12 5L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-800">Tạo phiếu nhập</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/products/export/create-export-receipt')}
              className="flex flex-col items-center justify-center p-6 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 19V5M5 12L12 19L19 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-800">Tạo phiếu xuất</span>
            </button>

            <button
              onClick={() => router.push('/inventory/inventory-checks')}
              className="flex flex-col items-center justify-center p-6 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="white" strokeWidth="2" />
                  <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-800">Kiểm kê kho</span>
            </button>

            <button
              onClick={() => router.push('/reports/inventory-report')}
              className="flex flex-col items-center justify-center p-6 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="10" width="4" height="11" fill="white" />
                  <rect x="10" y="6" width="4" height="15" fill="white" />
                  <rect x="17" y="3" width="4" height="18" fill="white" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-800">Báo cáo tồn kho</span>
            </button>

            <button
              onClick={() => router.push('/ai')}
              className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-lg transition-colors group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <span className="text-xl">🤖</span>
              </div>
              <span className="text-sm font-medium text-gray-800">Trợ lý AI</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
