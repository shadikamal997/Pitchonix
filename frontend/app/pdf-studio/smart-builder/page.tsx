'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Sparkles, Loader2, Wand2, FileEdit, FileCheck, AlertCircle, RefreshCw, FileText } from 'lucide-react';
import Link from 'next/link';
import { ContentAnalysisPreview } from '@/components/pdf-studio/ContentAnalysisPreview';
import { IssuesDisplay } from '@/components/pdf-studio/IssuesDisplay';
import { EnhancementPreview } from '@/components/pdf-studio/EnhancementPreview';
import TemplateSelector from '@/components/pdf-studio/TemplateSelector';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeToggle } from '@/components/ThemeToggle';
import { RichTextEditor } from '@/components/RichTextEditor';
import { A4Preview } from '@/components/A4Preview';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '@/components/Animations';

type Step = 'input' | 'review' | 'template' | 'enhanced';

export default function SmartBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('input');
  const [rawContent, setRawContent] = useState('');
  const [title, setTitle] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [enhancement, setEnhancement] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('clean_business_report');
  const [autoSuggestedTemplate, setAutoSuggestedTemplate] = useState<string>('');
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
      
      const backendData = response.data.data;
      
      // Map backend response to component format
      const mappedAnalysis = {
        detectedType: backendData.documentType || 'General Document',
        confidence: backendData.confidence || 0,
        wordCount: backendData.metrics?.words || 0,
        characterCount: backendData.metrics?.characters || 0,
        paragraphCount: backendData.metrics?.paragraphs || 0,
        sectionCount: backendData.metrics?.sections || 0,
        readabilityScore: backendData.metrics?.readability || 0,
        clarityScore: backendData.metrics?.clarity || 0,
        keywords: backendData.keywords || [],
        topics: backendData.topics || [],
        categories: backendData.categories || [],
        hasTitle: backendData.features?.hasTitle !== false,
        hasHeadings: backendData.features?.hasHeadings !== false,
        hasBullets: backendData.features?.hasBullets !== false,
        hasNumbers: backendData.features?.hasNumbers !== false,
        grammarIssues: backendData.grammarIssues || 0,
        spellingIssues: backendData.spellingIssues || 0,
        suggestedTitle: backendData.suggestedTitle,
        suggestedSections: backendData.suggestedStructure || [],
        issues: backendData.issues || [],
      };
      
      setAnalysis(mappedAnalysis);
      setStep('review');
      
      // Auto-suggest template based on detected type
      const suggestedTemplate = getTemplateFromType(mappedAnalysis.detectedType);
      setAutoSuggestedTemplate(suggestedTemplate);
      setSelectedTemplate(suggestedTemplate);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze content');
    } finally {
      setAnalyzing(false);
    }
  };

  // Map detected content type to best template
  const getTemplateFromType = (detectedType: string): string => {
    const typeMap: Record<string, string> = {
      'Startup Pitch': 'modern_one_pager',
      'Business Plan': 'business_plan_pro',
      'Proposal': 'client_proposal_pro',
      'Financial Report': 'financial_report',
      'Product Documentation': 'product_requirements',
      'Marketing Plan': 'strategy_document',
      'Sales Proposal': 'sales_proposal_advanced',
      'Technical Documentation': 'technical_documentation',
      'Brand Guidelines': 'brand_guidelines',
      'Performance Report': 'kpi_dashboard_report',
      'Budget Plan': 'budget_plan_report',
      'Strategy Document': 'strategy_document',
      'Partnership Proposal': 'partnership_proposal',
      'Business Overview': 'corporate_overview',
      'Report': 'clean_business_report',
      'Notes Document': 'clean_business_report',
      'General Document': 'clean_business_report',
    };
    return typeMap[detectedType] || 'clean_business_report';
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
          templateType: selectedTemplate,
          improveWriting: false,
          fixGrammar: false,
          addStructure: true,
          generateIntro: true,
          generateConclusion: !enhancement,
          includeTableOfContents: true,
          includeCoverPage: true,
        },
      });

      const data = response.data.data;
      
      // Check if authentication is required
      if (data.requiresAuth) {
        // Store the current state in sessionStorage
        sessionStorage.setItem('pendingGeneration', JSON.stringify({
          rawContent: contentToUse,
          config: {
            ...config,
            title: title || analysis?.suggestedTitle || 'Untitled Document',
            templateType: selectedTemplate,
          },
        }));
        
        // Redirect to login with return URL
        router.push('/login?redirect=/pdf-studio/smart-builder&message=Please sign in to save your document');
        return;
      }

      const { document } = data;
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/pdf-studio" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-blue-500" />
                  Smart PDF Builder
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Analyze → Review → Enhance → Generate</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              
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
          <FadeIn>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <SectionErrorBoundary sectionName="Content Input">
                  <SlideUp className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Paste Your Content</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Paste any content - business notes, school notes, articles, or mixed content. We'll transform it into a professional PDF.
                    </p>
              
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Content</label>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{wordCount} words · {charCount} characters</div>
                      </div>
                      <RichTextEditor
                        content={rawContent}
                        onChange={(html) => setRawContent(html)}
                        placeholder="Start typing or paste your content here...

