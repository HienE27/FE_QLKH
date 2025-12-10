// src/components/common/DataTable.tsx
'use client';

import { ReactNode, memo, useMemo } from 'react';

interface Column {
    key: string;
    label: string | ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

interface DataTableProps<T extends object = Record<string, unknown>> {
    columns: Column[];
    data?: T[];
    loading?: boolean;
    emptyMessage?: string;
    renderRow: (item: T, index: number) => ReactNode;
    getRowKey?: (item: T, index: number) => string | number;
    startIndex?: number;
}

function DataTableComponent<T extends object = Record<string, unknown>>({
    columns,
    data = [],
    loading = false,
    emptyMessage = 'Không có dữ liệu',
    renderRow,
    startIndex = 0,
    getRowKey = (item: T, index: number) =>
        'id' in item && item.id != null ? (item.id as string | number) : index + startIndex,
}: DataTableProps<T>) {
    // Memoize column headers to avoid re-rendering
    const columnHeaders = useMemo(
        () =>
            columns.map((col) => {
                // Map align to Tailwind classes (không thể dùng dynamic class names)
                const alignClass = col.align === 'left' 
                    ? 'text-left' 
                    : col.align === 'right' 
                    ? 'text-right' 
                    : 'text-center';
                
                return (
                    <th
                        key={col.key}
                        className={`px-4 ${alignClass} font-bold text-sm ${col.className || ''}`}
                    >
                        {col.label}
                    </th>
                );
            }),
        [columns]
    );

    // Memoize rows to avoid re-rendering when data hasn't changed
    const rows = useMemo(
        () =>
            data.map((item, index) => {
                const rowKey = getRowKey(item, index);
                return (
                    <tr
                        key={rowKey}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                    >
                        {renderRow(item, index)}
                    </tr>
                );
            }),
        [data, renderRow, getRowKey]
    );

    return (
        <div className="overflow-x-auto rounded-xl border border-blue-gray-100">
            <table className="w-full">
                <thead>
                    <tr className="bg-[#0099FF] text-white h-[48px]">
                        {columnHeaders}
                    </tr>
                </thead>
                <tbody>
                    {/* Hiển thị empty message chỉ khi không loading và không có data */}
                    {!loading && data.length === 0 && (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="text-center text-sm text-blue-gray-500 py-4"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    )}
                    
                    {/* Hiển thị data - giữ data cũ khi loading */}
                    {rows}
                </tbody>
            </table>
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
const DataTable = memo(DataTableComponent) as typeof DataTableComponent;
export default DataTable;

