'use client';

import React, { useRef } from 'react';
import { useAutoFitFontSize } from './text-layout-engine';

// =============================================================================
//  AutoFitText — drop-in replacement for a fixed-size text block.
//
//  Measures the container, picks the largest font size that fits within
//  [minSize, maxSize], and renders the text at that size. Re-fits on
//  container resize and text change.
//
//  Used by the canvas for title / subtitle / heading slot elements so a long
//  heading never overflows its slot.
// =============================================================================

interface Props {
  text:        string;
  minSize:     number;
  maxSize:     number;
  fontWeight?: number | string;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: React.CSSProperties['textTransform'];
  color?:      string;
  textAlign?:  React.CSSProperties['textAlign'];
  maxLines?:   number;
  className?:  string;
  style?:      React.CSSProperties;
  /** Render children OVERLAYED on the auto-sized text — used when the text is
   *  rich HTML and a TipTap editor is mounted in place. */
  asInnerHTML?: boolean;
  innerHTML?:   string;
}

export const AutoFitText: React.FC<Props> = ({
  text, minSize, maxSize, fontWeight, fontFamily, lineHeight, letterSpacing,
  textTransform, color, textAlign, maxLines, className, style: styleOverride,
  asInnerHTML, innerHTML,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { fontSize } = useAutoFitFontSize(wrapperRef, {
    text: asInnerHTML ? (stripHtml(innerHTML || '') || text) : text,
    minSize, maxSize, fontWeight, fontFamily, lineHeight, letterSpacing,
    textTransform: textTransform as string | undefined,
    maxLines,
  });

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize,
    fontWeight: fontWeight as any,
    fontFamily,
    lineHeight,
    letterSpacing: letterSpacing != null ? `${letterSpacing}px` : undefined,
    textTransform,
    color,
    textAlign,
    overflow: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    display: maxLines ? '-webkit-box' : undefined,
    WebkitBoxOrient: maxLines ? 'vertical' : undefined,
    WebkitLineClamp: maxLines,
    whiteSpace: asInnerHTML ? undefined : 'pre-wrap',
    ...styleOverride,
  };

  if (asInnerHTML && innerHTML) {
    // Phase Ω.1 — sanitise before injecting. Slide-editor HTML can include
    // user-typed content from collaborators or imported decks.
    const DOMPurify: any = typeof window !== 'undefined' ? require('dompurify') : null;
    const safe = DOMPurify && DOMPurify.sanitize ? DOMPurify.sanitize(innerHTML) : innerHTML;
    return <div ref={wrapperRef} className={className} style={style} dangerouslySetInnerHTML={{ __html: safe }} />;
  }
  return <div ref={wrapperRef} className={className} style={style}>{text}</div>;
};

function stripHtml(s: string): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