Example:

Pitchonix - AI-powered document creation
We help professionals create pitch decks, proposals, and business documents 10x faster using AI.

Problem: Creating professional documents takes hours of work and design skills.

Solution: Our platform analyzes your content, suggests structure, and generates beautiful PDFs automatically.

Key Features:
- Smart content analysis
- Automatic structure generation  
- Professional templates
- Export to PDF/PowerPoint"
                        className="min-h-[400px]"
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
                  </SlideUp>
                </SectionErrorBoundary>

                {/* Preview Section */}
                <SectionErrorBoundary sectionName="Document Preview">
                  <SlideUp delay={0.1} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Live Preview</h2>
                    <A4Preview
                      content={rawContent}
                      title={title || 'Untitled Document'}
                      brandKit={null}
                    />
                  </SlideUp>
                </SectionErrorBoundary>
              </div>
            </div>
          </FadeIn>
        )}

        {/* STEP 2: REVIEW */}
        {step === 'review' && analysis && (
          <FadeIn>
            <StaggerContainer className="max-w-6xl mx-auto space-y-6">
              <StaggerItem>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Content Analysis Results</h2>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Start Over
                  </button>
                </div>
              </StaggerItem>

              {/* Analysis Cards */}
              <StaggerItem>
                <SectionErrorBoundary sectionName="Content Analysis">
                  <ContentAnalysisPreview analysis={analysis} />
                </SectionErrorBoundary>
              </StaggerItem>

              {/* Issues */}
              {analysis.issues && (
                <StaggerItem>
                  <SectionErrorBoundary sectionName="Issues Display">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                      <IssuesDisplay issues={analysis.issues} />
                    </div>
                  </SectionErrorBoundary>
                </StaggerItem>
              )}

              {/* Action Buttons */}
              <StaggerItem>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">What would you like to do?</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={handleApplyEnhancements}
                      disabled={enhancing}
                      className="p-6 border-2 border-blue-300 dark:border-blue-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex flex-col items-center gap-3 group"
                    >
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Wand2 className="w-8 h-8 text-blue-600" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-1">Apply Enhancements</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Fix all issues automatically</p>
                      </div>
                      {enhancing && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                    </button>

                <button
                  onClick={() => setStep('template')}
                  className="p-6 border-2 border-green-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-gray-900 mb-1">Choose Template</h4>
                    <p className="text-sm text-gray-600">Select from 20 templates</p>
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
                    <h4 className="font-bold text-gray-900 mb-1">Quick Generate</h4>
                    <p className="text-sm text-gray-600">Use suggested template</p>
                  </div>
                  {generating && <Loader2 className="w-5 h-5 animate-spin text-purple-600" />}
                </button>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>
      </FadeIn>
        )}

        {/* STEP 2.5: TEMPLATE SELECTION */}
        {step === 'template' && analysis && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Analysis
              </button>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Start Over
              </button>
            </div>

            {/* Template Selector */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                autoSelectedTemplate={autoSuggestedTemplate}
              />
            </div>

            {/* Generate Button */}
            <div className="bg-white rounded-xl shadow-lg p-8 text-center sticky bottom-4 z-10">
              <div className="flex items-center justify-center gap-4">
                <div className="text-left">
                  <p className="text-sm text-gray-600">Selected Template:</p>
                  <p className="font-semibold text-gray-900">
                    {selectedTemplate.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                </div>
                <button
                  onClick={() => handleGeneratePDF(false)}
                  disabled={generating || !selectedTemplate}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-6 h-6" />
                      Generate PDF with This Template
                    </>
                  )}
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
              <p className="text-gray-600 mb-2">
                Your content has been enhanced and structured.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Using template: <span className="font-semibold text-gray-900">
                  {selectedTemplate.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setStep('template')}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all"
                >
                  Change Template
                </button>
                <button
                  onClick={() => handleGeneratePDF(true)}
                  disabled={generating}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white font-bold text-lg rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg"
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
          </div>
        )}
      </div>
    </div>
  );
}
