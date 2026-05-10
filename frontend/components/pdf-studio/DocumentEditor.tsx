'use client';

/**
 * DocumentEditor Component
 * 
 * Main editing interface for generated documents.
 * Features:
 * - Block-based editing with live preview
 * - Full formatting toolbar
 * - Page-by-page navigation
 * - Export to PDF with edits
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { EditableDocumentPreview } from './EditableDocumentPreview';
import {
  PageData,
  PageBlock,
  BlockStyles,
  BlockType,
  EditorState,
  EditorChange,
  DocumentData,
} from '@/types/document-editor';
import { convertCompositionToDocument, convertDocumentToComposition } from '@/lib/document-converter';

interface DocumentEditorProps {
  initialCompositions: any[]; // PageCompositionLegacy[]
  onExport: (compositions: any[]) => void;
  onSave?: (document: DocumentData) => void;
}

export function DocumentEditor({
  initialCompositions,
  onExport,
  onSave,
}: DocumentEditorProps) {
  // Convert legacy format to editable format
  const [editorState, setEditorState] = useState<EditorState>(() => {
    const pages = convertCompositionToDocument(initialCompositions);
    return {
      document: {
        id: `doc-${Date.now()}`,
        title: pages[0]?.title || 'Untitled Document',
        pages,
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          version: 1,
        },
      },
      selectedPageId: pages[0]?.id || null,
      selectedBlockId: null,
      changes: [],
      isDirty: false,
    };
  });

  const selectedPage = editorState.document.pages.find(
    p => p.id === editorState.selectedPageId
  );
  const selectedBlock = selectedPage?.blocks.find(
    b => b.id === editorState.selectedBlockId
  );

  /**
   * Update block styles
   */
  const handleStyleChange = useCallback((styles: Partial<BlockStyles>) => {
    if (!selectedBlock || !selectedPage) return;

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        return {
          ...page,
          blocks: page.blocks.map(block => {
            if (block.id !== selectedBlock.id) return block;

            return {
              ...block,
              styles: {
                ...block.styles,
                ...styles,
              },
            };
          }),
        };
      });

      const change: EditorChange = {
        action: 'update-block-styles',
        pageId: selectedPage.id,
        blockId: selectedBlock.id,
        oldValue: selectedBlock.styles,
        newValue: { ...selectedBlock.styles, ...styles },
        timestamp: Date.now(),
      };

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
          metadata: {
            ...prev.document.metadata,
            modifiedAt: new Date().toISOString(),
            version: prev.document.metadata.version + 1,
          },
        },
        changes: [...prev.changes, change],
        isDirty: true,
      };
    });
  }, [selectedBlock, selectedPage]);

  /**
   * Update block content
   */
  const handleBlockContentChange = useCallback((blockId: string, content: string) => {
    if (!selectedPage) return;

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        return {
          ...page,
          blocks: page.blocks.map(block => {
            if (block.id !== blockId) return block;

            return {
              ...block,
              content,
            };
          }),
        };
      });

      const change: EditorChange = {
        action: 'update-block-content',
        pageId: selectedPage.id,
        blockId,
        oldValue: selectedPage.blocks.find(b => b.id === blockId)?.content,
        newValue: content,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
          metadata: {
            ...prev.document.metadata,
            modifiedAt: new Date().toISOString(),
            version: prev.document.metadata.version + 1,
          },
        },
        changes: [...prev.changes, change],
        isDirty: true,
      };
    });
  }, [selectedPage]);

  /**
   * Add new block
   */
  const handleAddBlock = useCallback((type: BlockType) => {
    if (!selectedPage) return;

    const newBlock: PageBlock = {
      id: `block-${Date.now()}`,
      type,
      content: getDefaultContent(type),
      styles: getDefaultStyles(type),
      order: selectedPage.blocks.length,
    };

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        return {
          ...page,
          blocks: [...page.blocks, newBlock],
        };
      });

      const change: EditorChange = {
        action: 'add-block',
        pageId: selectedPage.id,
        blockId: newBlock.id,
        newValue: newBlock,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
        },
        changes: [...prev.changes, change],
        isDirty: true,
        selectedBlockId: newBlock.id,
      };
    });
  }, [selectedPage]);

  /**
   * Delete block
   */
  const handleDeleteBlock = useCallback(() => {
    if (!selectedBlock || !selectedPage) return;

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        return {
          ...page,
          blocks: page.blocks.filter(b => b.id !== selectedBlock.id),
        };
      });

      const change: EditorChange = {
        action: 'delete-block',
        pageId: selectedPage.id,
        blockId: selectedBlock.id,
        oldValue: selectedBlock,
        timestamp: Date.now(),
      };

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
        },
        changes: [...prev.changes, change],
        isDirty: true,
        selectedBlockId: null,
      };
    });
  }, [selectedBlock, selectedPage]);

  /**
   * Duplicate block
   */
  const handleDuplicateBlock = useCallback(() => {
    if (!selectedBlock || !selectedPage) return;

    const newBlock: PageBlock = {
      ...selectedBlock,
      id: `block-${Date.now()}`,
      order: selectedBlock.order + 1,
    };

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        const blockIndex = page.blocks.findIndex(b => b.id === selectedBlock.id);
        const newBlocks = [...page.blocks];
        newBlocks.splice(blockIndex + 1, 0, newBlock);

        return {
          ...page,
          blocks: newBlocks.map((b, i) => ({ ...b, order: i })),
        };
      });

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
        },
        isDirty: true,
        selectedBlockId: newBlock.id,
      };
    });
  }, [selectedBlock, selectedPage]);

  /**
   * Move block up/down
   */
  const handleMoveBlock = useCallback((direction: 'up' | 'down') => {
    if (!selectedBlock || !selectedPage) return;

    setEditorState(prev => {
      const newPages = prev.document.pages.map(page => {
        if (page.id !== selectedPage.id) return page;

        const blockIndex = page.blocks.findIndex(b => b.id === selectedBlock.id);
        if (
          (direction === 'up' && blockIndex === 0) ||
          (direction === 'down' && blockIndex === page.blocks.length - 1)
        ) {
          return page;
        }

        const newBlocks = [...page.blocks];
        const targetIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
        [newBlocks[blockIndex], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[blockIndex]];

        return {
          ...page,
          blocks: newBlocks.map((b, i) => ({ ...b, order: i })),
        };
      });

      return {
        ...prev,
        document: {
          ...prev.document,
          pages: newPages,
        },
        isDirty: true,
      };
    });
  }, [selectedBlock, selectedPage]);

  /**
   * Export document
   */
  const handleExport = useCallback(() => {
    const compositions = convertDocumentToComposition(editorState.document.pages);
    onExport(compositions);
  }, [editorState.document.pages, onExport]);

  /**
   * Save document
   */
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(editorState.document);
      setEditorState(prev => ({ ...prev, isDirty: false }));
    }
  }, [editorState.document, onSave]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <EditorToolbar
        selectedBlockId={editorState.selectedBlockId}
        currentStyles={selectedBlock?.styles || {}}
        onStyleChange={handleStyleChange}
        onAddBlock={handleAddBlock}
        onDeleteBlock={handleDeleteBlock}
        onDuplicateBlock={handleDuplicateBlock}
        onMoveBlock={handleMoveBlock}
        onPageSettings={() => {}}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Area */}
        <div className="flex-1 overflow-auto p-8 bg-gray-100">
          <EditableDocumentPreview
            pages={editorState.document.pages}
            selectedPageId={editorState.selectedPageId}
            selectedBlockId={editorState.selectedBlockId}
            onSelectPage={(pageId) => setEditorState(prev => ({ ...prev, selectedPageId: pageId }))}
            onSelectBlock={(blockId) => setEditorState(prev => ({ ...prev, selectedBlockId: blockId }))}
            onBlockContentChange={handleBlockContentChange}
          />
        </div>

        {/* Side Panel - Page Navigator */}
        <div className="w-64 border-l bg-white p-4 overflow-auto">
          <h3 className="font-semibold mb-4">Pages</h3>
          <div className="space-y-2">
            {editorState.document.pages.map((page, index) => (
              <button
                key={page.id}
                onClick={() => setEditorState(prev => ({ ...prev, selectedPageId: page.id }))}
                className={`w-full text-left p-2 rounded text-sm ${
                  page.id === editorState.selectedPageId
                    ? 'bg-blue-100 text-blue-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="font-medium">Page {index + 1}</div>
                <div className="text-xs text-gray-500 truncate">{page.title}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t space-y-2">
            <button
              onClick={handleSave}
              disabled={!editorState.isDirty}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={handleExport}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getDefaultContent(type: BlockType): string {
  switch (type) {
    case 'heading':
      return 'New Heading';
    case 'paragraph':
      return 'New paragraph text...';
    case 'bullet':
      return '• List item';
    case 'numbered':
      return '1. List item';
    case 'divider':
      return '─────────';
    case 'metric':
      return '42';
    case 'cta':
      return 'Call to Action';
    case 'image':
      return '[Image]';
    case 'table':
      return '[Table]';
    default:
      return '';
  }
}

function getDefaultStyles(type: BlockType): BlockStyles {
  const baseStyles: BlockStyles = {
    fontFamily: 'Inter',
    lineHeight: 1.6,
    textAlign: 'left',
    color: '#000000',
  };

  switch (type) {
    case 'heading':
      return {
        ...baseStyles,
        fontSize: 1.953,
        fontWeight: 'bold',
        lineHeight: 1.2,
        spaceBefore: 32,
        spaceAfter: 16,
      };
    case 'paragraph':
      return {
        ...baseStyles,
        fontSize: 1.0,
        spaceBefore: 0,
        spaceAfter: 16,
      };
    case 'bullet':
    case 'numbered':
      return {
        ...baseStyles,
        fontSize: 1.0,
        spaceBefore: 0,
        spaceAfter: 8,
        indent: 24,
      };
    case 'divider':
      return {
        ...baseStyles,
        fontSize: 1.0,
        spaceBefore: 24,
        spaceAfter: 24,
        textAlign: 'center',
        color: '#cccccc',
      };
    default:
      return baseStyles;
  }
}
