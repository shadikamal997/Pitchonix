import { WizardData } from '@/app/create/page';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Zap, BarChart3, DollarSign, FileText, ScrollText } from 'lucide-react';

interface Step6Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  documentType?: string;
}

const CONTENT_DEPTH_OPTIONS = [
  { value: 'concise', label: 'Concise', description: 'Bullet points, key messages only', slides: '5-10 slides' },
  { value: 'balanced', label: 'Balanced', description: 'Mix of bullets and details', slides: '10-15 slides', recommended: true },
  { value: 'detailed', label: 'Detailed', description: 'In-depth content, full explanations', slides: '15-25 slides' },
  { value: 'comprehensive', label: 'Comprehensive', description: 'Complete coverage, extensive details', slides: '25+ slides' },
];

const getSlideRecommendation = (docType: string) => {
  const recommendations: Record<string, { min: number; max: number; text: string }> = {
    pitch_deck: { min: 8, max: 20, text: 'Recommended: 10-15 slides for investor pitches' },
    business_plan: { min: 15, max: 35, text: 'Recommended: 20-30 slides for comprehensive business plans' },
    proposal: { min: 10, max: 25, text: 'Recommended: 12-18 slides for client proposals' },
    sales_deck: { min: 8, max: 18, text: 'Recommended: 10-12 slides for sales presentations' },
    one_pager: { min: 1, max: 1, text: 'Fixed at 1 slide for one-pagers' },
    case_study: { min: 5, max: 12, text: 'Recommended: 6-10 slides for case studies' },
    training_presentation: { min: 20, max: 50, text: 'Recommended: 25-40 slides for training materials' },
  };
  return recommendations[docType] || recommendations.pitch_deck;
};

const getDefaultFeatures = (docType: string) => {
  const defaults: Record<string, { charts: boolean; financials: boolean; notes: boolean; summary: boolean }> = {
    pitch_deck: { charts: true, financials: true, notes: true, summary: true },
    business_plan: { charts: true, financials: true, notes: true, summary: true },
    proposal: { charts: false, financials: false, notes: true, summary: true },
    sales_deck: { charts: true, financials: false, notes: true, summary: false },
    one_pager: { charts: false, financials: false, notes: false, summary: false },
    case_study: { charts: true, financials: false, notes: false, summary: true },
    training_presentation: { charts: false, financials: false, notes: true, summary: true },
  };
  return defaults[docType] || defaults.pitch_deck;
};

