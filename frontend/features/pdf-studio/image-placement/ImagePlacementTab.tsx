'use client';

import React, { useRef, useState, useCallback } from 'react';
import {
  Upload, X, Image as ImageIcon, Loader2, AlignCenter, AlignLeft, AlignRight,
  Maximize2, MinusSquare, LayoutGrid, ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { PlacedImage } from './types';

interface UploadedImage {
  id: string;
  url: string;
  filename: string;
}

interface Props {
  // Upload & gallery
  onAddImage: (url: string) => void;           // add new image to page at default position
  // Placed-image inspector (when an image is selected on canvas)
  selectedImage: PlacedImage | null;
  onUpdateSelected: (updates: Partial<PlacedImage>) => void;
  onDeleteSelected: () => void;
  onDeselect: () => void;
  // Legacy hero image (kept for back-compat)
  heroImageUrl?: string;
  onSetHeroImage?: (url: string) => void;
}

const BACKEND = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
const resolveUrl = (url: string) => (!url ? '' : url.startsWith('http') ? url : `${BACKEND}${url}`);

export function ImagePlacementTab({
  onAddImage, selectedImage, onUpdateSelected, onDeleteSelected, onDeselect,
  heroImageUrl, onSetHeroImage,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [recentImages, setRecentImages] = useState<UploadedImage[]>([]);
  const [loadedRecent, setLoadedRecent] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/pdf-studio/images/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const img: UploadedImage = data.data;
      const url = resolveUrl(img.url);
      setRecentImages(prev => [img, ...prev.slice(0, 11)]);
      onAddImage(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) uploadFile(file);
  }, []);

  const loadRecentImages = async () => {
    if (loadedRecent) { setShowGallery(v => !v); return; }
    try {
      const { data } = await api.get('/pdf-studio/images/user/me');
      setRecentImages(data.data || []);
      setLoadedRecent(true);
      setShowGallery(true);
    } catch { setShowGallery(true); }
  };

  const fmt = (n: number) => Math.round(n * 10) / 10;

  // ── Inspector pane (when an image is selected on canvas) ──────────────────
  if (selectedImage) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#111111]">Selected Image</span>
          <button onClick={onDeselect} className="text-[10px] text-[#C9C6BD] hover:text-[#111111] font-medium">
            Deselect
          </button>
        </div>

        {/* Thumbnail */}
        <div className="relative rounded-lg overflow-hidden border border-[#E3E1DA] bg-[#EDEBE6]" style={{ height: 72 }}>
          <img src={selectedImage.url} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Position & Size */}
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">Position &amp; Size</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'X %', key: 'x', min: 0, max: 95 },
              { label: 'Y %', key: 'y', min: 0, max: 95 },
              { label: 'W %', key: 'width', min: 5, max: 100 },
              { label: 'H %', key: 'height', min: 5, max: 100 },
            ].map(({ label, key, min, max }) => (
              <label key={key} className="block">
                <span className="text-[9px] font-semibold text-[#9A9A9A] uppercase">{label}</span>
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={0.5}
                  value={fmt((selectedImage as any)[key])}
                  onChange={e => onUpdateSelected({ [key]: Number(e.target.value) })}
                  className="mt-0.5 w-full rounded border border-[#E3E1DA] px-2 py-1 text-xs text-[#111111] outline-none focus:border-[#A8B9AE]"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Alignment shortcuts */}
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">Align Horizontally</p>
          <div className="flex gap-1">
            {[
              { label: 'Left', icon: AlignLeft, x: 0 },
              { label: 'Center', icon: AlignCenter, x: (100 - selectedImage.width) / 2 },
              { label: 'Right', icon: AlignRight, x: 100 - selectedImage.width },
            ].map(({ label, icon: Icon, x }) => (
              <button
                key={label}
                title={label}
                onClick={() => onUpdateSelected({ x: Math.max(0, x) })}
                className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-[#E3E1DA] py-1.5 text-[10px] font-semibold text-[#6B6B6B] hover:bg-[#EDEBE6] hover:border-[#C9C6BD] transition-colors"
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mt-2 mb-1.5">Align Vertically</p>
          <div className="flex gap-1">
            {[
              { label: 'Top', y: 0 },
              { label: 'Middle', y: (100 - selectedImage.height) / 2 },
              { label: 'Bottom', y: 100 - selectedImage.height },
            ].map(({ label, y }) => (
              <button
                key={label}
                title={`Align ${label.toLowerCase()}`}
                onClick={() => onUpdateSelected({ y: Math.max(0, y) })}
                className="flex-1 flex items-center justify-center rounded-lg border border-[#E3E1DA] py-1.5 text-[10px] font-semibold text-[#6B6B6B] hover:bg-[#EDEBE6] hover:border-[#C9C6BD] transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Size presets */}
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">Size Presets</p>
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: 'Full', w: 100, h: 45, x: 0 },
              { label: '¾ Wide', w: 75, h: 40, x: 12.5 },
              { label: 'Half', w: 50, h: 35, x: 25 },
              { label: 'Banner', w: 100, h: 20, x: 0 },
              { label: 'Square', w: 40, h: 40, x: 30 },
              { label: 'Small', w: 30, h: 25, x: 35 },
            ].map(preset => (
              <button
                key={preset.label}
                onClick={() => onUpdateSelected({ width: preset.w, height: preset.h, x: preset.x })}
                className="rounded border border-[#E3E1DA] py-1 text-[10px] font-semibold text-[#6B6B6B] hover:bg-[#EDEBE6] hover:border-[#C9C6BD] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Object fit */}
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">Object Fit</p>
          <div className="flex gap-1">
            {(['cover', 'contain', 'fill'] as const).map(fit => (
              <button
                key={fit}
                onClick={() => onUpdateSelected({ fit })}
                className={`flex-1 rounded-lg border py-1.5 text-[10px] font-semibold capitalize transition-colors ${
                  (selectedImage.fit || 'cover') === fit
                    ? 'border-[#4F7563] bg-[#EEF5F1] text-[#355846]'
                    : 'border-[#E3E1DA] text-[#6B6B6B] hover:bg-[#EDEBE6]'
                }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">
            <span>Opacity</span>
            <span>{Math.round((selectedImage.opacity ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
            value={selectedImage.opacity ?? 1}
            onChange={e => onUpdateSelected({ opacity: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Layer */}
        <div>
          <p className="text-[10px] font-bold text-[#9A9A9A] uppercase tracking-wider mb-1.5">Layer (Z-Index)</p>
          <div className="flex gap-1">
            {[
              { label: 'Background', z: 1 },
              { label: 'Normal', z: 5 },
              { label: 'Foreground', z: 15 },
            ].map(({ label, z }) => (
              <button
                key={label}
                onClick={() => onUpdateSelected({ zIndex: z })}
                className={`flex-1 rounded-lg border py-1.5 text-[10px] font-semibold transition-colors ${
                  (selectedImage.zIndex ?? 2) === z
                    ? 'border-[#4F7563] bg-[#EEF5F1] text-[#355846]'
                    : 'border-[#E3E1DA] text-[#6B6B6B] hover:bg-[#EDEBE6]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={onDeleteSelected}
          className="w-full rounded-lg border border-[#F7E3E3] bg-[#FCF1F1] py-2 text-xs font-semibold text-[#9a3737] hover:bg-[#F7E3E3] transition-colors flex items-center justify-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" />
          Remove Image
        </button>
      </div>
    );
  }

  // ── Upload + Gallery pane (default) ───────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-[#111111]">Images on this page</p>
        <span className="text-[10px] text-[#C9C6BD]">Drag on canvas to move</span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-[#E3E1DA] rounded-xl p-5 text-center cursor-pointer hover:border-[#A8B9AE] hover:bg-[#EEF5F1]/40 transition-all"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-[#4F7563] animate-spin" />
            <p className="text-xs text-[#9A9A9A]">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-7 h-7 text-[#C9C6BD]" />
            <p className="text-xs font-semibold text-[#6B6B6B]">Upload image to page</p>
            <p className="text-[10px] text-[#C9C6BD]">PNG · JPG · WebP · max 10 MB</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      {error && <p className="text-xs text-[#D96A6A]">{error}</p>}

      {/* Gallery toggle */}
      <button
        onClick={loadRecentImages}
        className="flex w-full items-center justify-between text-xs text-[#4F7563] hover:text-[#263F34] font-semibold"
      >
        <span className="flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />
          My uploaded images
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showGallery ? 'rotate-180' : ''}`} />
      </button>

      {showGallery && (
        <div className="grid grid-cols-3 gap-1.5">
          {recentImages.length === 0 ? (
            <p className="col-span-3 text-[10px] text-[#C9C6BD] text-center py-3">No images yet.</p>
          ) : (
            recentImages.map(img => (
              <button
                key={img.id}
                onClick={() => onAddImage(resolveUrl(img.url))}
                className="relative overflow-hidden rounded-lg border-2 border-transparent hover:border-[#A8B9AE] transition-all group"
                style={{ aspectRatio: '4/3' }}
                title="Click to add to page"
              >
                <img src={resolveUrl(img.url)} alt={img.filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#4F7563]/0 group-hover:bg-[#4F7563]/20 flex items-center justify-center transition-all">
                  <span className="opacity-0 group-hover:opacity-100 text-[9px] font-bold text-white bg-[#4F7563] rounded px-1.5 py-0.5 transition-opacity">
                    Add
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="rounded-lg border border-[#F1F0EC] bg-[#EDEBE6] px-3 py-2 text-[10px] text-[#9A9A9A]">
        Select any placed image to edit exact X/Y, width, height, fit, opacity, and layer.
      </div>
    </div>
  );
}
