'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import api from '@/lib/api';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import Step1DocumentType from '@/components/wizard/Step1DocumentType';
import Step2BusinessInfo from '@/components/wizard/Step2BusinessInfo';
import Step3AudienceGoal from '@/components/wizard/Step3AudienceGoal';
import Step4BusinessDetails from '@/components/wizard/Step4BusinessDetails';
import Step5DesignPreferences from '@/components/wizard/Step5DesignPreferences';
import Step6GenerationSettings from '@/components/wizard/Step6GenerationSettings';
import StructuredDataStep from '@/components/wizard/StructuredDataStep';
import WizardIntelligencePanel from '@/components/wizard/WizardIntelligencePanel';
import { emptyStructuredWizardData, type StructuredWizardData } from '@/lib/wizard-structured';

// Dynamic wizard configuration based on document type
type StepConfig = {
  id: number;
  title: string;
  description: string;
  component: string;
  optional?: boolean;
};

const getWizardSteps = (documentType: string): StepConfig[] => {
  // Base steps for all document types
  const baseSteps: StepConfig[] = [
    { id: 1, title: 'Document Type', description: 'Choose what to create', component: 'Step1' },
    { id: 2, title: 'Business Info', description: 'Company details', component: 'Step2' },
  ];

  // Document-type specific configurations
  const configs: Record<string, StepConfig[]> = {
    pitch_deck: [
      ...baseSteps,
      { id: 3, title: 'Audience & Goal', description: 'Investors & purpose', component: 'Step3' },
      { id: 4, title: 'Pitch Details', description: 'Problem & solution', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    business_plan: [
      ...baseSteps,
      { id: 3, title: 'Executive Summary', description: 'High-level overview', component: 'Step3' },
      { id: 4, title: 'Business Model', description: 'How you operate', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    proposal: [
      ...baseSteps,
      { id: 3, title: 'Client & Goal', description: 'Who & what for', component: 'Step3' },
      { id: 4, title: 'Solution & Scope', description: 'What you\'ll deliver', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    sales_deck: [
      ...baseSteps,
      { id: 3, title: 'Target Audience', description: 'Customer profile', component: 'Step3' },
      { id: 4, title: 'Value Proposition', description: 'Why buy from you', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    one_pager: [
      ...baseSteps,
      { id: 3, title: 'Key Message', description: 'Core value', component: 'Step3' },
      { id: 4, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 5, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    case_study: [
      ...baseSteps,
      { id: 3, title: 'Customer Story', description: 'Who & challenge', component: 'Step3' },
      { id: 4, title: 'Solution & Results', description: 'What you delivered', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    training_presentation: [
      ...baseSteps,
      { id: 3, title: 'Learning Goals', description: 'Objectives', component: 'Step3' },
      { id: 4, title: 'Content Structure', description: 'Topics & modules', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    product_launch: [
      ...baseSteps,
      { id: 3, title: 'Product Details', description: 'Features & benefits', component: 'Step3' },
      { id: 4, title: 'Launch Strategy', description: 'Go-to-market plan', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    strategy_presentation: [
      ...baseSteps,
      { id: 3, title: 'Strategic Vision', description: 'Goals & objectives', component: 'Step3' },
      { id: 4, title: 'Roadmap & Initiatives', description: 'Action plan', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    board_meeting_deck: [
      ...baseSteps,
      { id: 3, title: 'Board Context', description: 'Meeting purpose', component: 'Step3' },
      { id: 4, title: 'Key Topics', description: 'Agenda & updates', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    company_profile: [
      ...baseSteps,
      { id: 3, title: 'Target Audience', description: 'Who will read this', component: 'Step3' },
      { id: 4, title: 'Company Story', description: 'History & achievements', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    executive_summary: [
      ...baseSteps,
      { id: 3, title: 'Summary Context', description: 'Purpose & audience', component: 'Step3' },
      { id: 4, title: 'Key Highlights', description: 'Main points', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    marketing_plan: [
      ...baseSteps,
      { id: 3, title: 'Market & Audience', description: 'Target customers', component: 'Step3' },
      { id: 4, title: 'Strategy & Tactics', description: 'Marketing approach', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    financial_projection: [
      ...baseSteps,
      { id: 3, title: 'Projection Period', description: 'Timeframe & goals', component: 'Step3' },
      { id: 4, title: 'Financial Details', description: 'Revenue & expenses', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    internal_report: [
      ...baseSteps,
      { id: 3, title: 'Report Context', description: 'Purpose & scope', component: 'Step3' },
      { id: 4, title: 'Key Findings', description: 'Data & insights', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
    partnership_proposal: [
      ...baseSteps,
      { id: 3, title: 'Partner Details', description: 'Who & why partner', component: 'Step3' },
      { id: 4, title: 'Partnership Value', description: 'Mutual benefits', component: 'Step4' },
      { id: 5, title: 'Business Data', description: 'KPIs, pricing, team, …', component: 'StepStructured' },
      { id: 6, title: 'Design', description: 'Visual preferences', component: 'Step5' },
      { id: 7, title: 'Settings', description: 'Generation options', component: 'Step6' },
    ],
  };

  // Return specific config or default pitch_deck config
  return configs[documentType] || configs.pitch_deck;
};

export interface WizardData {
  // Step 1 - Document Type
  documentType: string;
  
  // Step 2 - Business/Company Info (all types)
  companyName: string;
  industry: string;
  country: string;
  businessStage: string;
  productService: string;
  website: string;
  shortDescription: string;
  
  // Step 3 - Audience & Goal (varies by type)
  audience: string;
  purpose: string;
  desiredAction: string;
  tone: string;
  
  // Additional audience fields for specialized docs
  clientName?: string;
  clientIndustry?: string;
  customerName?: string;
  partnerName?: string;
  
  // Step 4 - Content Details (varies by type)
  problem: string;
  solution: string;
  targetCustomers: string;
  marketOpportunity: string;
  competitors: string;
  differentiation: string;
  revenueModel: string;
  pricing: string;
  traction: string;
  team: string;
  fundingAsk: string;
  roadmap: string;
  
  // Additional fields for specialized docs
  challenge?: string;
  resultsAchieved?: string;
  learningObjectives?: string;
  contentModules?: string;
  executiveSummary?: string;
  
  // Step 5 - Design
  theme: string;
  logo?: File | null;
  images?: File[]; // Additional images for slides/pages
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fontStyle: string;
  visualStyle: string;
  
  // Step 6 - Settings
  slideCount: number;
  contentDepth: string;
  includeCharts: boolean;
  includeFinancials: boolean;
  includeSpeakerNotes: boolean;
  includeExecutiveSummary: boolean;

  // Phase 28 — Structured business data (preferred by generation engine)
  structured?: StructuredWizardData;
}

// Wrap in Suspense to satisfy Next.js requirement for useSearchParams()
export default function CreateWizardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
            <div className="absolute inset-0 rounded-full border-2 border-green-200 animate-pulse" />
          </div>
        </div>
      }
    >
      <CreateWizardPage />
    </Suspense>
  );
}

function CreateWizardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [localProjectId, setLocalProjectId] = useState<string | null>(searchParams.get('project'));
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  // Check for template data from sessionStorage
  const getInitialData = (): WizardData => {
    const isTemplate = searchParams.get('template') === 'true';
    if (isTemplate && typeof window !== 'undefined') {
      const templateData = sessionStorage.getItem('selectedTemplate');
      if (templateData) {
        try {
          const parsed = JSON.parse(templateData);
          // Clear the template data after loading
          sessionStorage.removeItem('selectedTemplate');
          return { ...defaultWizardData, ...parsed };
        } catch (e) {
          console.error('Failed to parse template data:', e);
        }
      }
    }
    return defaultWizardData;
  };
  
  const defaultWizardData: WizardData = {
    documentType: '',
    companyName: '',
    industry: '',
    country: '',
    businessStage: '',
    productService: '',
    website: '',
    shortDescription: '',
    audience: '',
    purpose: '',
    desiredAction: '',
    tone: '',
    problem: '',
    solution: '',
    targetCustomers: '',
    marketOpportunity: '',
    competitors: '',
    differentiation: '',
    revenueModel: '',
    pricing: '',
    traction: '',
    team: '',
    fundingAsk: '',
    roadmap: '',
    theme: 'modern_tech',
    logo: null,
    images: [],
    brandColors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#10B981',
    },
    fontStyle: 'modern',
    visualStyle: 'minimal',
    slideCount: 12,
    contentDepth: 'balanced',
    includeCharts: true,
    includeFinancials: true,
    includeSpeakerNotes: true,
    includeExecutiveSummary: true,
    structured: emptyStructuredWizardData,
  };
  
  const [wizardData, setWizardData] = useState<WizardData>(getInitialData());

  // Get dynamic steps based on selected document type
  const STEPS = getWizardSteps(wizardData.documentType);
  const totalSteps = STEPS.length;

  // Load existing project data if editing
  useEffect(() => {
    if (localProjectId) {
      loadProjectData();
    }
  }, [localProjectId]);

  const loadProjectData = async () => {
    try {
      const response = await api.get(`/projects/${localProjectId}`);
      const project = response.data;
      
      if (project.businessInfo) {
        setWizardData((prev) => ({
          ...prev,
          documentType: project.documentType || '',
          ...project.businessInfo,
        }));
      }
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...stepData }));
  };

  const saveDraft = async (): Promise<string | null> => {
    try {
      const payload = {
        name: wizardData.companyName || 'Untitled Project',
        documentType: wizardData.documentType || 'pitch_deck',
        description: wizardData.shortDescription,
        industry: wizardData.industry,
        audience: wizardData.audience,
        tone: wizardData.tone,
        businessInfo: wizardData,
      };

      if (localProjectId) {
        await api.patch(`/projects/${localProjectId}`, payload);
        return localProjectId;
      } else {
        const response = await api.post('/projects', payload);
        const newId: string = response.data.id;
        setLocalProjectId(newId);
        router.replace(`/create?project=${newId}`);
        return newId;
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw error;
    }
  };

  const handleNext = async () => {
    try {
      await saveDraft();
    } catch {
      // Non-blocking: proceed to next step even if save fails
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    setGenerateError('');
    try {
      console.log('[Wizard] Starting generation...');
      const savedProjectId = await saveDraft();

      if (!savedProjectId) {
        setGenerateError('Failed to save project. Please try again.');
        setLoading(false);
        return;
      }

      console.log('[Wizard] Project saved:', savedProjectId);

      // Determine document format
      const { DOCUMENT_TYPES } = await import('@/components/wizard/Step1DocumentType');
      const selectedType = DOCUMENT_TYPES.find(t => t.id === wizardData.documentType);
      const format = selectedType?.format || 'slides';

      console.log('[Wizard] Document type:', wizardData.documentType, 'Format:', format);

      // Upload any Files attached during the wizard, replacing them with URLs.
      console.log('[Wizard] Uploading attached files…');
      const uploadOne = async (file: File): Promise<string> => {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/pdf-studio/images/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const raw = data?.data?.url || data?.url || '';
        // Resolve relative urls to absolute against the API origin
        if (!raw) throw new Error('Upload returned no URL');
        if (raw.startsWith('http')) return raw;
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/api\/?$/, '');
        return `${apiBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
      };

      const logoUrl = wizardData.logo instanceof File ? await uploadOne(wizardData.logo).catch(() => '') : '';
      const imageUrls: string[] = [];
      for (const f of (wizardData.images || [])) {
        if (f instanceof File) {
          const url = await uploadOne(f).catch(() => '');
          if (url) imageUrls.push(url);
        }
      }
      console.log(`[Wizard] Uploaded logo=${logoUrl ? 'yes' : 'no'}, images=${imageUrls.length}`);

      // Strip File objects from the wizard payload and substitute the uploaded URLs.
      const { logo: _logo, images: _images, ...rest } = wizardData;
      const serializableInput = {
        ...rest,
        logo:   logoUrl ? { url: logoUrl } : {},
        images: imageUrls.map((url) => ({ url })),
      };

      // Also persist the URLs on the project so the regenerate / template apply
      // flows can use them later.
      try {
        await api.patch(`/projects/${savedProjectId}`, {
          businessInfo: serializableInput,
        });
      } catch (_) { /* non-blocking */ }

      if (format === 'pdf') {
        // Generate PDF document
        console.log('[Wizard] Calling PDF generation...');
        const response = await api.post('/pdf-documents/generate', {
          projectId: savedProjectId,
          documentType: wizardData.documentType,
          input: serializableInput,
        });

        console.log('[Wizard] PDF generation started:', response.data);
        // Navigate to PDF Studio (once created)
        // For now, redirect to project page
        router.push(`/projects/${savedProjectId}`);
      } else {
        // Generate slide presentation
        console.log('[Wizard] Calling slide generation...');
        const response = await api.post('/generate', {
          projectId: savedProjectId,
          input: serializableInput,
        });

        console.log('[Wizard] Slide generation started:', response.data);
        router.push(`/projects/${savedProjectId}`);
      }
    } catch (error: any) {
      console.error('[Wizard] Generation failed:', error);
      console.error('[Wizard] Error details:', error.response?.data);
      setGenerateError(
        error.response?.data?.message || 'Failed to start generation. Please try again.'
      );
      setLoading(false);
    }
  };

  const isStepValid = (): boolean => {
    const currentStepConfig = STEPS[currentStep - 1];
    
    // Step 1: Document Type
    if (currentStepConfig.component === 'Step1') {
      return wizardData.documentType !== '';
    }
    
    // Step 2: Business Info (all types)
    if (currentStepConfig.component === 'Step2') {
      return wizardData.companyName !== '' && wizardData.industry !== '';
    }
    
    // Step 3: Audience/Goal (varies by doc type)
    if (currentStepConfig.component === 'Step3') {
      return wizardData.audience !== '' && wizardData.tone !== '';
    }
    
    // Step 4: Business/Content Details
    if (currentStepConfig.component === 'Step4') {
      return wizardData.problem !== '' && wizardData.solution !== '';
    }

    // Phase 28: Structured Data — always permits "next" (everything is optional;
    // the readiness panel surfaces missing items, doesn't block).
    if (currentStepConfig.component === 'StepStructured') {
      return true;
    }

    // Step 5: Design
    if (currentStepConfig.component === 'Step5') {
      return wizardData.theme !== '';
    }
    
    // Step 6: Settings
    if (currentStepConfig.component === 'Step6') {
      return wizardData.slideCount > 0;
    }
    
    return true;
  };

  const renderStep = () => {
    const currentStepConfig = STEPS[currentStep - 1];
    const stepComponent = currentStepConfig?.component;
    
    // Map component names to actual components
    switch (stepComponent) {
      case 'Step1':
        return <Step1DocumentType data={wizardData} onUpdate={updateWizardData} />;
      case 'Step2':
        return <Step2BusinessInfo data={wizardData} onUpdate={updateWizardData} documentType={wizardData.documentType} />;
      case 'Step3':
        return <Step3AudienceGoal data={wizardData} onUpdate={updateWizardData} documentType={wizardData.documentType} />;
      case 'Step4':
        return <Step4BusinessDetails data={wizardData} onUpdate={updateWizardData} documentType={wizardData.documentType} />;
      case 'StepStructured':
        return (
          <StructuredDataStep
            documentType={wizardData.documentType}
            structured={wizardData.structured ?? emptyStructuredWizardData}
            onUpdate={(structured) => updateWizardData({ structured })}
          />
        );
      case 'Step5':
        return <Step5DesignPreferences data={wizardData} onUpdate={updateWizardData} />;
      case 'Step6':
        return <Step6GenerationSettings data={wizardData} onUpdate={updateWizardData} documentType={wizardData.documentType} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Exit
                </Button>
              </Link>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  {wizardData.companyName || 'Create New Project'}
                </h1>
                <p className="text-xs text-slate-600">Step-by-step wizard</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
                <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                <span className="text-xs font-medium text-green-700">
                  Step {currentStep} of {STEPS.length}
                </span>
              </div>
            </div>
          </div>
          <div className="h-1 bg-slate-100">
            <div 
              className="h-full bg-gradient-to-r from-green-600 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Modern Stepper */}
          <div className="overflow-x-auto pb-4">
            <div className="flex items-center justify-between min-w-max md:min-w-0">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold transition-all shadow-lg ${
                        currentStep > step.id
                          ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/30'
                          : currentStep === step.id
                          ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-green-500/30 scale-110'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {currentStep > step.id ? <Check className="h-6 w-6" /> : step.id}
                    </div>
                    <div className="mt-3 text-center hidden md:block">
                      <p
                        className={`text-sm font-semibold ${
                          currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className="flex-1 px-3 flex items-center">
                      <div
                        className={`h-1 w-full rounded-full transition-all ${
                          currentStep > step.id 
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
                            : 'bg-slate-200'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Phase 28 — Live intelligence panel (hidden on document-type step) */}
          {currentStep > 1 && (
            <WizardIntelligencePanel
              data={{
                documentType:     wizardData.documentType,
                companyName:      wizardData.companyName,
                industry:         wizardData.industry,
                audience:         wizardData.audience,
                tone:             wizardData.tone,
                problem:          wizardData.problem,
                solution:         wizardData.solution,
                targetCustomers:  wizardData.targetCustomers,
                marketOpportunity:wizardData.marketOpportunity,
                competitors:      wizardData.competitors,
                differentiation:  wizardData.differentiation,
                revenueModel:     wizardData.revenueModel,
                pricing:          wizardData.pricing,
                traction:         wizardData.traction,
                team:             wizardData.team,
                fundingAsk:       wizardData.fundingAsk,
                roadmap:          wizardData.roadmap,
                structured:       wizardData.structured,
              }}
            />
          )}

          {/* Step Content Card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="p-8 md:p-12">
              {renderStep()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              size="lg"
              className="rounded-xl border-slate-200 hover:border-green-300 hover:bg-green-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                size="lg"
                className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-3">
                {generateError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    <p className="text-sm text-red-800 font-medium">{generateError}</p>
                  </div>
                )}
                <Button
                  onClick={handleFinish}
                  disabled={!isStepValid() || loading}
                  size="lg"
                  className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg shadow-green-500/30 transition-all hover:-translate-y-0.5"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      Finish & Generate
                      <Check className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
