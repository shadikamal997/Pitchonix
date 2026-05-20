'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import {
  X, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  Play, Pause, RotateCcw, Pointer, Eye, EyeOff, Loader2,
} from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import type { SlideListItem } from '../sidebar/useDeckSlides';
import { PresentationSlideView } from './PresentationSlideView';

// =============================================================================
//  PresenterMode — fullscreen presenter overlay.
//
//  Behaviour:
//    - Pre-fetches every slide's full record (background, themeTokens) AND its
//      elements once on open, so navigation is instant after the first frame.
//    - Resizes the slide stage to fit the visible area while honoring 16:9.
//    - Keyboard nav: ←/→/Space/PgDn/PgUp/Home/End. Esc closes. F toggles
//      fullscreen. L toggles laser pointer. N toggles speaker notes.
//    - Timer + progress are persistent; "Reset" rewinds the timer.
//    - Laser pointer is a 14px red dot that follows the cursor over the slide
//      stage when enabled.
// =============================================================================

interface SlideFull extends SlideListItem {
  background?:  any;
  themeTokens?: any;
  metadata?:    any;
}

interface Props {
  slides:           SlideListItem[];
  initialSlideId:   string;
  onClose:          () => void;
}

export const PresenterMode: React.FC<Props> = ({ slides, initialSlideId, onClose }) => {
  // ---- Data ---------------------------------------------------------------
  const [slidesFull, setSlidesFull]   = useState<Record<string, SlideFull>>({});
  const [elementsBy, setElementsBy]   = useState<Record<string, SlideElementDTO[]>>({});
  const [loadingInit, setLoadingInit] = useState(true);

  // ---- Navigation ---------------------------------------------------------
  const initialIdx = Math.max(0, slides.findIndex((s) => s.id === initialSlideId));
  const [index, setIndex] = useState(initialIdx);
  const total = slides.length;
  const current = slides[index];
  const next    = slides[index + 1] || null;

  // ---- UI state -----------------------------------------------------------
  const [showNotes, setShowNotes]   = useState(true);
  const [laser, setLaser]           = useState(false);
  const [fs, setFs]                 = useState(false);
  const [paused, setPaused]         = useState(false);
  const [elapsedMs, setElapsedMs]   = useState(0);
  const lastTickRef = useRef<number>(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 1280, h: 720 });
  const [pointer, setPointer]     = useState<{ x: number; y: number } | null>(null);

  // ------------------------------------------------------------------------
  // Initial fetch — slides full + elements for every slide
  // ------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch in parallel — small N (typically 8-30 slides).
        const results = await Promise.all(slides.map(async (s) => {
          const [slideRes, elsRes] = await Promise.all([
            api.get(`/slides/${s.id}`),
            api.get(`/slides/${s.id}/elements`),
          ]);
          return { slide: slideRes.data, elements: elsRes.data };
        }));
        if (cancelled) return;
        const full: Record<string, SlideFull> = {};
        const els:  Record<string, SlideElementDTO[]> = {};
        results.forEach((r, i) => {
          full[slides[i].id] = r.slide;
          els[slides[i].id]  = r.elements;
        });
        setSlidesFull(full);
        setElementsBy(els);
      } catch (err) {
        console.error('Presenter preload failed', err);
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slides]);

  // ------------------------------------------------------------------------
  // Stage sizing — fit 16:9 into the available area
  // ------------------------------------------------------------------------
  useEffect(() => {
    const node = stageWrapRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const targetH = (width * 9) / 16;
      if (targetH <= height) setStageSize({ w: Math.floor(width), h: Math.floor(targetH) });
      else                   setStageSize({ w: Math.floor((height * 16) / 9), h: Math.floor(height) });
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // ------------------------------------------------------------------------
  // Timer
  // ------------------------------------------------------------------------
  useEffect(() => {
    lastTickRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (!paused) setElapsedMs((ms) => ms + delta);
    }, 250);
    return () => window.clearInterval(id);
  }, [paused]);

  // ------------------------------------------------------------------------
  // Keyboard
  // ------------------------------------------------------------------------
  const goPrev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);
  const goFirst = useCallback(() => setIndex(0), []);
  const goLast  = useCallback(() => setIndex(total - 1), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in an input (just in case anything is mounted).
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) return;

      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': e.preventDefault(); goNext(); break;
        case 'ArrowLeft':  case 'PageUp':            e.preventDefault(); goPrev(); break;
        case 'Home':                                  e.preventDefault(); goFirst(); break;
        case 'End':                                   e.preventDefault(); goLast();  break;
        case 'Escape':                                e.preventDefault(); onClose(); break;
        case 'f': case 'F':                           e.preventDefault(); toggleFullscreen(); break;
        case 'l': case 'L':                           e.preventDefault(); setLaser((v) => !v); break;
        case 'n': case 'N':                           e.preventDefault(); setShowNotes((v) => !v); break;
        case 'p': case 'P':                           e.preventDefault(); setPaused((v) => !v); break;
        case 'r': case 'R':                           e.preventDefault(); setElapsedMs(0); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, goFirst, goLast, onClose]);

  // ------------------------------------------------------------------------
  // Fullscreen
  // ------------------------------------------------------------------------
  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      try { await el.requestFullscreen(); } catch { /* ignore */ }
    } else {
      try { await document.exitFullscreen(); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  const currentFull = current ? slidesFull[current.id] : null;
  const currentEls  = current ? (elementsBy[current.id] || []) : [];
  const nextFull    = next    ? slidesFull[next.id]    : null;
  const nextEls     = next    ? (elementsBy[next.id]    || []) : [];

  const speakerNotes = current?.speakerNotes || '';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
      style={{ cursor: laser ? 'none' : 'default' }}
    >
      {/* Top bar */}
      <header className="h-10 flex items-center px-4 gap-3 border-b border-white/10 flex-shrink-0">
        <span className="text-xs font-bold tracking-wide">PRESENTER</span>
        <span className="text-xs text-white/40">{formatTime(elapsedMs)}</span>
        <span className="text-xs text-white/60">{index + 1} / {total}</span>
        <div className="ml-auto flex items-center gap-1">
          <IconButton title="Reset timer (R)" onClick={() => setElapsedMs(0)}><RotateCcw className="w-3.5 h-3.5" /></IconButton>
          <IconButton title={paused ? 'Resume (P)' : 'Pause (P)'} onClick={() => setPaused((v) => !v)}>
            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </IconButton>
          <IconButton title="Laser pointer (L)"  active={laser}     onClick={() => setLaser((v) => !v)}><Pointer className="w-3.5 h-3.5" /></IconButton>
          <IconButton title="Speaker notes (N)"  active={showNotes} onClick={() => setShowNotes((v) => !v)}>
            {showNotes ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </IconButton>
          <IconButton title="Fullscreen (F)"     active={fs}        onClick={toggleFullscreen}>
            {fs ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </IconButton>
          <IconButton title="Exit (Esc)"         onClick={onClose}><X className="w-3.5 h-3.5" /></IconButton>
        </div>
      </header>

      {/* Stage row */}
      <div className="flex-1 flex overflow-hidden">
        <section
          ref={stageWrapRef}
          className="flex-1 flex items-center justify-center p-6 relative"
          onMouseMove={(e) => {
            if (!laser) return;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => setPointer(null)}
        >
          {loadingInit ? (
            <Loader2 className="w-10 h-10 animate-spin text-white/40" />
          ) : current ? (
            <div className="shadow-2xl rounded overflow-hidden bg-white" style={{ width: stageSize.w, height: stageSize.h }}>
              <PresentationSlideView
                index={index}
                total={total}
                elements={currentEls}
                background={currentFull?.background}
                themeTokens={currentFull?.themeTokens}
                width={stageSize.w}
              />
            </div>
          ) : (
            <span className="text-white/40">No slides</span>
          )}

          {/* Laser pointer dot */}
          {laser && pointer && (
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: pointer.x - 7,
                top:  pointer.y - 7,
                width: 14, height: 14,
                background: 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(239,68,68,0.7) 50%, rgba(239,68,68,0) 70%)',
                boxShadow: '0 0 14px 4px rgba(239,68,68,0.55)',
              }}
            />
          )}

          {/* On-stage prev/next click zones */}
          <button
            aria-label="Previous slide"
            onClick={goPrev}
            disabled={index === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            aria-label="Next slide"
            onClick={goNext}
            disabled={index === total - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </section>

        {/* Right rail — notes + next preview */}
        {showNotes && (
          <aside className="w-[300px] flex-shrink-0 border-l border-white/10 bg-slate-950 flex flex-col">
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Speaker notes</p>
              <p className="text-xs font-semibold text-white/90 mt-0.5 truncate">{current?.title || ''}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {speakerNotes || <span className="text-white/30 italic">No speaker notes for this slide.</span>}
            </div>

            {/* Next slide preview */}
            <div className="border-t border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">Up next</p>
              {next ? (
                <div className="bg-white rounded overflow-hidden shadow-xl">
                  <PresentationSlideView
                    index={index + 1}
                    total={total}
                    elements={nextEls}
                    background={nextFull?.background}
                    themeTokens={nextFull?.themeTokens}
                    width={272}
                  />
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded text-xs text-white/40 px-3 py-4 text-center">
                  End of deck
                </div>
              )}
              <p className="text-[11px] text-white/50 mt-2 truncate">{next?.title || '—'}</p>
            </div>
          </aside>
        )}
      </div>

      {/* Bottom: progress + slide bar */}
      <footer className="h-12 border-t border-white/10 flex items-center gap-3 px-4 flex-shrink-0">
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-white/10 rounded overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${total === 0 ? 0 : ((index + 1) / total) * 100}%` }}
          />
        </div>
        {/* Slide picker dots */}
        <div className="flex items-center gap-1 max-w-[420px] overflow-x-auto">
          {slides.map((s, i) => (
            <button
              key={s.id}
              title={s.title}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 h-1.5 rounded-full transition-all ${
                i === index ? 'bg-white w-6' : 'bg-white/30 hover:bg-white/60 w-2'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

const IconButton: React.FC<React.PropsWithChildren<{ onClick: () => void; title: string; active?: boolean }>> = ({ onClick, title, children, active }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
      active
        ? 'bg-green-500/20 text-green-300 ring-1 ring-green-400/40'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