export default function Step6GenerationSettings({ data, onUpdate, documentType = 'pitch_deck' }: Step6Props) {
  const slideRec = getSlideRecommendation(documentType);
  const defaultFeatures = getDefaultFeatures(documentType);
  
  // For one-pager, lock to 1 slide
  const isOnePager = documentType === 'one_pager';
  const effectiveSlideCount = isOnePager ? 1 : data.slideCount;
  
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Generation Settings</h2>
        <p className="text-[#6B6B6B]">Customize how your presentation will be created</p>
      </div>

      {/* Slide Count */}
      {!isOnePager && (
        <div className="rounded-2xl border-2 border-[#F1F0EC] bg-white p-6 shadow-sm">
          <Label className="text-lg font-bold tracking-tight text-[#111111] mb-4 block">
            Number of Slides: <span className="text-[#4F7563]">{effectiveSlideCount}</span>
          </Label>
          
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[8, 10, 12, 14, 16, 20].filter(num => num >= slideRec.min && num <= slideRec.max).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onUpdate({ slideCount: num })}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  effectiveSlideCount === num
                    ? 'bg-[#4F7563] text-white shadow-lg shadow-green-500/30'
                    : 'bg-[#F1F0EC] text-[#111111] hover:bg-[#E3E1DA] border border-[#E3E1DA]'
                }`}
              >
                {num} slides
              </button>
            ))}
          </div>
          
          {/* Slider */}
          <Slider
            value={[effectiveSlideCount]}
            onValueChange={([value]) => onUpdate({ slideCount: value })}
            min={slideRec.min}
            max={slideRec.max}
            step={1}
            className="mt-4"
          />
          <div className="flex justify-between text-sm text-[#9A9A9A] mt-3">
            <span>{slideRec.min}</span>
            <span>{Math.floor((slideRec.min + slideRec.max) / 2)}</span>
            <span>{slideRec.max}</span>
          </div>
          <p className="text-sm text-[#6B6B6B] mt-4 p-3 bg-[#EEF5F1] rounded-lg border border-green-100">
            💡 {slideRec.text}
          </p>
        </div>
      )}
      
      {isOnePager && (
        <div className="p-4 rounded-xl bg-[#EEF5F1] border border-green-100">
          <p className="text-sm text-green-900">
            <strong>One-Pager Format:</strong> Fixed at 1 slide with all essential information on a single page.
          </p>
        </div>
      )}

      {/* Content Depth */}
      <div className="rounded-2xl border-2 border-[#F1F0EC] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-green-600 flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">📝</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-tight text-[#111111] mb-1">
              Content Depth <span className="text-[#D96A6A]">*</span>
            </h3>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">Choose how detailed your content should be</p>
          </div>
        </div>
        <RadioGroup value={data.contentDepth} onValueChange={(value) => onUpdate({ contentDepth: value })}>
          <div className="space-y-3">
            {CONTENT_DEPTH_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                  data.contentDepth === option.value
                    ? 'border-[#4F7563] bg-[#EEF5F1] shadow-lg shadow-green-500/20'
                    : 'border-[#E3E1DA] hover:border-[#A8B9AE]'
                }`}
              >
                <RadioGroupItem value={option.value} id={option.value} className="mt-1 mr-4" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#111111]">{option.label}</span>
                    {option.recommended && (
                      <span className="text-xs bg-[#DDE8E1] text-green-800 px-2 py-0.5 rounded-full font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#6B6B6B] mt-1">{option.description}</p>
                  <p className="text-xs text-[#9A9A9A] mt-1">{option.slides}</p>
                </div>
              </label>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Include Options */}
      <div className="rounded-2xl border-2 border-[#F1F0EC] bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">✨</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold tracking-tight text-[#111111] mb-1">What to Include</h3>
            <p className="text-sm text-[#6B6B6B] leading-relaxed">Customize your presentation features</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="flex items-start p-4 rounded-xl border-2 border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EEF5F1] cursor-pointer transition-all">
            <Checkbox
              checked={data.includeCharts}
              onCheckedChange={(checked) => onUpdate({ includeCharts: checked as boolean })}
              className="mt-1 mr-4"
            />
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-[#4F7563] mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Charts & Graphs</p>
                <p className="text-sm text-[#6B6B6B]">Visual data representations, growth charts, metrics</p>
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 rounded-xl border-2 border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EEF5F1] cursor-pointer transition-all">
            <Checkbox
              checked={data.includeFinancials}
              onCheckedChange={(checked) => onUpdate({ includeFinancials: checked as boolean })}
              className="mt-1 mr-4"
            />
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-[#4F7563] mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Financial Projections</p>
                <p className="text-sm text-[#6B6B6B]">Revenue forecasts, P&L, unit economics</p>
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 rounded-xl border-2 border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EEF5F1] cursor-pointer transition-all">
            <Checkbox
              checked={data.includeSpeakerNotes}
              onCheckedChange={(checked) => onUpdate({ includeSpeakerNotes: checked as boolean })}
              className="mt-1 mr-4"
            />
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-[#4F7563] mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Speaker Notes</p>
                <p className="text-sm text-[#6B6B6B]">Talking points and guidance for each slide</p>
              </div>
            </div>
          </label>

          <label className="flex items-start p-4 rounded-xl border-2 border-[#E3E1DA] hover:border-orange-300 hover:bg-[#FAEEDB] cursor-pointer transition-all">
            <Checkbox
              checked={data.includeExecutiveSummary}
              onCheckedChange={(checked) => onUpdate({ includeExecutiveSummary: checked as boolean })}
              className="mt-1 mr-4"
            />
            <div className="flex items-start gap-3">
              <ScrollText className="h-5 w-5 text-[#8c6210] mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Executive Summary</p>
                <p className="text-sm text-[#6B6B6B]">Opening slide with key highlights</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Generation Preview */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-[#DDE8E1]">
        <div className="flex items-start gap-3">
          <Zap className="h-6 w-6 text-[#4F7563] mt-1" />
          <div>
            <h4 className="font-semibold text-[#111111] mb-2">Ready to Generate</h4>
            <p className="text-sm text-[#111111] mb-3">
              Based on your settings, Pitchonix will create:
            </p>
            <ul className="space-y-1 text-sm text-[#111111]">
              <li>✓ {data.slideCount} professionally designed slides</li>
              <li>✓ {data.contentDepth === 'short' ? 'Concise' : data.contentDepth === 'balanced' ? 'Balanced' : 'Detailed'} content depth</li>
              <li>✓ {data.theme.replace('_', ' ')} theme with your brand colors</li>
              {data.includeCharts && <li>✓ Data visualizations and charts</li>}
              {data.includeFinancials && <li>✓ Financial projections</li>}
              {data.includeSpeakerNotes && <li>✓ Speaker notes for presenting</li>}
              {data.includeExecutiveSummary && <li>✓ Executive summary slide</li>}
            </ul>
            <p className="text-xs text-[#6B6B6B] mt-4">
              ⏱️ Estimated generation time: 30-60 seconds
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
