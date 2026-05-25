'use client';

import React, { useState, useRef, useEffect } from 'react';
import type DOMPurifyType from 'dompurify';
// DOMPurify requires a browser DOM — lazy-load to avoid SSR crash
let DOMPurify: typeof DOMPurifyType | null = null;
if (typeof window !== 'undefined') {
  DOMPurify = require('dompurify');
}
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';

interface A4PreviewProps {
  content: string;
  title?: string;
  template?: string;
  brandKit?: any;
  onExport?: () => void;
}

/**
 * A4 Preview Component
 * Displays document in proper A4 dimensions (210mm × 297mm)
 * with real-time rendering and zoom controls
 */
export function A4Preview({
  content,
  title = 'Untitled Document',
  template = 'modern',
  brandKit,
  onExport,
}: A4PreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // A4 dimensions in pixels at 96 DPI
  const A4_WIDTH_PX = 794; // 210mm
  const A4_HEIGHT_PX = 1123; // 297mm

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Word count from raw text (strip HTML tags)
  const wordCount = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;

  return (
    <SectionErrorBoundary sectionName="A4 Preview">
      <div className="flex flex-col h-full bg-[#F1F0EC] dark:bg-gray-900">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-[#E3E1DA] dark:border-gray-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-semibold text-[#111111] dark:text-white">
              {title}
            </h3>
            <span className="text-sm text-[#9A9A9A] dark:text-[#C9C6BD]">
              A4 (210 × 297mm)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#F1F0EC] dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-1 text-sm font-medium hover:bg-[#E3E1DA] dark:hover:bg-gray-600 rounded"
              >
                {zoom}%
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Fullscreen */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleFullscreen}
              className="h-8 w-8"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Export */}
            {onExport && (
              <Button
                onClick={onExport}
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto p-8 flex justify-center items-start"
          style={{ backgroundColor: '#525659' }}
        >
          {/* A4 Page */}
          <div
            className="bg-white shadow-2xl transition-transform duration-200"
            style={{
              width: `${A4_WIDTH_PX}px`,
              minHeight: `${A4_HEIGHT_PX}px`,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            {/* Page Content */}
            <div className="p-16">
              {/* Logo */}
              {brandKit?.logo && (
                <div className="mb-8">
                  <img
                    src={brandKit.logo}
                    alt="Logo"
                    className="h-12 object-contain"
                  />
                </div>
              )}

              {/* Title */}
              <h1
                className="text-4xl font-bold mb-8"
                style={{ color: brandKit?.colors?.primary || '#1E40AF' }}
              >
                {title}
              </h1>

              {/* Render HTML content from RichTextEditor */}
              <div
                className="prose max-w-none text-[#111111]"
                dangerouslySetInnerHTML={{ __html: DOMPurify ? DOMPurify.sanitize(content || '') : (content || '') }}
              />

              {/* Footer */}
              {brandKit?.contact && (
                <div className="mt-16 pt-8 border-t border-[#E3E1DA] text-sm text-[#9A9A9A]">
                  <div className="flex justify-between">
                    {brandKit.contact.email && (
                      <span>{brandKit.contact.email}</span>
                    )}
                    {brandKit.contact.website && (
                      <span>{brandKit.contact.website}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Info */}
        <div className="bg-white dark:bg-gray-800 border-t border-[#E3E1DA] dark:border-gray-700 p-2 text-center text-xs text-[#9A9A9A] dark:text-[#C9C6BD]">
          Live Preview · {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      </div>
    </SectionErrorBoundary>
  );
}

export default A4Preview;
