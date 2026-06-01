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
import { TEMPLATE_TO_SMART_FAMILY } from '../templateFamilyMap';

const BASE_FAMILIES: TemplateFamily[] = [
  INVESTOR_MINIMAL,
  LUXURY_DARK,
  EDITORIAL_REPORT,
  STARTUP_GRADIENT,
  CRIMSON_DARK_BUSINESS,
  LIGHT_BLUE_BUSINESS,
  CORPORATE_MONOCHROME,
  SOFT_GEOMETRIC_BLUE,
];

const SMART_FAMILY_TO_BASE: Record<string, TemplateFamily> = {
  'investor-minimal': INVESTOR_MINIMAL,
  'luxury-dark': LUXURY_DARK,
  'editorial-report': EDITORIAL_REPORT,
  'startup-gradient': STARTUP_GRADIENT,
  'crimson-dark': CRIMSON_DARK_BUSINESS,
  'crimson-dark-business': CRIMSON_DARK_BUSINESS,
  'light-blue-business': LIGHT_BLUE_BUSINESS,
  'corporate-monochrome': CORPORATE_MONOCHROME,
  'soft-geometric-blue': SOFT_GEOMETRIC_BLUE,
  'ocean-deep': CORPORATE_MONOCHROME,
  'forest-executive': EDITORIAL_REPORT,
  'ember-orange': STARTUP_GRADIENT,
  'arctic-white': INVESTOR_MINIMAL,
  'slate-pro': CORPORATE_MONOCHROME,
  'emerald-fintech': LIGHT_BLUE_BUSINESS,
  'midnight-tech': LUXURY_DARK,
  'rose-modern': SOFT_GEOMETRIC_BLUE,
  'cobalt-impact': LIGHT_BLUE_BUSINESS,
  'warm-sand': EDITORIAL_REPORT,
  'violet-creative': STARTUP_GRADIENT,
  'teal-health': SOFT_GEOMETRIC_BLUE,
};

const TEMPLATE_NAMES: Record<string, string> = {
  'crimson-dark-business': 'Crimson Dark Business',
  'purple-gradient-startup': 'Purple Gradient Startup',
  'editorial-business-report': 'Editorial Business Report',
  'dark-luxury-proposal': 'Dark Luxury Proposal',
  'ultra-minimal-swiss': 'Ultra Minimal Swiss',
  'investor-geometric-beige': 'Investor Geometric Beige',
  'yellow-digital-course': 'Yellow Digital Course',
  'light-blue-business-marketing': 'Light Blue Business Marketing',
  'teal-business-plan': 'Teal Business Plan',
  'monochrome-corporate-strategy': 'Monochrome Corporate Strategy',
  'fintech-investor-deck': 'Fintech Investor Deck',
  'startup-pitch-modern': 'Startup Pitch Modern',
  'product-launch-showcase': 'Product Launch Showcase',
  'training-course-pro': 'Training Course Pro',
  'board-meeting-executive': 'Board Meeting Executive',
  'sales-deck-conversion': 'Sales Deck Conversion',
  'strategy-roadmap': 'Strategy Roadmap',
  'agency-campaign-deck': 'Agency Campaign Deck',
  'healthcare-clean-brief': 'Healthcare Clean Brief',
  'sustainability-impact-deck': 'Sustainability Impact Deck',
};

function templateFamily(templateId: string, smartFamilyId: string): TemplateFamily {
  const base = SMART_FAMILY_TO_BASE[smartFamilyId] || INVESTOR_MINIMAL;
  return {
    ...base,
    id: templateId,
    name: TEMPLATE_NAMES[templateId] || base.name,
    category: base.category,
    theme: { ...base.theme },
    typography: { ...base.typography },
    chrome: { ...base.chrome },
    variants: base.variants.map((variant) => ({
      ...variant,
      slots: variant.slots.map((slot) => ({ ...slot, acceptsTypes: [...slot.acceptsTypes] })),
      chrome: variant.chrome ? { ...variant.chrome } : undefined,
      typography: variant.typography ? { ...variant.typography } : undefined,
    })),
  };
}

const TEMPLATE_FAMILIES = Object.entries(TEMPLATE_TO_SMART_FAMILY).map(([templateId, familyId]) =>
  templateFamily(templateId, familyId),
);

export const COMPOSITION_FAMILIES: TemplateFamily[] = [
  ...BASE_FAMILIES,
  ...TEMPLATE_FAMILIES,
];

// Run overlap validator on each family at module load (dev only).
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  for (const f of COMPOSITION_FAMILIES) validateFamily(f);
}

export function findCompositionFamily(templateId: string | null | undefined): TemplateFamily | null {
  if (!templateId) return null;
  const direct = COMPOSITION_FAMILIES.find((f) => f.id === templateId);
  if (direct) return direct;
  return SMART_FAMILY_TO_BASE[templateId] || null;
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
