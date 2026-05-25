'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video, Loader2, Check } from 'lucide-react';
import api from '@/lib/api';

interface MediaUploaderProps {
  type: 'image' | 'video';
  onUploadComplete?: (url: string) => void;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
}

export default function MediaUploader({
  type,
  onUploadComplete,
  maxSizeMB = type === 'image' ? 10 : 100,
  accept = type === 'image' 
    ? 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml'
    : 'video/mp4,video/webm,video/ogg,video/quicktime',
  className = '',
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      setError(`File size exceeds ${maxSizeMB}MB limit`);
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = type === 'image' ? '/upload/image' : '/upload/video';
      
      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      const { url } = response.data;
      setUploadedUrl(url);
      
      if (onUploadComplete) {
        onUploadComplete(url);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setUploadedUrl(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!uploadedUrl && !previewUrl && (
        <div
          onClick={handleBrowseClick}
          className="border-2 border-dashed border-[#C9C6BD] rounded-2xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <div className="flex flex-col items-center space-y-4">
            {type === 'image' ? (
              <ImageIcon className="w-12 h-12 text-[#C9C6BD]" />
            ) : (
              <Video className="w-12 h-12 text-[#C9C6BD]" />
            )}
            <div>
              <p className="text-lg font-semibold text-[#111111]">
                Upload {type === 'image' ? 'an image' : 'a video'}
              </p>
              <p className="text-sm text-[#9A9A9A] mt-1">
                Click to browse or drag and drop
              </p>
              <p className="text-xs text-[#C9C6BD] mt-2">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          </div>
        </div>
      )}

      {previewUrl && !uploadedUrl && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#E3E1DA]">
          {type === 'image' ? (
            <img src={previewUrl} alt="Preview" className="w-full h-64 object-cover" />
          ) : (
            <video src={previewUrl} className="w-full h-64" controls />
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-xl p-6 max-w-xs w-full mx-4">
                <div className="flex items-center space-x-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#4F7563]" />
                  <span className="font-semibold text-[#111111]">Uploading...</span>
                </div>
                <div className="w-full bg-[#E3E1DA] rounded-full h-2">
                  <div
                    className="bg-[#4F7563] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-[#6B6B6B] mt-2 text-center">{uploadProgress}%</p>
              </div>
            </div>
          )}
        </div>
      )}

      {uploadedUrl && previewUrl && (
        <div className="relative rounded-2xl overflow-hidden border-2 border-[#4F7563]">
          {type === 'image' ? (
            <img src={previewUrl} alt="Uploaded" className="w-full h-64 object-cover" />
          ) : (
            <video src={previewUrl} className="w-full h-64" controls />
          )}
          
          <div className="absolute top-4 right-4 flex space-x-2">
            <div className="bg-[#4F7563] text-white rounded-full px-4 py-2 flex items-center space-x-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">Uploaded</span>
            </div>
            <button
              onClick={handleReset}
              className="bg-white rounded-full p-2 shadow-lg hover:bg-[#F1F0EC] transition-colors"
            >
              <X className="w-5 h-5 text-[#111111]" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white text-sm font-medium truncate">{uploadedUrl}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-[#FCF1F1] border border-[#F7E3E3] rounded-xl p-4">
          <p className="text-[#9a3737] text-sm">{error}</p>
          <button
            onClick={handleReset}
            className="text-[#7a2929] text-sm font-semibold mt-2 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
