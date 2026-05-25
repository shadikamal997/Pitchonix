'use client';

import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';

interface Props {
  open:     boolean;
  onClose:  () => void;
  onCreate: (input: { name: string; description?: string }) => Promise<any>;
}

export const CreateWorkspaceModal: React.FC<Props> = ({ open, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) { setName(''); setDescription(''); setError(null); setBusy(false); }
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const n = name.trim();
    if (!n) { setError('Name is required'); return; }
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name: n, description: description.trim() || undefined });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to create workspace');
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E3E1DA]">
          <h2 className="text-base font-bold text-[#111111] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#4F7563]" /> New workspace
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#F1F0EC]" aria-label="Close">
            <X className="w-4 h-4 text-[#9A9A9A]" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing, Sales, Product…"
              className="w-full h-8 px-2 text-sm border border-[#C9C6BD] rounded focus:outline-none focus:ring-2 focus:ring-[#4F7563]/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-[#C9C6BD] rounded focus:outline-none focus:ring-2 focus:ring-[#4F7563]/30 resize-none"
            />
          </div>
          {error && (
            <div className="text-xs text-[#7a2929] bg-[#FCF1F1] border border-[#F7E3E3] rounded p-2">{error}</div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#F1F0EC] rounded">Cancel</button>
            <button
              onClick={submit}
              disabled={!name.trim() || busy}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#4F7563] hover:bg-[#355846] rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
