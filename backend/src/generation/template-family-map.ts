import type { SmartFamilyId } from '../components/smart/smart-types';

export const TEMPLATE_TO_SMART_FAMILY: Record<string, SmartFamilyId> = {
  // ── Perfect colour/mood matches ────────────────────────────────────────────
  'crimson-dark-business':         'crimson-dark',         // dark red, dramatic
  'purple-gradient-startup':       'violet-creative',      // purple gradient dark
  'editorial-business-report':     'editorial-report',     // serif, cream paper
  'dark-luxury-proposal':          'luxury-dark',          // gold / black
  'ultra-minimal-swiss':           'arctic-white',         // pure white, minimal
  'investor-geometric-beige':      'investor-minimal',     // warm beige, terracotta
  'yellow-digital-course':         'ember-orange',         // yellow/orange energetic
  'light-blue-business-marketing': 'light-blue-business',  // sky blue, navy accent
  'teal-business-plan':            'teal-health',          // teal / aqua
  'monochrome-corporate-strategy': 'corporate-monochrome', // black & white
  'startup-pitch-modern':          'startup-gradient',     // dark blue gradient
  'strategy-roadmap':              'slate-pro',            // dark indigo, SaaS

  // ── Corrected mappings (previously mismatched) ────────────────────────────
  'fintech-investor-deck':         'midnight-tech',        // dark navy/cyan (was emerald-fintech)
  'training-course-pro':           'emerald-fintech',      // light green edu (was warm-sand)
  'board-meeting-executive':       'ocean-deep',           // dark navy executive (was forest-executive)
  'sales-deck-conversion':         'warm-sand',            // warm amber/orange sales (was crimson-dark)
  'agency-campaign-deck':          'rose-modern',          // creative magenta (was violet-creative)
  'healthcare-clean-brief':        'soft-geometric-blue',  // soft blue/clinical (was rose-modern)
  'sustainability-impact-deck':    'forest-executive',     // dark forest green (was shared with board)
  'product-launch-showcase':       'cobalt-impact',        // royal blue launch energy
};

export function familyForTemplate(templateId: string | null | undefined): SmartFamilyId | null {
  if (!templateId) return null;
  return TEMPLATE_TO_SMART_FAMILY[templateId] || null;
}
