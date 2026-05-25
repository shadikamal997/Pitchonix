'use client';

import React from 'react';
import { tokenizeMentions } from './mention-tokens';

// =============================================================================
//  Phase 36.1A — MentionText
//
//  Renders comment content with @mentions highlighted as blue pills. Pure
//  presentation; carries no interactivity (clicking a mention does nothing
//  yet — notification routing is a separate phase).
// =============================================================================

interface Props {
  content:   string;
  /** When true, render in a softer style (used for deleted-message placeholder). */
  muted?:    boolean;
}

export const MentionText: React.FC<Props> = ({ content, muted }) => {
  const tokens = tokenizeMentions(content);
  return (
    <span className={muted ? 'italic text-[#C9C6BD]' : 'text-[#111111]'}>
      {tokens.map((t, i) =>
        t.kind === 'mention' ? (
          <span
            key={i}
            className="inline-flex items-center px-1 mx-0.5 rounded bg-[#DDE8E1] text-[#263F34] font-semibold text-[12px]"
            title={`@${t.displayName}`}
          >
            @{t.displayName}
          </span>
        ) : (
          <span key={i}>{t.text}</span>
        ),
      )}
    </span>
  );
};
