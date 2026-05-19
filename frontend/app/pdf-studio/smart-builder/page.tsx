'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Sparkles, Loader2, Wand2, FileEdit, FileCheck, AlertCircle, RefreshCw, FileText, List, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ContentAnalysisPreview } from '@/components/pdf-studio/ContentAnalysisPreview';
import { IssuesDisplay } from '@/components/pdf-studio/IssuesDisplay';
import { EnhancementPreview } from '@/components/pdf-studio/EnhancementPreview';
import TemplateSelector from '@/components/pdf-studio/TemplateSelector';
import { SectionErrorBoundary } from '@/components/ErrorBoundary';
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
        documentType: analysis?.detectedType || 'document',
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/pdf-studio" className="text-slate-500 hover:text-slate-900 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  Smart PDF Builder
                </h1>
                <p className="text-[11px] text-slate-500">Analyze → Review → Enhance → Generate</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-3">
              {[
                { id: 'input',    label: 'Input',    done: step === 'review' || step === 'template' || step === 'enhanced', active: step === 'input' },
                { id: 'review',   label: 'Review',   done: step === 'enhanced',                                              active: step === 'review' || step === 'template' },
                { id: 'enhanced', label: 'Generate', done: false,                                                            active: step === 'enhanced' },
              ].map((s, i, arr) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 ${
                    s.done ? 'text-green-600' : s.active ? 'text-green-700' : 'text-slate-400'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      s.done
                        ? 'border-green-600 bg-green-600 text-white'
                        : s.active
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-slate-300 text-slate-400'
                    }`}>
                      {s.done ? '✓' : i + 1}
                    </div>
                    <span className="text-xs font-semibold">{s.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`w-6 h-0.5 rounded-full ${s.done ? 'bg-green-500' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Error Message */}
        {error && (
          <div className="max-w-7xl mx-auto mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-red-900">Error</h4>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* STEP 1: INPUT */}
        {step === 'input' && (
          <FadeIn>
            <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-5">
                {/* Input Section */}
                <SectionErrorBoundary sectionName="Content Input">
                  <SlideUp className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500">
                        <FileEdit className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Paste Your Content</h2>
                        <p className="text-xs text-slate-500">Notes, articles, drafts — we'll turn it into a professional PDF</p>
                      </div>
                    </div>

                    {/* Title input */}
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Document Title <span className="text-slate-400 font-normal">(optional — AI suggests one)</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Q3 Business Report, Marketing Strategy 2025…"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                      />
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">Your Content</label>
                        <div className="text-[11px] text-slate-500">{wordCount} words · {charCount} chars</div>
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
                        className="min-h-[380px]"
                      />
                    </div>

                    <button
                      onClick={handleAnalyze}
                      disabled={!rawContent.trim() || analyzing}
                      className="w-full py-3 px-5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 hover:-translate-y-0.5"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing Content…
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyze Content
                        </>
                      )}
                    </button>
                  </SlideUp>
                </SectionErrorBoundary>

                {/* Preview Section */}
                <SectionErrorBoundary sectionName="Document Preview">
                  <SlideUp delay={0.1} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Live Preview</h2>
                    </div>
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
            <StaggerContainer className="max-w-6xl mx-auto space-y-5">
              <StaggerItem>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Content Analysis Results</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Review the detected type, structure, and issues before generating</p>
                  </div>
                  <button
                    onClick={handleStartOver}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                      <IssuesDisplay issues={analysis.issues} />
                    </div>
                  </SectionErrorBoundary>
                </StaggerItem>
              )}

              {/* Outline Preview */}
              {analysis.suggestedSections && analysis.suggestedSections.length > 0 && (
                <StaggerItem>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 rounded-md bg-green-50">
                        <List className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Document Outline Preview</h3>
                      <span className="ml-auto text-[11px] text-slate-400 font-semibold">{analysis.suggestedSections.length} sections</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      The document will be structured into these sections based on your content:
                    </p>
                    <ol className="space-y-1.5">
                      {analysis.suggestedSections.map((section: any, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 hover:bg-green-50/50 transition-colors">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {typeof section === 'string' ? section : section.title || section.name || `Section ${i + 1}`}
                            </p>
                            {typeof section === 'object' && section.type && (
                              <span className="text-[10px] text-slate-400 capitalize">{section.type}</span>
                            )}
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                        </li>
                      ))}
                    </ol>
                  </div>
                </StaggerItem>
              )}

              {/* Action Buttons */}
              <StaggerItem>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-1">What would you like to do?</h3>
                  <p className="text-xs text-slate-500 mb-4">Choose your next step — enhance, pick a template, or generate now</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    <button
                      onClick={handleApplyEnhancements}
                      disabled={enhancing}
                      className="p-4 border border-slate-200 bg-white rounded-xl hover:border-green-400 hover:bg-green-50/30 hover:shadow-sm transition-all flex flex-col items-center gap-2.5 group disabled:opacity-60"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-md shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
                        <Wand2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-sm text-slate-900 mb-0.5">Apply Enhancements</h4>
                        <p className="text-[11px] text-slate-500">Fix all issues automatically</p>
                      </div>
                      {enhancing && <Loader2 className="w-4 h-4 animate-spin text-green-600" />}
                    </button>

                    <button
                      onClick={() => setStep('template')}
                      className="p-4 border border-slate-200 bg-white rounded-xl hover:border-green-400 hover:bg-green-50/30 hover:shadow-sm transition-all flex flex-col items-center gap-2.5 group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-md shadow-green-500/20 group-hover:shadow-green-500/40 transition-shadow">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-sm text-slate-900 mb-0.5">Choose Template</h4>
                        <p className="text-[11px] text-slate-500">Select from 20 templates</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleGeneratePDF(false)}
                      disabled={generating}
                      className="p-4 border border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:border-green-500 hover:shadow-md transition-all flex flex-col items-center gap-2.5 group disabled:opacity-60"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-green-700 to-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
                        <FileCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-sm text-green-800 mb-0.5">Quick Generate</h4>
                        <p className="text-[11px] text-green-700">Use suggested template</p>
                      </div>
                      {generating && <Loader2 className="w-4 h-4 animate-spin text-green-700" />}
                    </button>
                  </div>
                </div>
              </StaggerItem>
            </StaggerContainer>
          </FadeIn>
        )}

        {/* STEP 2.5: TEMPLATE SELECTION */}
        {step === 'template' && analysis && (
          <div className="max-w-7xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep('review')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Analysis
              </button>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Start Over
              </button>
            </div>

            {/* Template Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <TemplateSelector
                selectedTemplate={selectedTemplate}
                onSelectTemplate={setSelectedTemplate}
                autoSelectedTemplate={autoSuggestedTemplate}
              />
            </div>

            {/* Generate Button */}
            <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-5 sticky bottom-4 z-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Selected Template</p>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedTemplate.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                </div>
                <button
                  onClick={() => handleGeneratePDF(false)}
                  disabled={generating || !selectedTemplate}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 hover:-translate-y-0.5"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Generate PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ENHANCED */}
        {step === 'enhanced' && enhancement && (
          <div className="max-w-6xl mx-auto space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Enhanced Content Preview</h2>
                <p className="text-xs text-slate-500 mt-0.5">Review the enhanced version before generating your PDF</p>
              </div>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-emerald-500 mb-3 shadow-md shadow-green-500/30">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Ready to Generate Your PDF?</h3>
              <p className="text-sm text-slate-500 mb-1">Your content has been enhanced and structured.</p>
              <p className="text-xs text-slate-500 mb-5">
                Using template: <span className="font-semibold text-green-700">
                  {selectedTemplate.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </span>
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setStep('template')}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Change Template
                </button>
                <button
                  onClick={() => handleGeneratePDF(true)}
                  disabled={generating}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 hover:-translate-y-0.5"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
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
