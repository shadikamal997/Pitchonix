'use client';

import React, { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Type, Palette,
} from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';

// =============================================================================
//  FloatingToolbar
//
//  Single shared toolbar that follows whichever inline editor currently has
//  focus. Renders above the editor element using its bounding-rect.
//
//  Two kinds of buttons:
//
//    1. INLINE MARKS    (B / I / U / S)
//       Dispatched directly through the TipTap editor's command chain so the
//       affected text immediately reflects the change. The bold/italic/etc.
//       extensions come from StarterKit.
//
//    2. ELEMENT STYLE   (color, font size, alignment)
//       These are STYLE properties of the whole element, not of a text range.
//       They go through `onStyleChange` → element.style.
//
//  We keep alignment / font controls on the element level rather than as
//  TipTap commands, because canvas elements are single-block and aligning
//  the whole element matches user expectation.
// =============================================================================

const COLORS = ['#111827', '#374151', '#6b7280', '#ef4444', '#f59e0b', '#16a34a', '#0ea5e9', '#7c3aed', '#ec4899', '#ffffff'];
const FONT_SIZES = [10, 11, 12, 14, 16, 18, 22, 28, 36, 48, 64];

interface Props {
  /** Currently focused TipTap editor (or null). */
  editor:        Editor | null;
  /** The element being edited; needed for style controls. */
  element:       SlideElementDTO | null;
  /** Stage-relative anchor (so the toolbar follows the element). */
  anchorRect:    DOMRect | null;
  /** Patch the element's style. */
  onStyleChange: (patch: Partial<ElementStyle>) => void;
}

export const FloatingToolbar: React.FC<Props> = ({ editor, element, anchorRect, onStyleChange }) => {
  // Track active mark state so buttons can highlight
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const handler = () => force((n) => n + 1);
    editor.on('selectionUpdate', handler);
    editor.on('transaction',     handler);
    editor.on('focus',           handler);
    editor.on('blur',            handler);
    return () => {
      editor.off('selectionUpdate', handler);
      editor.off('transaction',     handler);
      editor.off('focus',           handler);
      editor.off('blur',            handler);
    };
  }, [editor]);

  if (!element || !anchorRect) return null;

  const style = (element.style || {}) as ElementStyle;
  const currentSize = style.fontSize ?? defaultSizeFor(element.type);
  const currentColor = style.color ?? '#111827';
  const currentAlign = style.textAlign ?? 'left';

  const top  = Math.max(8, anchorRect.top - 56);
  const left = Math.max(8, Math.min(window.innerWidth - 440, anchorRect.left));

  const isMark = (name: string) => !!editor?.isActive(name);

  return (
    <div
      data-floating-toolbar
      onMouseDown={(e) => { e.preventDefault(); /* keep editor focus */ }}
      style={{ position: 'fixed', top, left, zIndex: 50 }}
      className="bg-white border border-slate-200 shadow-xl rounded-lg flex items-center gap-1 p-1"
    >
      {/* Font size */}
      <select
        value={currentSize}
        onChange={(e) => onStyleChange({ fontSize: Number(e.target.value) })}
        className="h-7 text-xs border border-slate-200 rounded px-1.5 outline-none focus:border-green-500"
        title="Font size"
      >
        {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <Divider />

      {/* Inline marks */}
      <ToolBtn label="Bold (⌘B)" active={isMark('bold')}
        onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn label="Italic (⌘I)" active={isMark('italic')}
        onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn label="Underline (⌘U)" active={isMark('underline')}
        onClick={() => editor?.chain().focus().toggleMark('underline' as any).run()}><Underline className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn label="Strikethrough" active={isMark('strike')}
        onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>

      <Divider />

      {/* Alignment (element-level) */}
      <ToolBtn label="Align left" active={currentAlign === 'left'}
        onClick={() => onStyleChange({ textAlign: 'left' })}><AlignLeft className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn label="Align center" active={currentAlign === 'center'}
        onClick={() => onStyleChange({ textAlign: 'center' })}><AlignCenter className="w-3.5 h-3.5" /></ToolBtn>
      <ToolBtn label="Align right" active={currentAlign === 'right'}
        onClick={() => onStyleChange({ textAlign: 'right' })}><AlignRight className="w-3.5 h-3.5" /></ToolBtn>

      <Divider />

      {/* Text color */}
      <div className="relative group">
        <ToolBtn label="Text color">
          <Palette className="w-3.5 h-3.5" />
          <span className="ml-1 inline-block w-3 h-3 rounded-sm border border-slate-300" style={{ background: currentColor }} />
        </ToolBtn>
        <div className="absolute top-full left-0 mt-1 hidden group-hover:flex bg-white border border-slate-200 rounded-lg shadow-xl p-1.5 z-10">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onStyleChange({ color: c })}
              title={c}
              className="w-5 h-5 rounded border border-slate-200 m-0.5"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const ToolBtn: React.FC<{
  label?: string; active?: boolean; onClick?: () => void; children: React.ReactNode;
}> = ({ label, active, onClick, children }) => (
  <button
    type="button"
    title={label}
    onMouseDown={(e) => { e.preventDefault(); }}
    onClick={onClick}
    className={`h-7 min-w-[28px] px-1.5 rounded text-xs flex items-center justify-center transition-colors ${
      active ? 'bg-green-100 text-green-800' : 'text-slate-700 hover:bg-slate-100'
    }`}
  >
    {children}
  </button>
);

const Divider: React.FC = () => <div className="h-5 w-px bg-slate-200 mx-0.5" />;

function defaultSizeFor(type: string): number {
  switch (type) {
    case 'heading':    return 32;
    case 'subheading': return 18;
    case 'paragraph':  return 14;
    case 'quote':      return 16;
    case 'caption':    return 11;
    case 'label':      return 11;
    case 'cta':        return 14;
    case 'footer':     return 10;
    default:           return 14;
  }
}
