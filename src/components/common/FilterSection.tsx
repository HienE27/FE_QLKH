// src/components/common/FilterSection.tsx
'use client';

import { ReactNode } from 'react';

interface FilterSectionProps {
    children: ReactNode;
    error?: string | null;
    onClearFilter?: () => void;
    onCreateNew?: () => void;
    createButtonText?: string;
    className?: string;
}

export default function FilterSection({
    children,
    error,
    onClearFilter,
    onCreateNew,
    createButtonText = '+ Thêm mới',
    className = '',
}: FilterSectionProps) {
    return (
        <div className={`bg-white rounded-lg shadow-lg p-6 mb-6 ${className}`}>
            {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-4 py-2">
                    {error}
                </div>
            )}

            {children}

            {(onClearFilter || onCreateNew) && (
                <div className="flex justify-end gap-3 mt-4">
                    {onClearFilter && (
                        <button
                            type="button"
                            onClick={onClearFilter}
                            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                        >
                            Xóa lọc
                        </button>
                    )}

                    {onCreateNew && (
                        <button
                            type="button"
                            className="px-6 py-2 bg-[#0046ff] hover:bg-[#0039cc] text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg"
                            onClick={onCreateNew}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M8 3V13M3 8H13"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                            {createButtonText}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

