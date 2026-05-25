'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import { 
  ArrowLeft, 
  Palette, 
  FileText, 
  Image as ImageIcon,
  Layers,
  Sparkles,
  Award,
  TrendingUp,
  Target,
  Briefcase,
  Building,
  Users,
  Loader2
} from 'lucide-react';
import { TemplateCard } from '@/components/pdf-studio/StandardCard';
import { TemplatePreview } from '@/components/pdf-studio/TemplatePreview';
import api from '@/lib/api';

const VISUAL_TEMPLATES = [
  {
    id: 'modern_one_pager',
    name: 'Modern One Pager',
    description: 'Bold visual one-pager with hero image, key metrics, and modern design',
    icon: FileText,
    color: 'blue',
    category: 'Business Core',
    preview: '/templates/modern-one-pager.jpg',
  },
  {
    id: 'business_flyer',
    name: 'Business Flyer',
    description: 'Eye-catching flyer with image overlays and compelling CTA',
    icon: Sparkles,
    color: 'purple',
    category: 'Marketing',
    preview: '/templates/business-flyer.jpg',
  },
  {
    id: 'case_study_sheet',
    name: 'Case Study Sheet',
    description: 'Professional case study with results, metrics, and visuals',
    icon: Award,
    color: 'green',
    category: 'Sales & Client',
    preview: '/templates/case-study.jpg',
  },
  {
    id: 'startup_overview',
    name: 'Startup Overview',
    description: 'Pitch-style overview with team, traction, and product visuals',
    icon: TrendingUp,
    color: 'orange',
    category: 'Business Core',
    preview: '/templates/startup-overview.jpg',
  },
  {
    id: 'marketing_flyer',
    name: 'Marketing Flyer',
    description: 'Creative marketing flyer with gradient backgrounds and imagery',
    icon: Target,
    color: 'pink',
    category: 'Marketing',
    preview: '/templates/marketing-flyer.jpg',
  },
  {
    id: 'corporate_brochure',
    name: 'Corporate Brochure',
    description: 'Multi-section brochure with services, team, and portfolio',
    icon: Briefcase,
    color: 'indigo',
    category: 'Brand & Content',
    preview: '/templates/corporate-brochure.jpg',
  },
  {
    id: 'executive_handout',
    name: 'Executive Handout',
    description: 'Premium handout for conferences and executive meetings',
    icon: Building,
    color: 'teal',
    category: 'Business Core',
    preview: '/templates/executive-handout.jpg',
  },
  {
    id: 'product_flyer',
    name: 'Product Flyer',
    description: 'Product-focused flyer with features, benefits, and imagery',
    icon: Layers,
    color: 'cyan',
    category: 'Marketing',
    preview: '/templates/product-flyer.jpg',
  },
  {
    id: 'brand_overview',
    name: 'Brand Overview',
    description: 'Brand story document with mission, values, and visual identity',
    icon: Palette,
    color: 'rose',
    category: 'Brand & Content',
    preview: '/templates/brand-overview.jpg',
  },
  {
    id: 'promotional_sheet',
    name: 'Promotional Sheet',
    description: 'Promotional material with offers, benefits, and call-to-action',
    icon: Users,
    color: 'amber',
    category: 'Marketing',
    preview: '/templates/promotional-sheet.jpg',
  },
];

