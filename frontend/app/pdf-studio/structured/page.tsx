'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, Briefcase, Building, TrendingUp, DollarSign, Users, PieChart, File } from 'lucide-react';

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
  blue: { bg: 'bg-blue-50', text: 'text-blue-900', hover: 'hover:bg-blue-100', icon: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-900', hover: 'hover:bg-green-100', icon: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-900', hover: 'hover:bg-purple-100', icon: 'text-purple-600' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-900', hover: 'hover:bg-orange-100', icon: 'text-orange-600' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-900', hover: 'hover:bg-pink-100', icon: 'text-pink-600' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-900', hover: 'hover:bg-yellow-100', icon: 'text-yellow-600' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-900', hover: 'hover:bg-teal-100', icon: 'text-teal-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-900', hover: 'hover:bg-indigo-100', icon: 'text-indigo-600' },
};

export default function StructuredDocumentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/pdf-studio" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-green-500" />
                Structured Documents
              </h1>
              <p className="text-sm text-gray-600">Professional business templates with guided creation</p>
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
            
            return (
              <Link
                key={template.id}
                href="/pdf-studio/smart-builder"
                className={`relative bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-md hover:border-${template.color}-300 transition-all p-6`}
              >
                <div className={`w-14 h-14 ${colors.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`w-7 h-7 ${colors.icon}`} />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {template.name}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {template.description}
                </p>
                
                <div className="flex items-center text-sm font-medium text-blue-600">
                  Create Document
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Alternative CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Need a Document Right Now?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
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
