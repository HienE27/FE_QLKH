'use client';

import React, { memo } from 'react';

type BaseFilters = {
  code: string;
  from: string;
  to: string;
  status: string;
  [key: string]: string;
};

type StatusOption = { value: string; label: string };

type ReportFiltersProps<T extends BaseFilters> = {
  filters: T;
  partnerKey: keyof T;
  partnerLabel: string;
  statusOptions: StatusOption[];
  loading: boolean;
  error?: string | null;
  onChange: (next: Partial<T>) => void;
  onSearch: () => void;
  onReset: () => void;
};

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  placeholder?: string;
  type?: 'text' | 'date';
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="block text-sm font-medium text-blue-gray-800 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
    />
  </div>
);

export function ReportFilters<T extends BaseFilters>(props: ReportFiltersProps<T>) {
  const { filters, partnerKey, partnerLabel, statusOptions, loading, error, onChange, onSearch, onReset } = props;

  return (
    <section>
      <h3 className="text-lg font-bold text-blue-gray-800 mb-4">Bộ lọc</h3>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <TextField label="Mã phiếu" value={filters.code} placeholder="Nhập mã phiếu" onChange={(value) => onChange({ code: value } as Partial<T>)} />
        <TextField label={partnerLabel} value={filters[partnerKey] || ''} placeholder={`Tên ${partnerLabel.toLowerCase()}`} onChange={(value) => onChange({ [partnerKey]: value } as Partial<T>)} />
        <TextField label="Từ ngày" value={filters.from} type="date" onChange={(value) => onChange({ from: value } as Partial<T>)} />
        <TextField label="Đến ngày" value={filters.to} type="date" onChange={(value) => onChange({ to: value } as Partial<T>)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-blue-gray-800 mb-2">Trạng thái</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value } as Partial<T>)}
            className="w-full px-4 py-2 bg-blue-gray-50 border border-blue-gray-300 rounded-lg focus:ring-2 focus:ring-[#0099FF] focus:border-[#0099FF]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      <div className="flex items-center justify-between mt-6">
        <button onClick={onReset} className="px-6 py-2 rounded-lg border border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-colors">
          Đặt lại
        </button>
        <div className="flex gap-3">
          <button onClick={onSearch} disabled={loading} className="px-6 py-2 rounded-lg bg-[#0099FF] hover:bg-[#0088EE] text-white flex items-center gap-2 disabled:opacity-60">
            {loading ? 'Đang tải...' : 'Tìm kiếm'}
          </button>
        </div>
      </div>
    </section>
  );
}

export default memo(ReportFilters) as typeof ReportFilters;

