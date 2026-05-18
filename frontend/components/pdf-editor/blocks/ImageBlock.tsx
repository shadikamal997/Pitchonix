'use client';

import React from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';

export interface ImageBlockProps {
  src?: string;
  alt?: string;
  caption?: string;
  layout?: 'single' | 'double' | 'triple' | 'grid';
  images?: Array<{ src: string; alt?: string; caption?: string }>;
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'auto';
  onChange?: (data: any) => void;
}

export function ImageBlock({
  src,
  alt = 'Image',
  caption,
  layout = 'single',
  images = [],
  aspectRatio = '16/9',
  onChange,
}: ImageBlockProps) {
  const renderPlaceholder = (index?: number) => (
    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer group">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
        <Upload className="h-8 w-8 text-slate-400 group-hover:text-green-600 transition-colors" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700 group-hover:text-green-700 transition-colors">
          Upload Image{index !== undefined && ` ${index + 1}`}
        </p>
        <p className="text-xs text-slate-500 mt-1">Click to browse or drag and drop</p>
      </div>
    </div>
  );

  const renderSingle = () => (
    <div className="w-full">
      <div
        className={`relative w-full overflow-hidden rounded-2xl shadow-lg`}
        style={{ aspectRatio }}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          renderPlaceholder()
        )}
      </div>
      {caption && (
        <p className="mt-4 text-sm text-center text-slate-600 italic">{caption}</p>
      )}
    </div>
  );

  const renderDouble = () => (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1].map((index) => {
          const image = images[index];
          return (
            <div key={index} className="relative overflow-hidden rounded-2xl shadow-lg" style={{ aspectRatio }}>
              {image?.src ? (
                <img src={image.src} alt={image.alt || `Image ${index + 1}`} className="w-full h-full object-cover" />
              ) : (
                renderPlaceholder(index)
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <p className="mt-4 text-sm text-center text-slate-600 italic">{caption}</p>
      )}
    </div>
  );

  const renderTriple = () => (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((index) => {
          const image = images[index];
          return (
            <div key={index} className="relative overflow-hidden rounded-2xl shadow-lg" style={{ aspectRatio }}>
              {image?.src ? (
                <img src={image.src} alt={image.alt || `Image ${index + 1}`} className="w-full h-full object-cover" />
              ) : (
                renderPlaceholder(index)
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <p className="mt-4 text-sm text-center text-slate-600 italic">{caption}</p>
      )}
    </div>
  );

  const renderGrid = () => (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((index) => {
          const image = images[index];
          return (
            <div key={index} className="relative overflow-hidden rounded-2xl shadow-lg aspect-square">
              {image?.src ? (
                <div>
                  <img src={image.src} alt={image.alt || `Image ${index + 1}`} className="w-full h-full object-cover" />
                  {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-xs text-white font-semibold">{image.caption}</p>
                    </div>
                  )}
                </div>
              ) : (
                renderPlaceholder(index)
              )}
            </div>
          );
        })}
      </div>
      {caption && (
        <p className="mt-4 text-sm text-center text-slate-600 italic">{caption}</p>
      )}
    </div>
  );

  return (
    <div className="w-full py-8">
      {layout === 'single' && renderSingle()}
      {layout === 'double' && renderDouble()}
      {layout === 'triple' && renderTriple()}
      {layout === 'grid' && renderGrid()}
    </div>
  );
}

export default ImageBlock;
