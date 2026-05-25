'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api';

interface UnsplashImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  description: string;
  photographer: string;
  photographerUrl: string;
  downloadUrl: string;
}

interface UnsplashImagePickerProps {
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}

export function UnsplashImagePicker({ onSelect, onClose }: UnsplashImagePickerProps) {
  const [query, setQuery] = useState('business');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await api.get('/unsplash/status');
      setEnabled(response.data.enabled);
      if (response.data.enabled) {
        searchImages('business');
      }
    } catch (error) {
      console.error('Failed to check Unsplash status:', error);
    }
  };

  const searchImages = async (searchQuery: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/unsplash/search?query=${encodeURIComponent(searchQuery)}&perPage=20`);
      setImages(response.data.images || []);
    } catch (error) {
      console.error('Failed to search images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchImages(query);
    }
  };

  const handleImageSelect = async (image: UnsplashImage) => {
    try {
      // Trigger download tracking (Unsplash requirement)
      await api.post('/unsplash/download', { downloadUrl: image.downloadUrl });
      onSelect(image.url);
      onClose();
    } catch (error) {
      console.error('Failed to trigger download:', error);
      onSelect(image.url);
      onClose();
    }
  };

  if (!enabled) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <h3 className="text-lg font-semibold mb-4">Unsplash Integration Not Configured</h3>
          <p className="text-[#6B6B6B] mb-4">
            Stock image search requires an Unsplash API key. Please configure it in your environment variables.
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#4F7563]" />
            <h2 className="text-xl font-semibold">Stock Images</h2>
            <span className="text-sm text-[#9A9A9A]">by Unsplash</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C9C6BD]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for images (e.g., business, office, technology)"
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && images.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-[#4F7563] border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-[#6B6B6B]">Loading images...</p>
              </div>
            </div>
          ) : images.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-[#6B6B6B]">No images found. Try a different search term.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleImageSelect(image)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-[#F1F0EC] hover:ring-2 hover:ring-[#4F7563]/40 transition-all"
                >
                  <img
                    src={image.thumbnailUrl}
                    alt={image.description || 'Stock image'}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-xs truncate">
                        By {image.photographer}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-[#EDEBE6]">
          <p className="text-xs text-[#6B6B6B] text-center">
            Photos provided by{' '}
            <a
              href="https://unsplash.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4F7563] hover:underline"
            >
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
