'use client';

import { X, Sparkles, Building2, Users, Target, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IndustryTemplate } from './TemplateGallery';

interface TemplatePreviewModalProps {
  template: IndustryTemplate;
  onClose: () => void;
  onUse: (template: IndustryTemplate) => void;
}

export default function TemplatePreviewModal({
  template,
  onClose,
  onUse,
}: TemplatePreviewModalProps) {
  const { prefilled } = template;

  const handleUse = () => {
    onUse(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E3E1DA] p-6 flex items-center justify-between z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#111111]">{template.name}</h2>
              {template.popular && (
                <Badge className="bg-[#D9A441] text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Popular
                </Badge>
              )}
            </div>
            <p className="text-[#6B6B6B]">{template.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[#DDE8E1] text-[#355846]">
              {template.industry}
            </Badge>
            <Badge className="bg-[#DDE8E1] text-[#355846]">
              {template.documentType.replace('_', ' ')}
            </Badge>
            {template.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Preview Sections */}
          <div className="space-y-4">
            {/* Business Overview */}
            <PreviewSection
              icon={Building2}
              title="Business Overview"
              content={prefilled.shortDescription}
            />

            {/* Problem & Solution */}
            <div className="grid md:grid-cols-2 gap-4">
              <PreviewSection
                icon={Target}
                title="Problem"
                content={prefilled.problem}
                compact
              />
              <PreviewSection
                icon={Sparkles}
                title="Solution"
                content={prefilled.solution}
                compact
              />
            </div>

            {/* Market & Customers */}
            <div className="grid md:grid-cols-2 gap-4">
              <PreviewSection
                icon={Users}
                title="Target Customers"
                content={prefilled.targetCustomers}
                compact
              />
              <PreviewSection
                icon={DollarSign}
                title="Market Opportunity"
                content={prefilled.marketOpportunity}
                compact
              />
            </div>

            {/* Competitive Advantage */}
            <PreviewSection
              icon={Sparkles}
              title="Differentiation"
              content={prefilled.differentiation}
            />

            {/* Revenue Model */}
            <PreviewSection
              icon={DollarSign}
              title="Revenue Model"
              content={prefilled.revenueModel}
            />

            {/* Traction */}
            <PreviewSection
              icon={Target}
              title="Current Traction"
              content={prefilled.currentTraction}
            />

            {/* Expandable Sections */}
            <details className="bg-[#EDEBE6] rounded-lg p-4">
              <summary className="font-semibold text-[#111111] cursor-pointer">
                View More Details
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="font-medium text-[#111111] mb-2">Pricing</h4>
                  <p className="text-[#111111] text-sm">{prefilled.pricing}</p>
                </div>
                <div>
                  <h4 className="font-medium text-[#111111] mb-2">Competition</h4>
                  <p className="text-[#111111] text-sm">{prefilled.competitors}</p>
                </div>
                <div>
                  <h4 className="font-medium text-[#111111] mb-2">Team</h4>
                  <p className="text-[#111111] text-sm">{prefilled.team}</p>
                </div>
                <div>
                  <h4 className="font-medium text-[#111111] mb-2">Funding Ask</h4>
                  <p className="text-[#111111] text-sm">{prefilled.fundingAsk}</p>
                </div>
                <div>
                  <h4 className="font-medium text-[#111111] mb-2">Roadmap</h4>
                  <p className="text-[#111111] text-sm">{prefilled.roadmap}</p>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E3E1DA] p-6 flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUse}
            className="flex-1 bg-[#4F7563] hover:bg-[#355846]"
          >
            Use This Template
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PreviewSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string;
  compact?: boolean;
}

function PreviewSection({ icon: Icon, title, content, compact }: PreviewSectionProps) {
  return (
    <div className={`bg-[#EDEBE6] rounded-lg p-4 ${compact ? '' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-[#4F7563]" />
        <h3 className="font-semibold text-[#111111]">{title}</h3>
      </div>
      <p className="text-[#111111] text-sm leading-relaxed">{content}</p>
    </div>
  );
}
