// =============================================================================
//  Phase 42.7 — CV Import Enterprise Hardening helpers
//
//  Standalone (no Nest deps) so they're easy to unit-test and re-use.
//  Wired into CvImportService.
// =============================================================================

import { CvProfileDto } from './cv-types';

// -----------------------------------------------------------------------------
//  42.7B — Multi-language section heading dictionaries.
//
//  All keys are stored fully NORMALISED (lowercase, accent-stripped,
//  punctuation-stripped) so the lookup is O(1) regardless of input casing
//  or diacritics. Arabic + RTL handled by the same map since the comparison
//  is on Unicode codepoints.
// -----------------------------------------------------------------------------

export type SectionKey =
  | 'experience' | 'education' | 'skills' | 'languages' | 'projects'
  | 'certifications' | 'awards' | 'publications' | 'references' | 'summary';

const en: Record<string, SectionKey> = {
  // English (existing aliases preserved + a few extra)
  'experience': 'experience', 'work experience': 'experience',
  'professional experience': 'experience', 'employment': 'experience',
  'employment history': 'experience', 'work history': 'experience',
  'professional background': 'experience', 'career': 'experience',
  'career history': 'experience', 'career highlights': 'experience',
  'professional journey': 'experience', 'positions': 'experience',
  'roles': 'experience', 'volunteer experience': 'experience',
  'relevant experience': 'experience',
  'education': 'education', 'academic background': 'education',
  'academic': 'education', 'academic history': 'education',
  'qualifications': 'certifications', 'training': 'certifications',
  'courses': 'certifications',
  'skills': 'skills', 'technical skills': 'skills', 'core skills': 'skills',
  'core competencies': 'skills', 'competencies': 'skills',
  'technical stack': 'skills', 'tech stack': 'skills', 'tools': 'skills',
  'tools and technologies': 'skills', 'expertise': 'skills',
  'my expertise': 'skills', 'key skills': 'skills', 'areas of expertise': 'skills',
  'languages': 'languages', 'languages spoken': 'languages',
  'language proficiency': 'languages',
  'projects': 'projects', 'side projects': 'projects', 'portfolio': 'projects',
  'selected projects': 'projects', 'notable projects': 'projects',
  'key projects': 'projects',
  'certifications': 'certifications', 'certificates': 'certifications',
  'licenses and certifications': 'certifications',
  'professional certifications': 'certifications',
  'awards': 'awards', 'awards and honors': 'awards',
  'achievements': 'awards', 'honors': 'awards', 'recognition': 'awards',
  'publications': 'publications', 'research': 'publications', 'papers': 'publications',
  'references': 'references', 'referees': 'references',
};
const fr: Record<string, SectionKey> = {
  'experience': 'experience', 'experience professionnelle': 'experience',
  'experiences': 'experience', 'experiences professionnelles': 'experience',
  'parcours professionnel': 'experience', 'emploi': 'experience',
  'historique professionnel': 'experience',
  'formation': 'education', 'education': 'education',
  'parcours academique': 'education', 'etudes': 'education',
  'competences': 'skills', 'competences techniques': 'skills',
  'savoir faire': 'skills', 'outils': 'skills',
  'langues': 'languages', 'langues parlees': 'languages',
  'projets': 'projects', 'projets personnels': 'projects',
  'certifications': 'certifications', 'certificats': 'certifications',
  'qualifications': 'certifications',
  'recompenses': 'awards', 'distinctions': 'awards',
  'publications': 'publications', 'references': 'references',
  'a propos': 'summary', 'profil': 'summary', 'resume': 'summary', 'sommaire': 'summary',
};
const de: Record<string, SectionKey> = {
  'berufserfahrung': 'experience', 'berufliche erfahrung': 'experience',
  'erfahrung': 'experience', 'beruflicher werdegang': 'experience',
  'beschaftigung': 'experience',
  'ausbildung': 'education', 'bildung': 'education', 'studium': 'education',
  'akademische ausbildung': 'education',
  'kenntnisse': 'skills', 'fahigkeiten': 'skills',
  'fertigkeiten': 'skills', 'technische kenntnisse': 'skills',
  'sprachen': 'languages', 'sprachkenntnisse': 'languages',
  'projekte': 'projects', 'zertifikate': 'certifications',
  'zertifizierungen': 'certifications', 'qualifikationen': 'certifications',
  'auszeichnungen': 'awards', 'veroffentlichungen': 'publications',
  'referenzen': 'references',
  'uber mich': 'summary', 'profil': 'summary', 'zusammenfassung': 'summary',
};
const es: Record<string, SectionKey> = {
  'experiencia': 'experience', 'experiencia profesional': 'experience',
  'experiencia laboral': 'experience', 'trayectoria profesional': 'experience',
  'historial laboral': 'experience',
  'educacion': 'education', 'formacion': 'education',
  'formacion academica': 'education', 'estudios': 'education',
  'habilidades': 'skills', 'aptitudes': 'skills',
  'competencias': 'skills', 'conocimientos': 'skills', 'herramientas': 'skills',
  'idiomas': 'languages',
  'proyectos': 'projects', 'certificaciones': 'certifications',
  'certificados': 'certifications', 'cualificaciones': 'certifications',
  'premios': 'awards', 'reconocimientos': 'awards',
  'publicaciones': 'publications', 'referencias': 'references',
  'sobre mi': 'summary', 'perfil': 'summary', 'resumen': 'summary',
};
const ro: Record<string, SectionKey> = {
  'experienta': 'experience', 'experienta profesionala': 'experience',
  'cariera': 'experience', 'angajari': 'experience',
  'educatie': 'education', 'studii': 'education', 'pregatire': 'education',
  'competente': 'skills', 'abilitati': 'skills', 'cunostinte': 'skills',
  'instrumente': 'skills',
  'limbi': 'languages', 'limbi straine': 'languages',
  'proiecte': 'projects', 'certificari': 'certifications',
  'certificate': 'certifications', 'calificari': 'certifications',
  'premii': 'awards', 'publicatii': 'publications',
  'referinte': 'references',
  'despre mine': 'summary', 'profil': 'summary', 'rezumat': 'summary',
};
const it: Record<string, SectionKey> = {
  'esperienza': 'experience', 'esperienza professionale': 'experience',
  'esperienza lavorativa': 'experience', 'carriera': 'experience',
  'istruzione': 'education', 'formazione': 'education', 'studi': 'education',
  'competenze': 'skills', 'capacita': 'skills', 'abilita': 'skills',
  'strumenti': 'skills',
  'lingue': 'languages',
  'progetti': 'projects', 'certificazioni': 'certifications',
  'qualifiche': 'certifications',
  'premi': 'awards', 'riconoscimenti': 'awards',
  'pubblicazioni': 'publications', 'referenze': 'references',
  'profilo': 'summary', 'sommario': 'summary', 'chi sono': 'summary',
};
const nl: Record<string, SectionKey> = {
  'ervaring': 'experience', 'werkervaring': 'experience',
  'professionele ervaring': 'experience', 'loopbaan': 'experience',
  'opleiding': 'education', 'studie': 'education',
  'vaardigheden': 'skills', 'competenties': 'skills',
  'kennis': 'skills', 'gereedschappen': 'skills',
  'talen': 'languages',
  'projecten': 'projects', 'certificaten': 'certifications',
  'certificeringen': 'certifications', 'kwalificaties': 'certifications',
  'onderscheidingen': 'awards', 'publicaties': 'publications',
  'referenties': 'references',
  'over mij': 'summary', 'profiel': 'summary', 'samenvatting': 'summary',
};
const pt: Record<string, SectionKey> = {
  'experiencia': 'experience', 'experiencia profissional': 'experience',
  'experiencia de trabalho': 'experience', 'carreira': 'experience',
  'historico profissional': 'experience',
  'educacao': 'education', 'formacao': 'education',
  'formacao academica': 'education', 'estudos': 'education',
  'habilidades': 'skills', 'competencias': 'skills',
  'conhecimentos': 'skills', 'ferramentas': 'skills',
  'idiomas': 'languages',
  'projetos': 'projects', 'certificacoes': 'certifications',
  'certificados': 'certifications',
  'premios': 'awards', 'reconhecimentos': 'awards',
  'publicacoes': 'publications', 'referencias': 'references',
  'sobre mim': 'summary', 'perfil': 'summary', 'resumo': 'summary',
};

