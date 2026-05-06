import { Injectable } from '@nestjs/common';

export interface IndustryTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  documentType: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  popular: boolean;
  prefilled: {
    companyName: string;
    industry: string;
    shortDescription: string;
    problem: string;
    solution: string;
    targetCustomers: string;
    marketOpportunity: string;
    competitors: string;
    differentiation: string;
    revenueModel: string;
    pricing: string;
    currentTraction: string;
    team: string;
    fundingAsk: string;
    roadmap: string;
  };
}

@Injectable()
export class TemplateService {
  private templates: IndustryTemplate[] = [
    // ===== SaaS/Technology Templates =====
    {
      id: 'saas-b2b-crm',
      name: 'B2B SaaS - CRM Platform',
      category: 'technology',
      industry: 'Technology',
      documentType: 'pitch_deck',
      description: 'Enterprise CRM platform pitch deck template',
      tags: ['saas', 'b2b', 'crm', 'enterprise'],
      popular: true,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Technology',
        shortDescription: 'AI-powered CRM that helps sales teams close 30% more deals',
        problem: 'Sales teams waste 60% of their time on manual data entry and struggle to identify high-value opportunities. Legacy CRMs are complex, expensive ($100/user/month), and require 3-month implementation.',
        solution: 'Modern, AI-powered CRM with automated data capture, intelligent lead scoring, and predictive analytics. Setup in 5 minutes, not 3 months. Smart workflows that adapt to your sales process.',
        targetCustomers: 'Mid-market B2B companies (100-1000 employees) with 10-50 person sales teams. Technology, Professional Services, and Manufacturing sectors.',
        marketOpportunity: 'TAM: $50B (Global CRM market), SAM: $8B (Mid-market segment), SOM: $800M (Realistic 3-year capture at 10% market penetration)',
        competitors: 'Salesforce ($150/user, complex), HubSpot ($100/user, limited AI), Pipedrive ($50/user, basic features), Manual spreadsheets (free, chaotic)',
        differentiation: 'AI-first approach: Auto-captures data from emails/calls, predicts deal outcomes with 85% accuracy, 10x faster setup than Salesforce, 40% lower cost, built-in coaching for sales reps',
        revenueModel: 'SaaS subscription model: Starter ($29/user/month), Professional ($79/user/month), Enterprise ($149/user/month + custom features). Annual contracts with 15% discount.',
        pricing: 'Starter: $29/user/mo (5-10 users, basic CRM), Pro: $79/user/mo (unlimited users, AI features, integrations), Enterprise: $149/user/mo (custom workflows, dedicated support, API access)',
        currentTraction: '1,200 customers, $500K MRR growing 25% month-over-month, 92% retention rate, NPS score of 68, $60K average contract value, 4-week average sales cycle',
        team: 'CEO: Former VP Sales at Salesforce (10 years CRM experience), CTO: Ex-Google ML Engineer (built recommendation systems), VP Product: Designed HubSpot features used by 100K+ users',
        fundingAsk: '$3M Series A to expand sales team (10 AEs), build advanced AI features, and scale customer success operations. Target: 5,000 customers, $5M ARR in 18 months.',
        roadmap: 'Q1: Launch mobile app + advanced forecasting, Q2: Release marketplace for 3rd-party integrations, Q3: International expansion (EU/UK), Q4: AI sales assistant that writes emails',
      },
    },
    {
      id: 'saas-ai-analytics',
      name: 'AI Analytics Platform',
      category: 'technology',
      industry: 'Technology',
      documentType: 'pitch_deck',
      description: 'AI-powered analytics and business intelligence platform',
      tags: ['saas', 'ai', 'analytics', 'data'],
      popular: true,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Technology',
        shortDescription: 'Natural language analytics - ask questions, get instant insights',
        problem: 'Business users wait days for data teams to create reports. Traditional BI tools (Tableau, Power BI) require SQL knowledge and take weeks to learn. Companies make decisions on gut feeling, not data.',
        solution: 'AI analytics platform where anyone can ask questions in plain English and get instant visualizations. "Show me sales by region last quarter" → instant chart. No coding, no waiting, no data team bottleneck.',
        targetCustomers: 'E-commerce, SaaS, and retail companies ($5M-$100M revenue) with 50-500 employees. Decision-makers who need data but lack technical skills.',
        marketOpportunity: 'TAM: $35B (Business Intelligence market), SAM: $6B (SMB segment), SOM: $600M (Target 10% of SMBs needing accessible analytics)',
        competitors: 'Tableau ($70/user, complex), Power BI ($10/user, technical), Looker ($50/user, requires SQL knowledge), Google Analytics (free, limited), Excel (everywhere, manual)',
        differentiation: 'Natural language interface (no SQL needed), AI automatically finds insights and anomalies, connects to 200+ data sources in 1-click, 10x faster than traditional BI, real-time alerts',
        revenueModel: 'SaaS subscription: Growth ($49/user/month for up to 10 users), Business ($149/user/month unlimited users), Enterprise ($499/month for teams of 50+). Usage-based pricing for API calls.',
        pricing: 'Growth: $49/user/mo (3-10 users, unlimited dashboards, standard connectors), Business: $149/user/mo (custom SQL, API access, white-label), Enterprise: Custom (SSO, on-premise, SLA)',
        currentTraction: '850 companies, $320K MRR, 18% month-over-month growth, 88% retention, Featured in TechCrunch, 4.7★ on G2 (250+ reviews), $8K average LTV per customer',
        team: 'CEO: Former product lead at Google Analytics (500M users), CTO: PhD in ML from Stanford (published 15 papers on NLP), Head of Data: Built data infrastructure at Airbnb',
        fundingAsk: '$2.5M Seed round to build AI features (auto-insights, predictive analytics), hire 3 ML engineers, and launch European expansion. 12-month runway to profitability.',
        roadmap: 'Q1: Predictive analytics (forecast revenue/churn), Q2: Collaborative dashboards + sharing, Q3: Mobile app (iOS/Android), Q4: Embedded analytics (white-label for SaaS products)',
      },
    },
    {
      id: 'saas-hr-tech',
      name: 'HR Tech - Talent Management',
      category: 'technology',
      industry: 'Technology',
      documentType: 'pitch_deck',
      description: 'Modern talent management and employee engagement platform',
      tags: ['saas', 'hr', 'recruiting', 'engagement'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Technology',
        shortDescription: 'All-in-one platform for hiring, onboarding, and retaining top talent',
        problem: 'Companies use 8+ tools for HR (recruiting, onboarding, engagement, performance). Disjointed experience, data silos, $500/employee/year in software costs. 70% of employees disengaged.',
        solution: 'Unified platform: AI-powered recruiting (auto-screens 100 resumes in minutes), automated onboarding (new hires productive Day 1), continuous feedback (replaces annual reviews), predictive churn analytics.',
        targetCustomers: 'Fast-growing tech companies (50-500 employees) hiring 5+ people per month. HR leaders frustrated with outdated tools. Companies in SF, NYC, Austin, Seattle.',
        marketOpportunity: 'TAM: $20B (HR Tech market), SAM: $4B (Mid-market tech companies), SOM: $400M (Capture 10% of companies with 50-500 employees)',
        competitors: 'Workday ($150/employee, enterprise-focused), BambooHR ($8/employee, basic features), Greenhouse ($6K/month, recruiting only), Manual processes (spreadsheets, email)',
        differentiation: 'First all-in-one platform: hiring → onboarding → engagement in one system. AI predicts employee churn 90 days early. Mobile-first (millennials live on phones). 1/3 the cost of competitors.',
        revenueModel: 'Per-employee pricing: Starter ($8/employee/month for <100 employees), Growth ($12/employee/month for 100-500), Enterprise ($16/employee/month for 500+). Annual contracts.',
        pricing: 'Starter: $8/employee/mo (core HR, recruiting), Growth: $12/employee/mo (+ engagement surveys, analytics), Enterprise: $16/employee/mo (+ churn prediction, API, SSO)',
        currentTraction: '320 companies, 45,000 employees on platform, $180K MRR, 95% retention (best in category), customers include fast-growing startups, 6-month payback period',
        team: 'CEO: Former Head of People at Stripe (scaled from 200 to 2,000 employees), CTO: Ex-LinkedIn engineer (built recruiting tools), VP Product: Designed onboarding flows at Airbnb',
        fundingAsk: '$4M Series A for product development (performance management module), sales expansion (hire 8 AEs), and international launch (UK, Germany). Target 1,000 companies by 2027.',
        roadmap: 'Q1: Performance management (continuous feedback, goals), Q2: Learning management system (courses, certifications), Q3: People analytics dashboard, Q4: AI career pathing',
      },
    },

    // ===== Fintech Templates =====
    {
      id: 'fintech-payments',
      name: 'Fintech - Payment Platform',
      category: 'fintech',
      industry: 'Finance',
      documentType: 'pitch_deck',
      description: 'Next-generation payment processing platform',
      tags: ['fintech', 'payments', 'b2b', 'api'],
      popular: true,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Finance',
        shortDescription: 'Modern payment API for the next generation of internet businesses',
        problem: 'Stripe is expensive (2.9% + 30¢), PayPal is clunky, banks take 3-5 days to settle. Businesses lose 3% margin to payment fees. International payments cost 5-7%. Chargebacks are manual nightmares.',
        solution: 'Payment API with: blockchain settlement (instant, not 3 days), ML fraud detection (reduce chargebacks 80%), dynamic routing (automatically use cheapest processor), transparent pricing (flat 1.9%).',
        targetCustomers: 'E-commerce businesses ($1M-$50M GMV), SaaS companies (subscription billing), marketplaces (split payments). Tech-savvy founders who want modern infrastructure.',
        marketOpportunity: 'TAM: $250B (Global payment processing market), SAM: $30B (Online payments in US/EU), SOM: $3B (Capture 10% of businesses seeking Stripe alternatives)',
        competitors: 'Stripe (2.9%, dominant), Square (2.6%, retail-focused), PayPal (3.5%, legacy), Adyen (custom pricing, enterprise), crypto (volatile, complex)',
        differentiation: '35% cheaper than Stripe, instant settlement (not T+2), built-in fraud detection (saves 2% of revenue), one API for 150+ countries, supports crypto payments, carbon-neutral',
        revenueModel: 'Transaction fees: 1.9% + 20¢ per transaction (vs Stripe 2.9% + 30¢). Additional revenue from currency conversion (0.5%), instant payouts ($5/transaction), premium support.',
        pricing: 'Standard: 1.9% + 20¢ (all features included, no hidden fees), Volume: 1.5% + 15¢ (>$1M monthly), Enterprise: Custom (dedicated infrastructure, SLA)',
        currentTraction: '2,400 businesses, $120M GMV per month, $2.3M monthly revenue, 22% month-over-month growth, 98% uptime, processing payments in 45 countries',
        team: 'CEO: Ex-Stripe engineer (built Stripe Connect), CFO: Former PayPal executive (managed $10B portfolio), CTO: Security researcher (found vulnerabilities in major banks)',
        fundingAsk: '$8M Series A to obtain payment licenses (EU, Asia), build compliance team, scale infrastructure, and launch crypto on-ramp. Goal: $1B GMV monthly by end of 2027.',
        roadmap: 'Q1: Launch EU operations (SEPA, PSD2 compliance), Q2: Crypto payments (Bitcoin, USDC), Q3: Buy-now-pay-later (installments), Q4: Banking-as-a-service (issue cards)',
      },
    },
    {
      id: 'fintech-neobank',
      name: 'Fintech - Neobank for SMBs',
      category: 'fintech',
      industry: 'Finance',
      documentType: 'pitch_deck',
      description: 'Digital banking platform designed for small businesses',
      tags: ['fintech', 'banking', 'b2b', 'smb'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Finance',
        shortDescription: 'Banking, bookkeeping, and tax filing - all in one app for small businesses',
        problem: 'Small businesses juggle 5 tools: bank account (Chase), bookkeeping (QuickBooks $50/mo), invoicing (FreshBooks $30/mo), tax prep (H&R Block $200/year), payroll (Gusto $40/mo). Total: $200/month chaos.',
        solution: 'All-in-one business banking app: free checking account, automatic expense categorization, one-click invoicing, integrated tax filing, payroll in 3 clicks. Replace 5 tools with 1.',
        targetCustomers: 'Freelancers, solopreneurs, and small businesses (1-10 employees) with $100K-$2M annual revenue. Service-based businesses: consultants, agencies, contractors.',
        marketOpportunity: 'TAM: $12B (SMB banking + fintech tools market), SAM: $3B (Freelancers and micro-businesses in US), SOM: $300M (Capture 10% of solopreneurs and SMBs)',
        competitors: 'Traditional banks (Chase, Wells Fargo: slow, fees), Brex (venture-backed startups only), Mercury ($20/mo, limited features), QuickBooks ($50/mo, not a bank)',
        differentiation: 'True all-in-one: banking + bookkeeping + taxes in one app. Free checking (vs $15/mo at banks), automatic categorization (save 5 hours/month), integrated tax filing (save $500/year).',
        revenueModel: 'Freemium: Free checking account (make money on interchange fees), Premium $20/month (unlimited transactions, priority support), Plus $50/month (payroll, advanced tax features).',
        pricing: 'Free: Basic checking, debit card, mobile deposits, Premium: $20/mo (+ unlimited transfers, tax filing, bookkeeping), Plus: $50/mo (+ payroll, multi-user access, API)',
        currentTraction: '18,000 business accounts, $240M deposits, $85K monthly revenue (interchange + subscriptions), 15% take rate on deposits, 4.6★ App Store rating (8,000 reviews)',
        team: 'CEO: Former product manager at Square (launched Square Banking), CFO: Ex-Goldman Sachs (structured finance), CPO: Designed Venmo user experience',
        fundingAsk: '$5M Series A for banking license acquisition, product development (lending, corporate cards), and customer acquisition (target 100K businesses in 18 months).',
        roadmap: 'Q1: Launch business loans (up to $100K credit lines), Q2: Corporate cards (2% cashback), Q3: International payments (50 countries), Q4: Embedded banking API (white-label)',
      },
    },

    // ===== E-commerce Templates =====
    {
      id: 'ecommerce-dtc-brand',
      name: 'DTC Brand - Sustainable Products',
      category: 'ecommerce',
      industry: 'E-commerce',
      documentType: 'pitch_deck',
      description: 'Direct-to-consumer sustainable product brand',
      tags: ['ecommerce', 'dtc', 'sustainability', 'consumer'],
      popular: true,
      prefilled: {
        companyName: '[Your Brand]',
        industry: 'E-commerce',
        shortDescription: 'Sustainable [product category] that don\'t compromise on quality or style',
        problem: 'Consumers want sustainable products but current options are: expensive ($100+ for basics), poor quality (fall apart after 6 months), boring designs (beige everything). 73% of millennials willing to pay more for sustainable brands.',
        solution: 'Premium sustainable [products] at accessible prices ($39-$79). Made from recycled materials, carbon-neutral shipping, stylish designs. For every purchase, plant a tree. Quality guarantee: if it breaks in 2 years, free replacement.',
        targetCustomers: 'Environmentally conscious millennials and Gen Z (25-40 years old, $50K+ income) in urban areas. Values sustainability but won\'t sacrifice quality. Shops online, influenced by Instagram/TikTok.',
        marketOpportunity: 'TAM: $8B (Sustainable consumer goods market), SAM: $2B ([Product category] segment), SOM: $200M (Realistic 10% market share in online sustainable [products])',
        competitors: 'Traditional brands (Amazon Basics: cheap, unsustainable), Luxury eco brands (Patagonia: expensive $150+), Generic sustainable brands (poor quality, no brand loyalty)',
        differentiation: 'Accessible pricing (40% cheaper than Patagonia), superior quality (2-year guarantee vs industry standard 90 days), influencer-worthy design, carbon-negative (not just neutral), transparent supply chain.',
        revenueModel: 'Direct-to-consumer e-commerce: 70% online sales (Shopify store), 20% Amazon/marketplaces, 10% wholesale to boutiques. Gross margin: 65%, AOV: $85, repeat rate: 35%.',
        pricing: 'Core Products: $39-$59 (t-shirts, basics), Premium Line: $79-$129 (jackets, specialty items), Subscription Box: $49/month (curated sustainable products, 15% discount)',
        currentTraction: '42,000 customers, $180K monthly revenue, 25% month-over-month growth, 35% repeat purchase rate, 4.8★ average review (6,500 reviews), CAC: $25, LTV: $180 (CAC/LTV = 7.2x)',
        team: 'Founder: Fashion industry veteran (10 years at Everlane), Head of Sustainability: Worked at Patagonia on supply chain, CMO: Grew DTC brand from $0 to $20M at Allbirds',
        fundingAsk: '$2M Seed to scale production (launch 15 new SKUs), expand marketing (influencer partnerships, paid ads), and build retail presence (pop-up stores in 5 cities).',
        roadmap: 'Q1: Launch premium jacket line ($129), Q2: Open first retail pop-up (SF), Q3: Expand to EU markets, Q4: Launch subscription box program, 2027: Wholesale partnerships with Nordstrom',
      },
    },

    // ===== Healthcare Templates =====
    {
      id: 'healthcare-telemedicine',
      name: 'Healthcare - Telemedicine Platform',
      category: 'healthcare',
      industry: 'Healthcare',
      documentType: 'pitch_deck',
      description: 'Virtual care platform connecting patients with specialists',
      tags: ['healthcare', 'telemedicine', 'telehealth', 'b2c'],
      popular: true,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Healthcare',
        shortDescription: 'See a doctor in 15 minutes from your phone - $39 per visit',
        problem: 'Patients wait 21 days for doctor appointments, spend 2 hours in waiting rooms, pay $150+ copays. 30% of ER visits could be handled virtually. Rural areas have no specialists within 50 miles.',
        solution: 'Telemedicine platform: video consultations in 15 minutes, prescriptions sent to your pharmacy instantly, follow-ups via text, AI triage, accept insurance. Board-certified doctors licensed in all 50 states.',
        targetCustomers: 'Busy professionals (no time for in-person visits), parents with sick kids, rural residents (limited local care), uninsured (affordable option), chronic disease management (frequent check-ins).',
        marketOpportunity: 'TAM: $65B (US telehealth market), SAM: $15B (On-demand virtual care), SOM: $1.5B (Capture 10% of episodic virtual visits in 5 years)',
        competitors: 'Teladoc ($75/visit, long wait times), MDLive ($80/visit, no mental health), Urgent care ($150, have to leave home), Traditional doctors ($200, 3-week wait)',
        differentiation: '15-minute average wait (vs 45 min competitors), AI symptoms checker (route to right specialist), mental health integrated, $39 flat fee (transparent pricing), mobile-first experience.',
        revenueModel: 'Per-visit fees: $39 per consultation (cash pay), $15 copay (insurance), Subscriptions: $19/month unlimited visits, B2B: $5/employee/month (corporate wellness programs).',
        pricing: 'Pay-per-visit: $39 (general care), $59 (specialist), $89 (therapy session), Subscription: $19/mo (unlimited visits, priority access), Family Plan: $49/mo (cover 4 people)',
        currentTraction: '125,000 registered users, 18,000 visits per month, $680K monthly revenue, 35% month-over-month growth, 4.7★ App Store rating, partnered with 5 major insurance providers',
        team: 'CEO: Emergency room doctor (10 years clinical experience), CTO: Built telehealth infrastructure at Kaiser Permanente, CMO: Growth marketing at Oscar Health (acquired 2M members)',
        fundingAsk: '$6M Series A to expand provider network (hire 100 doctors), obtain insurance contracts (Anthem, UnitedHealthcare), launch mental health services, and scale to 500K monthly visits.',
        roadmap: 'Q1: Launch mental health services (therapists, psychiatrists), Q2: Prescription delivery (partner with pharmacies), Q3: Chronic care management (diabetes, hypertension), Q4: International expansion (Canada)',
      },
    },

    // ===== More templates continuing... (Let me add more diverse industries)
    {
      id: 'edtech-learning-platform',
      name: 'EdTech - Online Learning Platform',
      category: 'education',
      industry: 'Education',
      documentType: 'pitch_deck',
      description: 'Interactive learning platform for professional development',
      tags: ['edtech', 'education', 'online-learning', 'saas'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Education',
        shortDescription: 'Learn in-demand skills with interactive projects, not boring videos',
        problem: 'Online courses have 5% completion rates. Passive video watching doesn\'t stick. Employers need practical skills, not certificates. Traditional education costs $50K+ and takes 4 years. Skills are outdated within 3 years.',
        solution: 'Project-based learning: build real products while learning. AI mentor gives instant feedback. Peer code reviews. Gamification (badges, streaks). Career coaches. Job guarantee: get hired or money back.',
        targetCustomers: 'Career switchers (25-35 years old) looking to break into tech. Recent graduates with non-technical degrees. Professionals upskilling. People in non-coastal cities seeking remote jobs.',
        marketOpportunity: 'TAM: $25B (Online education market), SAM: $5B (Professional development segment), SOM: $500M (Target 100K students at $5K average spend)',
        competitors: 'Coursera ($399/course, low completion), Udemy ($20/course, no support), Bootcamps ($15K, 12 weeks intensive), Traditional education ($50K+ tuition, 4 years)',
        differentiation: 'Project-based (not video lectures), AI-powered personalized learning paths, job guarantee (or tuition refund), income-share agreements (pay only when employed), lifetime access.',
        revenueModel: 'Course sales: $499/course or $39/month subscription (all courses), Income Share Agreements: $0 upfront, 15% of income for 2 years (only if earning $50K+), B2B: $199/employee/month (corporate training).',
        pricing: 'Monthly: $39/mo (unlimited courses, no commitment), Annual: $299/year (save 36%), Bootcamp: $5,999 (job guarantee, 6 months intensive), ISA: $0 upfront (15% income share if placed)',
        currentTraction: '32,000 students, 68% completion rate (13x industry average), 850 job placements, $420K MRR, partnerships with 120 employers hiring graduates, 4.9★ rating (Trustpilot)',
        team: 'CEO: Former VP of Education at Udacity, CPO: Designed curriculum at Lambda School (12,000 graduates), CTO: Engineering director at Coursera (built learning platform for 100M users)',
        fundingAsk: '$4M Series A to expand course catalog (15 new career paths), build enterprise sales team (target 500 companies), and launch international markets (India, Brazil, Nigeria).',
        roadmap: 'Q1: Launch Data Science bootcamp, Q2: Build job board (direct employer partnerships), Q3: AI-powered career coach, Q4: Expand to India market (local pricing, languages)',
      },
    },

    // Adding more diverse industries
    {
      id: 'foodtech-delivery',
      name: 'Food Tech - Ghost Kitchen Network',
      category: 'food',
      industry: 'Food & Beverage',
      documentType: 'pitch_deck',
      description: 'Cloud kitchen network for delivery-only restaurant brands',
      tags: ['foodtech', 'delivery', 'restaurants', 'marketplace'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Food & Beverage',
        shortDescription: 'Launch delivery restaurant brands with zero real estate costs',
        problem: 'Opening a restaurant requires $300K+ (real estate, equipment, permits) and 70% fail in first year. Delivery is 40% of orders but restaurants pay 30% commission to DoorDash/Uber Eats. Most kitchens sit idle 50% of the day.',
        solution: 'Shared kitchen spaces optimized for delivery. Rent by the hour ($25/hr vs $10K/month lease). We provide equipment, permits, staff. Launch virtual brands in days, not months. Multiple brands share same kitchen.',
        targetCustomers: 'Aspiring restaurant entrepreneurs (no capital for traditional restaurant), Existing restaurants (expand with delivery-only brands), Food influencers (monetize following), Chefs (test concepts without risk).',
        marketOpportunity: 'TAM: $35B (Restaurant industry in US), SAM: $8B (Delivery-focused segment), SOM: $800M (Ghost kitchens growing 12% annually, target 10% of market)',
        competitors: 'CloudKitchens ($2K/month, no support), Traditional restaurant ($ 300K upfront, high risk), DoorDash Kitchens (only for existing restaurants), Home kitchen (illegal, limited)',
        differentiation: 'Pay-per-use ($25/hr vs $2K/month fixed cost), turnkey solution (equipment, permits, staff included), data analytics (menu optimization), multi-brand friendly, prime delivery locations.',
        revenueModel: 'Kitchen rental: $25/hour usage fee, Commission: 10% of sales (for marketing/tech), Equipment lease: $500/month (optional premium equipment), Software: $99/month (order management, analytics).',
        pricing: 'Pay-as-you-go: $25/hour (includes utilities, cleaning), Part-time: $2K/month (80 hours, priority booking), Full-time: $5K/month (unlimited hours, dedicated space)',
        currentTraction: '8 kitchen locations across 3 cities, 250 active brands using kitchens, $1.2M monthly GMV, $180K monthly revenue, 70% utilization rate, average brand does $4K/week sales',
        team: 'CEO: Founded restaurant chain (8 locations, sold for $12M), COO: Operations director at Uber Eats (launched 50 markets), Head Chef: Michelin-starred restaurant veteran',
        fundingAsk: '$7M Series A to open 15 new locations (NYC, LA, Chicago, Miami), build proprietary kitchen management software, and launch brand incubator program (invest in promising food entrepreneurs).',
        roadmap: 'Q1: Open 3 NYC locations, Q2: Launch brand incubator (invest $50K in 10 concepts), Q3: Expand to LA and Chicago, Q4: Build consumer app (order from all ghost kitchen brands)',
      },
    },

    {
      id: 'proptech-rental',
      name: 'PropTech - Rental Management',
      category: 'real-estate',
      industry: 'Real Estate',
      documentType: 'pitch_deck',
      description: 'Modern property management software for landlords',
      tags: ['proptech', 'real-estate', 'saas', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Real Estate',
        shortDescription: 'Property management software that actually works',
        problem: 'Landlords juggle 8 tools: rent collection (Venmo), tenant screening (third-party services), maintenance (phone calls), accounting (spreadsheets). 30% of rent paid late. Tenant turnover costs $5K per unit.',
        solution: 'All-in-one platform: online rent collection (auto-reminders), one-click tenant screening, maintenance ticketing (tenants submit via app), automated lease renewals, financial reports for taxes.',
        targetCustomers: 'Small-to-medium landlords (5-50 properties), property managers (manage 100+ units), real estate investors (want data-driven decisions). Focused on residential, not commercial.',
        marketOpportunity: 'TAM: $15B (Property management software market), SAM: $4B (Small landlords in US), SOM: $400M (Target landlords with 5-50 properties)',
        competitors: 'AppFolio ($280/month, complex), Buildium ($160/month, clunky), Zillow Rental Manager (free, limited), Spreadsheets (error-prone, time-consuming)',
        differentiation: 'Designed for small landlords (not enterprise), mobile-first (tenants pay rent via app), AI-powered rent pricing (optimize revenue), integrated accounting (exports to QuickBooks), 24/7 chat support.',
        revenueModel: 'SaaS subscription: $5/unit/month (vs competitors $10-15/unit). Additional revenue: tenant screening ($35/report), maintenance marketplace (10% commission on contractor payments).',
        pricing: 'Starter: $25/mo (up to 5 units), Growth: $99/mo (up to 20 units), Professional: $199/mo (up to 50 units), Enterprise: Custom (100+ units, API access)',
        currentTraction: '1,800 landlords, 24,000 units under management, $2.1M rent collected monthly, $120K MRR, 94% retention, 4.8★ rating (1,200 reviews), featured in BiggerPockets',
        team: 'CEO: Serial real estate investor (owns 80 rental properties), CTO: Built payments infrastructure at PayPal, Head of Product: Product manager at Zillow (built rental features)',
        fundingAsk: '$3M Series A to launch maintenance marketplace (connect landlords with vetted contractors), build mobile app (iOS/Android), and expand to property insurance products (revenue share with insurers).',
        roadmap: 'Q1: Launch maintenance marketplace (contractor network), Q2: Build tenant mobile app (pay rent, submit requests), Q3: Property insurance integration, Q4: Expand to Canada and UK markets',
      },
    },

    {
      id: 'logistics-freight',
      name: 'Logistics - Digital Freight Matching',
      category: 'logistics',
      industry: 'Transportation',
      documentType: 'pitch_deck',
      description: 'Uber for freight - connecting shippers with truckers',
      tags: ['logistics', 'freight', 'marketplace', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Transportation',
        shortDescription: 'Book freight shipments instantly - no phone calls, no brokers',
        problem: 'Shipping freight requires calling 10 brokers, waiting hours for quotes, then manually tracking. Brokers take 20-30% margin. 35% of trucks drive empty (wasted fuel, emissions). Lack of transparency causes delays.',
        solution: 'Digital freight marketplace: instant quotes in 2 minutes (vs 2 hours), book with 1 click, real-time GPS tracking, automated invoicing. Connect shippers directly with carriers (cut out brokers, save 20%).',
        targetCustomers: 'Small-to-medium manufacturers and distributors (100-5000 shipments/year) who waste time dealing with brokers. Trucking companies (want to fill empty miles). 3PLs (improve efficiency).',
        marketOpportunity: 'TAM: $800B (US freight market), SAM: $120B (Brokered freight segment), SOM: $12B (Capture 10% of brokered freight with digital solution)',
        competitors: 'Traditional freight brokers (C.H. Robinson, expensive 25% margin), Uber Freight ($50M revenue, limited coverage), Convoy (shut down in 2023), Manual calling (slow, opaque)',
        differentiation: 'Instant pricing (no waiting for quotes), 15% take rate (vs 25% brokers), real-time tracking (see truck location), verified carriers (insurance checked), carbon offset included.',
        revenueModel: 'Transaction fees: 15% of shipment value (vs 25% traditional brokers). Additional revenue: load insurance (5% of shipment value), financing (pay carriers instantly, shipper pays in 30 days, 2% fee).',
        pricing: 'Pay-per-shipment: 15% commission (no monthly fees, no contracts), Volume discount: 12% (>100 shipments/month), Enterprise: 10% (>500 shipments/month, dedicated account manager)',
        currentTraction: '850 active shippers, 4,200 verified carriers, $24M freight booked, $3.6M revenue (15% take rate), 18% month-over-month growth, 45% load repeat rate, 99.2% on-time delivery',
        team: 'CEO: VP of Operations at XPO Logistics (managed $2B freight network), CTO: Senior engineer at Uber (built Uber Freight technology), COO: Supply chain consultant at McKinsey',
        fundingAsk: '$10M Series A to expand carrier network (recruit 10,000 trucks), build load optimization AI (increase truck utilization 20%), and scale nationwide (currently in 15 states, target 48).',
        roadmap: 'Q1: Launch load optimization AI (match cargo with empty trucks), Q2: Expand to 30 states, Q3: Launch instant carrier financing (pay drivers within 24 hours), Q4: International expansion (Canada, Mexico)',
      },
    },

    // Add more templates for other industries
    {
      id: 'manufacturing-iot',
      name: 'Manufacturing - IoT Monitoring',
      category: 'industrial',
      industry: 'Manufacturing',
      documentType: 'pitch_deck',
      description: 'IoT sensors and predictive maintenance for factories',
      tags: ['iot', 'manufacturing', 'industrial', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Manufacturing',
        shortDescription: 'Predict machine failures before they happen - reduce downtime 80%',
        problem: 'Factory equipment breaks unexpectedly, costing $250K per hour of downtime. Maintenance is reactive (fix after broken) or wasteful (replace parts on schedule). 30% of maintenance budget wasted on unnecessary repairs.',
        solution: 'IoT sensors monitor machine health 24/7. AI predicts failures 2-4 weeks in advance. Maintenance scheduling optimized. Remote monitoring dashboard. ROI: reduce downtime 80%, extend equipment life 25%.',
        targetCustomers: 'Mid-sized manufacturers ($50M-$500M revenue) with expensive equipment (CNC machines, injection molding, assembly lines). Automotive, electronics, aerospace, pharmaceuticals.',
        marketOpportunity: 'TAM: $45B (Industrial IoT market), SAM: $8B (Predictive maintenance segment), SOM: $800M (Target mid-market manufacturers in US/EU)',
        competitors: 'GE Predix (enterprise-only, $100K+ setup), Siemens MindSphere (complex, long implementation), Manual monitoring (clipboard and Excel, reactive), Legacy SCADA systems (no predictive analytics)',
        differentiation: 'Plug-and-play sensors (install in 1 day vs 3 months), affordable ($500/machine/month vs $100K setup), AI trained on 10M data points, mobile alerts (text when problem detected).',
        revenueModel: 'Subscription: $500/machine/month (sensors, software, analytics). Setup: $2K one-time per machine (hardware + installation). Enterprise: Custom pricing for 100+ machines with SLA.',
        pricing: 'Starter: $500/machine/month (real-time monitoring, alerts), Professional: $800/machine/month (+ predictive analytics, reports), Enterprise: Custom (dedicated support, integration, SLA)',
        currentTraction: '45 manufacturing facilities, 2,200 machines monitored, $1.1M MRR, prevented 340 equipment failures (saved $85M in downtime), 96% customer retention, average ROI: 420% in first year',
        team: 'CEO: Industrial engineer (15 years at Bosch, designed factory automation), CTO: IoT expert (PhD from MIT, 20 patents), VP Sales: Sold industrial equipment at Siemens for 12 years',
        fundingAsk: '$5M Series A to expand sales team (hire 10 field engineers), build advanced AI models (detect 50 failure modes vs 20 today), and launch EU expansion (Germany, France, UK).',
        roadmap: 'Q1: Launch energy optimization module (reduce power consumption 15%), Q2: Expand to pharmaceutical manufacturing (FDA compliance), Q3: EU market entry, Q4: Partner with equipment OEMs (bundle sensors)',
      },
    },

    {
      id: 'climate-carbon-offset',
      name: 'Climate Tech - Carbon Offset Platform',
      category: 'climate',
      industry: 'Climate Tech',
      documentType: 'pitch_deck',
      description: 'Transparent carbon offset marketplace for businesses',
      tags: ['climate', 'sustainability', 'marketplace', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Climate Tech',
        shortDescription: 'Help businesses reach net-zero with verified carbon offsets',
        problem: 'Companies commit to net-zero but 68% don\'t know how. Carbon offset market is opaque (don\'t know where money goes). Greenwashing is rampant. Verification is manual and expensive. Offsets are commoditized (all look same).',
        solution: 'Transparent marketplace: vetted projects (reforestation, renewable energy, carbon capture), blockchain tracking (prove impact), API for e-commerce (offset at checkout), dashboards for reporting (ESG compliance).',
        targetCustomers: 'E-commerce brands (offset shipping), SaaS companies (carbon-neutral operations), manufacturers (Scope 1/2/3 emissions), consultants (advise clients on sustainability), venture capital (portfolio carbon tracking).',
        marketOpportunity: 'TAM: $2B (Voluntary carbon offset market), SAM: $800M (B2B corporate buyers), SOM: $80M (Target early adopters: tech, retail, consulting industries)',
        competitors: 'Pachama ($10M/year contracts, enterprise), Stripe Climate (for Stripe merchants only), Manual consultants ($50K/project), Commodity offset brokers (no transparency)',
        differentiation: 'Self-serve platform (start in 10 minutes), transparent pricing ($10-$50/ton vs opaque quotes), blockchain verified, API for developers, projects in 40 countries, co-benefits (biodiversity, jobs).',
        revenueModel: 'Transaction fee: 15% of offset purchases (e.g. company buys $10K in offsets, we take $1.5K). SaaS: $199/month for emissions tracking software. Consulting: $5K for carbon audit.',
        pricing: 'Pay-as-you-go: $15-$50/ton CO2 offset (varies by project), Platform: $199/mo (emissions tracking, reporting), Enterprise: Custom (API access, dedicated projects, consulting)',
        currentTraction: '420 business customers, 1.2M tons CO2 offset, $18M offsets transacted, $2.7M revenue (15% take rate), partnerships with 60 offset projects globally, certified by Gold Standard and Verra',
        team: 'CEO: Former sustainability lead at Patagonia, CTO: Blockchain engineer (built Ethereum NFT marketplace), Head of Science: PhD in Environmental Science from Stanford',
        fundingAsk: '$4M Series A to launch carbon removal projects (direct air capture, ocean sequestration), expand to EU/Asia markets, and build emissions analytics AI (automatically calculate Scope 3 emissions).',
        roadmap: 'Q1: Launch carbon removal marketplace (direct air capture, biochar), Q2: Build Scope 3 calculator AI, Q3: Expand to EU (CBAM compliance), Q4: Partner with airlines (offset flights)',
      },
    },

    {
      id: 'entertainment-creator-tools',
      name: 'Creator Economy - Monetization Platform',
      category: 'creator-economy',
      industry: 'Entertainment',
      documentType: 'pitch_deck',
      description: 'All-in-one platform for content creators to monetize',
      tags: ['creator-economy', 'content', 'subscription', 'b2c'],
      popular: true,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Entertainment',
        shortDescription: 'Creators earn 5x more with memberships, coaching, and digital products',
        problem: 'Creators rely on ads (YouTube pays $3-5 per 1K views = poverty). Patreon takes 8% + fees. Building courses/memberships requires 5 tools (payment, hosting, email, community). 97% of creators earn <$10K/year.',
        solution: 'All-in-one platform: memberships ($10/month recurring revenue), sell digital products (courses, ebooks, templates), 1-on-1 coaching ($100/hour sessions), email marketing, community forums. Creators keep 95%.',
        targetCustomers: 'Mid-tier creators (10K-100K followers) across YouTube, Instagram, TikTok, podcasts. Niches: fitness, finance, productivity, design, parenting. Location: US, UK, Canada, Australia.',
        marketOpportunity: 'TAM: $15B (Creator economy market), SAM: $4B (Creator monetization tools), SOM: $400M (Mid-tier creators seeking to monetize beyond ads)',
        competitors: 'Patreon (8% fee, basic features), Kajabi ($149/month, complex), Gumroad (10% fee, just digital products), Substack (10%, writing-focused), Manual tools (Teachable + ConvertKit + Zoom = $300/month)',
        differentiation: 'Unified platform (replace 5 tools), 5% fee (vs Patreon 8%, Gumroad 10%), mobile app (fans consume on phone), AI coaching scheduler, growth tools (refer-a-friend, affiliate program).',
        revenueModel: 'Transaction fee: 5% of creator earnings (Stripe fees separate). Premium: $29/month (remove platform branding, advanced analytics, priority support). We process $50M annually = $2.5M revenue.',
        pricing: 'Free: 5% transaction fee (unlimited products, members, courses), Pro: $29/mo (remove branding, custom domain, analytics), Enterprise: $99/mo (white-label, API, dedicated support)',
        currentTraction: '8,500 creators, $4.2M monthly creator earnings (we take 5% = $210K/month), top creator earns $82K/month, 30% creator month-over-month growth, 4.9★ rating (Trustpilot), featured in Forbes',
        team: 'CEO: Former product manager at Patreon (launched memberships feature), CTO: Built payment infrastructure at OnlyFans (scaled to 2M creators), CMO: Grew Morning Brew to 4M subscribers',
        fundingAsk: '$3M Seed to build mobile app (iOS/Android), launch AI coaching assistant (schedule, recommendations), and expand internationally (Latin America, India, Southeast Asia).',
        roadmap: 'Q1: Launch mobile app (members watch courses on phone), Q2: AI assistant (auto-schedule 1-on-1 calls), Q3: NFT integration (sell limited digital collectibles), Q4: Expand to 20 new countries',
      },
    },

    // Continue adding more templates...
    {
      id: 'devtools-api-platform',
      name: 'Dev Tools - API Management Platform',
      category: 'technology',
      industry: 'Technology',
      documentType: 'pitch_deck',
      description: 'API gateway and management for modern developers',
      tags: ['devtools', 'api', 'infrastructure', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Technology',
        shortDescription: 'Launch, scale, and monetize APIs in minutes',
        problem: 'Building API infrastructure from scratch takes 3-6 months (authentication, rate limiting, analytics, billing). AWS API Gateway is complex. Kong requires DevOps team. 70% of API projects delayed by infrastructure.',
        solution: 'Complete API platform: deploy in 5 minutes, auto-scaling, built-in auth (OAuth, JWT), rate limiting, analytics dashboard, API marketplace, monetization (usage-based billing). No DevOps needed.',
        targetCustomers: 'SaaS startups building APIs, enterprises opening internal APIs to partners, API-first companies (Twilio-style), developers launching side projects, agencies building for clients.',
        marketOpportunity: 'TAM: $12B (API management market), SAM: $3B (SMB and developer segment), SOM: $300M (Capture 10% of companies with API-first products)',
        competitors: 'AWS API Gateway (complex, slow), Kong ($1K/month, self-hosted), Apigee (Google, $50K+, enterprise), Postman (docs only, no hosting), Building in-house (6 months, expensive)',
        differentiation: '10x faster to launch (5 minutes vs 3 months), developer-friendly (beautiful docs auto-generated), built-in monetization (charge per API call), 99.99% uptime SLA, 50ms latency globally.',
        revenueModel: 'Usage-based: $0.02 per 1K API calls (first 100K free). Pro: $49/month (custom domains, analytics, support). Enterprise: $499/month (SLA, dedicated infrastructure, white-label).',
        pricing: 'Free: 100K requests/month (hobby projects), Pro: $49/mo + $0.02/1K calls (production), Enterprise: $499/mo + $0.01/1K calls (volume discount, SLA, support)',
        currentTraction: '2,800 developers, 12B API calls processed monthly, $240K MRR, 25% month-over-month growth, customers in 80 countries, 99.97% uptime (past 12 months), 4.8★ rating (G2)',
        team: 'CEO: Former principal engineer at Stripe (built API infrastructure for 1M+ developers), CTO: Core contributor to Kong open source (10M downloads), Head of DevRel: Developer advocate at Twilio',
        fundingAsk: '$4M Series A to expand global infrastructure (5 new regions: India, Brazil, Australia, Japan, Singapore), build GraphQL support, and grow sales team (target Fortune 500 enterprises).',
        roadmap: 'Q1: Launch GraphQL gateway (federated APIs), Q2: Add WebSocket support (real-time APIs), Q3: API marketplace (monetize public APIs), Q4: Expand to 12 cloud regions globally',
      },
    },

    {
      id: 'cybersecurity-sme',
      name: 'Cybersecurity - SMB Security Platform',
      category: 'technology',
      industry: 'Technology',
      documentType: 'pitch_deck',
      description: 'Enterprise-grade security for small businesses',
      tags: ['cybersecurity', 'security', 'b2b', 'smb'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Technology',
        shortDescription: 'Cybersecurity for small businesses - $99/month, no CISO required',
        problem: 'SMBs face same cyber threats as enterprises but can\'t afford $150K/year CISO. 60% of small companies close within 6 months of breach. Compliance (GDPR, SOC 2) requires security but is expensive.',
        solution: 'Affordable security platform: automated vulnerability scanning, employee security training, phishing simulations, dark web monitoring, incident response playbooks. Compliance reports included. Managed by AI, not expensive consultants.',
        targetCustomers: 'Small businesses (10-200 employees) handling sensitive data. Professional services (law, accounting), healthcare clinics, financial advisors, SaaS startups, e-commerce stores.',
        marketOpportunity: 'TAM: $20B (SMB cybersecurity market), SAM: $5B (Managed security services for SMBs), SOM: $500M (Capture 10% of US SMBs needing security)',
        competitors: 'Enterprise security (too expensive, complex), Norton Small Business ($20/month, limited), Managed security services ($3K/month, requires contract), DIY (risky, ineffective)',
        differentiation: 'Affordable ($99/month vs $3K consultants), automated (AI replaces CISO), includes compliance (SOC 2, GDPR reports), insurance partnership (reduce premiums 20%), 24/7 monitoring.',
        revenueModel: 'SaaS subscription: $99/month per company (up to 25 employees), $199/month (26-100 employees), $499/month (100-200 employees). Add-ons: cyber insurance ($50/month), pen testing ($500/year).',
        pricing: 'Starter: $99/mo (up to 25 employees, basic security), Growth: $199/mo (26-100 employees, compliance reports), Pro: $499/mo (100-200 employees, dedicated security engineer)',
        currentTraction: '1,400 SMB customers, $175K MRR, prevented 83 breaches (saved $16M in potential damages), partnership with 3 cyber insurance providers (customers get 20% premium discount), 95% retention',
        team: 'CEO: Former CISO at mid-size companies (protected 10K+ employees), CTO: Security researcher (found vulnerabilities in Fortune 500 systems), COO: Scaled SMB SaaS at Gusto',
        fundingAsk: '$3M Seed to build automated pen testing tool, expand insurance partnerships, and launch cyber warranty (if breach happens on our watch, we pay recovery costs up to $50K).',
        roadmap: 'Q1: Launch automated penetration testing, Q2: Partner with 10 insurance carriers (bundled offering), Q3: Build cyber warranty program, Q4: Expand to UK and EU markets',
      },
    },

    {
      id: 'agrictech-farm-management',
      name: 'AgriTech - Farm Management Software',
      category: 'agriculture',
      industry: 'Agriculture',
      documentType: 'pitch_deck',
      description: 'Precision agriculture platform for modern farmers',
      tags: ['agritech', 'agriculture', 'iot', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Agriculture',
        shortDescription: 'Precision farming that increases yields 25% and reduces costs 20%',
        problem: 'Farmers make decisions based on gut feeling, not data. Over-watering wastes $2K/acre. Wrong fertilizer timing reduces yields 20%. Labor shortages cost $3B/year. Climate change increases crop failures.',
        solution: 'Farm management platform: satellite imagery (crop health from space), weather predictions (AI forecasts 14 days), soil sensors (moisture, nutrients), automated irrigation, labor tracking, harvest planning.',
        targetCustomers: 'Mid-size farms (500-5,000 acres) growing high-value crops (almonds, vineyards, vegetables). Tech-forward farmers under 50 years old. Located in California, Midwest, Texas.',
        marketOpportunity: 'TAM: $10B (AgTech market), SAM: $2B (Farm management software in US), SOM: $200M (Target mid-size farms with high-value crops)',
        competitors: 'John Deere Operations Center ($800/year, equipment-locked), Climate FieldView ($12/acre, basic), Granular (FarmersBusinessNetwork, manual), Excel spreadsheets (farmers hate tech)',
        differentiation: 'Equipment-agnostic (works with any tractor brand), satellite + sensors (complete picture), AI recommendations (not just data), mobile-first (use in field), affordable ($5/acre vs $12).',
        revenueModel: 'Per-acre pricing: $5/acre/season ($2.5K for 500-acre farm). Hardware: $200/sensor (10 sensors = $2K upfront). Premium: $10/acre (includes consultant recommendations).',
        pricing: 'Basic: $5/acre/season (satellite imagery, weather, recommendations), Pro: $10/acre/season (+ sensors, labor tracking, consultations), Enterprise: Custom (co-ops, large operations)',
        currentTraction: '680 farms, 340,000 acres managed, $1.7M annual revenue, customers increased yields 27% on average, reduced water usage 35%, featured in Farm Journal, partnership with 15 farm equipment dealers',
        team: 'CEO: Third-generation farmer (1,200 acres in California), CTO: Computer vision PhD from UC Davis (crop disease detection), Agronomist: 20 years advising farmers at Monsanto',
        fundingAsk: '$5M Series A to expand to 10 new crops (cotton, wheat, soybeans currently), build labor management module (track seasonal workers), and partner with John Deere for equipment integration.',
        roadmap: 'Q1: Launch crop disease detection AI (identify pests early), Q2: Expand to cotton and wheat, Q3: Build carbon credit calculator (farmers earn from carbon sequestration), Q4: International: Australia, Brazil',
      },
    },

    {
      id: 'legaltech-contract-automation',
      name: 'LegalTech - Contract Automation',
      category: 'legal',
      industry: 'Legal Services',
      documentType: 'pitch_deck',
      description: 'AI-powered contract drafting and review platform',
      tags: ['legaltech', 'ai', 'contracts', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Legal Services',
        shortDescription: 'Draft and review contracts in minutes, not hours',
        problem: 'Lawyers spend 60% of time on repetitive work (NDAs, employment contracts, vendor agreements). Associates bill $400/hour for template work. Contract review takes 2-3 days. Small businesses can\'t afford lawyers ($10K+ per contract).',
        solution: 'AI contract platform: generate contracts in 5 minutes (answer 10 questions, get custom agreement), AI review (flag risky clauses, suggest edits), e-signature, version control, 500+ templates.',
        targetCustomers: 'Small businesses (can\'t afford $400/hour lawyers), in-house legal teams (need efficiency), startups (high contract volume), freelancers (need client agreements), real estate agents (repetitive contracts).',
        marketOpportunity: 'TAM: $18B (Legal tech market), SAM: $4B (Contract automation segment), SOM: $400M (Target SMBs and startups with high contract volumes)',
        competitors: 'Traditional lawyers ($400/hour, slow), LegalZoom ($399/contract, templates), DocuSign (e-signature only, no AI), Ironclad ($30K/year, enterprise), DIY templates (risky, not customized)',
        differentiation: 'AI-powered (not just templates), jurisdiction-specific (complies with state laws), plain-English explanations (not legalese), 95% cheaper than lawyers, 10x faster, integrated e-signature.',
        revenueModel: 'SaaS subscription: $49/month (unlimited contracts, 1 user), $149/month (team plan, 5 users), $499/month (enterprise, unlimited users, API). Pay-per-contract: $29/contract (no subscription).',
        pricing: 'Pay-per-contract: $29 (one-off contracts), Solo: $49/mo (unlimited contracts, 1 user), Team: $149/mo (5 users, approval workflows), Enterprise: $499/mo (unlimited, API, integrations)',
        currentTraction: '6,500 customers, 45,000 contracts generated, $195K MRR, partnerships with 8 law firms (white-label for clients), 92% customer satisfaction, average contract creation time: 8 minutes (vs 6 hours manually)',
        team: 'CEO: Corporate lawyer at top law firm (15 years M&A experience), CTO: NLP engineer from OpenAI (worked on GPT-3), CLO: Former general counsel at Series C startup',
        fundingAsk: '$4M Series A to train AI on 1M+ contracts (improve accuracy), expand to 50 contract types (currently 25), and build enterprise sales team (target Fortune 500 legal departments).',
        roadmap: 'Q1: Launch contract negotiation AI (suggests counteroffers), Q2: Build contract repository (search all contracts), Q3: Add risk scoring (rate contract risk 1-10), Q4: International expansion (UK, Canada)',
      },
    },

    {
      id: 'media-podcast-platform',
      name: 'Media - Podcast Growth Platform',
      category: 'media',
      industry: 'Entertainment',
      documentType: 'pitch_deck',
      description: 'All-in-one platform for podcast creators to grow and monetize',
      tags: ['media', 'podcast', 'creator-economy', 'saas'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Entertainment',
        shortDescription: 'Podcasters grow 3x faster with our promotion and monetization tools',
        problem: 'Podcasters struggle to grow (average podcast has 150 downloads/episode). Distribution is fragmented (upload to 10+ platforms). Sponsorship requires 10K+ listeners. 90% of podcasts monetize <$500/month.',
        solution: 'Podcast platform: one-click distribution to Spotify/Apple/YouTube, AI-powered promotion (clips for TikTok/Instagram), dynamic ad insertion, audience analytics, sponsor marketplace, transcription included.',
        targetCustomers: 'Aspiring podcasters (0-5K listeners wanting to grow), mid-tier shows (5K-50K listeners monetizing), independent networks (manage 10+ shows), YouTube creators (adding audio format).',
        marketOpportunity: 'TAM: $3B (Podcast industry revenue), SAM: $800M (Podcast tools and platforms), SOM: $80M (Target indie podcasters and small networks)',
        competitors: 'Anchor/Spotify (free, basic features), Megaphone ($99/mo, expensive), Buzzsprout ($12/mo, no monetization), Patreon (8% fee, not podcast-specific), Manual (upload to 10 platforms separately)',
        differentiation: 'AI clip generator (auto-create 20 clips for social), sponsor marketplace (connect with 500+ brands), dynamic ads (monetize back catalog), audience analytics (know your listeners), includes website.',
        revenueModel: 'SaaS subscription: $19/month (unlimited episodes, basic analytics), $49/month (sponsor marketplace, AI clips), $149/month (dynamic ads, white-label). Transaction fee: 5% on sponsorships.',
        pricing: 'Starter: $19/mo (unlimited episodes, hosting, analytics), Creator: $49/mo (+ AI clips, sponsor marketplace), Pro: $149/mo (+ dynamic ads, remove branding, white-label website)',
        currentTraction: '12,500 podcasters, 2.8M monthly listeners across platform, $300K MRR, facilitated $1.2M in sponsorship deals (5% = $60K revenue), top podcaster earns $18K/month through platform',
        team: 'CEO: Founder of popular podcast (1M downloads), CTO: Built audio infrastructure at SoundCloud, Head of Partnerships: Secured sponsorships at Gimlet Media (Spotify)',
        fundingAsk: '$3M Seed to build video podcasting features (record video + audio), launch AI voice cloning (translate episodes to 10 languages), and expand sponsor marketplace to 2,000+ brands.',
        roadmap: 'Q1: Launch video podcasting (record video + auto-generate audio), Q2: AI translation (episodes in 10 languages), Q3: Live podcasting (stream to YouTube/Twitch), Q4: Podcast discovery app (listeners find new shows)',
      },
    },

    // Rounding out to 20 templates with more variety
    {
      id: 'insurance-insurtech',
      name: 'InsurTech - On-Demand Insurance',
      category: 'insurance',
      industry: 'Insurance',
      documentType: 'pitch_deck',
      description: 'Flexible, on-demand insurance for the gig economy',
      tags: ['insurtech', 'insurance', 'gig-economy', 'b2c'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Insurance',
        shortDescription: 'Insurance you can turn on and off - pay only for coverage you use',
        problem: 'Freelancers and gig workers need insurance but traditional policies are: annual (pay 12 months upfront), one-size-fits-all (coverage you don\'t need), complex (60-page policies). 41% of freelancers have no insurance.',
        solution: 'On-demand insurance app: turn coverage on/off with a tap, pay by the day ($5/day), customizable (choose exactly what you need), instant quotes (no forms, no calls), claims paid in 24 hours.',
        targetCustomers: 'Freelancers, gig workers (Uber, Airbnb hosts), digital nomads, part-time consultants, side hustlers. Ages 25-45, tech-savvy, value flexibility over traditional policies.',
        marketOpportunity: 'TAM: $150B (US insurance market), SAM: $20B (Gig economy and freelance workers), SOM: $2B (Target 1M gig workers paying $2K/year average)',
        competitors: 'Traditional insurance (State Farm: annual, expensive), Lemonade ($25/month, not on-demand), Stride (health insurance only), No insurance (risky, 41% of freelancers).',
        differentiation: 'On-demand (turn on/off daily), usage-based pricing (pay only when working), instant approval (no underwriting delays), mobile-first (manage via app), claims AI (process in 24 hours).',
        revenueModel: 'Usage-based premiums: $5-15/day depending on coverage. Average customer uses 120 days/year = $600 annual premium. We keep 30% after paying claims and reinsurance = $180 per customer.',
        pricing: 'General Liability: $5/day, Professional Liability: $8/day, Equipment Coverage: $3/day, Bundle All: $12/day (save 25%). Pay only for days you activate coverage.',
        currentTraction: '28,000 insured freelancers, $16.8M annual premiums, $5M revenue (30% margin), 68% loss ratio (industry: 75%), 4.7★ App Store rating, average customer uses 110 days/year',
        team: 'CEO: Former VP at Progressive Insurance (15 years underwriting), CTO: Built Lemonade app (1M users), Actuary: Risk modeler at AIG (analyzed $50B portfolio)',
        fundingAsk: '$6M Series A to obtain insurance licenses in 30 more states (currently 20), build partnerships with gig platforms (Uber, Airbnb), and launch health insurance product.',
        roadmap: 'Q1: Expand to 50 states (currently 20), Q2: Partner with Uber (offer insurance to drivers), Q3: Launch health insurance (on-demand coverage for freelancers), Q4: International: Canada, UK',
      },
    },

    {
      id: 'travel-booking-platform',
      name: 'Travel Tech - Experience Marketplace',
      category: 'travel',
      industry: 'Travel & Hospitality',
      documentType: 'pitch_deck',
      description: 'Airbnb for local experiences and tours',
      tags: ['travel', 'marketplace', 'experiences', 'b2c'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'Travel & Hospitality',
        shortDescription: 'Book authentic local experiences from real locals, not tour companies',
        problem: 'Tourists want authentic experiences but TripAdvisor shows generic tours ($100+, 50-person groups). Local guides struggle to get customers. 65% of travelers want to "live like a local" but book standard tours.',
        solution: 'Marketplace connecting travelers with local guides: cooking classes in local homes, street art tours with artists, hiking with park rangers, coffee tastings with roasters. Authentic, small groups (max 8 people).',
        targetCustomers: 'Millennial/Gen Z travelers (25-40 years old, $60K+ income) seeking authentic experiences. Solo travelers, couples, digital nomads. 70% female. High disposable income, value experiences over things.',
        marketOpportunity: 'TAM: $180B (Global tourism experiences market), SAM: $40B (Activities and experiences segment), SOM: $4B (Authentic/local experiences niche)',
        competitors: 'Airbnb Experiences ($30M revenue, limited supply), TripAdvisor ($100+ tours, impersonal), Viator (Tripadvisor-owned, tour companies), GetYourGuide ($1.8B valuation, generic tours)',
        differentiation: 'Curated hosts (vet for authenticity), small groups (max 8 vs 50), fair pricing (hosts keep 85% vs Viator 70%), instant booking, local community (hosts support each other), impact (eco-friendly).',
        revenueModel: 'Transaction fee: 15% of booking (host keeps 85%). Average experience: $60, 6 people = $360 gross, we earn $54. Additional revenue: travel insurance (optional add-on, 5% of booking).',
        pricing: 'Standard commission: 15% (host keeps $85 of $100 experience), Plus: 12% (for hosts with 100+ bookings, loyalty discount), Travel insurance: 5% of booking (optional, travelers can add)',
        currentTraction: '8,500 hosts in 450 cities, 180,000 bookings last year, $10.8M GMV, $1.62M revenue (15% take rate), 4.9★ average experience rating, featured in Travel + Leisure, Condé Nast Traveler',
        team: 'CEO: Former Head of Experiences at Airbnb (launched in 40 cities), CMO: Growth marketing at GetYourGuide, COO: Operations director at Viator (managed 10K suppliers)',
        fundingAsk: '$4M Series A to expand to 100 new cities (currently in 60), build instant booking technology, and launch host academies (train locals to become great guides).',
        roadmap: 'Q1: Launch in 25 new cities (Asia, Latin America), Q2: Build instant booking (no host approval needed), Q3: Host insurance (liability coverage included), Q4: Corporate retreats (team-building experiences)',
      },
    },

    {
      id: 'fashion-virtual-fitting',
      name: 'Fashion Tech - Virtual Fitting Room',
      category: 'fashion',
      industry: 'E-commerce',
      documentType: 'pitch_deck',
      description: 'AI-powered virtual try-on for online fashion retail',
      tags: ['fashion', 'ai', 'ecommerce', 'b2b'],
      popular: false,
      prefilled: {
        companyName: '[Your Company]',
        industry: 'E-commerce',
        shortDescription: 'Try clothes on virtually before buying - reduce returns 50%',
        problem: 'Online clothing has 30% return rate (vs 8% in-store) costing retailers $550B/year. Customers can\'t tell if clothes will fit. Size charts are inconsistent. Returns cost $10-20 per item. Bad for environment.',
        solution: 'Virtual fitting room: upload photo or use camera, AI creates 3D body model, see clothes on YOUR body before buying, accurate sizing recommendations, works with any retailer\'s website (plugin).',
        targetCustomers: 'E-commerce fashion retailers ($10M-$500M annual revenue), DTC clothing brands, online marketplaces (ASOS, Zalando), luxury brands (Gucci, Prada going digital).',
        marketOpportunity: 'TAM: $35B (Fashion tech market), SAM: $5B (Virtual try-on and fit tech), SOM: $500M (Capture 10% of mid-market fashion retailers)',
        competitors: 'Zeekit (Walmart, acquired for $200M), True Fit ($200M raised, enterprise), Size recommendation tools (basic, 10% improvement), Manual sizing (guesswork, high returns)',
        differentiation: 'Most accurate fit (trained on 10M body scans), works with existing photos (no special camera needed), plug-and-play (integrate in 1 day), affordable ($0.10/try-on vs $1+ competitors).',
        revenueModel: 'Usage-based: $0.10 per virtual try-on. Average retailer: 100K monthly try-ons = $10K/month. Enterprise: Fixed $5K/month + $0.05/try-on for high-volume retailers.',
        pricing: 'Growth: $0.10/try-on (pay-as-you-go, no minimums), Pro: $5K/mo + $0.05/try-on (volume discount), Enterprise: Custom (white-label, dedicated infrastructure, SLA)',
        currentTraction: '85 fashion brands using platform, 8.5M virtual try-ons/month, $850K MRR, customers reduced returns 47% average, increased conversions 23%, partnership with Shopify (1M+ merchants).',
        team: 'CEO: Computer vision PhD from MIT (published 20 papers on 3D reconstruction), CTO: Ex-Amazon engineer (built size recommendation for fashion), Fashion Advisor: Former buyer at Nordstrom',
        fundingAsk: '$6M Series A to train AI on more body types (currently 50 types, target 200), expand to accessories (glasses, jewelry), and launch mobile SDK (try-on in Instagram).',
        roadmap: 'Q1: Launch AR mobile experience (try-on via phone camera), Q2: Expand to footwear (shoe fitting), Q3: Social sharing (show friends before buying), Q4: Generative AI (design custom clothes)',
      },
    },
  ];

  getAllTemplates(): IndustryTemplate[] {
    return this.templates;
  }

  getTemplateById(id: string): IndustryTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  getTemplatesByCategory(category: string): IndustryTemplate[] {
    return this.templates.filter(t => t.category === category);
  }

  getTemplatesByIndustry(industry: string): IndustryTemplate[] {
    return this.templates.filter(t => t.industry === industry);
  }

  getPopularTemplates(): IndustryTemplate[] {
    return this.templates.filter(t => t.popular);
  }

  searchTemplates(query: string): IndustryTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.templates.filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      t.industry.toLowerCase().includes(lowerQuery)
    );
  }
}
