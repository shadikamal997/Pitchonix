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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" /> New workspace
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marketing, Sales, Product…"
              className="w-full h-8 px-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          {error && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded">Cancel</button>
            <button
              onClick={submit}
              disabled={!name.trim() || busy}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
