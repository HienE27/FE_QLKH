// src/components/common/ActionButtons.tsx
'use client';

import { useState } from 'react';

interface ActionButtonsProps {
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    disabled?: boolean;
    viewTitle?: string;
    editTitle?: string;
    deleteTitle?: string;
}

function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
    const [show, setShow] = useState(false);

    return (
        <div className="relative group">
            <div
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
            </div>
            {show && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50 animate-fade-in-tooltip pointer-events-none">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
                </div>
            )}
        </div>
    );
}

function ActionButton({
    onClick,
    disabled,
    title,
    icon,
    color,
    disabledColor,
}: {
    onClick?: () => void;
    disabled?: boolean;
    title: string;
    icon: React.ReactNode;
    color: string;
    disabledColor?: string;
}) {
    const [isActive, setIsActive] = useState(false);

    const handleClick = () => {
        if (!disabled && onClick) {
            setIsActive(true);
            setTimeout(() => setIsActive(false), 150);
            onClick();
        }
    };

    return (
        <Tooltip text={title}>
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled}
                className={`
                    relative p-2 rounded-lg transition-all duration-200
                    ${disabled 
                        ? `opacity-40 cursor-not-allowed ${disabledColor || 'text-blue-gray-400'}` 
                        : `
                            ${color}
                            hover:scale-110 hover:shadow-md
                            active:scale-95
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50
                            ${isActive ? 'scale-95 shadow-inner' : ''}
                        `
                    }
                `}
                style={{
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
                }}
            >
                {/* Ripple effect */}
                {!disabled && (
                    <span className="absolute inset-0 rounded-lg bg-current opacity-0 hover:opacity-10 transition-opacity duration-200" />
                )}
                {icon}
            </button>
        </Tooltip>
    );
}

export default function ActionButtons({
    onView,
    onEdit,
    onDelete,
    disabled = false,
    viewTitle = 'Xem chi tiết',
    editTitle = 'Chỉnh sửa',
    deleteTitle = 'Xóa',
}: ActionButtonsProps) {
    return (
        <div className="flex items-center justify-center gap-2">
            {onView && (
                <ActionButton
                    onClick={onView}
                    disabled={disabled}
                    title={viewTitle}
                    color="text-[#0099FF] hover:bg-[#0099FF]/10 focus:ring-[#0099FF]"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z" />
                            <circle cx="12" cy="12.5" r="3" />
                        </svg>
                    }
                />
            )}

            {onEdit && (
                <ActionButton
                    onClick={onEdit}
                    disabled={disabled}
                    title={editTitle}
                    color="text-[#0099FF] hover:bg-[#0099FF]/10 focus:ring-[#0099FF]"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13" />
                            <path d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" />
                        </svg>
                    }
                />
            )}

            {onDelete && (
                <ActionButton
                    onClick={onDelete}
                    disabled={disabled}
                    title={deleteTitle}
                    color="text-red-500 hover:bg-red-50 focus:ring-red-500"
                    disabledColor="text-blue-gray-400"
                    icon={
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" />
                        </svg>
                    }
                />
            )}

            <style jsx>{`
                @keyframes fade-in-tooltip {
                    from {
                        opacity: 0;
                        transform: translate(-50%, 4px);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, 0);
                    }
                }
                .animate-fade-in-tooltip {
                    animation: fade-in-tooltip 0.2s ease-out;
                }
            `}</style>
        </div>
    );
}

