'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
import type { SlideElementDTO } from '@/types/slide-element';
import { useYDoc } from '@/features/collaboration/useYDoc';

// =============================================================================
//  InlineTextEditor — Phase 34.2A
//
//  Yjs-bound TipTap editor for a single text element. Two collaboration
//  layers:
//
//    Collaboration       — Y.Doc binding (CRDT merge of concurrent edits)
//    CollaborationCaret  — awareness binding (other users' carets + selection)
//
//  Y.Doc lifecycle:
//    - useYDoc(`text:{elementId}`) maintains a per-element doc + awareness,
//      synced over the existing /collaboration socket
//    - The server is authoritative: it ships the initial state on join,
//      applies every update, and persists debounced to SlideElement.ydocState
//    - Element.content still mirrors the latest text for export + render
//      when nobody is actively editing (updated on commit/onChange below)
//
//  On commit: we extract HTML + text from TipTap and call onChange one
//  final time so the element row persists with current content, matching
//  the pre-Yjs save semantics.
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
  multiline?:    boolean;
  /** Phase 34.2C — caret label + color for the CollaborationCaret extension.
   *  Threaded from SlideEditor's existing collaboration session so we don't
   *  spawn duplicate sockets here. */
  collaborator?: { name: string; color: string };
}

export const InlineTextEditor: React.FC<Props> = ({
  element, defaultSize, defaultWeight, onChange, onCommit, onEditorReady, multiline = true, collaborator,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const c = (element.content as any) || {};
  const initialHTML = c.html && c.html.trim()
    ? c.html
    : (c.text ? `<p>${escapeHtml(c.text)}</p>` : '<p></p>');

  // Phase 34.2A — Y.Doc + awareness for this element. `text:{elementId}`
  // is the docId convention used by YDocStore on the backend.
  const ydoc = useYDoc(`text:${element.id}`);
  const me = collaborator;

  // Track whether Y.Doc has received initial server state. We skip seeding
  // from element.content until then, so we don't fight the server.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!ydoc?.doc) return;
    // Wait for one external update from the server before considering the
    // doc hydrated. If after 800ms we still have an empty doc and no
    // remote state, seed from element.content so first-edit doesn't lose
    // existing text.
    const t = setTimeout(() => {
      if (seededRef.current) return;
      const isEmpty = ydoc.doc.getXmlFragment('default').length === 0;
      if (isEmpty && initialHTML && initialHTML !== '<p></p>') {
        // Seed via the editor (which writes via Y.Doc transaction).
        try { editor?.commands.setContent(initialHTML, { emitUpdate: true }); } catch { /* ignore */ }
      }
      seededRef.current = true;
    }, 800);
    const handler = () => { seededRef.current = true; clearTimeout(t); };
    ydoc.doc.on('update', handler);
    return () => { clearTimeout(t); ydoc.doc.off('update', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc?.doc, initialHTML]);

  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        // CollaborationCaret replaces TipTap's default cursor extension.
        // Disable the default to avoid conflicts.
        undoRedo: false,
      }),
    ];
    if (ydoc?.doc) {
      exts.push(Collaboration.configure({ document: ydoc.doc }));
      if (ydoc.awareness && me) {
        exts.push(CollaborationCaret.configure({
          provider: { awareness: ydoc.awareness } as any,
          user: { name: me.name, color: me.color },
        }));
      }
    }
    return exts;
  }, [ydoc?.doc, ydoc?.awareness, me?.name, me?.color]);

  const editor = useEditor({
    extensions,
    // When Collaboration is enabled, content MUST NOT be passed — the Y.Doc
    // is the source of truth. We seed via setContent after the doc is ready.
    content: ydoc?.doc ? undefined : initialHTML,
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
        if (!multiline && event.key === 'Enter') {
          event.preventDefault();
          onCommit();
          return true;
        }
        return false;
      },
    },
  }, [extensions]);

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
