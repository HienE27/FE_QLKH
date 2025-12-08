'use client';

import React, { memo } from 'react';
import { formatPrice } from '@/lib/utils';

type ReportSummaryProps = {
  totalLabel: string;
  processedLabel: string;
  cancelledLabel: string;
  totalCount: number;
  totalValue: number;
  processedCount: number;
  pendingCount: number;
  cancelledCount: number;
  averageValue: number;
  onExportExcel: () => void;
  onExportPDF: () => void;
};

const SummaryCard = ({
  title,
  value,
  icon,
  valueClassName,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}) => (
  <div className="bg-white rounded-lg shadow-sm border border-blue-gray-200 p-6 min-w-0 overflow-hidden">
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-blue-gray-600 truncate">{title}</p>
        <p className={`text-2xl font-bold text-blue-gray-800 mt-1 break-words ${valueClassName || ''}`}>{value}</p>
      </div>
      <div className="w-12 h-12 bg-[#0099FF]/10 rounded-full flex items-center justify-center">{icon}</div>
    </div>
  </div>
);

const SummaryActions = ({ cancelledLabel, cancelledCount, onExportExcel, onExportPDF }: { cancelledLabel: string; cancelledCount: number; onExportExcel: () => void; onExportPDF: () => void }) => (
  <section className="flex items-center justify-between gap-3">
    <p className="text-sm text-blue-gray-600">
      {cancelledLabel}: <span className="font-semibold text-red-500">{cancelledCount}</span>
    </p>
    <div className="flex gap-3">
      <button onClick={onExportExcel} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center gap-2 font-medium shadow-sm">
        Xuất Excel
      </button>
      <button onClick={onExportPDF} className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-2 font-medium shadow-sm">
        Xuất PDF
      </button>
    </div>
  </section>
);

export const ReportSummary = memo((props: ReportSummaryProps) => {
  const { totalLabel, processedLabel, cancelledLabel, totalCount, totalValue, processedCount, pendingCount, cancelledCount, averageValue, onExportExcel, onExportPDF } = props;

  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 max-w-full">
        <SummaryCard
          title={totalLabel}
          value={totalCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12L12 5L19 12" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
        <SummaryCard
          title="Tổng giá trị"
          value={formatPrice(totalValue)}
          valueClassName="text-[#0099FF] text-xl leading-tight"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2V22M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          }
        />
        <SummaryCard
          title={processedLabel}
          value={processedCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 12L10 17L19 8" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          valueClassName="text-green-600"
        />
        <SummaryCard
          title="Đang chờ xử lý"
          value={pendingCount}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8V12" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16H12.01" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#F59E0B" strokeWidth="2" />
            </svg>
          }
          valueClassName="text-yellow-600"
        />
        <SummaryCard
          title="Giá trị trung bình"
          value={formatPrice(averageValue)}
          valueClassName="text-xl leading-tight"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 12H20M4 12C4 8.13401 7.13401 5 11 5V19C7.13401 19 4 15.866 4 12Z" stroke="#0099FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
        />
      </section>

      <SummaryActions cancelledLabel={cancelledLabel} cancelledCount={cancelledCount} onExportExcel={onExportExcel} onExportPDF={onExportPDF} />
    </>
  );
});
ReportSummary.displayName = 'ReportSummary';

export default ReportSummary;

