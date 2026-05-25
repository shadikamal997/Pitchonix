'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import api from '@/lib/api';

const A4_W = 794; // 210 mm at 96 dpi

interface PreviewModalProps {
  documentId: string;
  documentTitle: string;
  pageCount: number;
  colorScheme?: string;
  templateType?: string;
  proTemplateId?: string | null;
  onClose: () => void;
  onExport?: (format: string) => void;
}

export default function PreviewModal({
  documentId,
  documentTitle,
  pageCount,
  colorScheme,
  templateType,
  proTemplateId,
  onClose,
  onExport,
}: PreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [zoom, setZoom] = useState(1);
  const [iframeHeight, setIframeHeight] = useState(1123);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fetch preview HTML on mount
  useEffect(() => {
    fetchPreview();
  }, [documentId, colorScheme, templateType, proTemplateId]);

  // Auto-fit zoom once HTML arrives
  useEffect(() => {
    if (!previewHtml || !scrollRef.current) return;
    const avail = scrollRef.current.offsetWidth - 64;
    setZoom(Math.min(1.25, Math.max(0.25, avail / A4_W)));
  }, [previewHtml]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (colorScheme) searchParams.set('colorScheme', colorScheme);
      if (templateType) searchParams.set('templateType', templateType);
      if (proTemplateId) searchParams.set('proTemplateId', proTemplateId);
      const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await api.get(`/pdf-studio/export/preview/${documentId}${params}`, {
        responseType: 'text',
      });
      setPreviewHtml(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setIframeHeight(doc.documentElement.scrollHeight + 32);
    } catch {
      // ignore
    }
  };

  const fitToWidth = () => {
    if (!scrollRef.current) return;
    const avail = scrollRef.current.offsetWidth - 64;
    setZoom(Math.min(1.25, Math.max(0.25, avail / A4_W)));
  };

  const scaledW = Math.round(A4_W * zoom);
  const scaledH = Math.round(iframeHeight * zoom);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* ── Toolbar ── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/10"
        style={{ background: '#16213e' }}
      >
        {/* Left: close + title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 text-[#C9C6BD] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-white leading-none">{documentTitle}</h2>
            <p className="text-[11px] text-[#C9C6BD] mt-0.5">{pageCount} page{pageCount !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Center: zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={fitToWidth}
              className="px-3 py-1 text-sm font-mono text-gray-200 hover:text-white hover:bg-white/10 rounded min-w-[56px] text-center transition-colors"
              title="Click to fit width"
            >
              {Math.round(zoom * 100)}%
            </button>

            <button
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fitToWidth}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            Fit
          </button>

          <button
            onClick={() => setZoom(1)}
            className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            100%
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPreview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {onExport && (
            <button
              onClick={() => onExport('pdf')}
              className="flex items-center gap-2 px-4 py-2 bg-[#4F7563] hover:bg-[#4F7563] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Preview area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        style={{ background: '#525659' }}
      >
        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
            <Loader2 className="w-12 h-12 animate-spin" />
            <p className="text-sm text-gray-300">Loading preview…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-sm text-gray-300">{error}</p>
            <button
              onClick={fetchPreview}
              className="px-4 py-2 bg-[#4F7563] text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Document */}
        {!loading && previewHtml && (
          <div
            className="flex justify-center py-8"
            style={{ minHeight: `${scaledH + 64}px` }}
          >
            {/*
              Same scaling trick as LivePreview:
              Outer wrapper = scaled dimensions (no overflow).
              Inner iframe = full A4 width, scaled via CSS transform.
              This guarantees the full page width is always visible.
            */}
            <div
              style={{
                width: `${scaledW}px`,
                height: `${scaledH}px`,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Document Preview"
                style={{
                  width: `${A4_W}px`,
                  height: `${iframeHeight}px`,
                  border: 'none',
                  display: 'block',
                  transformOrigin: 'top left',
                  transform: `scale(${zoom})`,
                }}
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
