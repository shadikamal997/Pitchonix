/**
 * PDF Studio Editor
 * Professional PDF document editor with 3-panel layout
 */

'use client';

import React, { useState } from 'react';
import {
  Save,
  Download,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  MoveUp,
  MoveDown,
  ZoomIn,
  ZoomOut,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PDFPage {
  id: string;
  type: string;
  content: any;
  thumbnail?: string;
}

interface PDFEditorProps {
  projectId: string;
  pages: PDFPage[];
  onSave?: () => void;
  onExport?: () => void;
  onEnhance?: () => void;
  onQualityCheck?: () => void;
}

export const PDFEditor: React.FC<PDFEditorProps> = ({
  projectId,
  pages: initialPages,
  onSave,
  onExport,
  onEnhance,
  onQualityCheck,
}) => {
  const [pages, setPages] = useState<PDFPage[]>(initialPages);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  const selectedPage = pages[selectedPageIndex];

  const handleAddPage = (type: string) => {
    const newPage: PDFPage = {
      id: `page-${Date.now()}`,
      type,
      content: {},
    };
    const newPages = [...pages];
    newPages.splice(selectedPageIndex + 1, 0, newPage);
    setPages(newPages);
    setSelectedPageIndex(selectedPageIndex + 1);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  const handleDuplicatePage = (index: number) => {
    const pageToDuplicate = pages[index];
    const newPage: PDFPage = {
      ...pageToDuplicate,
      id: `page-${Date.now()}`,
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, newPage);
    setPages(newPages);
    setSelectedPageIndex(index + 1);
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
    setSelectedPageIndex(targetIndex);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Action Bar */}
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">PDF Studio</h1>
            <p className="text-xs text-slate-600">
              {pages.length} {pages.length === 1 ? 'page' : 'pages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoom(Math.min(150, zoom + 10))}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* Action Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={onQualityCheck}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Quality Check
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onEnhance}
            className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
          >
            <Sparkles className="h-4 w-4" />
            Enhance
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            size="sm"
            onClick={onExport}
            className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </header>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Page Thumbnails */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Pages
            </h2>
            
            <div className="space-y-3">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className={`group relative rounded-xl border-2 transition-all cursor-pointer ${
                    selectedPageIndex === index
                      ? 'border-violet-500 bg-white shadow-lg'
                      : 'border-slate-200 bg-white hover:border-violet-300 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedPageIndex(index)}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[210/297] bg-slate-100 rounded-t-lg flex items-center justify-center text-slate-400 overflow-hidden">
                    {page.thumbnail ? (
                      <img src={page.thumbnail} alt={`Page ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Preview</p>
                      </div>
                    )}
                  </div>

                  {/* Page Info */}
                  <div className="p-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-900">
                        Page {index + 1}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {page.type}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePage(index);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePage(index, 'up');
                        }}
                        disabled={index === 0}
                        className="h-7 w-7 p-0"
                      >
                        <MoveUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMovePage(index, 'down');
                        }}
                        disabled={index === pages.length - 1}
                        className="h-7 w-7 p-0"
                      >
                        <MoveDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePage(index);
                        }}
                        disabled={pages.length <= 1}
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Page Button */}
              <button
                onClick={() => handleAddPage('content')}
                className="w-full aspect-[210/297] rounded-xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50 flex flex-col items-center justify-center gap-3 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <Plus className="h-6 w-6 text-slate-400 group-hover:text-violet-600" />
                </div>
                <p className="text-sm font-medium text-slate-600 group-hover:text-violet-700">
                  Add Page
                </p>
              </button>
            </div>
          </div>
        </aside>

        {/* Center - Page Preview */}
        <main className="flex-1 bg-slate-100 overflow-auto p-8">
          <div className="max-w-4xl mx-auto">
            <div
              className="bg-white shadow-2xl mx-auto transition-transform"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                width: '210mm',
                minHeight: '297mm',
              }}
            >
              {/* Render Selected Page */}
              <div className="w-full h-full p-8">
                <div className="text-center text-slate-400 py-20">
                  <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Page Preview</p>
                  <p className="text-sm mt-2">
                    Page {selectedPageIndex + 1} • {selectedPage?.type}
                  </p>
                  <p className="text-xs mt-4 text-slate-500">
                    PDF page templates will render here
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar - Edit Panel */}
        <aside className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-6">
              Edit Page
            </h2>

            {/* Page Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Page Type
              </label>
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
                <option>Cover Page</option>
                <option>Table of Contents</option>
                <option>Executive Summary</option>
                <option>Section Divider</option>
                <option>Two Column Content</option>
                <option>Metrics</option>
                <option>Chart</option>
                <option>Financial Table</option>
                <option>Timeline</option>
                <option>Case Study</option>
                <option>Conclusion</option>
              </select>
            </div>

            {/* Content Editors (conditional based on page type) */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Enter title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Content
                </label>
                <textarea
                  rows={6}
                  placeholder="Enter content"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>

              {/* Enhance Section Button */}
              <Button
                variant="outline"
                className="w-full gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Sparkles className="h-4 w-4" />
                Enhance This Section
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default PDFEditor;
