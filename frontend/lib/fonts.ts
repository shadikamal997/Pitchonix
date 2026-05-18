export type FontCategory = 'sans' | 'serif' | 'display' | 'script' | 'mono';

export interface FontOption {
  value: string;
  label: string;
  family: string;
  category: FontCategory;
  fallback: string;
}

const sansFallback = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const serifFallback = 'Georgia, "Times New Roman", serif';
const displayFallback = 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif';
const scriptFallback = '"Brush Script MT", cursive';
const monoFallback = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';

export const fontOptions: FontOption[] = [
  { value: 'inter', label: 'Inter', family: 'Inter', category: 'sans', fallback: sansFallback },
  { value: 'roboto', label: 'Roboto', family: 'Roboto', category: 'sans', fallback: sansFallback },
  { value: 'poppins', label: 'Poppins', family: 'Poppins', category: 'sans', fallback: sansFallback },
  { value: 'ibm_plex_sans', label: 'IBM Plex Sans', family: 'IBM Plex Sans', category: 'sans', fallback: sansFallback },
  { value: 'montserrat', label: 'Montserrat', family: 'Montserrat', category: 'sans', fallback: sansFallback },
  { value: 'lato', label: 'Lato', family: 'Lato', category: 'sans', fallback: sansFallback },
  { value: 'open_sans', label: 'Open Sans', family: 'Open Sans', category: 'sans', fallback: sansFallback },
  { value: 'raleway', label: 'Raleway', family: 'Raleway', category: 'sans', fallback: sansFallback },
  { value: 'dosis', label: 'Dosis', family: 'Dosis', category: 'sans', fallback: sansFallback },
  { value: 'ubuntu', label: 'Ubuntu', family: 'Ubuntu', category: 'sans', fallback: sansFallback },
  { value: 'quicksand', label: 'Quicksand', family: 'Quicksand', category: 'sans', fallback: sansFallback },
  { value: 'josefin_sans', label: 'Josefin Sans', family: 'Josefin Sans', category: 'sans', fallback: sansFallback },
  { value: 'fredoka', label: 'Fredoka', family: 'Fredoka', category: 'sans', fallback: sansFallback },
  { value: 'dm_sans', label: 'DM Sans', family: 'DM Sans', category: 'sans', fallback: sansFallback },
  { value: 'comfortaa', label: 'Comfortaa', family: 'Comfortaa', category: 'sans', fallback: sansFallback },
  { value: 'nunito', label: 'Nunito', family: 'Nunito', category: 'sans', fallback: sansFallback },
  { value: 'rubik', label: 'Rubik', family: 'Rubik', category: 'sans', fallback: sansFallback },
  { value: 'work_sans', label: 'Work Sans', family: 'Work Sans', category: 'sans', fallback: sansFallback },
  { value: 'syne', label: 'Syne', family: 'Syne', category: 'sans', fallback: sansFallback },
  { value: 'space_grotesk', label: 'Space Grotesk', family: 'Space Grotesk', category: 'sans', fallback: sansFallback },
  { value: 'outfit', label: 'Outfit', family: 'Outfit', category: 'sans', fallback: sansFallback },
  { value: 'varela_round', label: 'Varela Round', family: 'Varela Round', category: 'sans', fallback: sansFallback },
  { value: 'slabo_27px', label: 'Slabo 27px', family: 'Slabo 27px', category: 'sans', fallback: sansFallback },
  { value: 'lexend', label: 'Lexend', family: 'Lexend', category: 'sans', fallback: sansFallback },
  { value: 'manrope', label: 'Manrope', family: 'Manrope', category: 'sans', fallback: sansFallback },

  { value: 'merriweather', label: 'Merriweather', family: 'Merriweather', category: 'serif', fallback: serifFallback },
  { value: 'lora', label: 'Lora', family: 'Lora', category: 'serif', fallback: serifFallback },
  { value: 'pt_serif', label: 'PT Serif', family: 'PT Serif', category: 'serif', fallback: serifFallback },
  { value: 'bitter', label: 'Bitter', family: 'Bitter', category: 'serif', fallback: serifFallback },
  { value: 'crimson_text', label: 'Crimson Text', family: 'Crimson Text', category: 'serif', fallback: serifFallback },
  { value: 'cormorant', label: 'Cormorant', family: 'Cormorant Garamond', category: 'serif', fallback: serifFallback },
  { value: 'libre_baskerville', label: 'Libre Baskerville', family: 'Libre Baskerville', category: 'serif', fallback: serifFallback },
  { value: 'eb_garamond', label: 'EB Garamond', family: 'EB Garamond', category: 'serif', fallback: serifFallback },
  { value: 'prata', label: 'Prata', family: 'Prata', category: 'serif', fallback: serifFallback },
  { value: 'volkhov', label: 'Volkhov', family: 'Volkhov', category: 'serif', fallback: serifFallback },
  { value: 'playfair', label: 'Playfair Display', family: 'Playfair Display', category: 'serif', fallback: serifFallback },
  { value: 'georgia', label: 'Georgia', family: 'Georgia', category: 'serif', fallback: serifFallback },
  { value: 'times_new_roman', label: 'Times New Roman', family: 'Times New Roman', category: 'serif', fallback: serifFallback },

  { value: 'abril_fatface', label: 'Abril Fatface', family: 'Abril Fatface', category: 'display', fallback: displayFallback },
  { value: 'righteous', label: 'Righteous', family: 'Righteous', category: 'display', fallback: displayFallback },
  { value: 'bebas_neue', label: 'Bebas Neue', family: 'Bebas Neue', category: 'display', fallback: displayFallback },
  { value: 'oswald', label: 'Oswald', family: 'Oswald', category: 'display', fallback: displayFallback },
  { value: 'anton', label: 'Anton', family: 'Anton', category: 'display', fallback: displayFallback },
  { value: 'archivo_black', label: 'Archivo Black', family: 'Archivo Black', category: 'display', fallback: displayFallback },
  { value: 'gilda', label: 'Gilda Display', family: 'Gilda Display', category: 'display', fallback: displayFallback },
  { value: 'bangers', label: 'Bangers', family: 'Bangers', category: 'display', fallback: displayFallback },
  { value: 'chewy', label: 'Chewy', family: 'Chewy', category: 'display', fallback: displayFallback },

  { value: 'pacifico', label: 'Pacifico', family: 'Pacifico', category: 'script', fallback: scriptFallback },
  { value: 'caveat', label: 'Caveat', family: 'Caveat', category: 'script', fallback: scriptFallback },
  { value: 'great_vibes', label: 'Great Vibes', family: 'Great Vibes', category: 'script', fallback: scriptFallback },
  { value: 'dancing_script', label: 'Dancing Script', family: 'Dancing Script', category: 'script', fallback: scriptFallback },
  { value: 'satisfy', label: 'Satisfy', family: 'Satisfy', category: 'script', fallback: scriptFallback },
  { value: 'sacramento', label: 'Sacramento', family: 'Sacramento', category: 'script', fallback: scriptFallback },

  { value: 'ibm_plex_mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', category: 'mono', fallback: monoFallback },
  { value: 'jetbrains_mono', label: 'JetBrains Mono', family: 'JetBrains Mono', category: 'mono', fallback: monoFallback },
  { value: 'courier_prime', label: 'Courier Prime', family: 'Courier Prime', category: 'mono', fallback: monoFallback },
  { value: 'inconsolata', label: 'Inconsolata', family: 'Inconsolata', category: 'mono', fallback: monoFallback },
  { value: 'fira_code', label: 'Fira Code', family: 'Fira Code', category: 'mono', fallback: monoFallback },
  { value: 'source_code_pro', label: 'Source Code Pro', family: 'Source Code Pro', category: 'mono', fallback: monoFallback },
];

export const fontFamilies = fontOptions.reduce((acc, font) => {
  acc[font.category][font.value] = font.family;
  return acc;
}, {
  sans: {} as Record<string, string>,
  serif: {} as Record<string, string>,
  display: {} as Record<string, string>,
  script: {} as Record<string, string>,
  mono: {} as Record<string, string>,
});

export function getFontStack(value?: string | null): string {
  const font = fontOptions.find(option => option.value === value || option.family === value);
  if (!font) return value || `Inter, ${sansFallback}`;
  return `"${font.family}", ${font.fallback}`;
}

export function getFontKeyFromStack(stack?: string | null): string {
  if (!stack) return 'inter';
  const normalized = stack.toLowerCase();
  return fontOptions.find(option => normalized.includes(option.family.toLowerCase()))?.value || 'inter';
}
