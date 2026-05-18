import { ProTemplateDefinition, ProTemplateTokens } from '../types';

const archetypes: ProTemplateDefinition['archetypes'] = [
  'cover',
  'introduction',
  'section-divider',
  'content',
  'feature-list',
  'stats',
  'timeline',
  'swot-grid',
  'image-text',
  'closing',
];

const baseRadius = { sm: 8, md: 14, lg: 22, xl: 30 };

function tokens(colors: ProTemplateTokens['colors'], display = 'Inter', body = 'Inter'): ProTemplateTokens {
  return {
    colors,
    radius: baseRadius,
    typography: { display, body },
  };
}

function template(
  id: string,
  name: string,
  category: string,
  family: string,
  description: string,
  tags: string[],
  tokenSet: ProTemplateTokens,
): ProTemplateDefinition {
  return { id, name, category, family, description, tags, tokens: tokenSet, archetypes };
}

const palettes = {
  minimal: tokens({ paper: '#FAFAF7', ink: '#171717', muted: '#68625B', charcoal: '#25211D', accent: '#7C8C5A', accentSoft: '#ECEFDF', line: '#E3DFD4' }, 'Inter', 'Inter'),
  executive: tokens({ paper: '#F7F8F8', ink: '#17211F', muted: '#60706B', charcoal: '#18312D', accent: '#8DB7A7', accentSoft: '#E5F0EC', line: '#D7E2DE' }, 'Libre Baskerville', 'Manrope'),
  startup: tokens({ paper: '#F8FBFF', ink: '#14213D', muted: '#5E6D82', charcoal: '#111827', accent: '#3B82F6', accentSoft: '#DBEAFE', line: '#D6E4F5' }, 'Space Grotesk', 'Inter'),
  fintech: tokens({ paper: '#F6FBF9', ink: '#092E2A', muted: '#58726C', charcoal: '#123B36', accent: '#17A887', accentSoft: '#DDF7F0', line: '#CFE6DF' }, 'DM Sans', 'DM Sans'),
  luxury: tokens({ paper: '#11100E', ink: '#F8F1E5', muted: '#C4B8A4', charcoal: '#070707', accent: '#C7A45D', accentSoft: '#2B2418', line: '#3E3425' }, 'Playfair Display', 'Lora'),
  editorial: tokens({ paper: '#FFFDF8', ink: '#1C1A17', muted: '#756C5F', charcoal: '#25201A', accent: '#B35432', accentSoft: '#F5E5DB', line: '#E9DFD4' }, 'Cormorant Garamond', 'Lora'),
  futuristic: tokens({ paper: '#F7F9FF', ink: '#151733', muted: '#687099', charcoal: '#17152F', accent: '#7C3AED', accentSoft: '#EDE9FE', line: '#DCD7F6' }, 'Syne', 'Space Grotesk'),
  agency: tokens({ paper: '#FFFBF2', ink: '#211917', muted: '#796661', charcoal: '#2B1E1B', accent: '#EF6C4D', accentSoft: '#FDE7DF', line: '#EED9D0' }, 'Outfit', 'Nunito'),
  analytics: tokens({ paper: '#F5F8FB', ink: '#182536', muted: '#627086', charcoal: '#1F2937', accent: '#0EA5E9', accentSoft: '#E0F2FE', line: '#D4E3EF' }, 'IBM Plex Sans', 'IBM Plex Sans'),
  healthcare: tokens({ paper: '#F8FEFC', ink: '#11352F', muted: '#5C766F', charcoal: '#163D38', accent: '#2DD4BF', accentSoft: '#CCFBF1', line: '#CFEAE5' }, 'Nunito', 'Nunito'),
};

