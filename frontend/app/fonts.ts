// =============================================================================
//  Template font loader — Ω.INFRA.1 offline-resilient rewrite.
//
//  Previously every family was loaded via `next/font/google`, which FETCHES the
//  font files at compile time. When the build host has no network to
//  fonts.googleapis.com that fetch throws inside this module → the root layout
//  throws during SSR → every route returns 500.
//
//  Fix: do not fetch fonts at build time. The `--font-*` CSS variables are now
//  declared in globals.css (:root) and the actual web fonts are loaded
//  browser-side via a <link> in the root layout. Offline, the system fallbacks
//  in each variable apply and the app still renders — no SSR crash. The public
//  API (inter/manrope/allFontClassNames/resolveFontStack/FONT_NAME_TO_VAR) is
//  unchanged so consumers keep working.
// =============================================================================

interface FontShim { className: string; variable: string; style: { fontFamily?: string } }
const shim = (): FontShim => ({ className: '', variable: '', style: {} });

export const inter = shim();
export const playfair = shim();
export const cormorant = shim();
export const manrope = shim();
export const spaceGrotesk = shim();
export const fraunces = shim();
export const ibmPlexSans = shim();
export const bricolage = shim();
export const outfit = shim();
export const dmSerif = shim();
export const sora = shim();
export const lora = shim();
export const nunito = shim();
export const poppins = shim();
export const lato = shim();

// No build-time font classes to apply — the CSS variables live in globals.css.
export const allFontClassNames = '';

/** Google Fonts families to load browser-side (see RootLayout <link>). */
export const GOOGLE_FONT_FAMILIES = [
  'Inter:wght@400;500;600;700',
  'Playfair+Display:wght@400;500;600;700',
  'Cormorant+Garamond:wght@400;500;600;700',
  'Manrope:wght@400;500;600;700',
  'Space+Grotesk:wght@400;500;600;700',
  'Fraunces:wght@400;500;600;700',
  'IBM+Plex+Sans:wght@300;400;500;600;700',
  'Bricolage+Grotesque:wght@400;500;600;700',
  'Outfit:wght@400;500;600;700',
  'DM+Serif+Display',
  'Sora:wght@400;500;600;700',
  'Lora:wght@400;500;600;700',
  'Nunito:wght@400;500;600;700',
  'Poppins:wght@300;400;500;600;700;800;900',
  'Lato:wght@300;400;700;900',
];
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' + GOOGLE_FONT_FAMILIES.map((f) => `family=${f}`).join('&') + '&display=swap';

// =============================================================================
//  Map family-declared font names → the CSS variables (declared in globals.css).
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
 *  that uses the CSS variables declared in globals.css. */
export function resolveFontStack(stack: string | undefined | null): string {
  if (!stack) return 'var(--font-sans), system-ui, sans-serif';
  const first = stack.match(/"([^"]+)"|'([^']+)'|([A-Za-z][\w\- ]*)/);
  const name = first ? (first[1] || first[2] || first[3] || '').trim() : '';
  return FONT_NAME_TO_VAR[name] || stack;
}
