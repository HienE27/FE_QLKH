// src/components/common/FilterSection.tsx
'use client';

import { ReactNode, memo } from 'react';

interface FilterSectionProps {
    children: ReactNode;
    error?: string | null;
    onClearFilter?: () => void;
    onCreateNew?: () => void;
    createButtonText?: string;
    className?: string;
    title?: string;
}

function FilterSectionComponent({
    children,
    error,
    onClearFilter,
    onCreateNew,
    createButtonText = '+ Thêm mới',
    className = '',
    title,
}: FilterSectionProps) {
    return (
        <div className={`relative bg-white rounded-xl shadow-sm border border-blue-gray-100 overflow-hidden mb-6 ${className}`}>
            {/* Gradient accent border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0099FF] via-[#0088EE] to-[#0099FF] opacity-60" />
            
            {/* Content */}
            <div className="p-6">
                {/* Title (optional) */}
                {title && (
                    <div className="mb-4 pb-3 border-b border-blue-gray-100">
                        <h3 className="text-lg font-semibold text-blue-gray-800 flex items-center gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                                <path
                                    d="M3 4C3 3.44772 3.44772 3 4 3H20C20.5523 3 21 3.44772 21 4V8C21 8.55228 20.5523 9 20 9H4C3.44772 9 3 8.55228 3 8V4Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                                <path
                                    d="M3 12C3 11.4477 3.44772 11 4 11H20C20.5523 11 21 11.4477 21 12V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V12Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                            </svg>
                            {title}
                        </h3>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mb-4 animate-slide-down text-sm text-red-600 bg-gradient-to-r from-red-50 to-red-100/50 border-l-4 border-red-500 rounded-lg px-4 py-3 relative z-10 shadow-sm">
                        <div className="flex items-start gap-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500 flex-shrink-0 mt-0.5">
                                <path
                                    d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <p className="font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Children Content */}
                <div className="space-y-4">
                    {children}
                </div>

                {/* Action Buttons */}
                {(onClearFilter || onCreateNew) && (
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-blue-gray-100">
                        {onClearFilter && (
                            <button
                                type="button"
                                onClick={onClearFilter}
                                className="px-6 py-2.5 rounded-lg border-2 border-[#0099FF] text-[#0099FF] bg-white hover:bg-[#0099FF]/5 font-semibold transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:ring-offset-2"
                            >
                                <span className="flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" />
                                    </svg>
                                    Đặt lại
                                </span>
                            </button>
                        )}

                        {onCreateNew && (
                            <button
                                type="button"
                                className="px-6 py-2.5 bg-gradient-to-r from-[#0099FF] to-[#0088EE] hover:from-[#0088EE] hover:to-[#0077DD] text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl font-bold transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:ring-offset-2"
                                onClick={onCreateNew}
                            >
                                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:rotate-90">
                                    <path
                                        d="M8 3V13M3 8H13"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                {createButtonText}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes slide-down {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slide-down {
                    animation: slide-down 0.3s ease-out;
                }
            `}</style>
        </div>
    );
}

const FilterSection = memo(FilterSectionComponent);
export default FilterSection;

