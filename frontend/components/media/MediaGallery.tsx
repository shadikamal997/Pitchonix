'use client';

import { useState } from 'react';
import { Image as ImageIcon, Video, Trash2, Download } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  name: string;
  size: string;
  uploadedAt: string;
}

interface MediaGalleryProps {
  items: MediaItem[];
  onSelect?: (item: MediaItem) => void;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  className?: string;
}

export default function MediaGallery({
  items,
  onSelect,
  onDelete,
  selectable = false,
  className = '',
}: MediaGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (item: MediaItem) => {
    if (!selectable) return;
    setSelectedId(item.id);
    if (onSelect) {
      onSelect(item);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(id);
    }
  };

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No media files uploaded yet</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => handleSelect(item)}
          className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
            selectable ? 'cursor-pointer hover:border-blue-500' : ''
          } ${
            selectedId === item.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
          }`}
        >
          {/* Media Preview */}
          <div className="aspect-square bg-gray-100">
            {item.type === 'image' ? (
              <img
                src={item.url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={item.url}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Type Badge */}
          <div className="absolute top-2 left-2">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center space-x-1">
              {item.type === 'image' ? (
                <ImageIcon className="w-3 h-3 text-white" />
              ) : (
                <Video className="w-3 h-3 text-white" />
              )}
              <span className="text-xs text-white font-medium uppercase">
                {item.type}
              </span>
            </div>
          </div>

          {/* Hover Actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <a
              href={item.url}
              download
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg p-2 hover:bg-gray-100 transition-colors"
            >
              <Download className="w-4 h-4 text-gray-700" />
            </a>
            {onDelete && (
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="bg-white rounded-lg p-2 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>

          {/* Info Footer */}
          <div className="p-2 bg-white">
            <p className="text-xs font-medium text-gray-900 truncate">
              {item.name}
            </p>
            <p className="text-xs text-gray-500">{item.size}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
