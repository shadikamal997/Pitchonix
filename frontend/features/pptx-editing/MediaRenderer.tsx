'use client';

import React from 'react';
import { Play, Music, Film, Image as ImageIcon } from 'lucide-react';

// =============================================================================
//  Phase 38N — MediaRenderer
//
//  HTML5 video / audio / GIF playback for slide elements. Renders inside the
//  editor canvas + presenter mode + thumbnail previews.
//
//  Accepted element.content shapes (any of these work):
//    { kind:'video', src:'…',  posterUrl?, autoplay?, loop?, muted?, controls? }
//    { kind:'audio', src:'…',  controls? }
//    { kind:'gif',   src:'…',  alt? }
//    Legacy:
//      videoPlaceholder       → { posterUrl, providerLabel } (no playback)
//      embeddedMediaPlaceholder → same
//
//  This component intentionally has no remote-network reliance: if `src`
//  is missing we fall back to a poster image + provider badge.
// =============================================================================

interface MediaContent {
  kind?:        'video' | 'audio' | 'gif' | string;
  src?:         string;
  posterUrl?:   string;
  providerLabel?: string;
  alt?:         string;
  controls?:    boolean;
  autoplay?:    boolean;
  muted?:       boolean;
  loop?:        boolean;
}

interface Props {
  content:    MediaContent;
  elementType?: string;
  /** Set true in PresenterMode so video starts on slide enter. */
  presenting?: boolean;
  className?:  string;
}

export const MediaRenderer: React.FC<Props> = ({ content, elementType, presenting, className }) => {
  const kind = pickKind(content, elementType);
  const c = content || {};

  if (kind === 'video' && c.src) {
    return (
      <video
        src={c.src}
        poster={c.posterUrl}
        controls={c.controls ?? true}
        autoPlay={c.autoplay ?? presenting ?? false}
        muted={c.muted ?? presenting ?? false}
        loop={c.loop ?? false}
        playsInline
        className={`w-full h-full bg-black rounded ${className || ''}`}
      />
    );
  }

  if (kind === 'audio' && c.src) {
    return (
      <div className={`w-full h-full flex items-center gap-2 bg-slate-100 rounded px-3 ${className || ''}`}>
        <Music className="w-5 h-5 text-slate-500 flex-shrink-0" />
        <audio
          src={c.src}
          controls={c.controls ?? true}
          autoPlay={c.autoplay ?? false}
          loop={c.loop ?? false}
          className="flex-1"
        />
      </div>
    );
  }

  if (kind === 'gif' && c.src) {
    return <img src={c.src} alt={c.alt || ''} className={`w-full h-full object-contain rounded ${className || ''}`} />;
  }

  // Fallback: legacy placeholder.
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded border border-slate-200 ${className || ''}`}>
      {c.posterUrl
        ? <img src={c.posterUrl} alt="" className="w-full h-full object-cover rounded" />
        : <PlaceholderIcon kind={kind} />}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
          {c.providerLabel || (kind === 'audio' ? 'Audio' : kind === 'gif' ? 'GIF' : 'Video')}
        </span>
      </div>
    </div>
  );
};

function pickKind(c: MediaContent, elementType?: string): 'video' | 'audio' | 'gif' {
  if (c?.kind === 'audio' || c?.kind === 'gif' || c?.kind === 'video') return c.kind;
  if (elementType === 'videoPlaceholder') return 'video';
  if (elementType === 'embeddedMediaPlaceholder') return 'video';
  const src = (c?.src || c?.posterUrl || '').toLowerCase();
  if (src.endsWith('.mp3') || src.endsWith('.wav') || src.endsWith('.m4a')) return 'audio';
  if (src.endsWith('.gif')) return 'gif';
  return 'video';
}

const PlaceholderIcon: React.FC<{ kind: 'video' | 'audio' | 'gif' }> = ({ kind }) => {
  const Icon = kind === 'audio' ? Music : kind === 'gif' ? ImageIcon : Play;
  return <Icon className="w-8 h-8 text-slate-400" />;
};
