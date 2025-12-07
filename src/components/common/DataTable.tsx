// src/components/common/DataTable.tsx
'use client';

import { ReactNode } from 'react';

interface Column {
    key: string;
    label: string | ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

interface DataTableProps<T extends Record<string, unknown> = Record<string, unknown>> {
    columns: Column[];
    data?: T[];
    loading?: boolean;
    emptyMessage?: string;
    renderRow: (item: T, index: number) => ReactNode;
    getRowKey?: (item: T, index: number) => string | number;
    startIndex?: number;
}

export default function DataTable<T extends Record<string, unknown> = Record<string, unknown>>({
    columns,
    data = [],
    loading = false,
    emptyMessage = 'Không có dữ liệu',
    renderRow,
    startIndex = 0,
    getRowKey = (item: T, index: number) =>
        'id' in item && item.id != null ? (item.id as string | number) : index + startIndex,
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 overflow-hidden">
                <p className="p-4 text-sm text-blue-gray-600">Đang tải dữ liệu...</p>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 overflow-hidden">
                <p className="p-4 text-sm text-blue-gray-600 text-center">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-blue-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[#0099FF] text-white">
                        <tr className="h-[48px]">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={`px-4 text-${col.align || 'center'} font-bold text-sm ${col.className || ''}`}
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => {
                            const rowKey = getRowKey(item, index);
                            return (
                                <tr
                                    key={rowKey}
                                    className="border-b border-blue-gray-100 hover:bg-blue-gray-50 transition-colors h-[48px]"
                                >
                                    {renderRow(item, index)}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

