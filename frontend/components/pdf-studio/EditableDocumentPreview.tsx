'use client';

/**
 * EditableDocumentPreview Component
 * 
 * Renders pages with editable blocks.
 * Blocks can be selected and edited inline.
 */

import React, { useRef, useEffect } from 'react';
import { PageData, PageBlock } from '@/types/document-editor';

interface EditableDocumentPreviewProps {
  pages: PageData[];
  selectedPageId: string | null;
  selectedBlockId: string | null;
  onSelectPage: (pageId: string) => void;
  onSelectBlock: (blockId: string) => void;
  onBlockContentChange: (blockId: string, content: string) => void;
}

export function EditableDocumentPreview({
  pages,
  selectedPageId,
  selectedBlockId,
  onSelectPage,
  onSelectBlock,
  onBlockContentChange,
}: EditableDocumentPreviewProps) {
  return (
    <div className="max-w-[850px] mx-auto space-y-8">
      {pages.map((page) => (
        <EditablePage
          key={page.id}
          page={page}
          isSelected={page.id === selectedPageId}
          selectedBlockId={selectedBlockId}
          onSelectPage={() => onSelectPage(page.id)}
          onSelectBlock={onSelectBlock}
          onBlockContentChange={onBlockContentChange}
        />
      ))}
    </div>
  );
}

interface EditablePageProps {
  page: PageData;
  isSelected: boolean;
  selectedBlockId: string | null;
  onSelectPage: () => void;
  onSelectBlock: (blockId: string) => void;
  onBlockContentChange: (blockId: string, content: string) => void;
}

function EditablePage({
  page,
  isSelected,
  selectedBlockId,
  onSelectPage,
  onSelectBlock,
  onBlockContentChange,
}: EditablePageProps) {
  return (
    <div
      onClick={onSelectPage}
      className={`
        bg-white shadow-lg rounded-lg overflow-hidden cursor-pointer
        transition-all duration-200
        ${isSelected ? 'ring-4 ring-blue-400 shadow-xl' : 'hover:shadow-xl'}
      `}
      style={{
        width: '794px',
        minHeight: '1123px',
        backgroundColor: page.pageStyles.backgroundColor || '#ffffff',
      }}
    >
      {/* Page Number Badge */}
      <div className="absolute -top-2 -left-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
        {page.pageNumber}
      </div>

      {/* Content Area */}
      <div
        className="p-16"
        style={{
          marginTop: page.pageStyles.margins?.top || 64,
          marginRight: page.pageStyles.margins?.right || 64,
          marginBottom: page.pageStyles.margins?.bottom || 64,
          marginLeft: page.pageStyles.margins?.left || 64,
        }}
      >
        {page.blocks.map((block) => (
          <EditableBlock
            key={block.id}
            block={block}
            isSelected={block.id === selectedBlockId}
            onSelect={() => onSelectBlock(block.id)}
            onContentChange={(content) => onBlockContentChange(block.id, content)}
          />
        ))}
      </div>
    </div>
  );
}

interface EditableBlockProps {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onContentChange: (content: string) => void;
}

function EditableBlock({
  block,
  isSelected,
  onSelect,
  onContentChange,
}: EditableBlockProps) {
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSelected && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSelected]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const content = e.currentTarget.textContent || '';
    onContentChange(content);
  };

  const blockStyles: React.CSSProperties = {
    fontSize: `${block.styles.fontSize || 1.0}rem`,
    fontFamily: block.styles.fontFamily || 'Inter',
    fontWeight: block.styles.fontWeight || 'normal',
    fontStyle: block.styles.fontStyle || 'normal',
    textDecoration: block.styles.textDecoration || 'none',
    color: block.styles.color || '#000000',
    backgroundColor: block.styles.backgroundColor,
    textAlign: block.styles.textAlign || 'left',
    lineHeight: block.styles.lineHeight || 1.6,
    letterSpacing: block.styles.letterSpacing ? `${block.styles.letterSpacing}em` : undefined,
    textTransform: block.styles.textTransform as any,
    marginTop: block.styles.spaceBefore || 0,
    marginBottom: block.styles.spaceAfter || 0,
    paddingLeft: block.styles.indent || 0,
  };

  // Render based on block type
  switch (block.type) {
    case 'heading':
      return (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={blockStyles}
          className={`
            outline-none transition-all duration-150
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          {block.content}
        </div>
      );

    case 'paragraph':
    case 'bullet':
    case 'numbered':
      return (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={blockStyles}
          className={`
            outline-none transition-all duration-150
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          {block.content}
        </div>
      );

    case 'divider':
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            ...blockStyles,
            borderTop: `2px solid ${block.styles.color || '#cccccc'}`,
            height: 1,
          }}
          className={`
            transition-all duration-150 cursor-pointer
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : 'hover:opacity-70'}
          `}
        />
      );

    case 'image':
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={blockStyles}
          className={`
            border-2 border-dashed border-gray-300 rounded p-8 text-center
            transition-all duration-150 cursor-pointer
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          <div className="text-gray-400">📷 Image Placeholder</div>
          <div className="text-xs text-gray-500 mt-2">{block.content}</div>
        </div>
      );

    case 'metric':
      return (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={{
            ...blockStyles,
            fontSize: '3rem',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
          className={`
            outline-none transition-all duration-150
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          {block.content}
        </div>
      );

    case 'cta':
      return (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={blockStyles}
          className={`
            px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold text-center
            outline-none transition-all duration-150 cursor-pointer
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : 'hover:bg-blue-600'}
          `}
        >
          {block.content}
        </div>
      );

    default:
      return (
        <div
          ref={inputRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          style={blockStyles}
          className={`
            outline-none transition-all duration-150
            ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2 bg-blue-50' : 'hover:bg-gray-50'}
          `}
        >
          {block.content}
        </div>
      );
  }
}
