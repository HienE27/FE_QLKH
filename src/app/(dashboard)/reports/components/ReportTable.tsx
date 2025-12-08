'use client';

import React, { memo } from 'react';
import { TableSkeleton } from '@/components/common/TableSkeleton';

type SortField = 'date' | 'value';
type SortDirection = 'asc' | 'desc';

export type ReportTableProps<T> = {
  loading: boolean;
  currentData: T[];
  visibleRows: T[];
  paddingTop: number;
  paddingBottom: number;
  startIndex: number;
  startVirtualIndex: number;
  sortField: SortField;
  sortDirection: SortDirection;
  onToggleSort: (field: SortField) => void;
  dateLabel: string;
  valueLabel: string;
  partnerLabel: string;
  getCode: (row: T) => string | undefined;
  getPartner: (row: T) => string | undefined;
  getDate: (row: T) => string;
  getValue: (row: T) => number;
  getStatus: (row: T) => string;
  getNote: (row: T) => string | undefined;
  statusLabels: Record<string, string>;
  statusColor: Record<string, string>;
  formatPrice: (value?: number) => string;
  onScroll?: (scrollTop: number) => void;
};

const StatusBadge = memo(({ status, statusLabels, statusColor }: { status: string; statusLabels: Record<string, string>; statusColor: Record<string, string> }) => (
  <span className={`inline-block px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${statusColor[status]}`}>{statusLabels[status]}</span>
));
StatusBadge.displayName = 'StatusBadge';

const ReportRow = memo(
  <T,>({
    record,
    index,
    formatPrice,
    statusLabels,
    statusColor,
    getCode,
    getPartner,
    getDate,
    getValue,
    getStatus,
    getNote,
  }: {
    record: T;
    index: number;
    formatPrice: (value?: number) => string;
    statusLabels: Record<string, string>;
    statusColor: Record<string, string>;
    getCode: (row: T) => string | undefined;
    getPartner: (row: T) => string | undefined;
    getDate: (row: T) => string;
    getValue: (row: T) => number;
    getStatus: (row: T) => string;
    getNote: (row: T) => string | undefined;
  }) => (
    <tr className="border-b border-blue-gray-200 hover:bg-blue-gray-50 transition-colors h-[48px]">
      <td className="px-4 text-center text-sm text-blue-gray-800">{index}</td>
      <td className="px-4 text-left text-sm font-medium">{getCode(record)}</td>
      <td className="px-4 text-left text-sm text-blue-gray-700">{getPartner(record) || '-'}</td>
      <td className="px-4 text-center text-sm text-blue-gray-700 whitespace-nowrap">{getDate(record)}</td>
      <td className="px-4 text-right text-sm font-semibold text-green-600">{formatPrice(getValue(record))}</td>
      <td className="px-4 text-center">
        <StatusBadge status={getStatus(record)} statusLabels={statusLabels} statusColor={statusColor} />
      </td>
      <td className="px-4 text-left text-sm text-blue-gray-600">{getNote(record) || '-'}</td>
    </tr>
  ),
);
ReportRow.displayName = 'ReportRow';

export function ReportTable<T>(props: ReportTableProps<T>) {
  const {
    loading,
    currentData,
    visibleRows,
    paddingTop,
    paddingBottom,
    startIndex,
    startVirtualIndex,
    sortField,
    sortDirection,
    onToggleSort,
    dateLabel,
    valueLabel,
    partnerLabel,
    getCode,
    getPartner,
    getDate,
    getValue,
    getStatus,
    getNote,
    statusLabels,
    statusColor,
    formatPrice,
    onScroll,
  } = props;

  if (loading) {
    return <TableSkeleton columns={7} rows={8} />;
  }

  return (
    <div className="rounded-xl border border-blue-gray-100 overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <div
          className="max-h-[520px] overflow-auto"
          style={{ height: 520 }}
          onScroll={onScroll ? (e) => onScroll(e.currentTarget.scrollTop) : undefined}
        >
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#0099FF] text-white h-[48px] text-sm font-bold sticky top-0 z-10">
                <th className="px-4 text-center w-[80px]">STT</th>
                <th className="px-4 text-left w-[200px]">Mã phiếu</th>
                <th className="px-4 text-left w-[260px]">{partnerLabel}</th>
                <th className="px-4 text-center w-[200px]">
                  <button type="button" onClick={() => onToggleSort('date')} className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition">
                    {dateLabel}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                      <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'date' && sortDirection === 'asc' ? 1 : 0.4} />
                      <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'date' && sortDirection === 'desc' ? 1 : 0.4} />
                    </svg>
                  </button>
                </th>
                <th className="px-4 text-right w-[200px]">
                  <button type="button" onClick={() => onToggleSort('value')} className="flex items-center justify-center gap-2 w-full hover:bg-white/10 py-2 rounded transition">
                    {valueLabel}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                      <path d="M8 3L11 7H5L8 3Z" opacity={sortField === 'value' && sortDirection === 'asc' ? 1 : 0.4} />
                      <path d="M8 13L5 9H11L8 13Z" opacity={sortField === 'value' && sortDirection === 'desc' ? 1 : 0.4} />
                    </svg>
                  </button>
                </th>
                <th className="px-4 text-center w-[200px]">Trạng thái</th>
                <th className="px-4 text-left">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-blue-gray-500" colSpan={7}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                <>
                  <tr style={{ height: paddingTop }} aria-hidden />
                  {visibleRows.map((record, index) => {
                    const actualIndex = startIndex + startVirtualIndex + index + 1;
                    return (
                      <ReportRow
                        key={(record as { id?: number }).id ?? `${startVirtualIndex}-${index}`}
                        record={record}
                        index={actualIndex}
                        formatPrice={formatPrice}
                        statusLabels={statusLabels}
                        statusColor={statusColor}
                        getCode={getCode}
                        getPartner={getPartner}
                        getDate={getDate}
                        getValue={getValue}
                        getStatus={getStatus}
                        getNote={getNote}
                      />
                    );
                  })}
                  <tr style={{ height: paddingBottom }} aria-hidden />
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(ReportTable) as typeof ReportTable;

