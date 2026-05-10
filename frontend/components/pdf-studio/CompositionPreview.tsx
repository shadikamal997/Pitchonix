'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CompositionRenderer from './CompositionRenderer';

// A4 dimensions in pixels at 96 DPI
const A4_WIDTH_PX = 794; // 210mm
const A4_HEIGHT_PX = 1123; // 297mm

interface Page {
  id: string;
  order: number;
  pageType: string;
  title?: string;
  content: {
    text?: string;
    composition?: any;
  };
}

interface Document {
  id: string;
  title: string;
  metadata?: {
    compositionQuality?: number;
    generatedSections?: number;
  };
}

interface CompositionPreviewProps {
  document: Document;
  pages: Page[];
  currentPageIndex?: number;
  onPageChange?: (index: number) => void;
  className?: string;
}

/**
 * CompositionPreview
 * 
 * Multi-page document preview with composition-based rendering,
 * immersive viewport mode, and quality metrics display.
 */
export function CompositionPreview({
  document,
  pages,
  currentPageIndex = 0,
  onPageChange,
  className = '',
}: CompositionPreviewProps) {
  const [zoom, setZoom] = useState(100);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(currentPageIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync current index with prop
  useEffect(() => {
    setCurrentIndex(currentPageIndex);
  }, [currentPageIndex]);

  // Auto-scroll to current page when index changes
  useEffect(() => {
    if (scrollContainerRef.current && pages[currentIndex]) {
      const pageElement = scrollContainerRef.current.querySelector(
        `[data-page-index="${currentIndex}"]`
      );
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentIndex, pages]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePrevPage = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    onPageChange?.(newIndex);
  };

  const handleNextPage = () => {
    const newIndex = Math.min(pages.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    onPageChange?.(newIndex);
  };

  const toggleImmersive = () => {
    setIsImmersive(!isImmersive);
    if (!isImmersive) {
      // When entering immersive mode, fit to width
      setZoom(100);
    }
  };

  const toggleMetrics = () => setShowMetrics(!showMetrics);

  const currentPage = pages[currentIndex];
  const hasComposition = currentPage?.content?.composition;

  // Calculate overall quality from all pages
  const overallQuality = React.useMemo(() => {
    const qualities = pages
      .filter(p => p.content?.composition?.metrics?.overallQuality)
      .map(p => p.content.composition.metrics.overallQuality);
    
    if (qualities.length === 0) return null;
    return qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
  }, [pages]);

  const getQualityColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getQualityBadge = (score: number): string => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Work';
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-100 dark:bg-gray-900 transition-all duration-300 ${
        isImmersive ? 'fixed inset-0 z-50' : ''
      } ${className}`}
    >
      {/* Toolbar */}
      <div
        className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ${
          isImmersive ? 'opacity-0 hover:opacity-100' : ''
        }`}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: Document Info */}
          <div className="flex items-center gap-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'}
                </span>
                {overallQuality !== null && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className={`text-xs font-semibold ${getQualityColor(overallQuality)}`}>
                      {overallQuality.toFixed(0)}/100 {getQualityBadge(overallQuality)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevPage}
                disabled={currentIndex === 0}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[60px] text-center">
                {currentIndex + 1} / {pages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPage}
                disabled={currentIndex === pages.length - 1}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
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
                className="px-3 py-1 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 rounded min-w-[50px]"
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

            {/* Metrics Toggle */}
            {hasComposition && (
              <Button
                variant={showMetrics ? 'default' : 'outline'}
                size="icon"
                onClick={toggleMetrics}
                className="h-8 w-8"
                title="Toggle quality metrics"
              >
                <BarChart2 className="h-4 w-4" />
              </Button>
            )}

            {/* Immersive Mode */}
            <Button
              variant={isImmersive ? 'default' : 'outline'}
              size="icon"
              onClick={toggleImmersive}
              className="h-8 w-8"
              title="Immersive mode"
            >
              {isImmersive ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-8 flex justify-center items-start"
        style={{ backgroundColor: '#525659' }}
      >
        <div className="space-y-8">
          {pages.map((page, index) => {
            const isCurrentPage = index === currentIndex;
            const hasCompositionData = page.content?.composition;

            return (
              <div
                key={page.id}
                data-page-index={index}
                className={`transition-all duration-200 ${
                  isCurrentPage ? 'ring-4 ring-blue-500' : ''
                }`}
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  marginBottom: zoom !== 100 ? `${(zoom - 100) * 5}px` : undefined,
                }}
              >
                {/* A4 Page */}
                <div
                  className="bg-white shadow-2xl relative"
                  style={{
                    width: `${A4_WIDTH_PX}px`,
                    minHeight: `${A4_HEIGHT_PX}px`,
                  }}
                >
                  {/* Page Number Badge */}
                  <div className="absolute top-4 left-4 bg-gray-100 px-3 py-1 rounded-full text-xs font-semibold text-gray-600">
                    Page {page.order}
                  </div>

                  {/* Render with Composition Data if available */}
                  {hasCompositionData ? (
                    <CompositionRenderer
                      composition={page.content.composition}
                      pageType={page.pageType}
                      pageTitle={page.title}
                      showMetrics={showMetrics && isCurrentPage}
                    />
                  ) : (
                    // Fallback to simple text rendering
                    <div className="p-16">
                      {page.title && (
                        <h1 className="text-4xl font-bold mb-8 text-gray-900">
                          {page.title}
                        </h1>
                      )}
                      <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                        {page.content?.text || 'No content'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Info Footer */}
      <div
        className={`bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 transition-all duration-300 ${
          isImmersive ? 'opacity-0 hover:opacity-100' : ''
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          <span>
            {hasComposition ? 'Production-Quality Composition' : 'Standard Preview'}
          </span>
          {currentPage && currentPage.content?.composition?.metrics && (
            <>
              <span>•</span>
              <span>
                Quality: {currentPage.content.composition.metrics.overallQuality.toFixed(1)}/100
              </span>
              <span>•</span>
              <span className="capitalize">
                {currentPage.content.composition.density} density
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompositionPreview;