// Arabic — stored as-is. The comparator must NOT apply accent-stripping
// to non-Latin code points; the normalise() function below guards that.
const ar: Record<string, SectionKey> = {
  'الخبرات': 'experience',
  'الخبرة': 'experience',
  'خبرة': 'experience',
  'الخبرة العملية': 'experience',
  'الخبرات المهنية': 'experience',
  'المسار المهني': 'experience',
  'التاريخ المهني': 'experience',
  'التعليم': 'education',
  'الدراسة': 'education',
  'المؤهلات الدراسية': 'education',
  'الخلفية الأكاديمية': 'education',
  'المهارات': 'skills',
  'المهارات التقنية': 'skills',
  'الكفاءات': 'skills',
  'الأدوات': 'skills',
  'اللغات': 'languages',
  'المشاريع': 'projects',
  'الشهادات': 'certifications',
  'الشهادات المهنية': 'certifications',
  'الجوائز': 'awards',
  'التقديرات': 'awards',
  'المنشورات': 'publications',
  'الأبحاث': 'publications',
  'المراجع': 'references',
  'نبذة': 'summary',
  'الملخص': 'summary',
  'الملخص المهني': 'summary',
  'عني': 'summary',
};

const ALL_DICTIONARIES = [en, fr, de, es, ro, it, nl, pt, ar];

