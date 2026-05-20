// =============================================================================
//  Template font loader — Phase 1 fix.
//
//  Every font referenced by a TemplateFamily is registered here via
//  `next/font/google`. Each font is exposed as a CSS variable that template
//  families consume via `resolveFontStack()`.
//
//  `next/font/google` requires literal object args (no spread), so each call
//  is self-contained.
// =============================================================================

import {
  Inter,
  Playfair_Display,
  Cormorant_Garamond,
  Manrope,
  Space_Grotesk,
  Fraunces,
  IBM_Plex_Sans,
  Bricolage_Grotesque,
  Outfit,
  DM_Serif_Display,
  Sora,
  Lora,
  Nunito,
  Poppins,
  Lato,
} from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'], variable: '--font-sans', display: 'swap', preload: true,
});

export const playfair = Playfair_Display({
  subsets: ['latin'], variable: '--font-playfair', display: 'swap', preload: false,
});

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant', display: 'swap', preload: false,
});

export const manrope = Manrope({
  subsets: ['latin'], variable: '--font-manrope', display: 'swap', preload: false,
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'], variable: '--font-space-grotesk', display: 'swap', preload: false,
});

export const fraunces = Fraunces({
  subsets: ['latin'], variable: '--font-fraunces', display: 'swap', preload: false,
});

export const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'], weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-plex', display: 'swap', preload: false,
});

export const bricolage = Bricolage_Grotesque({
  subsets: ['latin'], variable: '--font-bricolage', display: 'swap', preload: false,
});

export const outfit = Outfit({
  subsets: ['latin'], variable: '--font-outfit', display: 'swap', preload: false,
});

export const dmSerif = DM_Serif_Display({
  subsets: ['latin'], weight: '400', variable: '--font-dm-serif', display: 'swap', preload: false,
});

export const sora = Sora({
  subsets: ['latin'], variable: '--font-sora', display: 'swap', preload: false,
});

export const lora = Lora({
  subsets: ['latin'], variable: '--font-lora', display: 'swap', preload: false,
});

export const nunito = Nunito({
  subsets: ['latin'], variable: '--font-nunito', display: 'swap', preload: false,
});

export const poppins = Poppins({
  subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins', display: 'swap', preload: false,
});

export const lato = Lato({
  subsets: ['latin'], weight: ['300', '400', '700', '900'],
  variable: '--font-lato', display: 'swap', preload: false,
});

export const allFontClassNames = [
  inter.variable,
  playfair.variable,
  cormorant.variable,
  manrope.variable,
  spaceGrotesk.variable,
  fraunces.variable,
  ibmPlexSans.variable,
  bricolage.variable,
  outfit.variable,
  dmSerif.variable,
  sora.variable,
  lora.variable,
  nunito.variable,
  poppins.variable,
  lato.variable,
].join(' ');

// =============================================================================
//  Map family-declared font names → loaded CSS variables.
// =============================================================================

const FONT_NAME_TO_VAR: Record<string, string> = {
  'Playfair Display':       'var(--font-playfair), Georgia, serif',
  'Cormorant Garamond':     'var(--font-cormorant), Georgia, serif',
  'DM Serif Display':       'var(--font-dm-serif), Georgia, serif',
  'Fraunces':               'var(--font-fraunces), Georgia, serif',
  'Source Serif Pro':       'var(--font-fraunces), Georgia, serif',
  'Manrope':                'var(--font-manrope), system-ui, sans-serif',
  'Space Grotesk':          'var(--font-space-grotesk), system-ui, sans-serif',
  'IBM Plex Sans':          'var(--font-ibm-plex), system-ui, sans-serif',
  'Bricolage Grotesque':    'var(--font-bricolage), system-ui, sans-serif',
  'Outfit':                 'var(--font-outfit), system-ui, sans-serif',
  'Sora':                   'var(--font-sora), system-ui, sans-serif',
  'Poppins':                'var(--font-poppins), system-ui, sans-serif',
  'Nunito':                 'var(--font-nunito), system-ui, sans-serif',
  'Inter':                  'var(--font-sans), system-ui, sans-serif',
  'Lora':                   'var(--font-lora), Georgia, serif',
  'EB Garamond':            'var(--font-cormorant), Georgia, serif',
  'Lato':                   'var(--font-lato), system-ui, sans-serif',
  'Helvetica Neue':         'system-ui, -apple-system, Helvetica, Arial, sans-serif',
  'Georgia':                'Georgia, "Times New Roman", serif',
  'Arial':                  'Arial, sans-serif',
};

/** Resolve a template-declared font stack into a real CSS family value
 *  that uses the next/font CSS variables. */
export function resolveFontStack(stack: string | undefined | null): string {
  if (!stack) return 'var(--font-sans), system-ui, sans-serif';
  const first = stack.match(/"([^"]+)"|'([^']+)'|([A-Za-z][\w\- ]*)/);
  const name = first ? (first[1] || first[2] || first[3] || '').trim() : '';
  return FONT_NAME_TO_VAR[name] || stack;
}
