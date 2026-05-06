'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PDFEditor from '@/components/pdf-editor/PDFEditor';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfDocument {
  id: string;
  name: string;
  documentType: string;
  content: any;
  project: {
    id: string;
    name: string;
  };
}

interface PDFPage {
  id: string;
  type: string;
  content: any;
  thumbnail?: string;
}

export default function PdfEditorPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [pages, setPages] = useState<PDFPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocument();
  }, [params.id]);

  const fetchDocument = async () => {
    try {
      // Fetch project data
      const response = await api.get(`/projects/${params.id}`);
      const project = response.data;
      setPdfDocument(project);
      
      // Initialize pages from project content or create a default page
      if (project.content && Array.isArray(project.content.pages)) {
        setPages(project.content.pages);
      } else {
        // Create a default first page
        setPages([{
          id: '1',
          type: 'cover',
          content: {
            title: project.name || 'Untitled Document',
            subtitle: project.description || '',
          }
        }]);
      }
    } catch (error) {
      console.error('Failed to fetch document:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.patch(`/projects/${params.id}`, {
        content: { pages },
      });
      alert('Document saved successfully!');
    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.post(`/pdf-documents/${params.id}/export`, {}, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${pdfDocument?.name || 'document'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export document:', error);
      alert('Export failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (!pdfDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Document not found</h2>
        <Button onClick={() => router.push('/pdf-studio')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to PDF Studio
        </Button>
      </div>
    );
  }

  return (
    <PDFEditor
      projectId={pdfDocument.id}
      pages={pages}
      onSave={handleSave}
      onExport={handleExport}
    />
  );
}
