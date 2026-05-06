'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Download, Save, Loader2, CheckCircle, Sparkles, ZapIcon } from 'lucide-react';
import Link from 'next/link';
import ExportDropdown from '@/components/pdf-studio/ExportDropdown';

export default function PdfEditorPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [document, setDocument] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [documentId]);

  const fetchDocument = async () => {
    try {
      const response = await api.get(`/pdf-studio/smart-builder/documents/${documentId}`);
      const { document, analysis, config } = response.data.data;
      
      setDocument(document);
      setPages(document.pages || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load document');
      setLoading(false);
    }
  };

  const handlePageContentChange = (pageId: string, newContent: string) => {
    setPages(pages.map(page => 
      page.id === pageId 
        ? { ...page, content: { ...page.content, text: newContent } }
        : page
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      // Save each page
      for (const page of pages) {
        await api.patch(`/pdf-pages/${page.id}`, {
          content: page.content,
        });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleEnhance = async (type: string) => {
    const currentPage = pages[currentPageIndex];
    if (!currentPage) return;
    
    try {
      const response = await api.post(`/pdf-studio/smart-builder/enhance`, {
        documentId: document.id,
        enhancementType: type,
        targetId: currentPage.id,
      });
      
      const { enhancedContent } = response.data.data;
      handlePageContentChange(currentPage.id, enhancedContent);
    } catch (err: any) {
      setError('Enhancement failed');
    }
  };

  const handleExport = async (format: string = 'pdf') => {
    if (!document) return;
    
    try {
      setSaving(true);
      
      // Call export endpoint with selected format
      const response = await api.post(`/pdf-studio/export/${document.id}`, {
        format: format,
        templateType: document.templateType || 'clean_business_report',
      }, {
        responseType: 'blob', // Important for file downloads
      });
      
      // Create download link
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      
      // Set filename based on format
      const extension = format === 'pdf' ? 'pdf' : format === 'docx' ? 'docx' : 'pptx';
      link.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
      
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Export failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/pdf-studio" className="text-blue-600 hover:underline">
            Back to PDF Studio
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/pdf-studio" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{document?.title || 'Untitled Document'}</h1>
                <p className="text-sm text-gray-600">{pages.length} pages</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Saved</span>
                </div>
              )}
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save
                  </>
                )}
              </button>
              
              <ExportDropdown 
                onExport={handleExport} 
                loading={saving}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Page Thumbnails - Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Pages</h3>
              <div className="space-y-2">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentPageIndex === index
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {page.title || `Page ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{page.pageType}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Editor - Center */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-8">
              {currentPage && (
                <>
                  {/* Page Title */}
                  <div className="mb-6">
                    <input
                      type="text"
                      value={currentPage.title || ''}
                      onChange={(e) => {
                        const newPages = [...pages];
                        newPages[currentPageIndex] = {
                          ...currentPage,
                          title: e.target.value,
                        };
                        setPages(newPages);
                      }}
                      placeholder="Page title..."
                      className="w-full text-2xl font-bold text-gray-900 border-0 border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-2"
                    />
                    <div className="mt-2 text-sm text-gray-500 capitalize">
                      Type: {currentPage.pageType}
                    </div>
                  </div>

                  {/* Page Content */}
                  <div>
                    <textarea
                      value={currentPage.content?.text || ''}
                      onChange={(e) => handlePageContentChange(currentPage.id, e.target.value)}
                      placeholder="Enter page content..."
                      className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>

                  {/* Page Navigation */}
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                      disabled={currentPageIndex === 0}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPageIndex + 1} of {pages.length}
                    </span>
                    <button
                      onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))}
                      disabled={currentPageIndex === pages.length - 1}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Enhancement Controls - Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Enhance This Page</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleEnhance('improve_writing')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Improve Writing
                </button>
                
                <button
                  onClick={() => handleEnhance('fix_grammar')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  <CheckCircle className="w-4 h-4" />
                  Fix Grammar
                </button>
                
                <button
                  onClick={() => handleEnhance('restructure')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm font-medium"
                >
                  <ZapIcon className="w-4 h-4" />
                  Add Structure
                </button>
                
                <button
                  onClick={() => handleEnhance('expand')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                >
                  <ZapIcon className="w-4 h-4" />
                  Expand Content
                </button>
                
                <button
                  onClick={() => handleEnhance('shorten')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
                >
                  <ZapIcon className="w-4 h-4" />
                  Shorten Content
                </button>
                
                <button
                  onClick={() => handleEnhance('professionalize')}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100 transition-colors text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" />
                  Make Professional
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Page Info</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>Order: {currentPage?.order}</div>
                  <div>Type: {currentPage?.pageType}</div>
                  <div>Words: {currentPage?.content?.text?.split(/\s+/).filter((w: string) => w).length || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
