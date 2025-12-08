'use client';

import React, { memo } from 'react';
import dynamic from 'next/dynamic';
import type { DashboardAlert } from '@/services/ai.service';
import type { SupplierExport, SupplierImport } from '@/services/inventory.service';

const PieChart = dynamic(() => import('@/components/charts/PieChart'), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#0099FF] border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
  ssr: false,
});

export const Header = memo(() => (
  <div className="mb-12">
    <h2 className="text-2xl font-bold text-blue-gray-800 mb-1">Tổng quan</h2>
    <p className="text-sm text-blue-gray-600 uppercase">Dashboard quản lý kho hàng</p>
  </div>
));
Header.displayName = 'Header';

type SummaryCardsProps = {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  formatPrice: (value?: number) => string;
};

export const SummaryCards = memo(
  ({ totalProducts, totalInventoryValue, lowStockCount, outOfStockCount, formatPrice }: SummaryCardsProps) => (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CardStat
          title="Tổng hàng hóa"
          value={totalProducts}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="currentColor" strokeWidth="2" />
              <path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke="currentColor" strokeWidth="2" />
            </svg>
          }
        />

        <CardStat
          title="Giá trị tồn kho"
          value={formatPrice(totalInventoryValue)}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />

        <CardStat
          title="Sắp hết hàng"
          value={lowStockCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />

        <CardStat
          title="Hết hàng"
          value={outOfStockCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
      </div>
    </div>
  ),
);
SummaryCards.displayName = 'SummaryCards';

type CardStatProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
};

const CardStat = memo(({ title, value, icon }: CardStatProps) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-blue-gray-600 font-bold mb-1">{title}</p>
        <p className="text-2xl font-bold text-blue-gray-800">{value}</p>
      </div>
      <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">{icon}</div>
    </div>
  </div>
));
CardStat.displayName = 'CardStat';

type AiAlertsSectionProps = {
  aiAlerts: DashboardAlert[];
  aiSummary: string;
  alertsLoading: boolean;
  loadAiAlerts: () => void;
  getAlertStyles: (type: string) => string;
  onOpenSmartAlert: () => void;
  onSelectAlert: (alert: DashboardAlert) => void;
};

