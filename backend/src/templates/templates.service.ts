import { Injectable } from '@nestjs/common';

export interface VisualTemplate {
  id: string;
  name: string;
  category: string;
  industry: string;
  documentType: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  popular: boolean;
  colorScheme: string;
  layoutType: 'hero' | 'split' | 'grid' | 'asymmetric' | 'overlay' | 'editorial';
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
export class TemplatesService {
  private visualTemplates: VisualTemplate[] = [
    // Technology Templates
    {
      id: 'tech-startup-flyer',
      name: 'Tech Startup Flyer',
      category: 'technology',
      industry: 'Technology',
      documentType: 'business_flyer',
      description: 'Eye-catching flyer for tech startups showcasing innovation',
      tags: ['startup', 'technology', 'innovation', 'saas'],
      popular: true,
      colorScheme: 'blue',
      layoutType: 'hero',
      thumbnail: '/templates/tech-startup-flyer.png',
      prefilled: {
        companyName: 'TechFlow AI',
        industry: 'Artificial Intelligence',
        shortDescription: 'Enterprise AI automation platform that transforms business workflows',
        problem: 'Companies waste 40% of time on repetitive tasks',
        solution: 'AI-powered automation that learns your workflows',
        targetCustomers: 'Enterprise teams 50-500 employees',
        marketOpportunity: '$50B workflow automation market growing 25% YoY',
        competitors: 'Zapier, Make, n8n',
        differentiation: 'AI learns workflows vs. manual configuration',
        revenueModel: 'SaaS subscription: $99-999/month',
        pricing: 'Starter $99, Pro $299, Enterprise $999',
        currentTraction: '500 paying customers, $50K MRR, 15% monthly growth',
        team: 'Ex-Google AI engineers, 10 years ML experience',
        fundingAsk: '$2M seed round for product and sales',
        roadmap: 'Q1: Mobile app, Q2: API launch, Q3: Enterprise features',
      },
    },
    {
      id: 'saas-one-pager',
      name: 'SaaS One-Pager',
      category: 'technology',
      industry: 'Software',
      documentType: 'modern_one_pager',
      description: 'Modern one-page overview for SaaS products',
      tags: ['saas', 'software', 'b2b', 'one-pager'],
      popular: true,
      colorScheme: 'purple',
      layoutType: 'split',
      thumbnail: '/templates/saas-one-pager.png',
      prefilled: {
        companyName: 'CloudSync Pro',
        industry: 'Cloud Software',
        shortDescription: 'Real-time collaboration platform for distributed teams',
        problem: 'Remote teams struggle with async communication and context switching',
        solution: 'Unified workspace with real-time presence and smart notifications',
        targetCustomers: 'Remote-first companies 10-1000 employees',
        marketOpportunity: '$30B collaboration tools market',
        competitors: 'Slack, Microsoft Teams, Notion',
        differentiation: 'AI-powered context awareness reduces notification fatigue by 70%',
        revenueModel: 'Per-user SaaS: $15-45/user/month',
        pricing: 'Team $15, Business $30, Enterprise $45',
        currentTraction: '10K users, 200 companies, 80% retention',
        team: 'Second-time founders, sold previous company to Atlassian',
        fundingAsk: '$5M Series A for market expansion',
        roadmap: 'Q1: Video integration, Q2: Mobile apps, Q3: Enterprise SSO',
      },
    },
    {
      id: 'mobile-app-promo',
      name: 'Mobile App Promotional Sheet',
      category: 'technology',
      industry: 'Mobile Apps',
      documentType: 'promotional_sheet',
      description: 'Promotional material for mobile app launches',
      tags: ['mobile', 'app', 'consumer', 'b2c'],
      popular: false,
      colorScheme: 'indigo',
      layoutType: 'editorial',
      thumbnail: '/templates/mobile-app-promo.png',
      prefilled: {
        companyName: 'FitTrack',
        industry: 'Health & Fitness',
        shortDescription: 'AI personal trainer in your pocket with real-time form correction',
        problem: 'Personal trainers cost $100/hour, poor form causes injuries',
        solution: 'Computer vision analyzes workout form via phone camera',
        targetCustomers: 'Fitness enthusiasts 25-45, $50K+ income',
        marketOpportunity: '$30B fitness app market, 100M potential users',
        competitors: 'Peloton, Apple Fitness+, Nike Training Club',
        differentiation: 'Real-time AI form correction vs. pre-recorded videos',
        revenueModel: 'Freemium: $9.99/month premium',
        pricing: 'Free basic, Premium $9.99, Family $14.99',
        currentTraction: '50K downloads, 5K paid subscribers, 4.8★ rating',
        team: 'Ex-Google CV engineers + certified trainers',
        fundingAsk: '$3M seed for AI model training and marketing',
        roadmap: 'Q1: Android launch, Q2: Wearables integration, Q3: Social features',
      },
    },

    // Fintech Templates
    {
      id: 'fintech-investor-flyer',
      name: 'Fintech Investor Flyer',
      category: 'fintech',
      industry: 'Financial Technology',
      documentType: 'business_flyer',
      description: 'Professional flyer for fintech investor presentations',
      tags: ['fintech', 'finance', 'investment', 'banking'],
      popular: true,
      colorScheme: 'emerald',
      layoutType: 'overlay',
      thumbnail: '/templates/fintech-investor-flyer.png',
      prefilled: {
        companyName: 'PayFlow',
        industry: 'Payments',
        shortDescription: 'Instant cross-border payments for freelancers and SMBs',
        problem: 'International payments take 3-5 days and cost 3-7% in fees',
        solution: 'Blockchain-based instant transfers at 0.5% cost',
        targetCustomers: 'Freelancers and SMBs with international clients',
        marketOpportunity: '$300B cross-border payments market',
        competitors: 'Wise, PayPal, Western Union',
        differentiation: 'Instant vs. 3-day settlement, 85% lower fees',
        revenueModel: 'Transaction fees: 0.5% per transfer',
        pricing: '0.5% transaction fee, no hidden charges',
        currentTraction: '$10M monthly volume, 10K active users, 40% MoM growth',
        team: 'Ex-Stripe and Coinbase engineering leads',
        fundingAsk: '$10M Series A for licenses and expansion',
        roadmap: 'Q1: EU licenses, Q2: Latin America, Q3: Asia expansion',
      },
    },
    {
      id: 'neobank-overview',
      name: 'Neobank Product Sheet',
      category: 'fintech',
      industry: 'Banking',
      documentType: 'product_flyer',
      description: 'Product overview for digital banking solutions',
      tags: ['banking', 'fintech', 'neobank', 'digital'],
      popular: false,
      colorScheme: 'teal',
      layoutType: 'grid',
      thumbnail: '/templates/neobank-overview.png',
      prefilled: {
        companyName: 'Nextbank',
        industry: 'Digital Banking',
        shortDescription: 'Mobile-first banking for digital nomads and expats',
        problem: 'Traditional banks don\'t support multi-currency accounts for global workers',
        solution: 'Multi-currency accounts with local IBANs in 30+ countries',
        targetCustomers: 'Digital nomads, expats, remote workers',
        marketOpportunity: '50M digital nomads, $5B addressable market',
        competitors: 'Revolut, N26, Wise',
        differentiation: 'Local IBANs in 30 countries vs. 5-10 for competitors',
        revenueModel: 'Monthly subscription + interchange fees',
        pricing: 'Free tier, Premium $9.99, Business $29.99',
        currentTraction: '100K users, 10K premium subscribers, banking license approved',
        team: 'Ex-Revolut team with banking expertise',
        fundingAsk: '$15M Series B for international expansion',
        roadmap: 'Q1: US market entry, Q2: Business accounts, Q3: Investment features',
      },
    },

    // E-commerce Templates
    {
      id: 'ecommerce-brand-sheet',
      name: 'E-commerce Brand Sheet',
      category: 'ecommerce',
      industry: 'E-commerce',
      documentType: 'brand_overview',
      description: 'Brand overview for e-commerce businesses',
      tags: ['ecommerce', 'retail', 'brand', 'dtc'],
      popular: true,
      colorScheme: 'orange',
      layoutType: 'asymmetric',
      thumbnail: '/templates/ecommerce-brand-sheet.png',
      prefilled: {
        companyName: 'EcoThreads',
        industry: 'Sustainable Fashion',
        shortDescription: 'Sustainable fashion brand using recycled ocean plastic',
        problem: '8M tons of plastic enter oceans yearly, fast fashion is wasteful',
        solution: 'Stylish clothing made from 100% recycled ocean plastic',
        targetCustomers: 'Eco-conscious millennials and Gen-Z, $40K+ income',
        marketOpportunity: '$300B sustainable fashion market, 20% CAGR',
        competitors: 'Patagonia, Everlane, Allbirds',
        differentiation: 'Ocean plastic recycling vs. general sustainability claims',
        revenueModel: 'Direct-to-consumer e-commerce',
        pricing: 'Premium positioning: $60-150 per item',
        currentTraction: '$2M annual revenue, 10K customers, 35% repeat rate',
        team: 'Fashion industry veterans + sustainability experts',
        fundingAsk: '$3M for inventory and marketing',
        roadmap: 'Q1: Retail partnerships, Q2: Men\'s line, Q3: Accessories',
      },
    },
    {
      id: 'marketplace-overview',
      name: 'Marketplace One-Pager',
      category: 'ecommerce',
      industry: 'Marketplace',
      documentType: 'modern_one_pager',
      description: 'One-pager for two-sided marketplace platforms',
      tags: ['marketplace', 'platform', 'two-sided', 'network'],
      popular: false,
      colorScheme: 'amber',
      layoutType: 'hero',
      thumbnail: '/templates/marketplace-overview.png',
      prefilled: {
        companyName: 'ArtisanHub',
        industry: 'Handmade Goods Marketplace',
        shortDescription: 'Global marketplace connecting artisans with conscious consumers',
        problem: 'Artisans struggle to reach global markets, consumers want authentic goods',
        solution: 'Curated marketplace with storytelling and direct artisan connections',
        targetCustomers: 'Artisans in developing countries + conscious consumers globally',
        marketOpportunity: '$40B handmade goods market',
        competitors: 'Etsy, Fair Trade certified stores',
        differentiation: 'Direct artisan stories + impact metrics vs. generic listings',
        revenueModel: '15% commission on sales',
        pricing: '15% seller commission, no buyer fees',
        currentTraction: '500 artisans, 10K buyers, $500K GMV, 30% MoM growth',
        team: 'Ex-Etsy and Fair Trade organization leaders',
        fundingAsk: '$5M Series A for artisan onboarding and marketing',
        roadmap: 'Q1: Africa expansion, Q2: Mobile app, Q3: Wholesale channel',
      },
    },

    // Healthcare Templates
    {
      id: 'healthtech-flyer',
      name: 'HealthTech Flyer',
      category: 'healthcare',
      industry: 'Healthcare Technology',
      documentType: 'marketing_flyer',
      description: 'Marketing flyer for healthcare technology solutions',
      tags: ['healthcare', 'medical', 'healthtech', 'telemedicine'],
      popular: true,
      colorScheme: 'rose',
      layoutType: 'split',
      thumbnail: '/templates/healthtech-flyer.png',
      prefilled: {
        companyName: 'MediConnect',
        industry: 'Telemedicine',
        shortDescription: 'AI-powered remote patient monitoring and telehealth platform',
        problem: 'Chronic disease patients need frequent monitoring, hospital visits are costly',
        solution: 'At-home monitoring devices + AI alerts for early intervention',
        targetCustomers: 'Healthcare providers, insurance companies, elderly patients',
        marketOpportunity: '$250B remote patient monitoring market',
        competitors: 'Teladoc, Amwell, Doctor on Demand',
        differentiation: 'AI predictive alerts vs. reactive monitoring',
        revenueModel: 'B2B2C: $50-200/patient/month paid by providers',
        pricing: 'Basic $50, Advanced $120, Premium $200',
        currentTraction: '50 hospital partnerships, 5K active patients, FDA clearance',
        team: 'Medical doctors + AI engineers, Stanford Health advisors',
        fundingAsk: '$10M Series A for clinical trials and sales',
        roadmap: 'Q1: Diabetes monitoring, Q2: Cardiac care, Q3: Insurance partnerships',
      },
    },
    {
      id: 'wellness-promo',
      name: 'Wellness Program Sheet',
      category: 'healthcare',
      industry: 'Wellness',
      documentType: 'promotional_sheet',
      description: 'Promotional material for wellness programs',
      tags: ['wellness', 'mental-health', 'corporate', 'b2b'],
      popular: false,
      colorScheme: 'purple',
      layoutType: 'editorial',
      thumbnail: '/templates/wellness-promo.png',
      prefilled: {
        companyName: 'MindfulWork',
        industry: 'Corporate Wellness',
        shortDescription: 'Mental health platform for employee wellbeing and burnout prevention',
        problem: 'Employee burnout costs companies $300B/year in lost productivity',
        solution: 'AI mental health coach + therapist matching + wellness tracking',
        targetCustomers: 'HR departments in companies 100+ employees',
        marketOpportunity: '$60B corporate wellness market',
        competitors: 'BetterHelp, Calm for Business, Headspace for Work',
        differentiation: 'Proactive burnout detection vs. reactive therapy matching',
        revenueModel: 'Per-employee SaaS: $10-30/employee/month',
        pricing: 'Standard $10, Premium $20, Enterprise $30',
        currentTraction: '50 corporate clients, 10K employees covered, 85% engagement',
        team: 'Licensed therapists + tech founders, backed by Mayo Clinic',
        fundingAsk: '$8M Series A for enterprise sales and content',
        roadmap: 'Q1: Manager training, Q2: Analytics dashboard, Q3: Global expansion',
      },
    },

    // Education Templates
    {
      id: 'edtech-platform-sheet',
      name: 'EdTech Platform Sheet',
      category: 'education',
      industry: 'Education Technology',
      documentType: 'modern_one_pager',
      description: 'One-pager for educational technology platforms',
      tags: ['education', 'edtech', 'learning', 'online-courses'],
      popular: true,
      colorScheme: 'blue',
      layoutType: 'grid',
      thumbnail: '/templates/edtech-platform-sheet.png',
      prefilled: {
        companyName: 'CodeAcademy Kids',
        industry: 'K-12 Education',
        shortDescription: 'Gamified coding education platform for kids 6-14',
        problem: 'Kids need 21st century skills but schools lack coding curriculum',
        solution: 'Game-based coding lessons with AI tutor and progress tracking',
        targetCustomers: 'Parents of kids 6-14, schools, after-school programs',
        marketOpportunity: '$20B K-12 coding education market',
        competitors: 'Scratch, Code.org, Tynker',
        differentiation: 'AI tutor personalizes learning vs. one-size-fits-all',
        revenueModel: 'B2C subscription + B2B school licenses',
        pricing: 'Parent $19.99/month, School $500/classroom/year',
        currentTraction: '50K students, 200 schools, 70% completion rate',
        team: 'Ex-Google Education + child development experts',
        fundingAsk: '$5M Series A for curriculum and marketing',
        roadmap: 'Q1: Mobile app, Q2: Teacher dashboard, Q3: Certification program',
      },
    },
    {
      id: 'training-flyer',
      name: 'Corporate Training Flyer',
      category: 'education',
      industry: 'Corporate Training',
      documentType: 'business_flyer',
      description: 'Flyer for corporate training and upskilling programs',
      tags: ['training', 'corporate', 'b2b', 'upskilling'],
      popular: false,
      colorScheme: 'navy',
      layoutType: 'overlay',
      thumbnail: '/templates/training-flyer.png',
      prefilled: {
        companyName: 'SkillBoost Pro',
        industry: 'Corporate Learning',
        shortDescription: 'AI-powered upskilling platform for enterprise teams',
        problem: 'Companies spend $200B/year on training with poor ROI and low completion',
        solution: 'Personalized learning paths with AI skill gap analysis',
        targetCustomers: 'L&D departments in companies 500+ employees',
        marketOpportunity: '$200B corporate training market',
        competitors: 'Coursera for Business, LinkedIn Learning, Udemy Business',
        differentiation: 'AI skill gap analysis + ROI tracking vs. generic courses',
        revenueModel: 'Per-employee SaaS: $30-100/employee/year',
        pricing: 'Standard $30, Premium $60, Enterprise $100',
        currentTraction: '100 enterprise clients, 50K learners, 80% completion rate',
        team: 'Ex-Coursera and Deloitte Consulting leaders',
        fundingAsk: '$12M Series B for enterprise sales and content',
        roadmap: 'Q1: Skills marketplace, Q2: Certification tracking, Q3: Integration hub',
      },
    },
  ];

  /**
   * Get all visual templates
   */
  findAll(): VisualTemplate[] {
    return this.visualTemplates;
  }

  /**
   * Get templates by category
   */
  findByCategory(category: string): VisualTemplate[] {
    if (category === 'all') {
      return this.visualTemplates;
    }
    return this.visualTemplates.filter((t) => t.category === category);
  }

  /**
   * Get popular templates
   */
  findPopular(): VisualTemplate[] {
    return this.visualTemplates.filter((t) => t.popular);
  }

  /**
   * Search templates
   */
  search(query: string): VisualTemplate[] {
    const q = query.toLowerCase();
    return this.visualTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.industry.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  /**
   * Get template by ID
   */
  findOne(id: string): VisualTemplate | undefined {
    return this.visualTemplates.find((t) => t.id === id);
  }
}
