'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, FileType, FileImage, Loader2, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  ExportMenu — toolbar dropdown that lets the user export the current deck
//  to PPTX / PDF / PNG / JPEG. Triggers the element-aware backend export
//  (`POST /slide-export/:deckId/:format`).
// =============================================================================

type Format = 'pptx' | 'pdf' | 'png' | 'jpeg';

const FORMATS: { id: Format; label: string; description: string; ext: string; Icon: any }[] = [
  { id: 'pptx', label: 'PowerPoint (.pptx)', description: 'Editable in Keynote / PowerPoint',     ext: 'pptx', Icon: FileType  },
  { id: 'pdf',  label: 'PDF',                description: 'High-fidelity print + sharing format', ext: 'pdf',  Icon: FileText  },
  { id: 'png',  label: 'PNG images',         description: 'Lossless image per slide (.zip)',      ext: 'zip',  Icon: FileImage },
  { id: 'jpeg', label: 'JPEG images',        description: 'Compact image per slide (.zip)',       ext: 'zip',  Icon: FileImage },
];

interface Props {
  deckId: string;
  deckTitle?: string;
}

interface Status {
  state:     'idle' | 'running' | 'success' | 'error';
  format?:   Format;
  message?:  string;
  manifest?: any;
}

export const ExportMenu: React.FC<Props> = ({ deckId, deckTitle }) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleExport = async (format: Format) => {
    setOpen(false);
    setStatus({ state: 'running', format });
    try {
      const res = await api.post(`/slide-export/${deckId}/${format}`, undefined, {
        responseType: 'blob',
      });

      // Pull manifest from the X-Export-Manifest header for the success toast.
      let manifest: any = null;
      try {
        const raw = res.headers['x-export-manifest'];
        if (typeof raw === 'string' && raw) manifest = JSON.parse(decodeURIComponent(raw));
      } catch { /* tolerated */ }

      const contentType = typeof res.headers['content-type'] === 'string' ? res.headers['content-type'] : '';
      const ext = filenameExt(format, contentType);
      const name = `${slugify(deckTitle || 'presentation')}.${ext}`;
      triggerDownload(res.data as Blob, name);

      setStatus({ state: 'success', format, manifest, message: `Downloaded ${name}` });
      window.setTimeout(() => setStatus((s) => (s.state === 'success' ? { state: 'idle' } : s)), 4000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Export failed';
      setStatus({ state: 'error', format, message: msg });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={status.state === 'running'}
        title="Export deck"
        className="h-7 px-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-60 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow-md shadow-green-500/30"
      >
        {status.state === 'running' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        Export
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[280px] bg-white border border-slate-200 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Export deck</p>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Element-level fidelity. Includes manifest.</p>
          </div>
          {FORMATS.map(({ id, label, description, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleExport(id)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors text-left"
            >
              <Icon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800">{label}</div>
                <div className="text-[10px] text-slate-500 truncate">{description}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {(status.state === 'running' || status.state === 'success' || status.state === 'error') && (
        <div className="absolute right-0 top-full mt-2 w-[300px] z-40">
          {status.state === 'running' && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-green-600 animate-spin" />
              <span className="text-xs text-slate-700">Building {labelFor(status.format!)}…</span>
            </div>
          )}
          {status.state === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg shadow-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-700" />
                <span className="text-xs font-semibold text-green-900">{status.message}</span>
              </div>
              {status.manifest && (
                <div className="text-[11px] text-green-800 mt-1 pl-5">
                  {status.manifest.slideCount} slide{status.manifest.slideCount === 1 ? '' : 's'} · {status.manifest.elementTotal} element{status.manifest.elementTotal === 1 ? '' : 's'}
                  {status.manifest.warnings?.length ? <span className="block text-amber-700 mt-0.5">⚠ {status.manifest.warnings.length} warning(s)</span> : null}
                </div>
              )}
            </div>
          )}
          {status.state === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-xl px-3 py-2 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-red-900">Export failed</div>
                <div className="text-[11px] text-red-700">{status.message}</div>
              </div>
              <button
                type="button"
                onClick={() => setStatus({ state: 'idle' })}
                className="text-[11px] font-semibold text-red-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'presentation';
}

function filenameExt(format: Format, contentType: string): string {
  if (format === 'pptx') return 'pptx';
  if (format === 'pdf')  return 'pdf';
  if (contentType.startsWith('application/zip')) return 'zip';
  return format === 'png' ? 'png' : 'jpg';
}

function labelFor(f: Format): string {
  switch (f) {
    case 'pptx': return 'PowerPoint';
    case 'pdf':  return 'PDF';
    case 'png':  return 'PNG bundle';
    case 'jpeg': return 'JPEG bundle';
  }
}
