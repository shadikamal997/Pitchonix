'use client';

import React, { useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  ImageUploader
//
//  Shared widget used by ImagePanel and LogoPanel.
//
//    - Click or drag-and-drop to upload an image
//    - Posts to /pdf-studio/images/upload (multipart "file")
//    - Resolves the returned URL to an absolute URL when the server returns a
//      relative path (matches existing PDF studio behaviour)
//    - Reports the final URL to the parent via `onUploaded`
// =============================================================================

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '');
const resolveUrl = (url: string) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND}${url}`);

interface Props {
  /** Called with the absolute URL after a successful upload. */
  onUploaded: (url: string) => void;
  /** Compact mode = small inline drop zone (default = full panel zone). */
  compact?: boolean;
}

export const ImageUploader: React.FC<Props> = ({ onUploaded, compact }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('File must be an image');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/pdf-studio/images/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = resolveUrl(data?.data?.url || '');
      if (!url) throw new Error('Upload returned no URL');
      onUploaded(url);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed');
      setTimeout(() => setError(''), 4000);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) upload(f);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0]; if (f) upload(f);
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-7 px-2.5 bg-green-50 hover:bg-green-100 text-green-700 text-[11px] font-semibold rounded flex items-center gap-1.5 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        {error && <span className="text-[10px] text-red-600">{error}</span>}
      </>
    );
  }

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-slate-200 rounded p-3 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/40 transition-colors"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
            <p className="text-[11px] text-slate-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-5 h-5 text-slate-400" />
            <p className="text-[11px] font-semibold text-slate-600">Click or drop image</p>
            <p className="text-[10px] text-slate-400">PNG · JPG · WebP · max 10 MB</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {error && <p className="text-[11px] text-red-600 mt-1">{error}</p>}
    </div>
  );
};
