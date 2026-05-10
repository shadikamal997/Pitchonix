'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface UploadedImage {
  id: string;
  url: string;
  filename: string;
}

interface ImageUploadPanelProps {
  onImageSelect: (url: string) => void;
  currentImageUrl?: string;
  label?: string;
}

export function ImageUploadPanel({ onImageSelect, currentImageUrl, label = 'Page Image' }: ImageUploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [recentImages, setRecentImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState('');
  const [loadedRecent, setLoadedRecent] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '');

  const resolveUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${backendBase}${url}`;
  };

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
      setRecentImages(prev => [img, ...prev.slice(0, 11)]);
      onImageSelect(resolveUrl(img.url));
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
    if (loadedRecent) { setShowGallery(true); return; }
    try {
      const { data } = await api.get('/pdf-studio/images/user/me');
      setRecentImages(data.data || []);
      setLoadedRecent(true);
      setShowGallery(true);
    } catch {
      setShowGallery(true);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>

      {/* Current image preview */}
      {currentImageUrl && (
        <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50" style={{ height: 100 }}>
          <img src={currentImageUrl} alt="page" className="w-full h-full object-cover" />
          <button
            onClick={() => onImageSelect('')}
            className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/50 rounded px-1.5 py-0.5">
            <Check className="w-2.5 h-2.5 text-green-400" />
            <span className="text-[9px] text-white font-medium">Image set</span>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-xs text-gray-500">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-gray-400" />
            <p className="text-xs text-gray-500 font-medium">Click or drag image</p>
            <p className="text-[10px] text-gray-400">PNG, JPG, WebP · max 10MB</p>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Recent images gallery toggle */}
      <button
        onClick={loadRecentImages}
        className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
      >
        <ImageIcon className="w-3.5 h-3.5" />
        {showGallery ? 'Hide gallery' : 'My uploaded images'}
      </button>

      {showGallery && (
        <div className="grid grid-cols-3 gap-1.5">
          {recentImages.length === 0 ? (
            <p className="col-span-3 text-[10px] text-gray-400 text-center py-3">No images yet. Upload one above.</p>
          ) : recentImages.map(img => (
            <button
              key={img.id}
              onClick={() => onImageSelect(resolveUrl(img.url))}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                currentImageUrl === resolveUrl(img.url)
                  ? 'border-blue-500'
                  : 'border-transparent hover:border-blue-300'
              }`}
              style={{ aspectRatio: '4/3' }}
            >
              <img src={resolveUrl(img.url)} alt={img.filename} className="w-full h-full object-cover" />
              {currentImageUrl === resolveUrl(img.url) && (
                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-blue-700" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
