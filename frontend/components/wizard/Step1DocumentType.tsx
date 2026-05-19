import { WizardData } from '@/app/create/page';
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
  FileType
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
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'sales_deck',
    name: 'Sales Deck',
    icon: TrendingUp,
    description: 'Convert prospects into customers',
    category: 'presentations',
    format: 'slides',
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    id: 'board_meeting_deck',
    name: 'Board Meeting Deck',
    icon: Users,
    description: 'Board presentations and updates',
    category: 'presentations',
    format: 'slides',
    color: 'from-red-500 to-red-600',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  {
    id: 'training_presentation',
    name: 'Training Presentation',
    icon: GraduationCap,
    description: 'Educational and training materials',
    category: 'presentations',
    format: 'slides',
    color: 'from-lime-500 to-lime-600',
    textColor: 'text-lime-600',
    bgColor: 'bg-lime-50 hover:bg-lime-100',
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
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100',
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
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'proposal',
    name: 'Proposal',
    icon: FileCheck,
    description: 'Win clients with professional proposals',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-green-500 to-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'company_profile',
    name: 'Company Profile',
    icon: Building2,
    description: 'Showcase your company and capabilities',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-gray-700 to-gray-900',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    icon: ClipboardList,
    description: 'High-level business summary for executives',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  {
    id: 'marketing_plan',
    name: 'Marketing Plan',
    icon: Megaphone,
    description: 'Strategic marketing and growth plan',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-pink-500 to-pink-600',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50 hover:bg-pink-100',
  },
  {
    id: 'financial_projection',
    name: 'Financial Projections',
    icon: DollarSign,
    description: 'Revenue forecasts and financial models',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100',
  },
  {
    id: 'case_study',
    name: 'Case Study',
    icon: BookOpen,
    description: 'Customer success stories and case studies',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-teal-500 to-teal-600',
    textColor: 'text-teal-600',
    bgColor: 'bg-teal-50 hover:bg-teal-100',
  },
  {
    id: 'internal_report',
    name: 'Internal Report',
    icon: FolderKanban,
    description: 'Team and organizational reports',
    category: 'pdf_documents',
    format: 'pdf',
    color: 'from-slate-500 to-slate-600',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50 hover:bg-slate-100',
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
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
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
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    borderColor: 'border-cyan-200',
    selectedBg: 'bg-gradient-to-br from-cyan-500 to-blue-600',
  },
];

// Export for use in other components
export { DOCUMENT_TYPES };
export type { DocumentType };

export default function Step1DocumentType({ data, onUpdate }: Step1Props) {
  const selectedType = DOCUMENT_TYPES.find(t => t.id === data.documentType);
  
  // Get document types by category
  const presentationTypes = DOCUMENT_TYPES.filter(type => type.category === 'presentations');
  const pdfDocumentTypes = DOCUMENT_TYPES.filter(type => type.category === 'pdf_documents');

  const renderDocumentCard = (type: DocumentType) => {
    const Icon = type.icon;
    const isSelected = data.documentType === type.id;

    return (
      <button
        key={type.id}
        onClick={() => onUpdate({ documentType: type.id })}
        className={`p-3 rounded-lg border text-left transition-all bg-white ${
          isSelected
            ? 'border-green-600 ring-1 ring-green-600 shadow-md shadow-green-500/10'
            : 'border-slate-200 hover:border-green-400 hover:shadow-sm'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <div className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-gradient-to-br from-green-600 to-emerald-500'
              : 'bg-slate-50 group-hover:bg-green-50'
          }`}>
            <Icon className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className={`font-semibold text-sm leading-tight mb-0.5 ${
              isSelected ? 'text-green-700' : 'text-slate-900'
            }`}>
              {type.name}
            </h4>
            <p className="text-[11px] leading-snug text-slate-500 line-clamp-2">
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
        <h2 className="text-2xl font-bold mb-1 text-slate-900">What would you like to create?</h2>
        <p className="text-sm text-slate-500">Choose from 16 professional document types</p>
      </div>

      {/* Presentations Category */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-green-600 to-emerald-500">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Presentations</h3>
            <p className="text-xs text-slate-500">Slide decks for pitches, sales, and meetings</p>
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
            <h3 className="text-base font-bold text-slate-900">PDF Studio</h3>
            <p className="text-xs text-slate-500">Professional PDF documents and reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {pdfDocumentTypes.map(renderDocumentCard)}
        </div>
      </div>

      {/* Selected Confirmation */}
      {selectedType && (
        <div className="mt-6 p-3 rounded-lg bg-green-50 border border-green-200">
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
              <p className="text-xs text-green-700">
                {selectedType.format === 'pdf' ? 'PDF Document' : 'Slide Presentation'} • {selectedType.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
