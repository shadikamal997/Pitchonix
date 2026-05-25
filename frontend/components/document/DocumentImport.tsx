'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiService } from '@/lib/api';
import { parseApiError } from '@/lib/errors';
import { toastError, toastSuccess } from '@/hooks/useToast';
import { ParsedDocument } from '@/types/document';
import { cn } from '@/lib/utils';

interface DocumentImportProps {
  onImportComplete: (data: ParsedDocument) => void;
  onCancel?: () => void;
}

export function DocumentImport({ onImportComplete, onCancel }: DocumentImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!acceptedTypes.includes(selectedFile.type)) {
      toastError('Invalid file type', 'Please upload a PDF or DOCX file');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toastError('File too large', 'Maximum file size is 10MB');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setStatus('uploading');
    setProgress(0);

    try {
      // Upload with progress tracking
      const result = await apiService.uploadDocument<ParsedDocument>(
        file,
        (uploadProgress) => {
          setProgress(uploadProgress);
          if (uploadProgress === 100) {
            setStatus('processing');
          }
        }
      );

      setStatus('success');
      setProgress(100);
      toastSuccess('Document imported!', `Extracted data with ${result.confidence}% confidence`);
      
      // Pass data to parent
      onImportComplete(result);
    } catch (error) {
      setStatus('error');
      const appError = parseApiError(error);
      toastError('Import failed', appError.userMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files?.[0];
    
    if (!droppedFile) return;

    if (!acceptedTypes.includes(droppedFile.type)) {
      toastError('Invalid file type', 'Please upload a PDF or DOCX file');
      return;
    }

    setFile(droppedFile);
    setStatus('idle');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const reset = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Document</CardTitle>
        <CardDescription>
          Upload a PDF or DOCX file to automatically extract business information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'hover:border-primary hover:bg-primary/5',
              'flex flex-col items-center justify-center space-y-3'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop your file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF and DOCX files (max 10MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Info */}
            <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
              <FileText className="w-8 h-8 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {status === 'idle' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={reset}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Status & Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {status === 'uploading' && 'Uploading...'}
                    {status === 'processing' && 'Extracting data...'}
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Status Messages */}
            {status === 'processing' && (
              <div className="flex items-center space-x-2 text-sm text-[#4F7563]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Using AI to extract business information...</span>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center space-x-2 text-sm text-[#4F7563]">
                <CheckCircle className="w-4 h-4" />
                <span>Document processed successfully!</span>
              </div>
            )}

            {status === 'error' && (
              <div className="flex items-center space-x-2 text-sm text-[#9a3737]">
                <AlertCircle className="w-4 h-4" />
                <span>Failed to process document. Please try again.</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2">
              {status === 'idle' && (
                <>
                  <Button onClick={handleUpload} className="flex-1">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Document
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Cancel
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <Button onClick={handleUpload} className="flex-1">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Choose Different File
                  </Button>
                </>
              )}

              {onCancel && status !== 'success' && status !== 'uploading' && status !== 'processing' && (
                <Button variant="ghost" onClick={onCancel}>
                  Skip Import
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
