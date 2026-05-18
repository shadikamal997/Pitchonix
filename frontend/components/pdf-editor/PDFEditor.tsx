'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '../ui/button';
import {
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Save,
  Download,
  Sparkles,
  CheckCircle2,
  Plus,
  Copy,
  MoveUp,
  MoveDown,
  Trash2,
  Eye,
  Image,
  BarChart3,
  Table as TableIcon,
  Layout,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
} from 'lucide-react';

interface Page {
  id: string;
  type: string;
  title?: string;
  content?: any;
}

interface PDFEditorProps {
  documentId: string;
  projectId: string;
  initialPages?: Page[];
  onSave?: () => Promise<void>;
  onExport?: () => void;
  onQualityCheck?: () => void;
  onEnhance?: () => void;
}

const PDFEditor = ({
  documentId,
  projectId,
  initialPages = [],
  onSave,
  onExport,
  onQualityCheck,
  onEnhance,
}: PDFEditorProps) => {
  const [pages, setPages] = useState<Page[]>(
    initialPages.length > 0
      ? initialPages
      : [
          { id: '1', type: 'cover', title: 'Cover Page' },
          { id: '2', type: 'content', title: 'Content Page' },
        ]
  );
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  // Formatting state
  const [selectedFont, setSelectedFont] = useState('Inter');
  const [selectedFontSize, setSelectedFontSize] = useState('16');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [textAlign, setTextAlign] = useState('left');
  const [textColor, setTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState('#ffff00');

  const selectedPage = pages[selectedPageIndex];

  const handleAddPage = (type: string) => {
    const newPage: Page = {
      id: `${Date.now()}`,
      type,
      title: `New ${type} Page`,
    };
    setPages([...pages, newPage]);
    setSelectedPageIndex(pages.length);
  };

  const handleDuplicatePage = (index: number) => {
    const pageToDuplicate = pages[index];
    const duplicatedPage: Page = {
      ...pageToDuplicate,
      id: `${Date.now()}`,
      title: `${pageToDuplicate.title} (Copy)`,
    };
    const newPages = [...pages];
    newPages.splice(index + 1, 0, duplicatedPage);
    setPages(newPages);
    setSelectedPageIndex(index + 1);
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== index);
    setPages(newPages);
    setSelectedPageIndex(Math.max(0, Math.min(index, newPages.length - 1)));
  };

  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    const newPages = [...pages];
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

  const applyFormatting = (format: string) => {
    switch (format) {
      case 'bold':
        setIsBold(!isBold);
        break;
      case 'italic':
        setIsItalic(!isItalic);
        break;
      case 'underline':
        setIsUnderline(!isUnderline);
        break;
      case 'strikethrough':
        setIsStrikethrough(!isStrikethrough);
        break;
      case 'align-left':
        setTextAlign('left');
        break;
      case 'align-center':
        setTextAlign('center');
        break;
      case 'align-right':
        setTextAlign('right');
        break;
      case 'align-justify':
        setTextAlign('justify');
        break;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Action Bar */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        {/* First Row - Title and Main Actions */}
        <div className="h-14 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href={`/projects/${projectId}`}>
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <h1 className="text-base font-bold text-slate-900">PDF Studio</h1>
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
                className="h-7 w-7 p-0"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-sm font-medium text-slate-700 min-w-[60px] text-center">
                {zoom}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                disabled={zoom >= 150}
                className="h-7 w-7 p-0"
              >
                <ZoomIn className="h-3.5 w-3.5" />
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
              className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
            >
              <Sparkles className="h-4 w-4" />
              Enhance
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>

            <Button
              size="sm"
              onClick={onExport}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Second Row - Formatting Toolbar */}
        <div className="h-12 flex items-center px-6 gap-2 border-t border-slate-100 bg-slate-50/50 overflow-x-auto">
          {/* Font Family Selector */}
          <select
            value={selectedFont}
            onChange={(e) => setSelectedFont(e.target.value)}
            className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer min-w-[180px]"
          >
            <optgroup label="Sans Serif">
              <option value="Inter">Inter</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
              <option value="Lato">Lato</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Poppins">Poppins</option>
              <option value="Source Sans Pro">Source Sans Pro</option>
              <option value="Raleway">Raleway</option>
              <option value="Nunito">Nunito</option>
              <option value="Ubuntu">Ubuntu</option>
              <option value="Work Sans">Work Sans</option>
              <option value="Rubik">Rubik</option>
              <option value="Quicksand">Quicksand</option>
              <option value="Manrope">Manrope</option>
              <option value="DM Sans">DM Sans</option>
              <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
            </optgroup>
            <optgroup label="Serif">
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="Merriweather">Merriweather</option>
              <option value="Lora">Lora</option>
              <option value="PT Serif">PT Serif</option>
              <option value="Crimson Text">Crimson Text</option>
              <option value="Libre Baskerville">Libre Baskerville</option>
              <option value="Cormorant">Cormorant</option>
              <option value="Source Serif Pro">Source Serif Pro</option>
            </optgroup>
            <optgroup label="Display">
              <option value="Bebas Neue">Bebas Neue</option>
              <option value="Archivo Black">Archivo Black</option>
              <option value="Righteous">Righteous</option>
              <option value="Anton">Anton</option>
              <option value="Oswald">Oswald</option>
              <option value="Exo 2">Exo 2</option>
            </optgroup>
            <optgroup label="Monospace">
              <option value="Courier New">Courier New</option>
              <option value="Monaco">Monaco</option>
              <option value="Roboto Mono">Roboto Mono</option>
              <option value="Source Code Pro">Source Code Pro</option>
              <option value="Fira Code">Fira Code</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="IBM Plex Mono">IBM Plex Mono</option>
            </optgroup>
            <optgroup label="Handwriting">
              <option value="Caveat">Caveat</option>
              <option value="Dancing Script">Dancing Script</option>
              <option value="Pacifico">Pacifico</option>
              <option value="Satisfy">Satisfy</option>
            </optgroup>
            <optgroup label="Google Fonts">
              <option value="Josefin Sans">Josefin Sans</option>
              <option value="Barlow">Barlow</option>
              <option value="Karla">Karla</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="Epilogue">Epilogue</option>
              <option value="Outfit">Outfit</option>
              <option value="Lexend">Lexend</option>
              <option value="Sora">Sora</option>
              <option value="Urbanist">Urbanist</option>
              <option value="Cabinet Grotesk">Cabinet Grotesk</option>
            </optgroup>
          </select>

          {/* Font Size */}
          <select
            value={selectedFontSize}
            onChange={(e) => setSelectedFontSize(e.target.value)}
            className="h-8 px-3 text-sm border border-slate-200 rounded-md bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer w-20"
          >
            <option>8</option>
            <option>9</option>
            <option>10</option>
            <option>11</option>
            <option>12</option>
            <option>14</option>
            <option>16</option>
            <option>18</option>
            <option>20</option>
            <option>24</option>
            <option>28</option>
            <option>32</option>
            <option>36</option>
            <option>48</option>
            <option>60</option>
            <option>72</option>
          </select>

          <div className="h-6 w-px bg-slate-300 mx-1" />

          {/* Text Formatting */}
          <Button
            variant={isBold ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('bold')}
            className="h-8 w-8 p-0 font-bold"
            title="Bold (Ctrl+B)"
          >
            <span className="text-sm">B</span>
          </Button>
          <Button
            variant={isItalic ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('italic')}
            className="h-8 w-8 p-0 italic"
            title="Italic (Ctrl+I)"
          >
            <span className="text-sm">I</span>
          </Button>
          <Button
            variant={isUnderline ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('underline')}
            className="h-8 w-8 p-0 underline"
            title="Underline (Ctrl+U)"
          >
            <span className="text-sm">U</span>
          </Button>
          <Button
            variant={isStrikethrough ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('strikethrough')}
            className="h-8 w-8 p-0"
            title="Strikethrough"
          >
            <span className="text-sm line-through">S</span>
          </Button>

          <div className="h-6 w-px bg-slate-300 mx-1" />

          {/* Text & Highlight Color */}
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-8 w-10 rounded border border-slate-200 cursor-pointer"
              title="Text Color"
            />
            <input
              type="color"
              value={highlightColor}
              onChange={(e) => setHighlightColor(e.target.value)}
              className="h-8 w-10 rounded border border-slate-200 cursor-pointer"
              title="Highlight Color"
            />
          </div>

          <div className="h-6 w-px bg-slate-300 mx-1" />

          {/* Alignment */}
          <Button
            variant={textAlign === 'left' ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('align-left')}
            className="h-8 w-8 p-0"
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === 'center' ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('align-center')}
            className="h-8 w-8 p-0"
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === 'right' ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('align-right')}
            className="h-8 w-8 p-0"
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={textAlign === 'justify' ? "default" : "ghost"}
            size="sm"
            onClick={() => applyFormatting('align-justify')}
            className="h-8 w-8 p-0"
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-slate-300 mx-1" />

          {/* Lists */}
          <Button variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5" title="Bullet List">
            <List className="h-4 w-4" />
            <span className="text-xs">Bullets</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 gap-1.5" title="Numbered List">
            <ListOrdered className="h-4 w-4" />
            <span className="text-xs">Numbers</span>
          </Button>

          <div className="h-6 w-px bg-slate-300 mx-1" />

          {/* Insert Elements */}
          <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5" title="Insert Image">
            <Image className="h-4 w-4" />
            <span className="text-xs">Image</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5" title="Insert Chart">
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Chart</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5" title="Insert Table">
            <TableIcon className="h-4 w-4" />
            <span className="text-xs">Table</span>
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5" title="Insert Layout">
            <Layout className="h-4 w-4" />
            <span className="text-xs">Layout</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Page List */}
        <aside className="w-64 border-r border-slate-200 bg-slate-50 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Pages</h2>
            <div className="space-y-3">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  onClick={() => setSelectedPageIndex(index)}
                  className={`group relative cursor-pointer rounded-xl border-2 transition-all ${
                    selectedPageIndex === index
                      ? 'border-green-500 bg-green-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Page Preview Thumbnail */}
                  <div className="aspect-[210/297] w-full rounded-t-lg bg-white flex items-center justify-center text-slate-400 border-b">
                    <Eye className="h-8 w-8 opacity-30" />
                  </div>

                  {/* Page Info */}
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          Page {index + 1}
                        </p>
                        <p className="text-[10px] text-slate-600 truncate mt-0.5">
                          {page.title || page.type}
                        </p>
                      </div>
                    </div>

                    {/* Page Actions */}
                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePage(index);
                        }}
                        className="h-7 w-7 p-0"
                        title="Duplicate"
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
                        title="Move Up"
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
                        title="Move Down"
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
                        title="Delete"
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
                className="w-full aspect-[210/297] rounded-xl border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-green-100 flex items-center justify-center transition-colors">
                  <Plus className="h-5 w-5 text-slate-400 group-hover:text-green-600" />
                </div>
                <p className="text-xs font-semibold text-slate-600 group-hover:text-green-700">
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
              <div
                className="w-full h-full p-8"
                style={{
                  fontFamily: selectedFont,
                  fontSize: `${selectedFontSize}px`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textDecoration: `${isUnderline ? 'underline' : ''} ${isStrikethrough ? 'line-through' : ''}`.trim(),
                  textAlign: textAlign as any,
                  color: textColor,
                  backgroundColor: highlightColor !== '#ffff00' ? highlightColor : 'transparent',
                }}
              >
                <div className="text-center text-slate-400 py-20">
                  <Eye className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">Page Preview</p>
                  <p className="text-sm mt-2">
                    Page {selectedPageIndex + 1} • {selectedPage?.type}
                  </p>
                  <p className="text-xs mt-4 text-slate-500">
                    PDF page templates will render here
                  </p>
                  <p className="text-xs mt-2 text-slate-500">
                    Font: {selectedFont} • Size: {selectedFontSize}px
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
              <select className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
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

            {/* Content Editors */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Enter title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Content
                </label>
                <textarea
                  rows={8}
                  placeholder="Enter content"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  style={{
                    fontFamily: selectedFont,
                    fontSize: `${selectedFontSize}px`,
                  }}
                />
              </div>

              {/* Enhance Section Button */}
              <Button
                variant="outline"
                className="w-full gap-2 border-green-200 text-green-700 hover:bg-green-50"
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
