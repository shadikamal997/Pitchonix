import { WizardData } from '@/app/create/page';
import { useRouter } from 'next/navigation';
import {
  Rocket,
  Briefcase,
  FileCheck,
  TrendingUp,
  Building2,
  Megaphone,
  FileText,
  ClipboardList,
  DollarSign,
  Presentation,
  BarChart3,
  UserCheck,
  FolderKanban,
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  FileType,
  Mail,
  Layout as LayoutIcon,
  User,
} from 'lucide-react';

interface Step1Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
}

type DocumentCategory = 'presentations' | 'pdf_documents';

interface DocumentType {
  id: string;
  name: string;
  icon: any;
  description: string;
  category: DocumentCategory;
  format: 'slides' | 'pdf';
  color: string;
  textColor: string;
  bgColor: string;
}

const DOCUMENT_TYPES: DocumentType[] = [
  // PRESENTATIONS (Slide Decks)
  {
    id: 'pitch_deck',
    name: 'Pitch Deck',
    icon: Rocket,
    description: 'Investor-ready slide presentation',
    category: 'presentations',
    format: 'slides',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'sales_deck',
    name: 'Sales Deck',
    icon: TrendingUp,
    description: 'Convert prospects into customers',
    category: 'presentations',
    format: 'slides',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-[#8c6210]',
    bgColor: 'bg-[#FAEEDB] hover:bg-[#F5E1B7]',
  },
  {
    id: 'board_meeting_deck',
    name: 'Board Meeting Deck',
    icon: Users,
    description: 'Board presentations and updates',
    category: 'presentations',
    format: 'slides',
    color: 'from-red-500 to-red-600',
    textColor: 'text-[#9a3737]',
    bgColor: 'bg-[#FCF1F1] hover:bg-[#F7E3E3]',
  },
  {
    id: 'training_presentation',
    name: 'Training Presentation',
    icon: GraduationCap,
    description: 'Educational and training materials',
    category: 'presentations',
    format: 'slides',
    color: 'from-lime-500 to-lime-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'product_launch',
    name: 'Product Launch',
    icon: Rocket,
    description: 'Launch your product with impact',
    category: 'presentations',
    format: 'slides',
    color: 'from-sky-500 to-sky-600',
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    id: 'strategy_presentation',
    name: 'Strategy Presentation',
    icon: BarChart3,
    description: 'Strategic planning and roadmaps',
    category: 'presentations',
    format: 'slides',
    color: 'from-amber-500 to-amber-600',
    textColor: 'text-[#8c6210]',
    bgColor: 'bg-[#FAEEDB] hover:bg-[#F5E1B7]',
  },
  
  // PDF DOCUMENTS
  {
    id: 'business_plan',
    name: 'Business Plan',
    icon: Briefcase,
    description: 'Comprehensive business strategy document',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'proposal',
    name: 'Proposal',
    icon: FileCheck,
    description: 'Win clients with professional proposals',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-green-500 to-green-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'company_profile',
    name: 'Company Profile',
    icon: Building2,
    description: 'Showcase your company and capabilities',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-gray-700 to-gray-900',
    textColor: 'text-[#111111]',
    bgColor: 'bg-[#EDEBE6] hover:bg-[#F1F0EC]',
  },
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    icon: ClipboardList,
    description: 'High-level business summary for executives',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-indigo-500 to-indigo-600',
    textColor: 'text-[#355846]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'marketing_plan',
    name: 'Marketing Plan',
    icon: Megaphone,
    description: 'Strategic marketing and growth plan',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-pink-500 to-pink-600',
    textColor: 'text-[#9a3737]',
    bgColor: 'bg-[#FCF1F1] hover:bg-[#F7E3E3]',
  },
  {
    id: 'financial_projection',
    name: 'Financial Projections',
    icon: DollarSign,
    description: 'Revenue forecasts and financial models',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-emerald-500 to-emerald-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'case_study',
    name: 'Case Study',
    icon: BookOpen,
    description: 'Customer success stories and case studies',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-teal-500 to-teal-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'internal_report',
    name: 'Internal Report',
    icon: FolderKanban,
    description: 'Team and organizational reports',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-slate-500 to-slate-600',
    textColor: 'text-[#6B6B6B]',
    bgColor: 'bg-[#EDEBE6] hover:bg-[#F1F0EC]',
  },
  {
    id: 'partnership_proposal',
    name: 'Partnership Proposal',
    icon: UserCheck,
    description: 'Collaboration and partnership proposals',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-violet-500 to-violet-600',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50 hover:bg-violet-100',
  },
  {
    id: 'one_pager',
    name: 'One Pager',
    icon: FileText,
    description: 'Concise single-page overview',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-indigo-500 to-indigo-600',
    textColor: 'text-[#355846]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },

  // Phase 42 — CAREER DOCUMENTS (route directly to /career builder).
  {
    id: 'cv',
    name: 'CV',
    icon: User,
    description: 'Full curriculum vitae',
    category: 'career' as any,
    format: 'pdf',
    color: 'from-emerald-500 to-emerald-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'resume',
    name: 'Resume',
    icon: Briefcase,
    description: 'Concise 1-2 page resume',
    category: 'career' as any,
    format: 'pdf',
    color: 'from-teal-500 to-teal-600',
    textColor: 'text-[#4F7563]',
    bgColor: 'bg-[#EEF5F1] hover:bg-[#DDE8E1]',
  },
  {
    id: 'cover_letter',
    name: 'Cover Letter',
    icon: Mail,
    description: 'Tailored letter for a specific role',
    category: 'career' as any,
    format: 'pdf',
    color: 'from-sky-500 to-sky-600',
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50 hover:bg-sky-100',
  },
  {
    id: 'portfolio',
    name: 'Portfolio',
    icon: LayoutIcon,
    description: 'Showcase of work, projects, and case studies',
    category: 'career' as any,
    format: 'pdf',
    color: 'from-fuchsia-500 to-fuchsia-600',
    textColor: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-50 hover:bg-fuchsia-100',
  },
];

const CATEGORIES = [
  {
    id: 'presentations' as DocumentCategory,
    name: 'Presentations',
    icon: Layers,
    description: 'Slide decks for pitches, sales, and meetings',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    borderColor: 'border-violet-200',
    selectedBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
  },
  {
    id: 'pdf_documents' as DocumentCategory,
    name: 'PDF Studio',
    icon: FileType,
    description: 'Professional PDF documents and reports',
    color: 'from-cyan-500 to-blue-600',
    iconBg: 'bg-[#DDE8E1]',
    iconColor: 'text-[#4F7563]',
    borderColor: 'border-cyan-200',
    selectedBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
  // Phase 42 — Career docs as a first-class wizard category.
  {
    id: 'career' as DocumentCategory,
    name: 'Career Documents',
    icon: Briefcase,
    description: 'CV, Resume, Cover Letter, Portfolio',
    color: 'from-emerald-500 to-teal-600',
    iconBg: 'bg-[#DDE8E1]',
    iconColor: 'text-[#4F7563]',
    borderColor: 'border-emerald-200',
    selectedBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  },
];

// Export for use in other components
export { DOCUMENT_TYPES };
export type { DocumentType };

export default function Step1DocumentType({ data, onUpdate }: Step1Props) {
  const router = useRouter();
  const selectedType = DOCUMENT_TYPES.find(t => t.id === data.documentType);

  // Get document types by category
  const presentationTypes = DOCUMENT_TYPES.filter(type => type.category === 'presentations');
  const pdfDocumentTypes  = DOCUMENT_TYPES.filter(type => type.category === 'pdf_documents');
  // Phase 42 — career types short-circuit the wizard and jump to the builder.
  const careerTypes       = DOCUMENT_TYPES.filter((type) => (type.category as any) === 'career');

  const pickCareer = (id: string) => {
    // Map wizard id → /career?create=<doctype>
    const map: Record<string, string> = {
      cv: 'cv', resume: 'resume', cover_letter: 'coverLetter', portfolio: 'portfolio',
    };
    const doctype = map[id] || 'cv';
    router.push(`/career?create=${doctype}`);
  };

  const renderDocumentCard = (type: DocumentType) => {
    const Icon = type.icon;
    const isSelected = data.documentType === type.id;
    const isCareer = (type.category as any) === 'career';

    return (
      <button
        key={type.id}
        onClick={() => isCareer ? pickCareer(type.id) : onUpdate({ documentType: type.id })}
        className={`p-3 rounded-lg border text-left transition-all bg-white ${
          isSelected
            ? 'border-[#4F7563] ring-1 ring-[#4F7563]/40 shadow-md shadow-green-500/10'
            : 'border-[#E3E1DA] hover:border-green-400 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-gradient-to-br from-green-600 to-emerald-500'
              : 'bg-[#EDEBE6] group-hover:bg-[#EEF5F1]'
          }`}>
            <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-[#6B6B6B]'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`font-semibold text-sm leading-tight mb-0.5 ${
              isSelected ? 'text-[#355846]' : 'text-[#111111]'
            }`}>
              {type.name}
            </h4>
            <p className="text-[11px] leading-snug text-[#9A9A9A] line-clamp-2">
              {type.description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-1 text-[#111111]">What would you like to create?</h2>
        <p className="text-sm text-[#9A9A9A]">Choose from 16 professional document types</p>
      </div>

      {/* Presentations Category */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111111]">Presentations</h3>
            <p className="text-xs text-[#9A9A9A]">Slide decks for pitches, sales, and meetings</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {presentationTypes.map(renderDocumentCard)}
        </div>
      </div>

      {/* PDF Documents Category */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600">
            <FileType className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111111]">PDF Studio</h3>
            <p className="text-xs text-[#9A9A9A]">Professional PDF documents and reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {pdfDocumentTypes.map(renderDocumentCard)}
        </div>
      </div>

      {/* Phase 42 — Career Documents Category */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111111]">Career Documents</h3>
            <p className="text-xs text-[#9A9A9A]">CV, Resume, Cover Letter, Portfolio — opens the career builder</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {careerTypes.map(renderDocumentCard)}
        </div>
      </div>

      {/* Selected Confirmation */}
      {selectedType && (
        <div className="mt-6 p-3 rounded-lg bg-[#EEF5F1] border border-[#DDE8E1]">
          <div className="flex items-center gap-2.5">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-900">
                {selectedType.name}
              </p>
              <p className="text-xs text-[#355846]">
                {selectedType.format === 'pdf' ? 'PDF Document' : 'Slide Presentation'} • {selectedType.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
