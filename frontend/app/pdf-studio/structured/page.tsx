'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { ArrowLeft, FileText, Briefcase, Building, TrendingUp, DollarSign, Users, PieChart, File, Loader2 } from 'lucide-react';
import { TemplateCard } from '@/components/pdf-studio/StandardCard';
import api from '@/lib/api';

const DOCUMENT_TEMPLATES = [
  {
    id: 'business_plan',
    name: 'Business Plan',
    description: 'Comprehensive business plan with market analysis, financial projections, and strategy',
    icon: Briefcase,
    color: 'blue',
  },
  {
    id: 'proposal',
    name: 'Business Proposal',
    description: 'Professional proposal for services, products, or partnerships',
    icon: FileText,
    color: 'green',
  },
  {
    id: 'company_profile',
    name: 'Company Profile',
    description: 'Showcase your company with a professional profile document',
    icon: Building,
    color: 'purple',
  },
  {
    id: 'executive_summary',
    name: 'Executive Summary',
    description: 'Concise overview of your business or project',
    icon: File,
    color: 'orange',
  },
  {
    id: 'marketing_plan',
    name: 'Marketing Plan',
    description: 'Strategic marketing plan with tactics and metrics',
    icon: TrendingUp,
    color: 'pink',
  },
  {
    id: 'financial_projection',
    name: 'Financial Projection',
    description: 'Detailed financial forecasts and projections',
    icon: DollarSign,
    color: 'yellow',
  },
  {
    id: 'partnership_proposal',
    name: 'Partnership Proposal',
    description: 'Propose strategic partnerships and collaborations',
    icon: Users,
    color: 'teal',
  },
  {
    id: 'case_study',
    name: 'Case Study',
    description: 'Document success stories and project outcomes',
    icon: PieChart,
    color: 'indigo',
  },
];

const colorClasses: Record<string, { bg: string; text: string; hover: string; icon: string }> = {
  blue: { bg: 'bg-[#EEF5F1]', text: 'text-[#1A2D24]', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]' },
  green: { bg: 'bg-[#EEF5F1]', text: 'text-[#1A2D24]', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]' },
  purple: { bg: 'bg-[#EEF5F1]', text: 'text-purple-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]' },
  orange: { bg: 'bg-[#FAEEDB]', text: 'text-orange-900', hover: 'hover:bg-[#F5E1B7]', icon: 'text-[#8c6210]' },
  pink: { bg: 'bg-[#FCF1F1]', text: 'text-pink-900', hover: 'hover:bg-[#F7E3E3]', icon: 'text-[#9a3737]' },
  yellow: { bg: 'bg-[#FAEEDB]', text: 'text-yellow-900', hover: 'hover:bg-[#F5E1B7]', icon: 'text-[#8c6210]' },
  teal: { bg: 'bg-[#EEF5F1]', text: 'text-teal-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]' },
  indigo: { bg: 'bg-[#EEF5F1]', text: 'text-indigo-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#355846]' },
};

export default function StructuredDocumentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [creatingDocument, setCreatingDocument] = useState<string | null>(null);

  const handleCreateDocument = async (templateId: string, templateName: string) => {
    try {
      setCreatingDocument(templateId);

      // Create a new structured document using Smart PDF Builder endpoint
      const response = await api.post('/pdf-studio/smart-builder/generate', {
        rawContent: `# ${templateName}\n\n## Executive Summary\n\nProvide a brief overview of your ${templateName.toLowerCase()}.\n\n## Introduction\n\nStart creating your ${templateName.toLowerCase()} here...\n\n## Main Content\n\nAdd your detailed content in this section.\n\n### Key Points\n\n- Point 1\n- Point 2\n- Point 3\n\n## Conclusion\n\nSummarize your key points here.`,
        config: {
          title: templateName,
          tone: 'professional',
          designStyle: 'corporate',
          improveWriting: true,
          fixGrammar: true,
          addStructure: true,
          generateIntro: false,
          generateSummary: false,
          generateConclusion: false,
          includeTableOfContents: true,
          includeCoverPage: true,
        }
      });

      const responseData = response.data.data;
      
      // Check if user needs to authenticate
      if (responseData.requiresAuth) {
        router.push('/login');
        return;
      }

      const documentId = responseData.document?.id;
      
      if (!documentId) {
        throw new Error('No document ID returned from server');
      }

      // Navigate to editor
      router.push(`/pdf-studio/editor/${documentId}`);
    } catch (error: any) {
      console.error('Failed to create document:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create document. Please try again.';
      toast.error(errorMessage);
      setCreatingDocument(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/pdf-studio" className="text-[#6B6B6B] hover:text-[#111111]">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#111111] flex items-center gap-2">
                <FileText className="w-6 h-6 text-[#4F7563]" />
                Structured Documents
              </h1>
              <p className="text-sm text-[#6B6B6B]">Professional business templates with guided creation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DOCUMENT_TEMPLATES.map((template) => {
            const Icon = template.icon;
            const colors = colorClasses[template.color];
            const isCreating = creatingDocument === template.id;
            
            return (
              <TemplateCard
                key={template.id}
                name={template.name}
                description={template.description}
                icon={Icon}
                iconColor={colors.icon}
                iconBg={colors.bg}
                onClick={() => handleCreateDocument(template.id, template.name)}
                isLoading={isCreating}
              />
            );
          })}
        </div>

        {/* Alternative CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12">
          <h3 className="text-2xl font-bold text-[#111111] mb-4">
            Need a Document Right Now?
          </h3>
          <p className="text-[#6B6B6B] mb-6 max-w-2xl mx-auto">
            The Smart PDF Builder can handle any business document template you need. 
            Just paste your content (notes, outline, draft, or anything), and we'll 
            structure it into a professional document automatically.
          </p>
          <Link
            href="/pdf-studio/smart-builder"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-colors shadow-lg"
          >
            <FileText className="w-6 h-6" />
            Go to Smart PDF Builder
          </Link>
        </div>
      </div>
    </div>
  );
}
