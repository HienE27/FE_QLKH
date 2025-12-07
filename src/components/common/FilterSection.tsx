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
        <div className={`bg-white rounded-xl shadow-sm border border-blue-gray-100 p-6 mb-6 ${className}`}>
            {error && (
                <div className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2 relative z-10">
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
                            className="px-6 py-2 rounded-lg border border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-medium transition-colors"
                        >
                            Đặt lại
                        </button>
                    )}

                    {onCreateNew && (
                        <button
                            type="button"
                            className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg transition-colors flex items-center gap-2 shadow-md font-bold"
                            onClick={onCreateNew}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M8 3V13M3 8H13"
                                    stroke="currentColor"
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

