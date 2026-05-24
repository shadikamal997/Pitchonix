'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { MentionAutocomplete } from './MentionAutocomplete';
import { detectActiveMention, applyMention, type MentionMeta } from './mention-tokens';

// =============================================================================
//  Phase 36.1A — MentionTextarea
//
//  Drop-in textarea with @mention autocomplete. Used by:
//    - inline-composer in CommentModeOverlay
//    - inline-composer in CommentsPanel
//    - reply composer
//    - edit composer
//
//  Tracks caret state, runs `detectActiveMention()` on each change, and
//  positions a popover anchored below the cursor (approximated by anchoring
//  to the textarea + a vertical offset — good enough for short composers).
// =============================================================================

interface Props {
  value:        string;
  onChange:     (next: string) => void;
  placeholder?: string;
  rows?:        number;
  autoFocus?:   boolean;
  className?:   string;
  onKeyDown?:   (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const MentionTextarea: React.FC<Props> = ({
  value, onChange, placeholder, rows = 3, autoFocus, className, onKeyDown,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null);
  const [anchor,  setAnchor]  = useState<{ left: number; top: number } | null>(null);

  // Keyboard handler hot-wire — autocomplete registers a function here so we
  // can swallow Enter/Tab/Arrow keys before the textarea sees them.
  const acKeyHandlerRef = useRef<((e: KeyboardEvent) => boolean) | null>(null);
  const registerKeyHandler = useCallback((h: (e: KeyboardEvent) => boolean) => {
    acKeyHandlerRef.current = h;
  }, []);

  const recalc = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? 0;
    const t = detectActiveMention(ta.value, caret);
    setTrigger(t);
    if (t) {
      const box = ta.getBoundingClientRect();
      // Anchor under the textarea — good enough for short composers.
      setAnchor({ left: box.left, top: box.bottom + 4 });
    } else {
      setAnchor(null);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    // Defer to next frame so the caret position reflects the new value.
    requestAnimationFrame(recalc);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // First, give the autocomplete a chance to consume nav keys.
    if (acKeyHandlerRef.current && trigger) {
      const handled = acKeyHandlerRef.current(e.nativeEvent as any);
      if (handled) { e.preventDefault(); return; }
    }
    onKeyDown?.(e);
  };

  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);

  const handleSelect = (user: MentionMeta) => {
    const ta = ref.current;
    if (!ta || !trigger) return;
    const caret = ta.selectionStart ?? 0;
    const { content, caret: nextCaret } = applyMention(value, caret, trigger, user);
    onChange(content);
    setTrigger(null);
    setAnchor(null);
    // restore caret position once React applies the new value
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(nextCaret, nextCaret);
    });
  };

  return (
    <>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onClick={recalc}
        onKeyUp={recalc}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />
      <MentionAutocomplete
        active={!!trigger}
        query={trigger?.query ?? ''}
        anchor={anchor}
        onSelect={handleSelect}
        onClose={() => { setTrigger(null); setAnchor(null); }}
        registerKeyHandler={registerKeyHandler}
      />
    </>
  );
};
