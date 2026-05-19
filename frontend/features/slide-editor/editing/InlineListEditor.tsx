'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  InlineListEditor
//
//  Per-item editor for bulletList / numberedList elements. The user spec was
//  explicit:
//        "edit bullet points one-by-one"
//
//  Each item gets its OWN TipTap instance, focused independently. Keyboard:
//    - Enter at end of an item     → new item below (cursor moves there)
//    - Backspace at empty item     → delete item, cursor moves to previous
//    - Tab / Shift+Tab             → reserved for indent (future)
//    - Esc                          → exit edit mode
// =============================================================================

interface ListItem { id: string; text: string; html?: string }
interface ListContent { items: ListItem[]; marker?: string; start?: number }

interface Props {
  element:        SlideElementDTO;
  ordered?:       boolean;
  /** Called on any item change. */
  onChange:       (patch: { content: ListContent }) => void;
  /** Called when user finishes editing (click outside / Esc). */
  onCommit:       () => void;
  /** Reports the currently-focused editor up to the floating toolbar. */
  onEditorReady?: (editor: Editor | null) => void;
}

export const InlineListEditor: React.FC<Props> = ({ element, ordered, onChange, onCommit, onEditorReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialContent = (element.content as any) as ListContent | null;
  const [items, setItems] = useState<ListItem[]>(initialContent?.items?.length
    ? initialContent.items
    : [{ id: `item-${Date.now()}`, text: '' }]);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Track which item should be focused after a state change (for Enter / Backspace handlers).
  const focusAfterUpdateRef = useRef<{ id: string; pos: 'start' | 'end' } | null>(null);

  // Push every change up
  useEffect(() => {
    onChange({ content: { ...(initialContent || {}), items } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Click outside commits
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const t = e.target as HTMLElement;
      if (t?.closest?.('[data-floating-toolbar]')) return;
      if (!containerRef.current.contains(e.target as Node)) onCommit();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [onCommit]);

  const addItemAfter = (id: string) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (i < 0) return prev;
      const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const next = [...prev];
      next.splice(i + 1, 0, { id: newId, text: '' });
      focusAfterUpdateRef.current = { id: newId, pos: 'start' };
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev; // never leave the list with zero items
      const i = prev.findIndex((x) => x.id === id);
      if (i < 0) return prev;
      const focusTarget = prev[i - 1] || prev[i + 1];
      if (focusTarget) focusAfterUpdateRef.current = { id: focusTarget.id, pos: 'end' };
      return prev.filter((x) => x.id !== id);
    });
  };

  const updateItemContent = (id: string, html: string, text: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, html, text } : x)));
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'auto', cursor: 'text' }}>
      {(ordered ? (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14, color: '#1f2937', lineHeight: 1.55 }}>
          {items.map((it, i) => (
            <ListItemRow
              key={it.id}
              ordered
              index={i}
              start={initialContent?.start ?? 1}
              item={it}
              onFocusEditor={(ed) => { setFocusedId(it.id); onEditorReady?.(ed); }}
              onChange={(html, text) => updateItemContent(it.id, html, text)}
              onAddAfter={() => addItemAfter(it.id)}
              onRemove={() => removeItem(it.id)}
              onEscape={onCommit}
              focusNext={focusAfterUpdateRef.current?.id === it.id ? focusAfterUpdateRef.current.pos : null}
              clearFocusNext={() => { focusAfterUpdateRef.current = null; }}
            />
          ))}
        </ol>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 14, color: '#1f2937', lineHeight: 1.55 }}>
          {items.map((it, i) => (
            <ListItemRow
              key={it.id}
              index={i}
              item={it}
              onFocusEditor={(ed) => { setFocusedId(it.id); onEditorReady?.(ed); }}
              onChange={(html, text) => updateItemContent(it.id, html, text)}
              onAddAfter={() => addItemAfter(it.id)}
              onRemove={() => removeItem(it.id)}
              onEscape={onCommit}
              focusNext={focusAfterUpdateRef.current?.id === it.id ? focusAfterUpdateRef.current.pos : null}
              clearFocusNext={() => { focusAfterUpdateRef.current = null; }}
            />
          ))}
        </ul>
      ))}
    </div>
  );
};

// =============================================================================
//  Per-item row
// =============================================================================

const ListItemRow: React.FC<{
  item:          ListItem;
  index:         number;
  ordered?:      boolean;
  start?:        number;
  onChange:      (html: string, text: string) => void;
  onAddAfter:    () => void;
  onRemove:      () => void;
  onEscape:      () => void;
  onFocusEditor: (editor: Editor | null) => void;
  focusNext:     'start' | 'end' | null;
  clearFocusNext: () => void;
}> = ({ item, index, ordered, start = 1, onChange, onAddAfter, onRemove, onEscape, onFocusEditor, focusNext, clearFocusNext }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, codeBlock: false, blockquote: false,
        horizontalRule: false, bulletList: false, orderedList: false,
      }),
    ],
    content: item.html && item.html.trim() ? item.html : (item.text ? `<p>${item.text}</p>` : '<p></p>'),
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.getText()),
    onFocus:  ({ editor }) => onFocusEditor(editor),
    onBlur:   () => onFocusEditor(null),
    editorProps: {
      attributes: { class: 'slide-rt-editing focus:outline-none', style: 'min-height:1em;outline:none;' },
      handleKeyDown: (view, event) => {
        // Enter (without modifiers) → new item below
        if (event.key === 'Enter' && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
          event.preventDefault();
          onAddAfter();
          return true;
        }
        // Backspace at empty / start of item → remove this item, move focus to prev
        if (event.key === 'Backspace') {
          const isEmpty = editor?.isEmpty;
          const sel = view.state.selection;
          const atStart = sel.empty && sel.from === 0;
          if (isEmpty || atStart) {
            event.preventDefault();
            onRemove();
            return true;
          }
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onEscape();
          return true;
        }
        return false;
      },
    },
  });

  // Honour focusNext request from parent (e.g. after Enter or Backspace).
  useEffect(() => {
    if (!editor || !focusNext) return;
    queueMicrotask(() => {
      if (focusNext === 'end') editor.commands.focus('end');
      else editor.commands.focus('start');
      clearFocusNext();
    });
  }, [editor, focusNext, clearFocusNext]);

  return (
    <li style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      {ordered ? (
        <span style={{ flex: '0 0 22px', fontWeight: 700, color: '#16a34a', userSelect: 'none' }}>{start + index}.</span>
      ) : (
        <span style={{ flex: '0 0 4px', width: 4, height: 4, borderRadius: '50%', background: '#16a34a', marginTop: 8, userSelect: 'none' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <EditorContent editor={editor} />
      </div>
    </li>
  );
};
