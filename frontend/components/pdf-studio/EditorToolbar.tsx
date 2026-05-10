'use client';

/**
 * EditorToolbar Component
 * 
 * Full-featured formatting toolbar for document editing.
 * Groups: Text, Paragraph, Page, Blocks
 */

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Type,
  Palette,
  ChevronDown,
  Plus,
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
  Settings,
} from 'lucide-react';
import {
  BlockStyles,
  FontFamily,
  FontWeight,
  HeadingLevel,
  TextAlign,
  BlockType,
} from '@/types/document-editor';

interface EditorToolbarProps {
  selectedBlockId: string | null;
  currentStyles: BlockStyles;
  onStyleChange: (styles: Partial<BlockStyles>) => void;
  onAddBlock: (type: BlockType) => void;
  onDeleteBlock: () => void;
  onDuplicateBlock: () => void;
  onMoveBlock: (direction: 'up' | 'down') => void;
  onPageSettings: () => void;
}

const FONT_FAMILIES: FontFamily[] = [
  'Inter',
  'Georgia',
  'Times New Roman',
  'Arial',
  'Helvetica',
  'Courier New',
  'Verdana',
];

const FONT_SIZES = [
  { label: 'Small', value: 0.875 },
  { label: 'Normal', value: 1.0 },
  { label: 'Medium', value: 1.125 },
  { label: 'Large', value: 1.25 },
  { label: 'XL', value: 1.5 },
  { label: '2XL', value: 1.875 },
  { label: '3XL', value: 2.25 },
];

const HEADING_LEVELS: Array<{ label: string; value: HeadingLevel }> = [
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Heading 4', value: 'h4' },
  { label: 'Body Text', value: 'body' },
];

const TEXT_TRANSFORMS = [
  { label: 'None', value: 'none' },
  { label: 'UPPERCASE', value: 'uppercase' },
  { label: 'lowercase', value: 'lowercase' },
  { label: 'Capitalize', value: 'capitalize' },
];

const BLOCK_TYPES: Array<{ label: string; type: BlockType; icon: string }> = [
  { label: 'Paragraph', type: 'paragraph', icon: '¶' },
  { label: 'Heading', type: 'heading', icon: 'H' },
  { label: 'Bullet List', type: 'bullet', icon: '•' },
  { label: 'Numbered List', type: 'numbered', icon: '1.' },
  { label: 'Divider', type: 'divider', icon: '─' },
  { label: 'Image', type: 'image', icon: '🖼' },
  { label: 'Metric', type: 'metric', icon: '#' },
  { label: 'CTA', type: 'cta', icon: '➜' },
  { label: 'Table', type: 'table', icon: '⊞' },
];