/** Lower-cases, strips diacritics, removes punctuation. Preserves
 *  non-Latin (Arabic, CJK) code-points untouched. */
export function normaliseLatin(s: string): string {
  if (!s) return '';
  // Detect non-Latin (Arabic, Hebrew, CJK) and skip diacritic-stripping there.
  const isLatin = /^[ -ɏḀ-ỿ -⁯⁰-₟₠-⃏⃐-⃿℀-⅏\s.,;:!?'"()-]+$/.test(s);
  let out = s.normalize('NFKC').toLowerCase().trim();
  if (isLatin) {
    out = out.normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  out = out.replace(/[:.!?–—\-_]+$/, '').replace(/^[:.!?–—\-_]+/, '');
  out = out.replace(/[‘’“”]/g, "'");
  out = out.replace(/\s{2,}/g, ' ').trim();
  return out;
}

/** Multi-language heading → SectionKey lookup. Returns null when unknown. */
export function classifyHeadingMultiLang(raw: string): SectionKey | null {
  if (!raw) return null;
  const norm = normaliseLatin(raw);
  for (const dict of ALL_DICTIONARIES) {
    if (dict[norm]) return dict[norm];
  }
  // Substring fallback (works for "My Work Experience" / "Mes compétences clés" / etc).
  for (const dict of ALL_DICTIONARIES) {
    for (const alias of Object.keys(dict)) {
      // Only accept substring if alias is at least 4 chars (avoid false hits like "it").
      if (alias.length >= 4 && norm.includes(alias)) return dict[alias];
    }
  }
  return null;
}

// =============================================================================
//  42.7I — Canonical skill normalisation
// =============================================================================
const SKILL_CANONICAL: Record<string, string> = {
  // JS ecosystem
  'reactjs': 'React', 'react.js': 'React', 'react js': 'React',
  'nodejs':  'Node.js', 'node js': 'Node.js', 'node.js': 'Node.js',
  'nextjs':  'Next.js', 'next.js': 'Next.js', 'next js': 'Next.js',
  'vuejs':   'Vue.js', 'vue.js': 'Vue.js',
  'angularjs': 'Angular',
  'js':      'JavaScript', 'javascript': 'JavaScript', 'java script': 'JavaScript',
  'ts':      'TypeScript', 'typescript': 'TypeScript', 'type script': 'TypeScript',
  // Backends + langs
  'py':      'Python',  'python': 'Python', 'python 3': 'Python',
  'golang':  'Go',
  'rust':    'Rust',
  // Cloud
  'aws':     'AWS',  'amazon web services': 'AWS',
  'gcp':     'GCP',  'google cloud': 'GCP', 'google cloud platform': 'GCP',
  'azure':   'Azure', 'microsoft azure': 'Azure',
  // DB
  'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
  'mysql':   'MySQL',
  'mongodb': 'MongoDB', 'mongo': 'MongoDB',
  // CI/CD + infra
  'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
  'docker':  'Docker',
  'terraform': 'Terraform', 'tf': 'Terraform',
  // Design
  'figma':   'Figma',
  'photoshop': 'Photoshop', 'adobe photoshop': 'Photoshop',
  'illustrator': 'Illustrator', 'adobe illustrator': 'Illustrator',
  // Office
  'excel':   'Excel', 'microsoft excel': 'Excel', 'ms excel': 'Excel',
  'word':    'Word',  'microsoft word': 'Word',
  // Methods
  'agile':   'Agile', 'scrum': 'Scrum',
};

export function canonicalSkill(raw: string): string {
  const norm = normaliseLatin(raw).replace(/\.+$/, '').trim();
  if (SKILL_CANONICAL[norm]) return SKILL_CANONICAL[norm];
  return raw.trim();
}

// =============================================================================
//  42.7H — Duplicate detection
// =============================================================================
export function findDuplicateSkills(skills: Array<{ name?: string }>): Array<{ canonical: string; variants: string[]; indices: number[] }> {
  const groups = new Map<string, { canonical: string; variants: string[]; indices: number[] }>();
  skills.forEach((s, i) => {
    const name = (s.name || '').trim();
    if (!name) return;
    const canon = canonicalSkill(name);
    const key = normaliseLatin(canon);
    if (!groups.has(key)) groups.set(key, { canonical: canon, variants: [], indices: [] });
    const g = groups.get(key)!;
    g.variants.push(name);
    g.indices.push(i);
  });
  return [...groups.values()].filter((g) => g.indices.length > 1);
}

export function findDuplicateExperiences(items: Array<{ role?: string; company?: string }>): Array<{ rep: { role: string; company: string }; indices: number[] }> {
  const groups = new Map<string, { rep: { role: string; company: string }; indices: number[] }>();
  items.forEach((e, i) => {
    const k = `${normaliseLatin(e.role || '')}|${normaliseLatin(e.company || '')}`;
    if (!k.replace('|', '').trim()) return;
    if (!groups.has(k)) groups.set(k, { rep: { role: e.role || '', company: e.company || '' }, indices: [] });
    groups.get(k)!.indices.push(i);
  });
  return [...groups.values()].filter((g) => g.indices.length > 1);
}

// =============================================================================
//  42.7D — Import confidence engine
// =============================================================================
export interface ImportConfidence {
  overall:    number;
  bands:      { heading: number; sections: number; skills: number; languages: number; experience: number; education: number };
  detected:   SectionKey[];
  missing:    SectionKey[];
  band:       'excellent' | 'good' | 'partial' | 'weak' | 'review';
}

// =============================================================================
//  Phase 43.1 — Education-level awareness.
//
//  Detect the highest education level reached so the scoring engine can
//  distinguish "high-school only" from "bachelor+", which were previously
//  both treated identically.
//
//  Returns a 0–1 multiplier used to scale the education band.
// =============================================================================
function educationLevelWeight(eduEntry: any): number {
  const text = `${eduEntry?.degree || ''} ${eduEntry?.institution || ''} ${eduEntry?.field || ''}`.toLowerCase();
  if (!text.trim()) return 0.5;            // unknown — assume mid-level
  if (/ph\.?d|doctor(?:ate|al)/i.test(text)) return 1.10;
  if (/master|mba|m\.?sc|m\.?a|m\.?eng|m\.?phil/i.test(text)) return 1.00;
  if (/bachelor|b\.?sc|b\.?a|b\.?eng|undergraduate|licen[cs]e/i.test(text)) return 0.85;
  if (/diploma|associate|h\.?n\.?d|foundation/i.test(text)) return 0.60;
  if (/high\s*school|secondary\s*school|grammar\s*school|lyc[ée]e|gymnasium|prep[a]?ratory|college\s+(?:prep|preparatory)/i.test(text)) return 0.30;
  // Any "university" / "college" mention without explicit degree → assume in progress.
  if (/university|college|institute|academy/i.test(text)) return 0.65;
  return 0.50;
}

export function computeConfidence(
  profile: Partial<CvProfileDto>,
  ctx:     { headingsDetected: number; headingsUnknown: number; usedFallback: boolean },
): ImportConfidence {
  // Heading confidence: ratio of recognised vs total + penalty for fallback.
  // Phase 43.1: more generous baseline when ANY headings are recognised, so
  // that a CV with 3-4 detected sections doesn't get pulled down by a low
  // total-heading count.
  const totalHeadings = ctx.headingsDetected + ctx.headingsUnknown;
  const headingRatio = totalHeadings === 0 ? 0 : ctx.headingsDetected / totalHeadings;
  const headingScore = Math.round(
    (ctx.usedFallback ? 45 : 75) +
    (totalHeadings === 0 ? 0 : headingRatio * 25),
  );

  const sectionCount = countNonEmptySections(profile);
  // Phase 43.1: 5 sections present → 100 (was 18 × n, hitting 100 only at 6).
  const sectionsScore = Math.min(100, sectionCount * 20);

  const skills = profile.skills || [];
  // Phase 43.1: 8 skills already → 80, 12 → 100.
  const skillsScore = Math.min(100, skills.length * 10);

  const langs = (profile as any).languages || [];
  // 2 languages → 60, 3 → 90, 4+ → 100.
  const languagesScore = Math.min(100, langs.length * 30);

  const exp = profile.experience || [];
  const expScore = Math.min(100, (
    exp.length * 25 +
    exp.filter((e: any) => e.bullets?.length > 0).length * 10 +
    exp.filter((e: any) => e.start || e.end).length * 8
  ));

  // Phase 43.1 — education awareness.
  const edu = profile.education || [];
  let eduScore = 0;
  if (edu.length > 0) {
    const maxWeight = Math.max(...edu.map(educationLevelWeight));
    // Base from level (max 70) + small bonus per additional entry.
    eduScore = Math.min(100, Math.round(70 * maxWeight + Math.max(0, edu.length - 1) * 8));
  }

  // Phase 43.1 — overall weighting rebalanced so a CV that has 5 detected
  // sections + reasonable skills/languages can clear 70 even without strong
  // experience-time-range signals (e.g. freelance entries).
  const overall = Math.round(
    headingScore   * 0.15 +
    sectionsScore  * 0.30 +
    skillsScore    * 0.15 +
    languagesScore * 0.10 +
    expScore       * 0.20 +
    eduScore       * 0.10,
  );
  const band: ImportConfidence['band'] =
    overall >= 90 ? 'excellent' :
    overall >= 75 ? 'good' :
    overall >= 60 ? 'partial' :
    overall >= 40 ? 'weak' : 'review';

  return {
    overall,
    bands: {
      heading:    clamp(headingScore),
      sections:   clamp(sectionsScore),
      skills:     clamp(skillsScore),
      languages:  clamp(languagesScore),
      experience: clamp(expScore),
      education:  clamp(eduScore),
    },
    detected: detectedSections(profile),
    missing:  missingSections(profile),
    band,
  };
}

const SECTION_ORDER: SectionKey[] = ['experience','education','skills','languages','projects','certifications','awards','publications','references','summary'];

function detectedSections(p: Partial<CvProfileDto>): SectionKey[] {
  return SECTION_ORDER.filter((k) => {
    if (k === 'summary') return !!(p.personal as any)?.summary;
    return (p as any)[k] && (p as any)[k].length > 0;
  });
}
function missingSections(p: Partial<CvProfileDto>): SectionKey[] {
  return SECTION_ORDER.filter((k) => !detectedSections(p).includes(k));
}
function countNonEmptySections(p: Partial<CvProfileDto>) {
  return detectedSections(p).length;
}
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))); }

