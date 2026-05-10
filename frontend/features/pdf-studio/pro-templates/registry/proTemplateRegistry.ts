import { ProTemplateDefinition } from '../types';
import { businessFlyerTokens } from '../tokens/businessFlyer.tokens';

export const PRO_TEMPLATE_REGISTRY: ProTemplateDefinition[] = [
  {
    id: 'modern-business-flyer',
    name: 'Modern Business Flyer',
    family: 'Business Flyer',
    category: 'Business',
    description: 'Premium editorial flyer with charcoal panels, teal accents, asymmetry, metrics, timelines, and brochure-style pages.',
    tags: ['Business', 'Editorial', 'Modern', 'Marketing'],
    tokens: businessFlyerTokens,
    archetypes: [
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
    ],
  },
];

export function getProTemplate(id?: string | null) {
  if (!id) return null;
  return PRO_TEMPLATE_REGISTRY.find(template => template.id === id) || null;
}
