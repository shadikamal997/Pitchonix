import { WizardData } from '@/app/create/page';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Step2Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  documentType?: string;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'E-commerce',
  'Education',
  'Real Estate',
  'Manufacturing',
  'Retail',
  'Entertainment',
  'Food & Beverage',
  'Transportation',
  'Energy',
  'Telecommunications',
  'Agriculture',
  'Consulting',
  'Marketing',
  'Other',
];

const BUSINESS_STAGES = [
  { value: 'idea', label: 'Idea Stage' },
  { value: 'pre_seed', label: 'Pre-Seed' },
  { value: 'seed', label: 'Seed' },
  { value: 'early_stage', label: 'Early Stage / Series A' },
  { value: 'growth', label: 'Growth / Series B+' },
  { value: 'established', label: 'Established Company' },
];

export default function Step2BusinessInfo({ data, onUpdate, documentType = 'pitch_deck' }: Step2Props) {
  // Show business stage only for investment-related documents
  const showBusinessStage = ['pitch_deck', 'business_plan', 'executive_summary'].includes(documentType);
  
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Tell us about your business</h2>
        <p className="text-gray-600">Basic information about your company</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Name */}
        <div className="md:col-span-2">
          <Label htmlFor="companyName" className="text-base">
            Company Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="companyName"
            value={data.companyName}
            onChange={(e) => onUpdate({ companyName: e.target.value })}
            placeholder="e.g., Acme Inc."
            className="mt-2"
            required
          />
        </div>

        {/* Industry */}
        <div>
          <Label htmlFor="industry" className="text-base">
            Industry <span className="text-red-500">*</span>
          </Label>
          <Select value={data.industry} onValueChange={(value) => onUpdate({ industry: value })}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry.toLowerCase()}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Business Stage - only for investment-related docs */}
        {showBusinessStage && (
          <div>
            <Label htmlFor="businessStage" className="text-base">
              Business Stage
            </Label>
            <Select value={data.businessStage} onValueChange={(value) => onUpdate({ businessStage: value })}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Country/Market */}
        <div>
          <Label htmlFor="country" className="text-base">
            Country / Market
          </Label>
          <Input
            id="country"
            value={data.country}
            onChange={(e) => onUpdate({ country: e.target.value })}
            placeholder="e.g., United States"
            className="mt-2"
          />
        </div>

        {/* Website */}
        <div>
          <Label htmlFor="website" className="text-base">
            Website
          </Label>
          <Input
            id="website"
            type="url"
            value={data.website}
            onChange={(e) => onUpdate({ website: e.target.value })}
            placeholder="https://yourcompany.com"
            className="mt-2"
          />
        </div>

        {/* Product/Service */}
        <div className="md:col-span-2">
          <Label htmlFor="productService" className="text-base">
            Product / Service
          </Label>
          <Input
            id="productService"
            value={data.productService}
            onChange={(e) => onUpdate({ productService: e.target.value })}
            placeholder="What do you offer?"
            className="mt-2"
          />
        </div>

        {/* Short Description */}
        <div className="md:col-span-2">
          <Label htmlFor="shortDescription" className="text-base">
            Short Description
          </Label>
          <Textarea
            id="shortDescription"
            value={data.shortDescription}
            onChange={(e) => onUpdate({ shortDescription: e.target.value })}
            placeholder="Briefly describe your company in 1-2 sentences"
            rows={3}
            className="mt-2"
          />
          <p className="text-sm text-gray-500 mt-1">
            This will be used as the tagline in your presentation
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Form completion</span>
          <span>{Math.round(((data.companyName ? 1 : 0) + (data.industry ? 1 : 0)) / 2 * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${((data.companyName ? 1 : 0) + (data.industry ? 1 : 0)) / 2 * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
