'use client';

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

interface ImageUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

interface ImageUploaderProps {
  onImageUploaded?: (image: ImageUploadResult) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  showPreview?: boolean;
  className?: string;
}

export default function ImageUploader({
  onImageUploaded,
  maxSizeMB = 10,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  showPreview = true,
  className = '',
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ImageUploadResult | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setError(null);
    setUploadedImage(null);

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setError(`Invalid file type. Accepted: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`);
      return;
    }

    // Show preview
    if (showPreview && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/pdf-studio/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageData = response.data.data as ImageUploadResult;
      setUploadedImage(imageData);

      if (onImageUploaded) {
        onImageUploaded(imageData);
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setUploadedImage(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`image-uploader ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {!preview && !uploadedImage && (
        <button
          onClick={handleClickUpload}
          disabled={uploading}
          className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Click to upload image</span>
              <span className="text-xs text-gray-500">
                Max {maxSizeMB}MB • JPEG, PNG, WebP, GIF
              </span>
            </>
          )}
        </button>
      )}

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <span className="text-sm">Uploading...</span>
              </div>
            </div>
          )}

          {uploadedImage && !uploading && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1.5">
              <CheckCircle className="w-4 h-4" />
            </div>
          )}

          {!uploading && (
            <button
              onClick={handleRemoveImage}
              className="absolute top-2 left-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {uploadedImage && (
        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-600">Upload successful</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {uploadedImage.filename} • {(uploadedImage.size / 1024).toFixed(1)} KB
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
