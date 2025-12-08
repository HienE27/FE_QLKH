// src/components/common/DataTable.tsx
'use client';

import { ReactNode } from 'react';

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

export default function DataTable<T extends object = Record<string, unknown>>({
    columns,
    data = [],
    loading = false,
    emptyMessage = 'Không có dữ liệu',
    renderRow,
    startIndex = 0,
    getRowKey = (item: T, index: number) =>
        'id' in item && item.id != null ? (item.id as string | number) : index + startIndex,
}: DataTableProps<T>) {
    return (
        <div className="overflow-x-auto rounded-xl border border-blue-gray-100">
                <table className="w-full">
                <thead>
                    <tr className="bg-[#0099FF] text-white h-[48px]">
                            {columns.map((col) => {
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
                            })}
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
                        {data.map((item, index) => {
                            const rowKey = getRowKey(item, index);
                            return (
                                <tr
                                    key={rowKey}
                                className="border-b border-gray-200 hover:bg-gray-50 transition-colors h-[48px]"
                                >
                                    {renderRow(item, index)}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
        </div>
    );
}

