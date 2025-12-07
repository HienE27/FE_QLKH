// src/components/common/ActionButtons.tsx
'use client';

interface ActionButtonsProps {
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    disabled?: boolean;
    viewTitle?: string;
    editTitle?: string;
    deleteTitle?: string;
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
        <div className="flex items-center justify-center gap-3">
            {onView && (
                <button
                    type="button"
                    onClick={onView}
                    className="hover:scale-110 transition-transform"
                    title={viewTitle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                        <path
                            d="M12 5C7 5 2.73 8.11 1 12.5C2.73 16.89 7 20 12 20C17 20 21.27 16.89 23 12.5C21.27 8.11 17 5 12 5Z"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                        <circle
                            cx="12"
                            cy="12.5"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="2"
                        />
                    </svg>
                </button>
            )}

            {onEdit && (
                <button
                    type="button"
                    onClick={onEdit}
                    className="hover:scale-110 transition-transform"
                    title={editTitle}
                    disabled={disabled}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-[#0099FF]">
                        <path
                            d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        <path
                            d="M18.5 2.5C18.9 2.1 19.44 1.88 20 1.88C20.56 1.88 21.1 2.1 21.5 2.5C21.9 2.9 22.12 3.44 22.12 4C22.12 4.56 21.9 5.1 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}

            {onDelete && (
                <button
                    type="button"
                    onClick={onDelete}
                    className="hover:scale-110 transition-transform disabled:opacity-60"
                    title={deleteTitle}
                    disabled={disabled}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={disabled ? 'text-blue-gray-400' : 'text-red-500'}>
                        <path
                            d="M3 6H21M5 6V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            )}
        </div>
    );
}

