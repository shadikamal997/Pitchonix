'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Sparkles, Loader2, Wand2, FileEdit, FileCheck, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ContentAnalysisPreview } from '@/components/pdf-studio/ContentAnalysisPreview';
import { IssuesDisplay } from '@/components/pdf-studio/IssuesDisplay';
import { EnhancementPreview } from '@/components/pdf-studio/EnhancementPreview';

type Step = 'input' | 'review' | 'enhanced';

export default function SmartBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [rawContent, setRawContent] = useState('');
  const [title, setTitle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [enhancement, setEnhancement] = useState<any>(null);
  const [error, setError] = useState('');

  const [config, setConfig] = useState({
    tone: 'formal',
    designStyle: 'modern',
  });

  const handleAnalyze = async () => {
    if (!rawContent.trim()) {
      setError('Please enter some content to analyze');
      return;
    }

    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    
    try {
      const response = await api.post('/pdf-studio/smart-builder/analyze', {
        rawContent,
      });
      
      setAnalysis(response.data.data);
      setStep('review');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze content');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyEnhancements = async () => {
    setEnhancing(true);
    setError('');

    try {
      const response = await api.post('/pdf-studio/smart-builder/enhance-content', {
        rawContent,
        fixAll: true,
        options: {
          tone: config.tone,
        },
      });

      setEnhancement(response.data.data);
      setStep('enhanced');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enhance content');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGeneratePDF = async (useEnhanced: boolean = false) => {
    setGenerating(true);
    setError('');

    try {
      const contentToUse = useEnhanced && enhancement 
        ? enhancement.enhancedContent 
        : rawContent;

      const response = await api.post('/pdf-studio/smart-builder/generate', {
        rawContent: contentToUse,
        config: {
          ...config,
          title: title || analysis?.suggestedTitle || 'Untitled Document',
          improveWriting: false,
          fixGrammar: false,
          addStructure: true,
          generateIntro: true,
          generateConclusion: !enhancement,
          includeTableOfContents: true,
          includeCoverPage: true,
        },
      });

      const { document } = response.data.data;
      router.push(`/pdf-studio/editor/${document.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setAnalysis(null);
    setEnhancement(null);
    setError('');
  };

  const charCount = rawContent.length;
  const wordCount = rawContent.trim().split(/\s+/).filter(w => w).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/pdf-studio" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  Smart PDF Builder
                </h1>
                <p className="text-sm text-gray-600">Analyze → Review → Enhance → Generate</p>
              </div>
            </div>
            
            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-4">
              <div className={`flex items-center gap-2 ${step === 'input' ? 'text-blue-600' : step === 'review' || step === 'enhanced' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'input' ? 'border-blue-600 bg-blue-50' : step === 'review' || step === 'enhanced' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                  {step === 'review' || step === 'enhanced' ? '✓' : '1'}
                </div>
                <span className="text-sm font-medium">Input</span>
              </div>
              <div className="w-8 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center gap-2 ${step === 'review' || step === 'enhanced' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step === 'review' || step === 'enhanced' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                  {step === 'enhanced' ? '✓' : '2'}
                </div>
                <span className="text-sm font-medium">Review</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Paste Your Content</h2>
              <p className="text-gray-600 mb-6">
                Paste any content - business notes, school notes, articles, or mixed content. We'll transform it into a professional PDF.
              </p>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Your Content</label>
                  <div className="text-sm text-gray-500">{wordCount} words · {charCount} characters</div>
                </div>
                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="Example:

Pitchonix - AI-powered document creation
We help professionals create pitch decks, proposals, and business documents 10x faster using AI. 

Problem: Creating professional documents takes hours of work and design skills.

Solution: Our platform analyzes your content, suggests structure, and generates beautiful PDFs automatically.

Key Features:
- Smart content analysis
- Automatic structure generation
- Professional templates
- Export to PDF/PowerPoint"
                  className="w-full h-96 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!rawContent.trim() || analyzing}
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Analyzing Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Analyze Content
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW */}
        {step === 'review' && analysis && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Content Analysis Results</h2>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            </div>

            {/* Analysis Cards */}
            <ContentAnalysisPreview analysis={analysis} />

            {/* Issues */}
            {analysis.issues && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <IssuesDisplay issues={analysis.issues} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What would you like to do?</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={handleApplyEnhancements}
                  disabled={enhancing}
                  className="p-6 border-2 border-blue-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wand2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 mb-1">Apply Enhancements</h4>
                    <p className="text-sm text-gray-600">Fix all issues automatically</p>
                  </div>
                  {enhancing && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                </button>

                <button
                  onClick={() => alert('Manual editing coming soon!')}
                  className="p-6 border-2 border-gray-300 rounded-xl hover:border-gray-500 hover:bg-gray-50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileEdit className="w-8 h-8 text-gray-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 mb-1">Edit Manually</h4>
                    <p className="text-sm text-gray-600">Make changes yourself</p>
                  </div>
                </button>

                <button
                  onClick={() => handleGeneratePDF(false)}
                  disabled={generating}
                  className="p-6 border-2 border-purple-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileCheck className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 mb-1">Generate Without Fixes</h4>
                    <p className="text-sm text-gray-600">Use current content as-is</p>
                  </div>
                  {generating && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ENHANCED */}
        {step === 'enhanced' && enhancement && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Enhanced Content Preview</h2>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            </div>

            {/* Enhancement Preview */}
            <EnhancementPreview
              originalContent={rawContent}
              enhancedContent={enhancement.enhancedContent}
              sections={enhancement.sections}
              fixedIssues={enhancement.fixedIssues}
              improvement={enhancement.improvement}
            />

            {/* Generate Button */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Ready to Generate Your PDF?</h3>
              <p className="text-gray-600 mb-6">
                Your content has been enhanced and structured. Click below to create your professional PDF.
              </p>
              <button
                onClick={() => handleGeneratePDF(true)}
                disabled={generating}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg mx-auto"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-6 h-6" />
                    Confirm & Generate PDF
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
