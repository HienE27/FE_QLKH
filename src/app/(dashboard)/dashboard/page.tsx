'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { getProducts } from '@/services/product.service';
import { getAllImports, getAllExports, type SupplierImport, type SupplierExport } from '@/services/inventory.service';
import { getSuppliers } from '@/services/supplier.service';
import { getDashboardAlerts, DashboardAlert } from '@/services/ai.service';

// Lazy load AI components để giảm bundle size ban đầu
const SmartInventoryAlertPopup = dynamic(() => import('@/components/ai/SmartInventoryAlertPopup'), {
  ssr: false,
});
const AlertProductsPopup = dynamic(() => import('@/components/ai/AlertProductsPopup'), {
  ssr: false,
});
import { getAllStock } from '@/services/stock.service';
import { formatPrice } from '@/lib/utils';
import {
  Header,
  SummaryCards,
  AiAlertsSection,
  ImportExportStats,
  ChartsSection,
  RecentActivities,
  QuickActions,
} from './components/sections';

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

  const formatDate = useCallback((dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('vi-VN');
    } catch {
      return 'N/A';
    }
  }, []);

  const statusMap = useMemo<Record<string, { label: string; color: string }>>(() => ({
    PENDING: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-800' },
    IMPORTED: { label: 'Đã nhập', color: 'bg-blue-100 text-blue-800' },
    EXPORTED: { label: 'Đã xuất', color: 'bg-green-100 text-green-800' },
    CANCELLED: { label: 'Đã hủy', color: 'bg-blue-gray-100 text-blue-gray-800' },
    APPROVED: { label: 'Đã duyệt', color: 'bg-blue-100 text-blue-800' },
    REJECTED: { label: 'Đã từ chối', color: 'bg-red-100 text-red-800' },
  }), []);

  const getStatusBadge = useCallback((status: string) => {
    const config = statusMap[status] || { label: status || 'N/A', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' };
    return (
      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  }, [statusMap]);

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
      <div className="text-center py-20">
        <div className="text-xl text-blue-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <SummaryCards
        totalProducts={totalProducts}
        totalInventoryValue={totalInventoryValue}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        formatPrice={formatPrice}
      />

      <AiAlertsSection
        aiAlerts={aiAlerts}
        aiSummary={aiSummary}
        alertsLoading={alertsLoading}
        loadAiAlerts={loadAiAlerts}
        getAlertStyles={getAlertStyles}
        onOpenSmartAlert={() => setShowSmartAlertPopup(true)}
        onSelectAlert={(alert) => {
          setSelectedAlert(alert);
          setShowAlertProductsPopup(true);
        }}
      />

      <ImportExportStats
        totalImports={totalImports}
        totalImportValue={totalImportValue}
        pendingImports={pendingImports}
        totalExports={totalExports}
        totalExportValue={totalExportValue}
        pendingExports={pendingExports}
        formatPrice={formatPrice}
        onViewImportReport={() => router.push('/reports/import-report')}
        onViewExportReport={() => router.push('/reports/export-report')}
      />

      <ChartsSection stockChartData={stockChartData} statusChartData={statusChartData} />

      <RecentActivities
        recentImports={recentImports}
        recentExports={recentExports}
        formatDate={formatDate}
        formatPrice={formatPrice}
        getStatusBadge={getStatusBadge}
        onImportClick={(id) => router.push(`/products/import/view-import-receipt/${id}`)}
        onExportClick={(id) => router.push(`/products/export/view-export-receipt/${id}`)}
        onViewMoreImport={() => router.push('/reports/import-report')}
        onViewMoreExport={() => router.push('/reports/export-report')}
      />

      <QuickActions
        onCreateImport={() => router.push('/imports/create')}
        onCreateExport={() => router.push('/exports/create')}
        onInventoryCheck={() => router.push('/inventory/inventory-checks')}
        onInventoryReport={() => router.push('/reports/inventory-report')}
        onReports={() => router.push('/reports')}
      />

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
    </>
  );
}