export const PRO_TEMPLATE_REGISTRY: ProTemplateDefinition[] = [
  template('modern-minimal-report', 'Modern Minimal Report', 'Modern Minimal', 'Minimal Report', 'Quiet editorial report system with spacious layouts, soft rules, and refined typography.', ['Minimal', 'Report', 'Editorial'], palettes.minimal),
  template('executive-board-brief', 'Executive Board Brief', 'Executive', 'Board Brief', 'Premium executive pages for strategy, operating updates, and decision documents.', ['Executive', 'Board', 'Strategy'], palettes.executive),
  template('startup-investor-memo', 'Startup Investor Memo', 'Startup', 'Investor Memo', 'Fast-moving startup narrative with metrics, roadmap, and investor-ready structure.', ['Startup', 'Investor', 'Pitch'], palettes.startup),
  template('fintech-operating-plan', 'Fintech Operating Plan', 'Fintech', 'Operating Plan', 'Trust-forward finance style with crisp data panels and controlled green accents.', ['Fintech', 'Finance', 'Plan'], palettes.fintech),
  template('dark-luxury-proposal', 'Dark Luxury Proposal', 'Dark Luxury', 'Luxury Proposal', 'High-contrast premium proposal design for luxury, hospitality, and high-value services.', ['Luxury', 'Dark', 'Proposal'], palettes.luxury),
  template('editorial-whitepaper', 'Editorial Whitepaper', 'Editorial', 'Whitepaper', 'Magazine-inspired long-form publishing with narrative pacing and strong section breaks.', ['Editorial', 'Whitepaper', 'Publishing'], palettes.editorial),
  template('future-tech-brief', 'Future Tech Brief', 'Futuristic', 'Technology Brief', 'Futuristic technical brief with modular data blocks and high-energy visual rhythm.', ['AI', 'Future Tech', 'Product'], palettes.futuristic),
  template('agency-campaign-book', 'Agency Campaign Book', 'Agency', 'Campaign Book', 'Bold agency layout for campaign strategy, creative direction, and launch packages.', ['Agency', 'Marketing', 'Campaign'], palettes.agency),
  template('analytics-performance-report', 'Analytics Performance Report', 'Analytics', 'Performance Report', 'Data-heavy report design with KPI pages, chart sections, and insight hierarchy.', ['Analytics', 'KPI', 'Charts'], palettes.analytics),
  template('product-showcase-deckdoc', 'Product Showcase Doc', 'Product Showcase', 'Product Narrative', 'Visual product storytelling with feature grids, proof points, and CTA pages.', ['Product', 'Showcase', 'Features'], palettes.startup),
  template('consulting-strategy-playbook', 'Consulting Strategy Playbook', 'Consulting', 'Strategy Playbook', 'Consulting-grade structure for diagnosis, recommendations, roadmap, and next steps.', ['Consulting', 'Strategy', 'Roadmap'], palettes.executive),
  template('premium-whitepaper-system', 'Premium Whitepaper System', 'Whitepaper', 'Research Paper', 'Long-form publishing layout for analysis, research, technical content, and evidence.', ['Research', 'Whitepaper', 'Longform'], palettes.editorial),
  template('ai-future-tech-report', 'AI Future Tech Report', 'AI/Future Tech', 'AI Report', 'Modern AI report system with deep-tech visual language and structured insights.', ['AI', 'Technology', 'Report'], palettes.futuristic),
  template('sustainability-impact-report', 'Sustainability Impact Report', 'Sustainability', 'Impact Report', 'Impact-focused layouts for ESG, sustainability, and public-facing progress reports.', ['Sustainability', 'ESG', 'Impact'], palettes.fintech),
  template('healthcare-program-brief', 'Healthcare Program Brief', 'Healthcare', 'Program Brief', 'Calm clinical communication layout for programs, research, and stakeholder updates.', ['Healthcare', 'Clinical', 'Program'], palettes.healthcare),
  template('investor-diligence-pack', 'Investor Diligence Pack', 'Investor', 'Diligence Pack', 'Structured investor packet with evidence, metrics, risks, and decision-ready sections.', ['Investor', 'Diligence', 'Finance'], palettes.analytics),
  template('educational-course-guide', 'Educational Course Guide', 'Educational', 'Course Guide', 'Readable training and education layout with modules, checkpoints, and summaries.', ['Education', 'Training', 'Guide'], palettes.minimal),
  template('roadmap-execution-plan', 'Roadmap Execution Plan', 'Roadmap', 'Execution Plan', 'Timeline-forward operating plan for milestones, ownership, dependencies, and delivery.', ['Roadmap', 'Timeline', 'Operations'], palettes.agency),
  template('case-study-storyline', 'Case Study Storyline', 'Case Study', 'Customer Story', 'Narrative case study system for problem, solution, proof, and quantified outcomes.', ['Case Study', 'Story', 'Proof'], palettes.executive),
  template('ultra-minimal-onepager', 'Ultra Minimal One Pager', 'Ultra Minimal', 'One Pager', 'Reduced, crisp one-page and short-form layout system for concise business documents.', ['Ultra Minimal', 'One Pager', 'Brief'], palettes.minimal),
];

export function getProTemplate(id?: string | null) {
  if (!id) return null;
  return PRO_TEMPLATE_REGISTRY.find(template => template.id === id) || null;
}