const colorClasses: Record<string, { bg: string; text: string; hover: string; icon: string; badge: string }> = {
  blue: { bg: 'bg-[#EEF5F1]', text: 'text-[#1A2D24]', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]', badge: 'bg-[#4F7563]' },
  purple: { bg: 'bg-[#EEF5F1]', text: 'text-purple-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]', badge: 'bg-[#4F7563]' },
  green: { bg: 'bg-[#EEF5F1]', text: 'text-[#1A2D24]', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]', badge: 'bg-[#4F7563]' },
  orange: { bg: 'bg-[#FAEEDB]', text: 'text-orange-900', hover: 'hover:bg-[#F5E1B7]', icon: 'text-[#8c6210]', badge: 'bg-[#D9A441]' },
  pink: { bg: 'bg-[#FCF1F1]', text: 'text-pink-900', hover: 'hover:bg-[#F7E3E3]', icon: 'text-[#9a3737]', badge: 'bg-[#D96A6A]' },
  indigo: { bg: 'bg-[#EEF5F1]', text: 'text-indigo-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#355846]', badge: 'bg-[#4F7563]' },
  teal: { bg: 'bg-[#EEF5F1]', text: 'text-teal-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]', badge: 'bg-[#4F7563]' },
  cyan: { bg: 'bg-[#EEF5F1]', text: 'text-cyan-900', hover: 'hover:bg-[#DDE8E1]', icon: 'text-[#4F7563]', badge: 'bg-[#4F7563]' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-900', hover: 'hover:bg-rose-100', icon: 'text-rose-600', badge: 'bg-rose-500' },
  amber: { bg: 'bg-[#FAEEDB]', text: 'text-amber-900', hover: 'hover:bg-[#F5E1B7]', icon: 'text-[#8c6210]', badge: 'bg-[#D9A441]' },
};

export default function VisualStudioPage() {
  const router = useRouter();
  const toast = useToast();
  const [creatingDocument, setCreatingDocument] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', 'Business Core', 'Marketing', 'Sales & Client', 'Brand & Content'];

  const filteredTemplates = selectedCategory === 'All' 
    ? VISUAL_TEMPLATES 
    : VISUAL_TEMPLATES.filter(t => t.category === selectedCategory);

  const handleCreateDocument = async (templateId: string) => {
    try {
      setCreatingDocument(templateId);

      const template = VISUAL_TEMPLATES.find(t => t.id === templateId);
      
      // Determine layout type based on template
      const layoutTypeMap: Record<string, string> = {
        'modern_one_pager': 'hero',
        'business_flyer': 'overlay',
        'case_study_sheet': 'split',
        'startup_overview': 'hero',
        'marketing_flyer': 'overlay',
        'corporate_brochure': 'editorial',
        'executive_handout': 'asymmetric',
        'product_flyer': 'split',
        'brand_overview': 'editorial',
        'promotional_sheet': 'overlay',
      };

      const layoutType = layoutTypeMap[templateId] || 'hero';
      
      // Create a new document using Smart PDF Builder endpoint with VISUAL COMPOSITION config
      const response = await api.post('/pdf-studio/smart-builder/generate', {
        rawContent: `# ${template?.name}\n\n## Overview\n\nStart creating your visual document here...\n\n## Key Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n## Call to Action\n\nYour compelling call to action goes here.`,
        config: {
          title: template?.name || 'Visual Document',
          designStyle: 'modern',
          tone: 'professional',
          improveWriting: true,
          fixGrammar: true,
          addStructure: true,
          includeCoverPage: true,
          includeTableOfContents: false,
          // NEW: Visual composition flags
          visualStyle: 'modern', // Signals this should use visual composition
          layoutType: layoutType, // hero, split, grid, overlay, asymmetric, editorial
          hasImages: false, // Will be true when user adds images
          hasCharts: false, // Will be true when user adds charts
        },
        // Mark document as visual type
        documentType: templateId,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#E3E1DA]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/pdf-studio" className="text-[#6B6B6B] hover:text-[#111111] transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-[#111111]">Visual Design Studio</h1>
                  <p className="text-sm text-[#6B6B6B]">Create stunning visual documents with modern layouts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100 to-pink-100 border border-orange-200 mb-6">
            <Sparkles className="w-4 h-4 text-[#8c6210]" />
            <span className="text-sm font-semibold text-orange-900">Canva-Style Visual Templates</span>
          </div>
          
          <h2 className="text-5xl font-bold text-[#111111] mb-4">
            Choose Your Visual Template
          </h2>
          <p className="text-xl text-[#6B6B6B] max-w-3xl mx-auto">
            Professional flyers, one-pagers, brochures, and marketing materials with image-driven layouts
          </p>
        </motion.div>

        {/* Category Filter */}
        <div className="flex items-center justify-center gap-3 mb-12 flex-wrap">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2.5 rounded-full font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-lg'
                  : 'bg-white text-[#111111] hover:bg-[#F1F0EC] border border-[#E3E1DA]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTemplates.map((template, index) => {
            const Icon = template.icon;
            const colors = colorClasses[template.color];
            const isCreating = creatingDocument === template.id;
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <button
                  onClick={() => !isCreating && handleCreateDocument(template.id)}
                  disabled={!!creatingDocument}
                  className="w-full text-left group bg-white rounded-2xl overflow-hidden border border-[#E3E1DA] hover:border-[#C9C6BD] hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                >
                  {/* SVG Preview thumbnail */}
                  <div className="relative bg-[#EDEBE6] overflow-hidden" style={{ height: 160 }}>
                    <TemplatePreview
                      templateId={template.id}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Category badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.45)' }}>
                      {template.category}
                    </div>
                    {isCreating && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  {/* Card info */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
                      </div>
                      <span className="font-semibold text-[#111111] text-sm">{template.name}</span>
                    </div>
                    <p className="text-xs text-[#9A9A9A] leading-relaxed">{template.description}</p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-20 text-center bg-[#263F34] rounded-[28px] p-10 text-white relative overflow-hidden"
        >
          <div className="absolute -top-20 right-20 w-72 h-72 bg-[#4F7563]/30 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 left-20 w-64 h-64 bg-[#7A988A]/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4">
              Need Something Custom?
            </h3>
            <p className="text-[#C9C6BD] mb-6 max-w-2xl mx-auto text-lg">
              Try the Smart PDF Builder for universal content support, or use Structured Documents for guided business templates.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/pdf-studio/smart-builder"
                className="px-8 py-4 bg-white text-[#111111] font-semibold rounded-xl hover:bg-[#F1F0EC] transition-colors shadow-lg"
              >
                Smart PDF Builder
              </Link>
              <Link
                href="/pdf-studio/structured"
                className="px-8 py-4 bg-slate-700 text-white font-semibold rounded-xl hover:bg-slate-600 transition-colors border border-slate-600"
              >
                Structured Documents
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
