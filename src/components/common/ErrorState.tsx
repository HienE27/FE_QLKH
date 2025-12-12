'use client';

import { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  icon?: ReactNode;
}

export function ErrorState({
  title = 'Đã xảy ra lỗi',
  message,
  error,
  onRetry,
  icon,
}: ErrorStateProps) {
  const errorMessage =
    message ||
    (error instanceof Error ? error.message : typeof error === 'string' ? error : 'Vui lòng thử lại sau.');

  const defaultIcon = (
    <svg
      className="w-16 h-16 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4">{icon || defaultIcon}</div>
      <h3 className="text-lg font-semibold text-red-600 mb-2">{title}</h3>
      <p className="text-sm text-blue-gray-600 mb-6 max-w-md">{errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Thử lại
        </button>
      )}
    </div>
  );
}