export const AiAlertsSection = memo((props: AiAlertsSectionProps) => {
  const { aiAlerts, aiSummary, alertsLoading, loadAiAlerts, getAlertStyles, onOpenSmartAlert, onSelectAlert } = props;

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

  return (
    <div className="mb-6">
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0099FF] rounded-xl flex items-center justify-center shadow-md">
              <span className="text-white text-lg">🤖</span>
            </div>
            <h3 className="text-lg font-bold text-[#0099FF]">Cảnh báo AI</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSmartAlert}
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
            <p className="text-sm text-blue-gray-600 ml-3">Đang phân tích dữ liệu...</p>
          </div>
        ) : aiAlerts.length > 0 ? (
          <>
            {aiSummary && (
              <div className="mb-4 p-3 bg-[#0099FF]/10 border-2 border-[#0099FF] rounded-lg">
                <p className="text-sm text-blue-gray-900 font-semibold">{aiSummary}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {aiAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow border ${getAlertStyles(alert.type)}`}
                  onClick={() => onSelectAlert(alert)}
                >
                  <span className="text-2xl">{getIconEmoji(alert.icon)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-gray-800">{alert.title}</p>
                    <p className="text-xs text-blue-gray-600 mt-1">{alert.message}</p>
                  </div>
                  <svg className="w-5 h-5 text-blue-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-blue-gray-600 mb-4">Nhấn nút &quot;Tải cảnh báo AI&quot; để xem các cảnh báo thông minh</p>
          </div>
        )}
      </div>
    </div>
  );
});
AiAlertsSection.displayName = 'AiAlertsSection';

type ImportExportStatsProps = {
  totalImports: number;
  totalImportValue: number;
  pendingImports: number;
  totalExports: number;
  totalExportValue: number;
  pendingExports: number;
  formatPrice: (v?: number) => string;
  onViewImportReport: () => void;
  onViewExportReport: () => void;
};

export const ImportExportStats = memo((props: ImportExportStatsProps) => {
  const { totalImports, totalImportValue, pendingImports, totalExports, totalExportValue, pendingExports, formatPrice, onViewImportReport, onViewExportReport } = props;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard title="Thống kê nhập kho" total={totalImports} value={formatPrice(totalImportValue)} pending={pendingImports} iconDirection="up" onView={onViewImportReport} />
        <StatCard title="Thống kê xuất kho" total={totalExports} value={formatPrice(totalExportValue)} pending={pendingExports} iconDirection="down" onView={onViewExportReport} />
      </div>
    </div>
  );
});
ImportExportStats.displayName = 'ImportExportStats';

type StatCardProps = {
  title: string;
  total: number;
  value: string | number;
  pending: number;
  iconDirection: 'up' | 'down';
  onView: () => void;
};

const StatCard = memo(({ title, total, value, pending, iconDirection, onView }: StatCardProps) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-bold text-blue-gray-800">{title}</h3>
      <div className="w-10 h-10 bg-[#0099FF]/10 rounded-xl flex items-center justify-center">{iconDirection === 'up' ? <ArrowUp /> : <ArrowDown />}</div>
    </div>
    <div className="flex flex-col gap-4 mb-4">
      <RowStat label="Tổng phiếu" value={total} valueClass="text-blue-gray-800" />
      <RowStat label="Tổng giá trị" value={value} valueClass="text-[#0099FF]" />
      <RowStat label="Chờ xử lý" value={pending} valueClass="text-yellow-600" />
    </div>
    <button onClick={onView} className="w-full px-4 py-2 bg-transparent border border-[#0099FF] text-[#0099FF] text-sm font-bold rounded-lg hover:bg-[#0099FF]/10 transition-colors">
      Xem báo cáo chi tiết →
    </button>
  </div>
));
StatCard.displayName = 'StatCard';

const RowStat = memo(({ label, value, valueClass }: { label: string; value: number | string; valueClass: string }) => (
  <div className="flex justify-between items-center">
    <p className="text-xs uppercase text-blue-gray-600 font-bold">{label}</p>
    <p className={`text-lg font-bold ${valueClass}`}>{value}</p>
  </div>
));
RowStat.displayName = 'RowStat';

type ChartsSectionProps = {
  stockChartData: { label: string; value: number; color: string }[];
  statusChartData: { label: string; value: number; color: string }[];
};

export const ChartsSection = memo(({ stockChartData, statusChartData }: ChartsSectionProps) => (
  <div className="mb-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <ChartCard title="Tình trạng tồn kho">
        <PieChart data={stockChartData} size={220} />
      </ChartCard>
      <ChartCard title="Trạng thái phiếu nhập/xuất">
        <PieChart data={statusChartData} size={220} />
      </ChartCard>
    </div>
  </div>
));
ChartsSection.displayName = 'ChartsSection';

const ChartCard = memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
    <h3 className="text-lg font-bold text-blue-gray-800 mb-4">{title}</h3>
    <div className="flex justify-center">{children}</div>
  </div>
));
ChartCard.displayName = 'ChartCard';

type RecentActivitiesProps = {
  recentImports: SupplierImport[];
  recentExports: SupplierExport[];
  formatDate: (d: string) => string;
  formatPrice: (v?: number) => string;
  getStatusBadge: (s: string) => React.ReactNode;
  onImportClick: (id: number | undefined) => void;
  onExportClick: (id: number | undefined) => void;
  onViewMoreImport: () => void;
  onViewMoreExport: () => void;
};

export const RecentActivities = memo((props: RecentActivitiesProps) => {
  const { recentImports, recentExports, formatDate, formatPrice, getStatusBadge, onImportClick, onExportClick, onViewMoreImport, onViewMoreExport } = props;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentCard
          title="Phiếu nhập gần đây"
          emptyText="Chưa có phiếu nhập nào"
          items={recentImports}
          onClick={onImportClick}
          onViewMore={onViewMoreImport}
          formatDate={formatDate}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          nameKey="supplierName"
          dateKey="importsDate"
        />
        <RecentCard
          title="Phiếu xuất gần đây"
          emptyText="Chưa có phiếu xuất nào"
          items={recentExports}
          onClick={onExportClick}
          onViewMore={onViewMoreExport}
          formatDate={formatDate}
          formatPrice={formatPrice}
          getStatusBadge={getStatusBadge}
          nameKey="customerName"
          dateKey="exportsDate"
        />
      </div>
    </div>
  );
});
RecentActivities.displayName = 'RecentActivities';

type RecentCardProps<T> = {
  title: string;
  emptyText: string;
  items: T[];
  onClick: (id: number | undefined) => void;
  onViewMore: () => void;
  formatDate: (d: string) => string;
  formatPrice: (v?: number) => string;
  getStatusBadge: (s: string) => React.ReactNode;
  nameKey: string;
  dateKey: string;
};

const RecentCard = memo(
  <T extends { id?: number; code?: string; status?: string; totalValue?: number }>({
    title,
    emptyText,
    items,
    onClick,
    onViewMore,
    formatDate,
    formatPrice,
    getStatusBadge,
    nameKey,
    dateKey,
  }: RecentCardProps<T>) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-blue-gray-800">{title}</h3>
        <button type="button" onClick={onViewMore} className="text-sm font-bold text-[#0099FF] hover:text-[#0088EE]">
          Xem thêm →
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="py-8 flex justify-center">
            <p className="text-sm text-blue-gray-600">{emptyText}</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[#0099FF]/10 hover:bg-[#0099FF]/20 transition-colors cursor-pointer border border-[#0099FF]/30"
              onClick={() => onClick(item.id)}
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-gray-800">{item.code}</p>
                <p className="text-xs text-blue-gray-600 mt-1">
                  {((item as Record<string, unknown>)[nameKey] as string) || 'N/A'} • {formatDate(String((item as Record<string, unknown>)[dateKey] || ''))}
                </p>
              </div>
              <div className="ml-3 text-right">
                <p className="text-sm font-bold text-[#0099FF]">{formatPrice(item.totalValue)}</p>
                <div className="mt-1">{getStatusBadge(item.status || '')}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  ),
);
RecentCard.displayName = 'RecentCard';

type QuickActionsProps = {
  onCreateImport: () => void;
  onCreateExport: () => void;
  onInventoryCheck: () => void;
  onInventoryReport: () => void;
  onReports: () => void;
};

export const QuickActions = memo(({ onCreateImport, onCreateExport, onInventoryCheck, onInventoryReport, onReports }: QuickActionsProps) => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-gray-100">
    <h3 className="text-lg font-bold text-blue-gray-800 mb-4">Thao tác nhanh</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
      <QuickActionButton label="Tạo phiếu nhập" onClick={onCreateImport} icon={<ArrowUp />} />
      <QuickActionButton label="Tạo phiếu xuất" onClick={onCreateExport} icon={<ArrowDown />} />
      <QuickActionButton label="Kiểm kê kho" onClick={onInventoryCheck} icon={<CheckBox />} />
      <QuickActionButton label="Báo cáo tồn kho" onClick={onInventoryReport} icon={<BarChart />} />
      <QuickActionButton label="Báo cáo AI" onClick={onReports} icon={<span className="text-xl text-white">📊</span>} />
    </div>
  </div>
));
QuickActions.displayName = 'QuickActions';

const QuickActionButton = memo(({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center p-6 bg-white hover:bg-gray-50 rounded-xl transition-colors border border-gray-200 shadow-sm group">
    <div className="w-12 h-12 bg-[#0099FF] rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">{icon}</div>
    <span className="text-xs uppercase text-blue-gray-800 font-bold text-center">{label}</span>
  </button>
));
QuickActionButton.displayName = 'QuickActionButton';

const ArrowUp = memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
    <path d="M12 5V19M5 12L12 5L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
ArrowUp.displayName = 'ArrowUp';

const ArrowDown = memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
    <path d="M12 19V5M5 12L12 19L19 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
ArrowDown.displayName = 'ArrowDown';

const CheckBox = memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));
CheckBox.displayName = 'CheckBox';

const BarChart = memo(() => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
    <rect x="3" y="10" width="4" height="11" fill="currentColor" />
    <rect x="10" y="6" width="4" height="15" fill="currentColor" />
    <rect x="17" y="3" width="4" height="18" fill="currentColor" />
  </svg>
));
BarChart.displayName = 'BarChart';


