// =============================================================================
//  Composition family registry — fixed mapping per template identity
//
//  Each template id maps to a family whose VISUAL IDENTITY matches the
//  template's name. No more aliasing collisions (e.g. crimson-dark mapped to
//  luxury-dark gold). At module load, every family's slot geometry is
//  validated and collisions are logged to the console.
// =============================================================================

import type { TemplateFamily } from './types';
import { INVESTOR_MINIMAL      } from './families/investor-minimal';
import { LUXURY_DARK           } from './families/luxury-dark';
import { EDITORIAL_REPORT      } from './families/editorial-report';
import { STARTUP_GRADIENT      } from './families/startup-gradient';
import { CRIMSON_DARK_BUSINESS } from './families/crimson-dark';
import { LIGHT_BLUE_BUSINESS   } from './families/light-blue-business';
import { CORPORATE_MONOCHROME  } from './families/corporate-monochrome';
import { SOFT_GEOMETRIC_BLUE   } from './families/soft-geometric-blue';
import { validateFamily        } from './overlap-validator';

export const COMPOSITION_FAMILIES: TemplateFamily[] = [
  INVESTOR_MINIMAL,
  LUXURY_DARK,
  EDITORIAL_REPORT,
  STARTUP_GRADIENT,
  CRIMSON_DARK_BUSINESS,
  LIGHT_BLUE_BUSINESS,
  CORPORATE_MONOCHROME,
  SOFT_GEOMETRIC_BLUE,
];

// Run overlap validator on each family at module load (dev only).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  for (const f of COMPOSITION_FAMILIES) validateFamily(f);
}

// Template id → family id mapping. Each template gets the family whose visual
// identity actually matches it. Templates not listed here render with theme
// tokens only (no family chrome).
const TEMPLATE_TO_FAMILY: Record<string, string> = {
  // Native ids
  'investor-minimal':              'investor-minimal',
  'luxury-dark':                   'luxury-dark',
  'editorial-report':              'editorial-report',
  'startup-gradient':              'startup-gradient',
  'crimson-dark-business':         'crimson-dark-business',
  'corporate-monochrome':          'corporate-monochrome',
  'soft-geometric-blue':           'soft-geometric-blue',

  // Phase 10 template ids → matching family by visual identity
  'investor-geometric-beige':      'corporate-monochrome',
  'monochrome-corporate-strategy': 'investor-minimal',
  'ultra-minimal-swiss':           'investor-minimal',
  'strategy-roadmap':              'investor-minimal',
  'board-meeting-executive':       'corporate-monochrome',

  'dark-luxury-proposal':          'luxury-dark',

  'editorial-business-report':     'editorial-report',
  'sustainability-impact-deck':    'editorial-report',

  'light-blue-business-marketing': 'soft-geometric-blue',
  'teal-business-plan':            'soft-geometric-blue',
  'healthcare-clean-brief':        'soft-geometric-blue',

  'purple-gradient-startup':       'startup-gradient',
  'startup-pitch-modern':          'startup-gradient',
  'product-launch-showcase':       'startup-gradient',
  'agency-campaign-deck':          'startup-gradient',

  'fintech-investor-deck':         'crimson-dark-business',
  'yellow-digital-course':         'startup-gradient',
  'training-course-pro':           'editorial-report',
  'sales-deck-conversion':         'crimson-dark-business',
};

export function findCompositionFamily(templateId: string | null | undefined): TemplateFamily | null {
  if (!templateId) return null;
  const direct = COMPOSITION_FAMILIES.find((f) => f.id === templateId);
  if (direct) return direct;
  const aliasId = TEMPLATE_TO_FAMILY[templateId];
  if (!aliasId) return null;
  return COMPOSITION_FAMILIES.find((f) => f.id === aliasId) || null;
}

/** Returns a debug snapshot of which family + variant would be used. */
export function debugRenderer(templateId: string | null | undefined, slideType: string | undefined): {
  selectedTemplateId: string | null;
  activeFamilyId:     string | null;
  activeFamilyName:   string | null;
  activeVariantTypes: string[];
  variantSlotIds:     string[];
} {
  const family = findCompositionFamily(templateId);
  if (!family) {
    return { selectedTemplateId: templateId || null, activeFamilyId: null, activeFamilyName: null, activeVariantTypes: [], variantSlotIds: [] };
  }
  const t = (slideType || 'default') as any;
  const variant = family.variants.find((v) => v.matches.includes(t)) || family.variants.find((v) => v.matches.includes('default' as any)) || family.variants[0];
  return {
    selectedTemplateId: templateId || null,
    activeFamilyId:     family.id,
    activeFamilyName:   family.name,
    activeVariantTypes: (variant?.matches || []).map(String),
    variantSlotIds:     (variant?.slots || []).map((s) => s.id),
  };
}
