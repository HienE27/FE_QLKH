'use client';

import { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  emoji?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
}

export function EmptyState({
  title = 'Không có dữ liệu',
  message = 'Hiện tại không có dữ liệu để hiển thị.',
  icon,
  emoji,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className="w-20 h-20 text-blue-gray-300 animate-pulse"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  const variantStyles = {
    default: {
      gradient: 'from-blue-gray-50 to-blue-gray-100/50',
      iconColor: 'text-blue-gray-300',
    },
    search: {
      gradient: 'from-amber-50 to-amber-100/50',
      iconColor: 'text-amber-300',
    },
    error: {
      gradient: 'from-red-50 to-red-100/50',
      iconColor: 'text-red-300',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="relative flex flex-col items-center justify-center py-16 px-4 text-center overflow-hidden">
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${styles.gradient} opacity-60`} />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10 animate-fade-in">
        {/* Icon/Emoji */}
        <div className="mb-6 transform transition-transform hover:scale-110 duration-300">
          {emoji ? (
            <div className="text-6xl animate-bounce-slow">{emoji}</div>
          ) : (
            <div className="relative">
              {icon || defaultIcon}
              <div className={`absolute inset-0 ${styles.iconColor} opacity-20 blur-xl animate-pulse`} />
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-blue-gray-800 mb-3 tracking-tight">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-blue-gray-600 mb-8 max-w-md leading-relaxed">
          {message}
        </p>

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-3 bg-[#0099FF] hover:bg-[#0088EE] text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#0099FF] focus:ring-offset-2"
          >
            {action.label}
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

