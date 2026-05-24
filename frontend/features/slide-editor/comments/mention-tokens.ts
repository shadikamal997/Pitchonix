// =============================================================================
//  Phase 36.1A — Mention tokenizer (frontend mirror of backend mention-parser)
//
//  The autocomplete UI emits mentions in bracket form:
//
//      @[Display Name](userId)
//
//  This module is the shared frontend code for:
//    1. Detecting an active "@trigger" while typing (so the autocomplete can
//       attach below the textarea)
//    2. Splitting persisted comment content into renderable tokens
//
//  Kept as a single pure module so renderers + composers stay in sync.
// =============================================================================

export interface MentionMeta {
  userId:      string;
  displayName: string;
}

export type MentionToken =
  | { kind: 'text';    text: string }
  | { kind: 'mention'; userId: string; displayName: string };

const BRACKET_RE = /@\[([^\]]+)\]\(([0-9a-fA-F-]{8,})\)/g;

/** Split persisted content into a flat list of text + mention tokens. */
export function tokenizeMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let cursor = 0;
  BRACKET_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BRACKET_RE.exec(content))) {
    if (m.index > cursor) {
      tokens.push({ kind: 'text', text: content.slice(cursor, m.index) });
    }
    tokens.push({ kind: 'mention', displayName: m[1].trim(), userId: m[2].trim() });
    cursor = m.index + m[0].length;
  }
  if (cursor < content.length) {
    tokens.push({ kind: 'text', text: content.slice(cursor) });
  }
  return tokens;
}

/**
 * Inspect the text up to the caret; if the user is currently typing an
 * @-handle (i.e. there's a recent @ not followed by whitespace), return
 * { start, query } describing the trigger so autocomplete can attach.
 *
 * Returns null when no active trigger.
 */
export function detectActiveMention(text: string, caret: number): { start: number; query: string } | null {
  if (caret <= 0) return null;
  // Walk back from caret looking for an '@' not preceded by an alnum
  // (otherwise emails like "foo@bar" would trigger).
  for (let i = caret - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === '@') {
      const prev = i === 0 ? ' ' : text[i - 1];
      if (/[a-zA-Z0-9_]/.test(prev)) return null;  // not a fresh trigger
      const query = text.slice(i + 1, caret);
      if (/\s/.test(query)) return null;           // closed by whitespace
      if (query.length > 40) return null;          // runaway match
      return { start: i, query };
    }
    if (/\s/.test(ch)) return null;
  }
  return null;
}

/** Inserts an `@[Display](uuid)` token at the active trigger; returns new content + new caret. */
export function applyMention(
  text: string, caret: number,
  trigger: { start: number; query: string },
  user: MentionMeta,
): { content: string; caret: number } {
  const bracket = `@[${user.displayName}](${user.userId}) `;
  const before  = text.slice(0, trigger.start);
  const after   = text.slice(caret);
  const content = before + bracket + after;
  return { content, caret: before.length + bracket.length };
}
