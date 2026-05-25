'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import TemplateGallery, { IndustryTemplate } from '@/components/templates/TemplateGallery';
import { WizardData } from '../create/page';

export default function TemplatesPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplatesPage />
    </Suspense>
  );
}

function TemplatesPage() {
  const router = useRouter();
  const [showTemplates, setShowTemplates] = useState(true);

  const handleSelectTemplate = (template: IndustryTemplate) => {
    // Convert template to WizardData and navigate to create page
    const wizardData: Partial<WizardData> = {
      documentType: template.documentType,
      companyName: template.prefilled.companyName,
      industry: template.prefilled.industry,
      shortDescription: template.prefilled.shortDescription,
      problem: template.prefilled.problem,
      solution: template.prefilled.solution,
      targetCustomers: template.prefilled.targetCustomers,
      marketOpportunity: template.prefilled.marketOpportunity,
      competitors: template.prefilled.competitors,
      differentiation: template.prefilled.differentiation,
      revenueModel: template.prefilled.revenueModel,
      pricing: template.prefilled.pricing,
      traction: template.prefilled.currentTraction,
      team: template.prefilled.team,
      fundingAsk: template.prefilled.fundingAsk,
      roadmap: template.prefilled.roadmap,
    };

    // Save to sessionStorage and navigate
    sessionStorage.setItem('selectedTemplate', JSON.stringify(wizardData));
    router.push('/create?template=true');
  };

  const handleCreateFromScratch = () => {
    sessionStorage.removeItem('selectedTemplate');
    router.push('/create');
  };

  return (
    <div>
      {showTemplates ? (
        <TemplateGallery
          onSelectTemplate={handleSelectTemplate}
          onCancel={handleCreateFromScratch}
        />
      ) : (
        <div className="min-h-screen bg-[#EDEBE6] flex items-center justify-center p-8">
          <div className="text-center max-w-lg">
            <div className="w-16 h-16 rounded-full bg-[#EEF5F1] text-[#4F7563] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="pn-h1 mb-3">Choose Your Starting Point</h1>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => setShowTemplates(true)}
                className="bg-[#4F7563] hover:bg-[#355846]"
              >
                Browse Templates
              </Button>
              <Button
                variant="outline"
                onClick={handleCreateFromScratch}
              >
                Start from Scratch
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
