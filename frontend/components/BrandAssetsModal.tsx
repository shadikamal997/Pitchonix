'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, ImageIcon, Loader2, Check, Trash2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

// =============================================================================
//  BrandAssetsModal
//
//  Lets the user upload a logo + up to N photos for an existing project. Each
//  file is uploaded to /pdf-studio/images/upload, then the resulting URL set
//  is POSTed to /generate/apply-brand-assets/:projectId which materializes
//  them onto the deck (cover hero, team photos, supporting visuals, brand
//  marks).
// =============================================================================

interface Props {
  projectId: string;
  open:      boolean;
  onClose:   () => void;
  onApplied?: (result: { photos: number; logos: number }) => void;
}

interface UploadedImage { url: string; name?: string }

export const BrandAssetsModal: React.FC<Props> = ({ projectId, open, onClose, onApplied }) => {
  const [logo, setLogo] = useState<UploadedImage | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ photos: number; logos: number } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
  const resolve = (u: string) => u.startsWith('http') ? u : `${apiBase}${u.startsWith('/') ? '' : '/'}${u}`;

  const uploadOne = async (file: File): Promise<UploadedImage | null> => {
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return null; }
    if (file.size > 10 * 1024 * 1024)     { setError(`${file.name} is over 10 MB`); return null; }
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await api.post('/pdf-studio/images/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const raw = data?.data?.url || data?.url || '';
      if (!raw) throw new Error('Upload returned no URL');
      return { url: resolve(raw), name: file.name };
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Upload failed');
      return null;
    }
  };

  const onLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setError(null);
    const up = await uploadOne(f);
    if (up) setLogo(up);
    setUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const onImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true); setError(null);
    const ups: UploadedImage[] = [];
    for (const f of files) {
      const u = await uploadOne(f);
      if (u) ups.push(u);
    }
    setImages((prev) => [...prev, ...ups]);
    setUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleApply = async () => {
    if (!logo && images.length === 0) { setError('Add a logo or at least one photo first'); return; }
    setApplying(true); setError(null);
    try {
      const { data } = await api.post(`/generate/apply-brand-assets/${projectId}`, {
        logoUrl: logo?.url || null,
        imageUrls: images.map((i) => i.url),
      });
      setDone({ photos: data?.photos ?? 0, logos: data?.logos ?? 0 });
      onApplied?.(data);
      setTimeout(() => { onClose(); }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <header className="h-12 border-b border-slate-200 px-4 flex items-center gap-3 flex-shrink-0">
          <ImageIcon className="w-4 h-4 text-green-600" />
          <h2 className="text-sm font-bold text-slate-900">Upload brand assets</h2>
          <button onClick={onClose} className="ml-auto p-1 rounded text-slate-500 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Upload your logo and any photos you want on the slides — they'll be applied automatically to the cover (hero photo), team members, and supporting slots like Problem / Solution / Market / Traction.
          </p>

          {/* Logo */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Logo</h3>
            {logo ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <img src={logo.url} alt="logo preview" className="w-16 h-16 object-contain bg-white border border-slate-200 rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800 truncate">{logo.name || 'logo.png'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{logo.url}</div>
                </div>
                <button onClick={() => setLogo(null)} className="p-1.5 rounded text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-600 hover:text-green-700 transition-colors">
                <Upload className="w-4 h-4" />
                Click or drop your logo here
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoSelect} />
              </label>
            )}
          </section>

          {/* Photos */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Photos ({images.length})</h3>
            <p className="text-[10px] text-slate-500 mb-2 leading-snug">
              First photo → cover hero · next photos → team members · remaining → Problem / Solution / Market / Traction visuals.
            </p>
            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt={img.name} className="w-full h-20 object-cover rounded border border-slate-200" />
                    <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute top-1 right-1 p-1 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-semibold text-center rounded-b">
                      {i === 0 ? 'Cover hero' : i <= 3 ? `Team ${i}` : `Visual ${i - 3}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 h-16 border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 rounded-lg cursor-pointer text-xs font-semibold text-slate-600 hover:text-green-700 transition-colors">
              <Upload className="w-4 h-4" />
              Add photos (multiple OK)
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onImagesSelect} />
            </label>
          </section>

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-green-700"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</div>
          )}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-red-700">{error}</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-semibold">
              <Check className="w-3.5 h-3.5 text-green-600" />
              Applied {done.photos} photo{done.photos === 1 ? '' : 's'} + {done.logos} brand mark{done.logos === 1 ? '' : 's'} to your deck.
            </div>
          )}
        </div>

        <footer className="h-14 border-t border-slate-200 px-4 flex items-center gap-3 flex-shrink-0 bg-slate-50">
          <button onClick={onClose} className="ml-auto px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded">Cancel</button>
          <button
            onClick={handleApply}
            disabled={applying || uploading || (!logo && images.length === 0)}
            className="px-4 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded shadow-md shadow-green-500/30 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {applying ? 'Applying…' : 'Apply to deck'}
          </button>
        </footer>
      </div>
    </div>
  );
};
