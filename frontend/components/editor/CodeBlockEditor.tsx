'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

interface CodeBlockEditorProps {
  codeBlocks: Array<{
    id: string;
    language: string;
    code: string;
    title?: string;
  }>;
  onAdd: (block: any) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, block: any) => void;
}

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'sql',
  'html', 'css', 'json', 'yaml', 'bash', 'shell', 'c', 'cpp', 'swift',
];

export default function CodeBlockEditor({
  codeBlocks,
  onAdd,
  onRemove,
  onUpdate,
}: CodeBlockEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-xs font-semibold text-gray-300">Code Blocks</label>
        <Button
          size="sm"
          onClick={() =>
            onAdd({
              id: Date.now().toString(),
              language: 'javascript',
              code: '// Your code here',
              title: 'Code Example',
            })
          }
          className="bg-purple-600 hover:bg-purple-700 text-white h-6 text-xs"
        >
          + Add
        </Button>
      </div>

      {codeBlocks.map((block) => (
        <div
          key={block.id}
          className="bg-gray-800 border border-gray-600 rounded p-3 space-y-2"
        >
          {/* Header */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={block.title || ''}
              onChange={(e) => onUpdate(block.id, { ...block, title: e.target.value })}
              placeholder="Block title (optional)"
              className="flex-1 bg-gray-700 border-gray-600 text-white px-2 py-1 rounded text-xs border"
            />

            <Select value={block.language} onValueChange={(lang) => onUpdate(block.id, { ...block, language: lang })}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600 max-h-64">
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onRemove(block.id)}
              className="text-red-400 hover:text-red-300 h-8 w-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Code Editor */}
          <Textarea
            value={block.code}
            onChange={(e) => onUpdate(block.id, { ...block, code: e.target.value })}
            placeholder="Enter code..."
            className="bg-gray-700 border-gray-600 text-white text-xs font-mono min-h-32 p-2"
            spellCheck={false}
          />

          {/* Preview */}
          <div className="bg-black rounded border border-gray-700 p-2 overflow-x-auto">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">
              <code>{block.code}</code>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