// =============================================================================
//  42.7A — OCR helper (lazy-loaded so the cost is paid only when called)
// =============================================================================

export interface OcrProgressCallback {
  (info: {
    phase: 'rendering' | 'sampling-lang' | 'downloading-pack' | 'recognising' | 'done';
    page?: number;
    pagesTotal?: number;
    percent: number;
    message: string;
    // Phase 42.9D — language-pack download details.
    packLang?: string;
    packPercent?: number;
    // Phase 42.9B — language detected during the sampling pass.
    detectedLang?: string;
  }): void;
}

// =============================================================================
//  Phase 42.9B Item 4 — OCR language-pack warmup.
//
//  Pre-downloads the tesseract.js language models so that the first import
//  in a session doesn't pay the 10-30s cold-download penalty.
//
//  Idempotent: tesseract.js caches packs in its worker filesystem on first
//  download — subsequent calls are no-ops. Fire-and-forget; warmup is
//  non-blocking and silent on failure (the worst case is a slow first
//  import, which is the status quo).
//
//  Priority order per spec: ara > eng > fra > deu > ron > (ita / spa / nld / por)
// =============================================================================

let warmupInFlight: Promise<{ ok: boolean; loaded: string[] }> | null = null;

export async function warmupOcrPacks(langs?: string[]): Promise<{ ok: boolean; loaded: string[] }> {
  if (warmupInFlight) return warmupInFlight;
  const targets = langs && langs.length ? langs : ['eng', 'ara', 'fra', 'deu', 'ron'];

  warmupInFlight = (async () => {
    let recognize: any;
    try { recognize = (await import('tesseract.js')).recognize; }
    catch { return { ok: false, loaded: [] }; }

    // Use a known-good 1x1 transparent PNG (CRC-correct) as the dummy image
    // — tesseract still loads the language pack before failing to recognise
    // anything. The previous hex blob had a bad IDAT CRC which made libpng
    // crash the worker thread, escaping into process.nextTick and killing
    // the backend (Phase 43.0A).
    const tiny = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      'base64'
    );
    const loaded: string[] = [];
    for (const lang of targets) {
      try {
        await recognize(tiny, lang);
        loaded.push(lang);
      } catch {
        // Per-lang failure is fine — tesseract may have failed AFTER loading
        // the pack. Still report it as loaded if the pack is in cache.
        loaded.push(lang);
      }
    }
    return { ok: true, loaded };
  })();

  // Reset the in-flight slot once finished so a manual refresh works.
  warmupInFlight.then(() => { warmupInFlight = null; }, () => { warmupInFlight = null; });
  return warmupInFlight;
}

