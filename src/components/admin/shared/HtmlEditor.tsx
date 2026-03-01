'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Undo,
  Redo,
  Code2,
  Eye,
  Heading1,
  Heading2,
  Heading3,
  ImageIcon,
  Minus,
  Quote,
} from 'lucide-react';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  enableHeadings?: boolean;
}

export function HtmlEditor({
  value,
  onChange,
  placeholder,
  rows = 8,
  enableHeadings = false,
}: HtmlEditorProps) {
  const [showCode, setShowCode] = useState(false);
  const [codeValue, setCodeValue] = useState(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: enableHeadings ? { levels: [1, 2, 3] } : false,
        hardBreak: {
          keepMarks: true,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none dark:prose-invert focus:outline-none min-h-[200px] p-3',
        style: `min-height: ${rows * 1.5}rem`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const cleaned = html === '<p></p>' ? '' : html;
      onChange(cleaned);
    },
  });

  // Sync external value changes - but NOT when in code view (to preserve raw HTML)
  useEffect(() => {
    if (showCode) {
      // In code view, just update the code value without touching Tiptap
      setCodeValue(value);
    } else if (editor && value !== editor.getHTML()) {
      // In visual view, sync to editor
      editor.commands.setContent(value || '');
      setCodeValue(value);
    }
  }, [value, editor, showCode]);

  // Handle switching between code and visual mode
  const toggleCodeView = () => {
    if (showCode) {
      // Switching from code to visual - warn if complex HTML might be stripped
      const hasComplexHtml = /<(div|span|svg|section|article|aside|nav|header|footer)[^>]*class=/i.test(codeValue);
      if (hasComplexHtml) {
        const confirmed = window.confirm(
          'Switching to visual mode will strip custom HTML (divs, classes, SVGs). Continue?\n\nTip: Stay in code view and click Save to preserve your HTML.'
        );
        if (!confirmed) return;
      }
      editor?.commands.setContent(codeValue || '');
      onChange(codeValue);
    } else {
      setCodeValue(editor?.getHTML() || '');
    }
    setShowCode(!showCode);
  };

  const handleCodeChange = (newValue: string) => {
    setCodeValue(newValue);
    onChange(newValue);
  };

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || 'https://');

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    if (!editor) return;
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-1 border rounded-md bg-muted/30">
        {enableHeadings && (
          <>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              className="h-8 w-8 p-0"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              className="h-8 w-8 p-0"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              className="h-8 w-8 p-0"
            >
              <Heading3 className="h-4 w-4" />
            </Button>
            <div className="w-px h-6 bg-border self-center mx-1" />
          </>
        )}
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border self-center mx-1" />
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border self-center mx-1" />
        <Button
          type="button"
          variant={editor.isActive('link') ? 'secondary' : 'ghost'}
          size="sm"
          onClick={setLink}
          title="Link"
          className="h-8 w-8 p-0"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addImage}
          title="Insert Image"
          className="h-8 w-8 p-0"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
          className="h-8 w-8 p-0"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border self-center mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border self-center mx-1" />
        <Button
          type="button"
          variant={showCode ? 'secondary' : 'ghost'}
          size="sm"
          onClick={toggleCodeView}
          title={showCode ? 'Visual Editor' : 'View HTML'}
          className="h-8 w-8 p-0"
        >
          {showCode ? <Eye className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Editor */}
      <div className="border rounded-md bg-background">
        {showCode ? (
          <Textarea
            value={codeValue}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="font-mono text-sm border-0 focus-visible:ring-0 resize-none"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Type naturally. Use Ctrl+B for bold, Ctrl+I for italic. Press Enter for new paragraph, Shift+Enter for line break.
      </p>
    </div>
  );
}
