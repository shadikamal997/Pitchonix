'use client';

import { useState } from 'react';
import { FileUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DocumentImport } from './DocumentImport';
import { ExtractedDataReview } from './ExtractedDataReview';
import { ParsedDocument, ExtractedData } from '@/types/document';

interface DocumentImportModalProps {
  onDataApplied: (data: ExtractedData) => void;
  trigger?: React.ReactNode;
}

export function DocumentImportModal({ onDataApplied, trigger }: DocumentImportModalProps) {
  const [open, setOpen] = useState(false);
  const [parsedDocument, setParsedDocument] = useState<ParsedDocument | null>(null);
  const [step, setStep] = useState<'import' | 'review'>('import');

  const handleImportComplete = (document: ParsedDocument) => {
    setParsedDocument(document);
    setStep('review');
  };

  const handleApply = (data: ExtractedData) => {
    onDataApplied(data);
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after animation completes
    setTimeout(() => {
      setParsedDocument(null);
      setStep('import');
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="lg">
            <FileUp className="w-4 h-4 mr-2" />
            Import Document
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'import' ? 'Import Document' : 'Review Extracted Data'}
          </DialogTitle>
          <DialogDescription>
            {step === 'import'
              ? 'Upload a PDF or DOCX file to automatically extract business information'
              : 'Review and edit the extracted information before applying to your wizard'}
          </DialogDescription>
        </DialogHeader>

        {step === 'import' ? (
          <DocumentImport
            onImportComplete={handleImportComplete}
            onCancel={handleClose}
          />
        ) : parsedDocument ? (
          <ExtractedDataReview
            parsedDocument={parsedDocument}
            onApply={handleApply}
            onCancel={handleClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