export function EditorToolbar({
  selectedBlockId,
  currentStyles,
  onStyleChange,
  onAddBlock,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  onPageSettings,
}: EditorToolbarProps) {
  const disabled = !selectedBlockId;

  return (
    <div className="border-b bg-white shadow-sm">
      <div className="flex items-center gap-4 p-2 overflow-x-auto">
        {/* Text Group */}
        <div className="flex items-center gap-1 border-r pr-4">
          <span className="text-xs font-medium text-gray-500 mr-2">Text</span>
          
          {/* Font Family */}
          <select
            value={currentStyles.fontFamily || 'Inter'}
            onChange={(e) => onStyleChange({ fontFamily: e.target.value as FontFamily })}
            disabled={disabled}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font} value={font}>
                {font}
              </option>
            ))}
          </select>

          {/* Font Size */}
          <select
            value={currentStyles.fontSize || 1.0}
            onChange={(e) => onStyleChange({ fontSize: parseFloat(e.target.value) })}
            disabled={disabled}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {FONT_SIZES.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Bold, Italic, Underline */}
          <ToolbarButton
            icon={<Bold size={16} />}
            active={currentStyles.fontWeight === 'bold'}
            onClick={() => onStyleChange({ 
              fontWeight: currentStyles.fontWeight === 'bold' ? 'normal' : 'bold' 
            })}
            disabled={disabled}
            tooltip="Bold"
          />
          <ToolbarButton
            icon={<Italic size={16} />}
            active={currentStyles.fontStyle === 'italic'}
            onClick={() => onStyleChange({ 
              fontStyle: currentStyles.fontStyle === 'italic' ? 'normal' : 'italic' 
            })}
            disabled={disabled}
            tooltip="Italic"
          />
          <ToolbarButton
            icon={<Underline size={16} />}
            active={currentStyles.textDecoration === 'underline'}
            onClick={() => onStyleChange({ 
              textDecoration: currentStyles.textDecoration === 'underline' ? 'none' : 'underline' 
            })}
            disabled={disabled}
            tooltip="Underline"
          />

          {/* Text Color */}
          <div className="relative">
            <input
              type="color"
              value={currentStyles.color || '#000000'}
              onChange={(e) => onStyleChange({ color: e.target.value })}
              disabled={disabled}
              className="w-8 h-8 border rounded cursor-pointer disabled:opacity-50"
              title="Text Color"
            />
          </div>

          {/* Text Transform */}
          <select
            value={currentStyles.textTransform || 'none'}
            onChange={(e) => onStyleChange({ textTransform: e.target.value as any })}
            disabled={disabled}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {TEXT_TRANSFORMS.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Paragraph Group */}
        <div className="flex items-center gap-1 border-r pr-4">
          <span className="text-xs font-medium text-gray-500 mr-2">Paragraph</span>

          {/* Heading Level */}
          <select
            value={currentStyles.headingLevel || 'body'}
            onChange={(e) => onStyleChange({ headingLevel: e.target.value as HeadingLevel })}
            disabled={disabled}
            className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {HEADING_LEVELS.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {/* Alignment */}
          <ToolbarButton
            icon={<AlignLeft size={16} />}
            active={currentStyles.textAlign === 'left'}
            onClick={() => onStyleChange({ textAlign: 'left' })}
            disabled={disabled}
            tooltip="Align Left"
          />
          <ToolbarButton
            icon={<AlignCenter size={16} />}
            active={currentStyles.textAlign === 'center'}
            onClick={() => onStyleChange({ textAlign: 'center' })}
            disabled={disabled}
            tooltip="Align Center"
          />
          <ToolbarButton
            icon={<AlignRight size={16} />}
            active={currentStyles.textAlign === 'right'}
            onClick={() => onStyleChange({ textAlign: 'right' })}
            disabled={disabled}
            tooltip="Align Right"
          />
          <ToolbarButton
            icon={<AlignJustify size={16} />}
            active={currentStyles.textAlign === 'justify'}
            onClick={() => onStyleChange({ textAlign: 'justify' })}
            disabled={disabled}
            tooltip="Justify"
          />

          {/* Line Height */}
          <label className="flex items-center gap-1 text-xs">
            <span>Line:</span>
            <input
              type="number"
              value={currentStyles.lineHeight || 1.6}
              onChange={(e) => onStyleChange({ lineHeight: parseFloat(e.target.value) })}
              disabled={disabled}
              step="0.1"
              min="1.0"
              max="3.0"
              className="w-12 px-1 py-1 text-xs border rounded disabled:opacity-50"
            />
          </label>

          {/* Letter Spacing */}
          <label className="flex items-center gap-1 text-xs">
            <span>Spacing:</span>
            <input
              type="number"
              value={currentStyles.letterSpacing || 0}
              onChange={(e) => onStyleChange({ letterSpacing: parseFloat(e.target.value) })}
              disabled={disabled}
              step="0.01"
              min="-0.1"
              max="0.5"
              className="w-12 px-1 py-1 text-xs border rounded disabled:opacity-50"
            />
          </label>
        </div>

        {/* Block Actions */}
        <div className="flex items-center gap-1 border-r pr-4">
          <span className="text-xs font-medium text-gray-500 mr-2">Block</span>
          
          <ToolbarButton
            icon={<Copy size={16} />}
            onClick={onDuplicateBlock}
            disabled={disabled}
            tooltip="Duplicate Block"
          />
          <ToolbarButton
            icon={<Trash2 size={16} />}
            onClick={onDeleteBlock}
            disabled={disabled}
            tooltip="Delete Block"
          />
          <ToolbarButton
            icon={<MoveUp size={16} />}
            onClick={() => onMoveBlock('up')}
            disabled={disabled}
            tooltip="Move Up"
          />
          <ToolbarButton
            icon={<MoveDown size={16} />}
            onClick={() => onMoveBlock('down')}
            disabled={disabled}
            tooltip="Move Down"
          />
        </div>

        {/* Add Block Dropdown */}
        <div className="relative">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onAddBlock(e.target.value as BlockType);
                e.target.value = '';
              }
            }}
            className="px-3 py-1.5 text-sm border rounded bg-blue-500 text-white hover:bg-blue-600 cursor-pointer"
          >
            <option value="">+ Add Block</option>
            {BLOCK_TYPES.map(({ label, type, icon }) => (
              <option key={type} value={type}>
                {icon} {label}
              </option>
            ))}
          </select>
        </div>

        {/* Page Settings */}
        <ToolbarButton
          icon={<Settings size={16} />}
          onClick={onPageSettings}
          tooltip="Page Settings"
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  tooltip?: string;
}

function ToolbarButton({ icon, active, onClick, disabled, tooltip }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`
        p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
        ${active ? 'bg-blue-100 text-blue-600' : 'text-gray-700'}
      `}
    >
      {icon}
    </button>
  );
}
