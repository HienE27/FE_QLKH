'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

type MenuBarProps = {
  editor: Editor;
  onSetLink: () => void;
  onAddImage: () => void;
};

const MenuBar = ({ editor, onSetLink, onAddImage }: MenuBarProps) => (
  <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1 bg-gray-50">
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleBold().run()}
      disabled={!editor.can().chain().focus().toggleBold().run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('bold')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="In đậm (Ctrl+B)"
    >
      <strong>B</strong>
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleItalic().run()}
      disabled={!editor.can().chain().focus().toggleItalic().run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('italic')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="In nghiêng (Ctrl+I)"
    >
      <em>I</em>
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleStrike().run()}
      disabled={!editor.can().chain().focus().toggleStrike().run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('strike')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Gạch ngang"
    >
      <s>S</s>
    </button>
    <div className="w-px h-6 bg-gray-300 mx-1" />
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('heading', { level: 1 })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Tiêu đề 1"
    >
      H1
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('heading', { level: 2 })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Tiêu đề 2"
    >
      H2
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('heading', { level: 3 })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Tiêu đề 3"
    >
      H3
    </button>
    <div className="w-px h-6 bg-gray-300 mx-1" />
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleBulletList().run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('bulletList')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Danh sách dấu đầu dòng"
    >
      •
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().toggleOrderedList().run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('orderedList')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Danh sách đánh số"
    >
      1.
    </button>
    <div className="w-px h-6 bg-gray-300 mx-1" />
    <button
      type="button"
      onClick={() => editor.chain().focus().setTextAlign('left').run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive({ textAlign: 'left' })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Căn trái"
    >
      ⬅
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().setTextAlign('center').run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive({ textAlign: 'center' })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Căn giữa"
    >
      ⬌
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().setTextAlign('right').run()}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive({ textAlign: 'right' })
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Căn phải"
    >
      ➡
    </button>
    <div className="w-px h-6 bg-gray-300 mx-1" />
    <button
      type="button"
      onClick={onSetLink}
      className={`px-2 py-1 rounded text-sm ${
        editor.isActive('link')
          ? 'bg-blue-500 text-white'
          : 'bg-white text-gray-700 hover:bg-gray-100'
      }`}
      title="Chèn link"
    >
      🔗
    </button>
    <button
      type="button"
      onClick={onAddImage}
      className="px-2 py-1 rounded text-sm bg-white text-gray-700 hover:bg-gray-100"
      title="Chèn hình ảnh"
    >
      🖼
    </button>
    <div className="w-px h-6 bg-gray-300 mx-1" />
    <button
      type="button"
      onClick={() => {
        const color = window.prompt('Nhập mã màu (ví dụ: #FF0000)');
        if (color) {
          editor.chain().focus().setColor(color).run();
        }
      }}
      className="px-2 py-1 rounded text-sm bg-white text-gray-700 hover:bg-gray-100"
      title="Màu chữ"
    >
      A
    </button>
    <button
      type="button"
      onClick={() => editor.chain().focus().unsetColor().run()}
      className="px-2 py-1 rounded text-sm bg-white text-gray-700 hover:bg-gray-100"
      title="Xóa màu"
    >
      🎨
    </button>
    <div className="flex-1" />
    <button
      type="button"
      onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
      className="px-2 py-1 rounded text-sm bg-white text-gray-700 hover:bg-gray-100"
      title="Xóa định dạng"
    >
      🧹
    </button>
  </div>
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung...',
  className = '',
}: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] px-4 py-2',
        'data-placeholder': placeholder,
      },
    },
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Đóng fullscreen bằng ESC
  useEffect(() => {
    if (!isFullscreen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;

    const url = window.prompt('URL hình ảnh');

    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-800">Chỉnh sửa mô tả</h3>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Đóng (ESC)
          </button>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto flex flex-col">
          <MenuBar editor={editor} onSetLink={setLink} onAddImage={addImage} />
          <div className="flex-1 overflow-auto p-4">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative border border-gray-300 rounded-md bg-white ${className}`}>
      <div className="relative">
        <MenuBar editor={editor} onSetLink={setLink} onAddImage={addImage} />
        <div className="relative min-h-[200px] max-h-[400px] overflow-auto">
          <EditorContent editor={editor} />
        </div>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="absolute top-2 right-2 z-10 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs flex items-center gap-1 shadow-sm"
          title="Phóng to để chỉnh sửa dễ dàng hơn"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
          Phóng to
        </button>
      </div>
    </div>
  );
}
