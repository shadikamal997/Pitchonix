export const TEMPLATE_TO_SMART_FAMILY = {
  // Perfect colour/mood matches
  'crimson-dark-business':         'crimson-dark',
  'purple-gradient-startup':       'violet-creative',
  'editorial-business-report':     'editorial-report',
  'dark-luxury-proposal':          'luxury-dark',
  'ultra-minimal-swiss':           'arctic-white',
  'investor-geometric-beige':      'investor-minimal',
  'yellow-digital-course':         'ember-orange',
  'light-blue-business-marketing': 'light-blue-business',
  'teal-business-plan':            'teal-health',
  'monochrome-corporate-strategy': 'corporate-monochrome',
  'startup-pitch-modern':          'startup-gradient',
  'strategy-roadmap':              'slate-pro',
  'product-launch-showcase':       'cobalt-impact',

  // Corrected mappings
  'fintech-investor-deck':         'midnight-tech',        // dark navy/cyan fintech
  'training-course-pro':           'emerald-fintech',      // light green education
  'board-meeting-executive':       'ocean-deep',           // dark navy executive
  'sales-deck-conversion':         'warm-sand',            // warm amber/orange sales
  'agency-campaign-deck':          'rose-modern',          // creative magenta/energetic
  'healthcare-clean-brief':        'soft-geometric-blue',  // soft blue / clinical
  'sustainability-impact-deck':    'forest-executive',     // dark forest green / ESG
} as const;

export type TemplateId = keyof typeof TEMPLATE_TO_SMART_FAMILY;

export function familyForTemplate(templateId: string | null | undefined): string | null {
  if (!templateId) return null;
  return (TEMPLATE_TO_SMART_FAMILY as Record<string, string>)[templateId] || null;
}
