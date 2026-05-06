import { useState } from 'react';
import { WizardData } from '@/app/create/page';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Step4Props {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  documentType?: string;
}

const getTitleAndDescription = (docType: string) => {
  const configs: Record<string, { title: string; description: string }> = {
    pitch_deck: { title: 'Pitch Details', description: 'Problem, solution & market opportunity' },
    business_plan: { title: 'Business Model', description: 'How your business operates' },
    proposal: { title: 'Project Details', description: 'Client needs & your solution' },
    sales_deck: { title: 'Value Proposition', description: 'Why customers should buy' },
    case_study: { title: 'Customer Success Story', description: 'Challenge & results achieved' },
    one_pager: { title: 'Key Message', description: 'Your core value proposition' },
    training_presentation: { title: 'Learning Structure', description: 'Objectives & content modules' },
  };
  return configs[docType] || configs.pitch_deck;
};

const TABS = [
  { id: 'core', label: 'Core Business' },
  { id: 'market', label: 'Market' },
  { id: 'traction', label: 'Traction & Team' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Step4BusinessDetails({ data, onUpdate, documentType = 'pitch_deck' }: Step4Props) {
  const { title, description } = getTitleAndDescription(documentType);
  const [activeTab, setActiveTab] = useState<TabId>('core');

  // One-Pager simplified view
  if (documentType === 'one_pager') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <div>
          <Label htmlFor="problem">Key Message <span className="text-red-500">*</span></Label>
          <Textarea
            id="problem"
            value={data.problem}
            onChange={(e) => onUpdate({ problem: e.target.value })}
            placeholder="Concise core message for your one-pager. What's the single most important thing to communicate?"
            rows={5}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="solution">Supporting Details</Label>
          <Textarea
            id="solution"
            value={data.solution}
            onChange={(e) => onUpdate({ solution: e.target.value })}
            placeholder="Brief supporting information, key facts, or call to action"
            rows={4}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  // Case Study view
  if (documentType === 'case_study') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <div>
          <Label htmlFor="problem">Customer Challenge <span className="text-red-500">*</span></Label>
          <Textarea id="problem" value={data.problem} onChange={(e) => onUpdate({ problem: e.target.value })} placeholder="What challenge was the customer facing? What was the business impact?" rows={4} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="solution">Solution Implemented <span className="text-red-500">*</span></Label>
          <Textarea id="solution" value={data.solution} onChange={(e) => onUpdate({ solution: e.target.value })} placeholder="What solution did you provide? What was the implementation process?" rows={4} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="traction">Results & Impact <span className="text-red-500">*</span></Label>
          <Textarea id="traction" value={data.traction} onChange={(e) => onUpdate({ traction: e.target.value })} placeholder="Quantifiable results: ROI, cost savings, growth metrics, time saved, etc." rows={4} className="mt-1" />
          <p className="text-xs text-gray-500 mt-1">Use specific numbers: "50% cost reduction" or "$500K annual savings"</p>
        </div>
      </div>
    );
  }

  // Training Presentation view
  if (documentType === 'training_presentation') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <div>
          <Label htmlFor="problem">Learning Objectives <span className="text-red-500">*</span></Label>
          <Textarea id="problem" value={data.problem} onChange={(e) => onUpdate({ problem: e.target.value })} placeholder="What will participants learn? List 3-5 key learning outcomes." rows={4} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="solution">Content Modules <span className="text-red-500">*</span></Label>
          <Textarea id="solution" value={data.solution} onChange={(e) => onUpdate({ solution: e.target.value })} placeholder="Main topics and modules. Outline the training structure." rows={5} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="targetCustomers">Activities & Assessments</Label>
          <Textarea id="targetCustomers" value={data.targetCustomers} onChange={(e) => onUpdate({ targetCustomers: e.target.value })} placeholder="Exercises, quizzes, hands-on activities, discussion questions" rows={3} className="mt-1" />
        </div>
      </div>
    );
  }

  // Proposal view
  if (documentType === 'proposal') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-gray-500 mt-1">{description}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Client Needs</h3>
            <div>
              <Label htmlFor="problem">Client's Challenge <span className="text-red-500">*</span></Label>
              <Textarea id="problem" value={data.problem} onChange={(e) => onUpdate({ problem: e.target.value })} placeholder="What problem or opportunity does the client have?" rows={4} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="targetCustomers">Client Goals</Label>
              <Textarea id="targetCustomers" value={data.targetCustomers} onChange={(e) => onUpdate({ targetCustomers: e.target.value })} placeholder="What does the client want to achieve?" rows={3} className="mt-1" />
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Your Solution</h3>
            <div>
              <Label htmlFor="solution">Proposed Solution <span className="text-red-500">*</span></Label>
              <Textarea id="solution" value={data.solution} onChange={(e) => onUpdate({ solution: e.target.value })} placeholder="What will you deliver? Describe your approach and methodology." rows={4} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="roadmap">Deliverables & Timeline</Label>
              <Textarea id="roadmap" value={data.roadmap} onChange={(e) => onUpdate({ roadmap: e.target.value })} placeholder="Key deliverables and project timeline" rows={3} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="pricing">Investment</Label>
              <Textarea id="pricing" value={data.pricing} onChange={(e) => onUpdate({ pricing: e.target.value })} placeholder="Pricing, payment terms, packages" rows={3} className="mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default view: pitch_deck, business_plan, sales_deck, etc.
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>

      {/* Simple tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Core Business */}
      {activeTab === 'core' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="problem">The Problem <span className="text-red-500">*</span></Label>
            <p className="text-xs text-gray-500 mb-1">Pain point your customers face</p>
            <Textarea
              id="problem"
              value={data.problem}
              onChange={(e) => onUpdate({ problem: e.target.value })}
              placeholder="Describe the pain point your customers face. Be specific and focus on impact."
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="solution">Your Solution <span className="text-red-500">*</span></Label>
            <p className="text-xs text-gray-500 mb-1">How your product/service solves it</p>
            <Textarea
              id="solution"
              value={data.solution}
              onChange={(e) => onUpdate({ solution: e.target.value })}
              placeholder="Explain how your product/service solves the problem. What makes it unique?"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="targetCustomers">Target Customers</Label>
            <p className="text-xs text-gray-500 mb-1">Who needs this most</p>
            <Textarea
              id="targetCustomers"
              value={data.targetCustomers}
              onChange={(e) => onUpdate({ targetCustomers: e.target.value })}
              placeholder="Example: B2B SaaS companies with 50-500 employees, struggling with customer retention"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="differentiation">Differentiation</Label>
            <p className="text-xs text-gray-500 mb-1">Your competitive advantage</p>
            <Textarea
              id="differentiation"
              value={data.differentiation}
              onChange={(e) => onUpdate({ differentiation: e.target.value })}
              placeholder="Example: Our AI reduces churn by 40% vs traditional methods, with patented technology"
              rows={5}
            />
          </div>
        </div>
      )}

      {/* Market */}
      {activeTab === 'market' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="marketOpportunity">Market Opportunity</Label>
            <p className="text-xs text-gray-500 mb-1">TAM/SAM/SOM and growth rate</p>
            <Textarea
              id="marketOpportunity"
              value={data.marketOpportunity}
              onChange={(e) => onUpdate({ marketOpportunity: e.target.value })}
              placeholder="Example: $50B TAM, $8B SAM, targeting $200M SOM. Market growing 15% annually"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="competitors">Competitors</Label>
            <p className="text-xs text-gray-500 mb-1">Main competitors and their weaknesses</p>
            <Textarea
              id="competitors"
              value={data.competitors}
              onChange={(e) => onUpdate({ competitors: e.target.value })}
              placeholder="Example: Competitor A is market leader but expensive. We offer enterprise features at SMB pricing"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="revenueModel">Revenue Model</Label>
            <p className="text-xs text-gray-500 mb-1">How you make money</p>
            <Textarea
              id="revenueModel"
              value={data.revenueModel}
              onChange={(e) => onUpdate({ revenueModel: e.target.value })}
              placeholder="Example: SaaS subscription (80%): $99/mo starter, $299/mo pro, $999/mo enterprise"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="pricing">Pricing Strategy</Label>
            <p className="text-xs text-gray-500 mb-1">Tiers, deal size, unit economics</p>
            <Textarea
              id="pricing"
              value={data.pricing}
              onChange={(e) => onUpdate({ pricing: e.target.value })}
              placeholder="Example: 3 tiers — Basic $49/mo, Pro $199/mo, Enterprise $999/mo. ACV $2,400"
              rows={5}
            />
          </div>
        </div>
      )}

      {/* Traction & Team */}
      {activeTab === 'traction' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="traction">Traction & Metrics</Label>
            <p className="text-xs text-gray-500 mb-1">Revenue, users, growth, milestones</p>
            <Textarea
              id="traction"
              value={data.traction}
              onChange={(e) => onUpdate({ traction: e.target.value })}
              placeholder="Example: $50K MRR growing 20% monthly, 5,000 active users, 85% retention"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="team">Team</Label>
            <p className="text-xs text-gray-500 mb-1">Key members, experience, advisors</p>
            <Textarea
              id="team"
              value={data.team}
              onChange={(e) => onUpdate({ team: e.target.value })}
              placeholder="Example: John Doe (CEO) — 15 years in SaaS, ex-VP at Google. Jane Smith (CTO) — Ex-Amazon"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="fundingAsk">Funding Ask</Label>
            <p className="text-xs text-gray-500 mb-1">Amount and use of funds (optional)</p>
            <Textarea
              id="fundingAsk"
              value={data.fundingAsk}
              onChange={(e) => onUpdate({ fundingAsk: e.target.value })}
              placeholder="Example: Raising $2M seed. 40% product, 30% marketing, 20% team, 10% operations"
              rows={5}
            />
          </div>
          <div>
            <Label htmlFor="roadmap">Roadmap & Vision</Label>
            <p className="text-xs text-gray-500 mb-1">Next 12–24 months milestones</p>
            <Textarea
              id="roadmap"
              value={data.roadmap}
              onChange={(e) => onUpdate({ roadmap: e.target.value })}
              placeholder="Example: Q1: Launch mobile app. Q2: Expand to Europe. Q3: AI features. Q4: Enterprise tier"
              rows={5}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">You can skip optional fields now and fill them in later.</p>
    </div>
  );
}