// =============================================================================
//  Phase 42.9B — Pre-OCR language sampling.
//
//  Strategy:
//    1. Rasterise just the first page at lower DPI (faster).
//    2. Run a quick English-only OCR pass (small image, fast).
//    3. Feed the extracted text into detectOcrLanguages().
//    4. Return the detected lang codes (always falls back to ['eng']).
//
//  We sample with English first because Latin OCR can produce *some*
//  readable output even for French/German/Spanish/Romanian/Italian/Dutch/
//  Portuguese, which is enough for the stopword sniff to disambiguate.
//  Arabic is detected via codepoint presence even in noisy English OCR.
// =============================================================================
export async function sampleLanguageFromPdf(buffer: Buffer, opts: { onProgress?: OcrProgressCallback; cancelCheck?: () => boolean } = {}): Promise<{ langs: string[]; sampleText: string }> {
  const { spawn } = await import('child_process');
  const fs       = await import('fs');
  const path     = await import('path');
  const os       = await import('os');
  const crypto   = await import('crypto');

  opts.onProgress?.({ phase: 'sampling-lang', percent: 8, message: 'Detecting CV language…' });

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-lang-sample-'));
  const pdfPath = path.join(dir, `${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(pdfPath, buffer);

  try {
    // Rasterise only the first page at 100 DPI for speed.
    await new Promise<void>((resolve, reject) => {
      const child = spawn('pdftoppm', [
        '-png', '-r', '100', '-f', '1', '-l', '1',
        pdfPath, path.join(dir, 'sample'),
      ], { stdio: 'ignore' });
      child.on('error', reject);
      child.on('exit', (c) => c === 0 ? resolve() : reject(new Error(`pdftoppm exited ${c}`)));
    });
    if (opts.cancelCheck?.()) return { langs: ['eng'], sampleText: '' };

    const files = fs.readdirSync(dir).filter((f) => f.startsWith('sample-') && f.endsWith('.png'));
    if (files.length === 0) return { langs: ['eng'], sampleText: '' };

    // Lazy-import tesseract for the sample.
    let recognize: any;
    try { recognize = (await import('tesseract.js')).recognize; }
    catch { return { langs: ['eng'], sampleText: '' }; }

    const { data } = await recognize(path.join(dir, files[0]), 'eng');
    const text = data?.text || '';
    const langs = require('./cv-import-polish').detectOcrLanguages(text);
    const detected = langs[0] || 'eng';
    opts.onProgress?.({ phase: 'sampling-lang', percent: 12, message: `Detected: ${detected}`, detectedLang: detected });
    return { langs, sampleText: text };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  }
}

/**
 * Try OCR on a PDF buffer.
 * Strategy:
 *   1. Use existing pdftoppm to rasterise the PDF to PNG pages.
 *   2. Run tesseract.js on each page.
 *   3. Concatenate the text.
 *   4. Cleanup tmp dir.
 *
 * Phase 42.8A — emits per-phase progress via the supplied callback.
 * Phase 42.8H — accepts `cancelCheck()` which the loop calls between pages
 *               and aborts early when it returns true.
 *
 * Returns the concatenated text + per-page confidence + langs used.
 */
export async function runOcrOnPdf(buffer: Buffer, opts: { langs?: string[]; maxPages?: number; onProgress?: OcrProgressCallback; cancelCheck?: () => boolean } = {}): Promise<{ text: string; pageConfidences: number[]; pagesRendered: number; langsUsed: string[]; cancelled?: boolean }> {
  const { spawn } = await import('child_process');
  const fs       = await import('fs');
  const path     = await import('path');
  const os       = await import('os');
  const crypto   = await import('crypto');

  const dir   = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-ocr-'));
  const pdfPath = path.join(dir, `${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(pdfPath, buffer);

  opts.onProgress?.({ phase: 'rendering', percent: 5, message: 'Rendering PDF pages…' });

  // Rasterise — first 5 pages by default (OCR is slow).
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pdftoppm', [
      '-png', '-r', '150',
      '-l', String(opts.maxPages ?? 5),
      pdfPath, path.join(dir, 'p'),
    ], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit',  (c) => c === 0 ? resolve() : reject(new Error(`pdftoppm exited ${c}`)));
  });

  const pages = fs.readdirSync(dir).filter((f) => f.startsWith('p-') && f.endsWith('.png')).sort();
  if (pages.length === 0) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
    return { text: '', pageConfidences: [], pagesRendered: 0, langsUsed: opts.langs || ['eng'] };
  }

  opts.onProgress?.({ phase: 'rendering', percent: 15, pagesTotal: pages.length, message: `Rendered ${pages.length} page(s).` });

  // Lazy-import tesseract.js so the cold start path stays cheap.
  let recognize: any;
  try { recognize = (await import('tesseract.js')).recognize; }
  catch (e) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
    throw new Error('tesseract.js not installed — run `pnpm add tesseract.js` in backend.');
  }

  const langs = (opts.langs || ['eng']).join('+');
  const out: { text: string; pageConfidences: number[]; pagesRendered: number; langsUsed: string[]; cancelled?: boolean } = {
    text: '', pageConfidences: [], pagesRendered: 0, langsUsed: opts.langs || ['eng'],
  };
  for (let i = 0; i < pages.length; i++) {
    if (opts.cancelCheck?.()) {
      out.cancelled = true;
      break;
    }
    const page = pages[i];
    const base = 15 + Math.round((i / pages.length) * 75);
    opts.onProgress?.({
      phase: 'recognising', page: i + 1, pagesTotal: pages.length, percent: base,
      message: `Analyzing page ${i + 1} of ${pages.length}…`,
    });
    try {
      const { data } = await recognize(path.join(dir, page), langs, {
        // Tesseract.js exposes a `logger` callback per chunk of work.
        // 42.9D — surface lang-pack download as a distinct sub-phase.
        logger: (m: any) => {
          if (typeof m?.progress !== 'number') return;
          const status = (m.status || '').toLowerCase();
          // tesseract.js emits "loading language traineddata", "downloading data"
          // for pack downloads on first use.
          if (status.includes('loading') && (status.includes('language') || status.includes('traineddata') || status.includes('downloading'))) {
            opts.onProgress?.({
              phase:    'downloading-pack',
              packLang: (opts.langs || ['eng'])[0],
              packPercent: Math.round(m.progress * 100),
              percent:  Math.min(15, 5 + Math.round(m.progress * 10)),
              message:  `Downloading ${(opts.langs || ['eng'])[0].toUpperCase()} OCR model…`,
            });
            return;
          }
          const pagePct = m.progress * (75 / pages.length);
          opts.onProgress?.({
            phase:    'recognising',
            page:     i + 1,
            pagesTotal: pages.length,
            percent:  Math.min(90, Math.round(15 + (i / pages.length) * 75 + pagePct)),
            message:  m.status ? `${m.status} (page ${i + 1}/${pages.length})` : `Analyzing page ${i + 1}…`,
          });
        },
      });
      out.text += (data?.text || '') + '\n\n';
      if (typeof data?.confidence === 'number') out.pageConfidences.push(data.confidence);
      out.pagesRendered++;
    } catch (e) {
      // Continue with remaining pages.
    }
  }

  opts.onProgress?.({ phase: 'done', percent: 95, message: 'Finalising extraction…' });
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  return out;
}
