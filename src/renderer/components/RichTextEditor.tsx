import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import ResizableImage from '../extensions/ResizableImage';
import Backlink from '../extensions/Backlink';
import { useEffect, useRef } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  currentDate?: string;
  onNavigateToDate?: (date: string) => void;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-1.5 py-1 rounded text-xs font-medium transition-colors ${
        active
          ? 'bg-iqz-blue text-white'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-slate-600 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function isPlainText(str: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(str);
}

function plainTextToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => `<p>${line || '<br>'}</p>`)
    .join('');
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '',
  minHeight = '12rem',
  currentDate,
  onNavigateToDate,
}: RichTextEditorProps) {
  const isInternalUpdate = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      ResizableImage,
      Backlink.configure({ onNavigateToDate }),
      Placeholder.configure({ placeholder }),
    ],
    content: isPlainText(content) ? plainTextToHtml(content) : content,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'outline-none prose prose-sm max-w-none',
        style: `min-height: ${minHeight}`,
      },
    },
  });

  // Sync external content changes (e.g. date navigation)
  useEffect(() => {
    if (!editor) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    const newContent = isPlainText(content) ? plainTextToHtml(content) : content;
    if (editor.getHTML() !== newContent) {
      editor.commands.setContent(newContent || '');
    }
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-iqz-blue/40 focus-within:border-iqz-blue/30">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-slate-700/60 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline (Ctrl+U)"
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
        >
          <span className="line-through">S</span>
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Sub-heading"
        >
          H3
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          1. List
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          " Quote
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        >
          {'</>'}
        </ToolbarButton>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          ―
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo (Ctrl+Y)"
        >
          ↪
        </ToolbarButton>
        {currentDate && (
          <>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mx-1" />
            <ToolbarButton
              onClick={async () => {
                const result = await window.api.pickImage(currentDate);
                if (result) {
                  editor.chain().focus().setImage({ src: result.url, alt: result.name }).run();
                }
              }}
              title="Insert image"
            >
              🖼
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
