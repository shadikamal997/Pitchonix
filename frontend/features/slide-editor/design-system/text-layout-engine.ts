// =============================================================================
//  TextLayoutEngine — real DOM-based text measurement.
//
//  Replaces the character-count heuristic from Phase 15's overflow-analyzer.
//  Provides:
//
//    measureTextSize(text, opts)       → { width, height } in CSS px
//    fitTextToBox(text, box, opts)     → optimal fontSize that fits the box
//
//  Uses a hidden, off-screen measurement div mounted once and reused across
//  calls (cheap — single layout pass per measure).
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';

let measureNode: HTMLDivElement | null = null;

function getMeasureNode(): HTMLDivElement {
  if (typeof document === 'undefined') {
    // SSR — caller should not be measuring; return a stub.
    return {} as HTMLDivElement;
  }
  if (!measureNode) {
    measureNode = document.createElement('div');
    measureNode.style.cssText = [
      'position: fixed',
      'top: -10000px',
      'left: -10000px',
      'visibility: hidden',
      'pointer-events: none',
      'white-space: pre-wrap',
      'word-break: break-word',
      'overflow-wrap: anywhere',
      'box-sizing: border-box',
      'contain: layout style',
    ].join(';');
    measureNode.setAttribute('aria-hidden', 'true');
    document.body.appendChild(measureNode);
  }
  return measureNode;
}

export interface MeasureOpts {
  fontSize:      number;
  fontWeight?:   number | string;
  fontFamily?:   string;
  lineHeight?:   number;        // multiplier (1.0–2.0)
  letterSpacing?: number;       // px
  textTransform?: string;
  maxWidthPx:    number;        // box width to wrap into
}

export function measureTextSize(text: string, opts: MeasureOpts): { width: number; height: number } {
  if (typeof window === 'undefined') return { width: 0, height: 0 };
  const node = getMeasureNode();
  if (!node.style) return { width: 0, height: 0 };
  node.style.width        = `${opts.maxWidthPx}px`;
  node.style.fontSize     = `${opts.fontSize}px`;
  node.style.fontWeight   = String(opts.fontWeight ?? 400);
  node.style.fontFamily   = opts.fontFamily || 'inherit';
  node.style.lineHeight   = String(opts.lineHeight ?? 1.35);
  node.style.letterSpacing = opts.letterSpacing != null ? `${opts.letterSpacing}px` : '0';
  node.style.textTransform = opts.textTransform || 'none';
  node.textContent = text || ' ';
  // Force a layout read
  const r = node.getBoundingClientRect();
  return { width: Math.ceil(r.width), height: Math.ceil(r.height) };
}

// =============================================================================
//  fitTextToBox — binary-search the largest fontSize that fits.
// =============================================================================

export interface FitOpts {
  /** Min font in px the search will accept before declaring overflow. */
  minSize: number;
  /** Max font in px the search starts from. */
  maxSize: number;
  /** Box width / height in px the text must fit inside. */
  maxWidthPx:  number;
  maxHeightPx: number;
  /** Pass-throughs to measureTextSize. */
  fontWeight?:   number | string;
  fontFamily?:   string;
  lineHeight?:   number;
  letterSpacing?: number;
  textTransform?: string;
  maxLines?: number;
}

export interface FitResult {
  fontSize:  number;
  fits:      boolean;     // false if even minSize overflows → caller should line-clamp
  measuredHeight: number;
  measuredWidth:  number;
}

export function fitTextToBox(text: string, opts: FitOpts): FitResult {
  if (typeof window === 'undefined') {
    return { fontSize: opts.maxSize, fits: true, measuredHeight: 0, measuredWidth: 0 };
  }
  const safeText = text || ' ';

  // Quick path — max size already fits.
  const probe = (size: number) => measureTextSize(safeText, {
    fontSize: size,
    fontWeight: opts.fontWeight,
    fontFamily: opts.fontFamily,
    lineHeight: opts.lineHeight,
    letterSpacing: opts.letterSpacing,
    textTransform: opts.textTransform,
    maxWidthPx: opts.maxWidthPx,
  });

  const heightLimit = (size: number) => Math.min(
    opts.maxHeightPx,
    opts.maxLines && opts.maxLines > 0
      ? opts.maxLines * size * (opts.lineHeight ?? 1.35)
      : opts.maxHeightPx,
  );

  const max = probe(opts.maxSize);
  if (max.height <= heightLimit(opts.maxSize)) return { fontSize: opts.maxSize, fits: true, ...{ measuredHeight: max.height, measuredWidth: max.width } };

  // Binary search.
  let lo = opts.minSize, hi = opts.maxSize, best = opts.minSize, bestM = max;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const m = probe(mid);
    if (m.height <= heightLimit(mid)) {
      best = mid; bestM = m;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const finalM = probe(best);
  return {
    fontSize: best,
    fits: finalM.height <= heightLimit(best),
    measuredHeight: finalM.height,
    measuredWidth:  finalM.width,
  };
}

// =============================================================================
//  React hook — observes the container size, re-fits on resize/text change.
//  Returns the optimal fontSize.
// =============================================================================

export interface UseAutoFitOpts {
  text:    string;
  minSize: number;
  maxSize: number;
  fontWeight?:    number | string;
  fontFamily?:    string;
  lineHeight?:    number;
  letterSpacing?: number;
  textTransform?: string;
  maxLines?:      number;
  /** When true, the result `fits` flag is `false` if even minSize overflows the height. */
  strictFit?:     boolean;
}

export function useAutoFitFontSize(
  containerRef: React.RefObject<HTMLElement>,
  opts: UseAutoFitOpts,
): { fontSize: number; fits: boolean } {
  const [result, setResult] = useState<{ fontSize: number; fits: boolean }>({ fontSize: opts.maxSize, fits: true });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const recompute = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const r = fitTextToBox(optsRef.current.text, {
      minSize: optsRef.current.minSize,
      maxSize: optsRef.current.maxSize,
      maxWidthPx:  rect.width,
      maxHeightPx: rect.height,
      fontWeight:  optsRef.current.fontWeight,
      fontFamily:  optsRef.current.fontFamily,
      lineHeight:  optsRef.current.lineHeight,
      letterSpacing: optsRef.current.letterSpacing,
      textTransform: optsRef.current.textTransform,
      maxLines: optsRef.current.maxLines,
    });
    setResult({ fontSize: r.fontSize, fits: r.fits });
  }, [containerRef]);

  // Recompute whenever the text or any sizing input changes.
  useEffect(() => {
    recompute();
  }, [opts.text, opts.minSize, opts.maxSize, opts.fontWeight, opts.fontFamily, opts.lineHeight, opts.letterSpacing, opts.textTransform, opts.maxLines, recompute]);

  // Re-fit on container resize.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, recompute]);

  return result;
}
