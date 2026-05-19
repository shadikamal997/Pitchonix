'use client';

import React, { useEffect, useRef } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  InlineTextEditor
//
//  TipTap-powered editor that runs INSIDE the canvas for a single text element.
//  Mounted only while editing this element; unmounted when edit mode ends.
//
//  The element's storage shape is:
//     content: { text: string, html?: string }
//
//  - We persist BOTH `html` (for re-render with formatting) and `text`
//    (for plain-text exports / search). On every keystroke we update local
//    state; commit happens on exit (Esc / blur / click outside).
// =============================================================================

interface Props {
  element:       SlideElementDTO;
  defaultSize?:  number;
  defaultWeight?: number;
  /** Called on every keystroke — debounced upstream. */
  onChange:      (patch: { content: { text: string; html: string } }) => void;
  /** Called when the user explicitly finishes editing (Esc, click out, blur). */
  onCommit:      () => void;
  /** Reports the live editor so the floating toolbar can dispatch commands to it. */
  onEditorReady?: (editor: Editor | null) => void;
  multiline?:    boolean;   // true for paragraph/quote; false for heading/caption/cta
}

export const InlineTextEditor: React.FC<Props> = ({
  element, defaultSize, defaultWeight, onChange, onCommit, onEditorReady, multiline = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const c = (element.content as any) || {};
  const initialHTML = c.html && c.html.trim()
    ? c.html
    : (c.text ? `<p>${escapeHtml(c.text)}</p>` : '<p></p>');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // We won't auto-create block-level structure — text-element editors are
        // single-block by design. Heading element ≠ HTML heading.
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,      // belongs to list elements, not text elements
        orderedList: false,
      }),
    ],
    content: initialHTML,
    immediatelyRender: false,
    autofocus: 'end',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange({ content: { text, html } });
    },
    editorProps: {
      attributes: {
        class: 'slide-rt-editing focus:outline-none',
        style: 'width:100%;height:100%;',
      },
      handleKeyDown: (_view, event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onCommit();
          return true;
        }
        // For single-line elements, swallow Enter to prevent newlines
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          onCommit();
          return true;
        }
        return false;
      },
    },
  });

  // Report editor instance up to the floating toolbar
  useEffect(() => {
    onEditorReady?.(editor);
    return () => { onEditorReady?.(null); };
  }, [editor, onEditorReady]);

  // Click outside the editor commits
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node;
      // Allow clicks within the floating toolbar (data-floating-toolbar)
      const t = target as HTMLElement;
      if (t?.closest?.('[data-floating-toolbar]')) return;
      if (!containerRef.current.contains(target)) onCommit();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [onCommit]);

  const css: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: 'transparent',
    color: (element.style as any)?.color || '#111827',
    fontSize: defaultSize,
    fontWeight: defaultWeight,
    fontFamily: (element.style as any)?.fontFamily,
    lineHeight: (element.style as any)?.lineHeight,
    textAlign: (element.style as any)?.textAlign || 'left',
    outline: 'none',
    cursor: 'text',
  };

  return (
    <div ref={containerRef} style={css} className="slide-rt-edit-host">
      <EditorContent editor={editor} />
    </div>
  );
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
