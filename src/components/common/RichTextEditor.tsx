'use client';

import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    height?: string;
    readOnly?: boolean;
}

export default function RichTextEditor({
    value,
    onChange,
    placeholder = 'Nhập nội dung...',
    className = '',
    height = 'h-32',
    readOnly = false,
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
        handleInput();
    };

    const ToolbarButton = ({ 
        onClick, 
        icon, 
        title, 
        isActive = false 
    }: { 
        onClick: () => void; 
        icon: JSX.Element; 
        title: string; 
        isActive?: boolean;
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
            }`}
        >
            {icon}
        </button>
    );

    if (readOnly) {
        return (
            <div
                className={`${className} ${height} overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50 prose prose-sm max-w-none`}
                dangerouslySetInnerHTML={{ __html: value || '' }}
            />
        );
    }

    return (
        <div className={`border border-gray-300 rounded-md bg-white ${isFocused ? 'ring-2 ring-blue-500 border-blue-500' : ''} transition-all ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50 rounded-t-md flex-wrap">
                <ToolbarButton
                    onClick={() => execCommand('bold')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                        </svg>
                    }
                    title="In đậm (Ctrl+B)"
                />
                <ToolbarButton
                    onClick={() => execCommand('italic')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 16M6 20l-4-16" />
                        </svg>
                    }
                    title="In nghiêng (Ctrl+I)"
                />
                <ToolbarButton
                    onClick={() => execCommand('underline')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    }
                    title="Gạch chân (Ctrl+U)"
                />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                    onClick={() => execCommand('insertUnorderedList')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    }
                    title="Danh sách dấu đầu dòng"
                />
                <ToolbarButton
                    onClick={() => execCommand('insertOrderedList')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                    }
                    title="Danh sách đánh số"
                />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                    onClick={() => {
                        const url = prompt('Nhập URL:');
                        if (url) execCommand('createLink', url);
                    }}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    }
                    title="Chèn liên kết"
                />
                <div className="w-px h-6 bg-gray-300 mx-1" />
                <ToolbarButton
                    onClick={() => execCommand('removeFormat')}
                    icon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    }
                    title="Xóa định dạng"
                />
            </div>

            {/* Editor */}
            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className={`${height} overflow-y-auto p-3 focus:outline-none prose prose-sm max-w-none min-h-[128px]`}
                    suppressContentEditableWarning
                />
                {!value && !isFocused && (
                    <div className="absolute top-3 left-3 text-gray-400 text-sm pointer-events-none">
                        {placeholder}
                    </div>
                )}
            </div>

            {/* Styles for editor content */}
            <style jsx global>{`
                [contenteditable] p {
                    margin: 0.5em 0;
                }
                [contenteditable] p:first-child {
                    margin-top: 0;
                }
                [contenteditable] p:last-child {
                    margin-bottom: 0;
                }
                [contenteditable] ul, [contenteditable] ol {
                    margin: 0.5em 0;
                    padding-left: 1.5em;
                }
                [contenteditable] a {
                    color: #2563eb;
                    text-decoration: underline;
                }
                [contenteditable] strong {
                    font-weight: 600;
                }
                [contenteditable] em {
                    font-style: italic;
                }
                [contenteditable] u {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}

