import { WizardData } from '@/app/create/page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Target, Zap, Building, DollarSign, Globe, Shield } from 'lucide-react';

interface Step3Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  documentType?: string;
}

// Document-specific audience configurations
const getAudienceTypesForDoc = (docType: string) => {
  const baseTypes = [
    { value: 'investors', label: 'Investors', icon: DollarSign, description: 'VCs, angels, fundraising' },
    { value: 'customers', label: 'Customers', icon: Users, description: 'B2B or B2C clients' },
    { value: 'partners', label: 'Partners', icon: Zap, description: 'Strategic partnerships' },
    { value: 'internal', label: 'Internal Team', icon: Building, description: 'Employees, stakeholders' },
    { value: 'board', label: 'Board of Directors', icon: Shield, description: 'Board presentations' },
    { value: 'banks', label: 'Banks / Lenders', icon: Globe, description: 'Financial institutions' },
    { value: 'government', label: 'Government', icon: Target, description: 'Public sector, grants' },
  ];

  // Customize for specific document types
  if (docType === 'pitch_deck') {
    return baseTypes.filter(t => ['investors', 'partners', 'banks'].includes(t.value));
  }
  if (docType === 'sales_deck') {
    return baseTypes.filter(t => ['customers', 'partners'].includes(t.value));
  }
  if (docType === 'proposal') {
    return [
      { value: 'customers', label: 'Clients', icon: Users, description: 'Potential clients' },
      { value: 'partners', label: 'Partners', icon: Zap, description: 'Business partners' },
      { value: 'government', label: 'Government', icon: Target, description: 'Government agencies' },
    ];
  }
  if (docType === 'case_study') {
    return [
      { value: 'customers', label: 'Prospects', icon: Users, description: 'Potential customers' },
      { value: 'partners', label: 'Partners', icon: Zap, description: 'Strategic partners' },
    ];
  }
  if (docType === 'training_presentation') {
    return [
      { value: 'internal', label: 'Employees', icon: Building, description: 'Internal team' },
      { value: 'customers', label: 'Customers', icon: Users, description: 'External customers' },
      { value: 'partners', label: 'Partners', icon: Zap, description: 'Business partners' },
    ];
  }
  
  return baseTypes;
};

const getTitleForDoc = (docType: string) => {
  if (docType === 'proposal') return 'Who is the client?';
  if (docType === 'case_study') return 'Who is this case study for?';
  if (docType === 'training_presentation') return 'Who is the audience?';
  return 'Who is this for?';
};

const getDescriptionForDoc = (docType: string) => {
  if (docType === 'proposal') return 'Define your client and project goal';
  if (docType === 'case_study') return 'Define your target audience for this success story';
  if (docType === 'training_presentation') return 'Define your training audience and objectives';
  return 'Define your audience and communication goal';
};

const AUDIENCE_TYPES = [
  { value: 'investors', label: 'Investors', icon: DollarSign, description: 'VCs, angels, fundraising' },
  { value: 'customers', label: 'Customers', icon: Users, description: 'B2B or B2C clients' },
  { value: 'partners', label: 'Partners', icon: Zap, description: 'Strategic partnerships' },
  { value: 'internal', label: 'Internal Team', icon: Building, description: 'Employees, stakeholders' },
  { value: 'board', label: 'Board of Directors', icon: Shield, description: 'Board presentations' },
  { value: 'banks', label: 'Banks / Lenders', icon: Globe, description: 'Financial institutions' },
  { value: 'government', label: 'Government', icon: Target, description: 'Public sector, grants' },
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { value: 'investor-focused', label: 'Investor-Focused', description: 'Data-driven, ROI-oriented' },
  { value: 'luxury', label: 'Luxury', description: 'Premium and sophisticated' },
  { value: 'bold', label: 'Bold', description: 'Confident and assertive' },
  { value: 'simple', label: 'Simple', description: 'Clear and straightforward' },
  { value: 'technical', label: 'Technical', description: 'Detailed and precise' },
  { value: 'corporate', label: 'Corporate', description: 'Traditional business style' },
];

export default function Step3AudienceGoal({ data, onUpdate, documentType = 'pitch_deck' }: Step3Props) {
  const audienceTypes = getAudienceTypesForDoc(documentType);
  const title = getTitleForDoc(documentType);
  const description = getDescriptionForDoc(documentType);
  
  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">{title}</h2>
        <p className="text-[#6B6B6B]">{description}</p>
      </div>

      {/* Audience Selection */}
      <div>
        <Label className="text-base mb-4 block">
          Primary Audience <span className="text-[#D96A6A]">*</span>
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {audienceTypes.map((audience) => {
            const Icon = audience.icon;
            const isSelected = data.audience === audience.value;

            return (
              <button
                key={audience.value}
                onClick={() => onUpdate({ audience: audience.value })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-[#4F7563] bg-[#EEF5F1] shadow-md'
                    : 'border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EDEBE6]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isSelected ? 'text-[#4F7563]' : 'text-[#C9C6BD]'}`} />
                  <div>
                    <p className={`font-semibold ${isSelected ? 'text-[#1A2D24]' : 'text-[#111111]'}`}>
                      {audience.label}
                    </p>
                    <p className="text-sm text-[#6B6B6B]">{audience.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Purpose */}
      <div>
        <Label htmlFor="purpose" className="text-base">
          What is the purpose of this presentation?
        </Label>
        <Textarea
          id="purpose"
          value={data.purpose}
          onChange={(e) => onUpdate({ purpose: e.target.value })}
          placeholder="e.g., Raise Series A funding, secure partnership, win new clients..."
          rows={3}
          className="mt-2"
        />
      </div>

      {/* Desired Action */}
      <div>
        <Label htmlFor="desiredAction" className="text-base">
          What should the audience do after viewing?
        </Label>
        <Textarea
          id="desiredAction"
          value={data.desiredAction}
          onChange={(e) => onUpdate({ desiredAction: e.target.value })}
          placeholder="e.g., Schedule a meeting, invest $2M, sign partnership agreement..."
          rows={2}
          className="mt-2"
        />
      </div>

      {/* Tone Selection */}
      <div>
        <Label className="text-base mb-4 block">
          Communication Tone <span className="text-[#D96A6A]">*</span>
        </Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TONE_OPTIONS.map((tone) => {
            const isSelected = data.tone === tone.value;

            return (
              <button
                key={tone.value}
                onClick={() => onUpdate({ tone: tone.value })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? 'border-purple-500 bg-[#EEF5F1]'
                    : 'border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EDEBE6]'
                }`}
              >
                <p className={`font-semibold mb-1 ${isSelected ? 'text-purple-900' : 'text-[#111111]'}`}>
                  {tone.label}
                </p>
                <p className="text-sm text-[#6B6B6B]">{tone.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
