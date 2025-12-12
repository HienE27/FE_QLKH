// src/components/common/VirtualTable.tsx
'use client';

import { ReactNode, memo, useMemo, useState, useCallback } from 'react';

interface Column {
    key: string;
    label: string | ReactNode;
    align?: 'left' | 'center' | 'right';
    className?: string;
}

interface VirtualTableProps<T extends object = Record<string, unknown>> {
    columns: Column[];
    data?: T[];
    loading?: boolean;
    emptyMessage?: string;
    renderRow: (item: T, index: number) => ReactNode;
    getRowKey?: (item: T, index: number) => string | number;
    startIndex?: number;
    // Virtual scrolling options
    rowHeight?: number;
    viewportHeight?: number;
    overscan?: number;
    // Custom table className
    tableClassName?: string;
}

function VirtualTableComponent<T extends object = Record<string, unknown>>({
    columns,
    data = [],
    loading = false,
    emptyMessage = 'Không có dữ liệu',
    renderRow,
    startIndex = 0,
    getRowKey = (item: T, index: number) =>
        'id' in item && item.id != null ? (item.id as string | number) : index + startIndex,
    rowHeight = 48,
    viewportHeight = 560,
    overscan = 8,
    tableClassName = '',
}: VirtualTableProps<T>) {
    const [virtualScrollTop, setVirtualScrollTop] = useState(0);

    // Memoize column headers to avoid re-rendering
    const columnHeaders = useMemo(
        () =>
            columns.map((col) => {
                // Map align to Tailwind classes
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

    // Virtual scrolling calculations
    const totalVirtualHeight = useMemo(
        () => data.length * rowHeight,
        [data.length, rowHeight],
    );

    const startVirtualIndex = useMemo(
        () => Math.max(0, Math.floor(virtualScrollTop / rowHeight) - overscan),
        [virtualScrollTop, rowHeight, overscan],
    );

    const endVirtualIndex = useMemo(
        () =>
            Math.min(
                data.length,
                Math.ceil((virtualScrollTop + viewportHeight) / rowHeight) + overscan,
            ),
        [virtualScrollTop, viewportHeight, rowHeight, overscan, data.length],
    );

    const visibleRows = useMemo(
        () => data.slice(startVirtualIndex, endVirtualIndex),
        [data, startVirtualIndex, endVirtualIndex],
    );

    const paddingTop = startVirtualIndex * rowHeight;
    const paddingBottom = Math.max(0, totalVirtualHeight - endVirtualIndex * rowHeight);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setVirtualScrollTop(e.currentTarget.scrollTop);
    }, []);

    // Render rows with virtual scrolling
    const rows = useMemo(
        () =>
            visibleRows.map((item, index) => {
                const actualIndex = startVirtualIndex + index;
                const rowKey = getRowKey(item, actualIndex);
                return (
                    <tr
                        key={rowKey}
                        className="group border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-gray-50 hover:to-blue-gray-100/50 transition-all duration-200 cursor-pointer"
                        style={{ 
                            height: rowHeight,
                            animation: `fadeInRow 0.3s ease-out ${index * 0.02}s both`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.classList.add('shadow-sm');
                            e.currentTarget.style.borderLeft = '3px solid #0099FF';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.classList.remove('shadow-sm');
                            e.currentTarget.style.borderLeft = 'none';
                        }}
                    >
                        {renderRow(item, actualIndex)}
                    </tr>
                );
            }),
        [visibleRows, startVirtualIndex, getRowKey, renderRow, rowHeight],
    );

    // If data is small, don't use virtual scrolling
    const shouldUseVirtualScrolling = data.length > 20;

    if (!shouldUseVirtualScrolling) {
        // Fallback to regular rendering for small datasets
        const allRows = useMemo(
            () =>
                data.map((item, index) => {
                    const rowKey = getRowKey(item, index);
                    return (
                        <tr
                            key={rowKey}
                            className="group border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-gray-50 hover:to-blue-gray-100/50 transition-all duration-200 cursor-pointer"
                            style={{ 
                                height: rowHeight,
                                animation: `fadeInRow 0.3s ease-out ${index * 0.02}s both`,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.classList.add('shadow-sm');
                                e.currentTarget.style.borderLeft = '3px solid #0099FF';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.classList.remove('shadow-sm');
                                e.currentTarget.style.borderLeft = 'none';
                            }}
                        >
                            {renderRow(item, index)}
                        </tr>
                    );
                }),
            [data, renderRow, getRowKey, rowHeight],
        );

        return (
            <div className={`overflow-x-auto rounded-xl border border-blue-gray-100 ${tableClassName}`}>
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#0099FF] text-white sticky top-0 z-10" style={{ height: rowHeight }}>
                            {columnHeaders}
                        </tr>
                    </thead>
                    <tbody>
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
                        {allRows}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className={`overflow-x-auto rounded-xl border border-blue-gray-100 ${tableClassName}`}>
            <div
                className="overflow-auto"
                onScroll={handleScroll}
                style={{ height: viewportHeight }}
            >
                <table className="w-full">
                    <thead>
                        <tr className="bg-[#0099FF] text-white sticky top-0 z-10" style={{ height: rowHeight }}>
                            {columnHeaders}
                        </tr>
                    </thead>
                    <tbody>
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
                        {data.length > 0 && (
                            <>
                                <tr style={{ height: paddingTop }} aria-hidden />
                                {rows}
                                <tr style={{ height: paddingBottom }} aria-hidden />
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Memoize the component to prevent unnecessary re-renders
const VirtualTable = memo(VirtualTableComponent) as typeof VirtualTableComponent;
export default VirtualTable;

// Add global styles for row animations
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInRow {
            from {
                opacity: 0;
                transform: translateY(4px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    if (!document.head.querySelector('style[data-virtual-table]')) {
        style.setAttribute('data-virtual-table', 'true');
        document.head.appendChild(style);
    }
}

