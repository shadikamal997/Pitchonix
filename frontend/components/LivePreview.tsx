'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Eye, RefreshCw, Maximize2 } from 'lucide-react';
import api from '@/lib/api';

// A4 at 96 dpi = 794 × 1123 px
const A4_W = 794;

interface LivePreviewProps {
  documentId: string;
  refreshTrigger?: number;
  colorScheme?: string;
  templateType?: string;
  proTemplateId?: string | null;
  className?: string;
  onFullscreen?: () => void;
}

export default function LivePreview({
  documentId,
  refreshTrigger,
  colorScheme,
  templateType,
  proTemplateId,
  className = '',
  onFullscreen,
}: LivePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [scale, setScale] = useState(0.5);
  const [iframeHeight, setIframeHeight] = useState(1123);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep scale in sync with container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width - 16; // 8px padding each side
      setScale(Math.max(0.1, Math.min(1, w / A4_W)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Debounced fetch — re-fetch when color scheme or template changes too
  useEffect(() => {
    const id = setTimeout(fetchPreview, 500);
    return () => {
      clearTimeout(id);
      abortRef.current?.abort();
    };
  }, [documentId, refreshTrigger, colorScheme, templateType, proTemplateId]);

  const fetchPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const searchParams = new URLSearchParams();
      if (colorScheme) searchParams.set('colorScheme', colorScheme);
      if (templateType) searchParams.set('templateType', templateType);
      if (proTemplateId) searchParams.set('proTemplateId', proTemplateId);
      const params = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await api.get(`/pdf-studio/export/preview/${documentId}${params}`, {
        signal: abortRef.current.signal,
        responseType: 'text',
      });

      setPreviewHtml(res.data);
      setLastUpdate(new Date());
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setError(err.response?.data?.message || err.message || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleIframeLoad = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) setIframeHeight(doc.documentElement.scrollHeight + 32);
    } catch {
      // ignore cross-origin errors
    }
  };

  // Dimensions of the scaled viewport
  const scaledW = Math.round(A4_W * scale);
  const scaledH = Math.round(iframeHeight * scale);

  return (
    <div className={`flex flex-col bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-gray-700">Live Preview</span>
          {loading && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
        </div>

        <div className="flex items-center gap-1">
          {!loading && (
            <span className="text-[10px] text-gray-400 mr-1">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchPreview}
            disabled={loading}
            title="Refresh"
            className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onFullscreen && (
            <button
              onClick={onFullscreen}
              title="Fullscreen preview"
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable preview area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{
          background: '#525659',
          height: 'calc(100vh - 210px)',
          minHeight: '360px',
        }}
      >
        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-xs text-gray-300 text-center">{error}</p>
            <button
              onClick={fetchPreview}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Initial loading state */}
        {loading && !previewHtml && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-xs text-gray-300">Generating preview…</p>
          </div>
        )}

        {/* Scaled preview */}
        {previewHtml && (
          <div
            className="flex justify-center py-4"
            style={{ minHeight: `${scaledH + 32}px` }}
          >
            {/*
              Outer wrapper is exactly the scaled dimensions.
              overflow:hidden clips the unscaled iframe so there is no
              horizontal scrollbar — the page is always fully visible.
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
                  transform: `scale(${scale})`,
                }}
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}

        {/* Refresh overlay (subsequent updates) */}
        {loading && previewHtml && (
          <div className="sticky top-0 bg-blue-600/80 text-white text-[10px] text-center py-1 z-10">
            <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
            Updating…
          </div>
        )}
      </div>
    </div>
  );
}
