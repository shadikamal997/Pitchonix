/**
 * Phase 36.1A — Mention parser
 *
 * Parses @mentions from comment content. The grammar is intentionally simple
 * so it survives autocomplete UX changes:
 *
 *   @[Display Name](userId)        — fully resolved (autocomplete output)
 *   @name                          — bare; resolved via fuzzy name/email match
 *
 * The bracket form is preferred because it preserves the chosen user id
 * even when display names collide.
 */

export interface MentionMeta {
  userId:      string;
  displayName: string;
}

const BRACKET_RE = /@\[([^\]]+)\]\(([0-9a-fA-F-]{8,})\)/g;
const BARE_RE    = /(^|[^a-zA-Z0-9_])@([a-zA-Z][a-zA-Z0-9_.\-]{1,40})/g;

/**
 * Extract bracketed mentions from content. Bare mentions are *not* resolved
 * here because resolution requires a DB lookup; callers that want them
 * should pass `resolveBare`.
 */
export function parseMentions(
  content: string,
  resolveBare?: (handle: string) => MentionMeta | null,
): MentionMeta[] {
  const out: MentionMeta[] = [];
  const seen = new Set<string>();

  // Bracket form (preferred — produced by the autocomplete UI)
  let m: RegExpExecArray | null;
  BRACKET_RE.lastIndex = 0;
  while ((m = BRACKET_RE.exec(content))) {
    const displayName = m[1].trim();
    const userId      = m[2].trim();
    if (!seen.has(userId)) {
      out.push({ userId, displayName });
      seen.add(userId);
    }
  }

  // Bare form — opt-in resolution
  if (resolveBare) {
    BARE_RE.lastIndex = 0;
    while ((m = BARE_RE.exec(content))) {
      const handle = m[2];
      const resolved = resolveBare(handle);
      if (resolved && !seen.has(resolved.userId)) {
        out.push(resolved);
        seen.add(resolved.userId);
      }
    }
  }

  return out;
}

/** Convenience for the panel renderer: yield text/mention tokens in order. */
export type MentionToken =
  | { kind: 'text';    text: string }
  | { kind: 'mention'; userId: string; displayName: string };

export function tokenizeMentions(content: string): MentionToken[] {
  const tokens: MentionToken[] = [];
  let cursor = 0;

  // Single pass over bracket mentions.
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
