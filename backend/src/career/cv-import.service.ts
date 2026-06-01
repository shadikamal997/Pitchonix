import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PptxImportService } from '../pptx-import/pptx-import.service';
import { UniversalConversionService } from '../universal-conversion/universal-conversion.service';
import { CvProfilesService } from './cv-profiles.service';
import { CvProfileDto } from './cv-types';
import {
  classifyHeadingMultiLang, normaliseLatin, canonicalSkill,
  findDuplicateSkills, findDuplicateExperiences, computeConfidence, runOcrOnPdf,
  sampleLanguageFromPdf,
  type SectionKey, type ImportConfidence,
} from './cv-import-pro';
import { detectOcrLanguages, ImportProgressTracker, type ImportEvent } from './cv-import-polish';
import { CvMappingMemoryService } from './cv-mapping-memory.service';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 42L + 42M + 42.6 — CV import.
//
//  Three input flavours:
//
//    1. DOCX / PDF / HTML / MD — route through UniversalConversionService to
//       get a UniversalDocument; then walk pages for section-anchored blocks.
//       Section anchors come from either real heading nodes OR paragraph
//       nodes whose text matches a known section name (bold-but-not-h1
//       styling is common in PDF exports).
//
//    2. LinkedIn export JSON — accept the same JSON shape LinkedIn provides
//       (or a curated subset like { profile, positions, education, skills }),
//       map onto our CvProfile section arrays.
//
//  Phase 42.6 hardening:
//    - heading detection works on paragraph nodes too (PDF / fancy DOCX
//      often emit paragraph + bold, not real H1/H2)
//    - normalises trailing punctuation, ALL-CAPS, leading/trailing space
//    - expanded alias table (Work History, Professional Background,
//      Technical Stack, Tools, Training, Courses, Profile, Objective, …)
//    - if zero sections found, runs a fallback pass that detects experience
//      blocks by date patterns, education by degree keywords, skills by
//      comma/pipe clusters
//    - returns `debug` payload in dev mode for the frontend to surface
// =============================================================================

const SECTION_HEADINGS: Record<string, keyof CvProfileDto> = {
  // Experience
  'experience':              'experience',
  'work experience':         'experience',
  'professional experience': 'experience',
  'employment':              'experience',
  'employment history':      'experience',
  'work history':            'experience',
  'professional background': 'experience',
  'career':                  'experience',
  'career history':          'experience',
  'positions':               'experience',
  'roles':                   'experience',
  'volunteer experience':    'experience',

  // Education
  'education':               'education',
  'academic background':     'education',
  'academic':                'education',
  'academic history':        'education',
  'qualifications':          'certifications',
  'training':                'certifications',
  'courses':                 'certifications',

  // Skills
  'skills':                  'skills',
  'technical skills':        'skills',
  'core skills':             'skills',
  'core competencies':       'skills',
  'competencies':            'skills',
  'technical stack':         'skills',
  'tech stack':              'skills',
  'tools':                   'skills',
  'tools & technologies':    'skills',
  'expertise':               'skills',
  'key skills':              'skills',
  'areas of expertise':      'skills',

  // Languages
  'languages':               'languages',
  'languages spoken':        'languages',
  'language proficiency':    'languages',

  // Projects
  'projects':                'projects',
  'side projects':           'projects',
  'portfolio':               'projects',
  'selected projects':       'projects',
  'notable projects':        'projects',
  'key projects':            'projects',

  // Certifications
  'certifications':          'certifications',
  'certificates':            'certifications',
  'licenses & certifications': 'certifications',
  'professional certifications': 'certifications',

  // Awards / Publications / References
  'awards':                  'awards',
  'awards & honors':         'awards',
  'awards & honours':        'awards',
  'achievements':            'awards',
  'honors':                  'awards',
  'recognition':             'awards',
  'publications':            'publications',
  'research':                'publications',
  'papers':                  'publications',
  'references':              'references',
  'referees':                'references',
};

// Summary-only headings (mapped to personal.summary, not a section array).
const SUMMARY_HEADINGS = new Set([
  'summary', 'profile', 'professional summary', 'professional profile',
  'objective', 'career objective', 'about', 'about me', 'introduction',
  'overview', 'personal statement', 'executive summary',
]);

// =============================================================================
//  Phase 43.1B — Personal-info headings.
//
//  A "CONTACT" or "PERSONAL INFO" heading isn't a real CV section in the
//  scoring model — the data underneath (name / email / phone / links)
//  feeds the `personal` object via collectPersonal(). Recognising these
//  markers prevents them from being pushed to `unknownHeadings[]` and
//  treated as a scoring penalty.
// =============================================================================
const PERSONAL_HEADINGS = new Set([
  'contact', 'contact info', 'contact information', 'contact details',
  'personal', 'personal info', 'personal information', 'personal details',
  'get in touch', 'reach me', 'reach out', 'find me', 'connect with me',
  'my contact', 'how to reach me',
]);

// =============================================================================
//  Phase 43.1B — Person-name detection.
//
//  At the top of a CV the visually-largest line is almost always the
//  person's name. Without this heuristic, "SHADI KAMAL" trips
//  `looksLikeHeading` (all-caps + short) and was being pushed into
//  `unknownHeadings`, which (a) polluted the warnings list and (b) made
//  the heading-confidence band dip.
//
//  Heuristic: 2–5 tokens, every token starts with a capital letter, no
//  digits, total length < 60, doesn't match any known section/personal
//  heading alias. Diacritics + apostrophes are allowed.
// =============================================================================
function looksLikePersonName(s: string): boolean {
  const t = (s || '').trim();
  if (!t || t.length > 60 || /\d/.test(t)) return false;
  const norm = normaliseHeading(t);
  if (SECTION_HEADINGS[norm] || SUMMARY_HEADINGS.has(norm) || PERSONAL_HEADINGS.has(norm)) return false;
  const tokens = t.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 5) return false;
  // Every token must START with a capital. Tolerates ALL-CAPS as well.
  return tokens.every((tok) => /^[A-ZÀ-ÖØ-Þ][A-Za-zÀ-ÖØ-öø-ÿ.'-]*$/.test(tok));
}

function toTitleCase(s: string): string {
  return (s || '').split(/\s+/).map((w) => {
    if (!w) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// =============================================================================
//  Phase 43.1C — Letter-spaced text collapse.
//
//  Many CV templates render section headings with CSS letter-spacing, which
//  the PDF parser exposes as a literal space between every character. So
//  "PROFILE" comes out as "P R O F I L E" and stops matching any heading
//  dictionary entry. Same for "W O R K  E X P E R I E N C E", "S K I L L S",
//  "L A N G U A G E S", and even the person's name "S H A D I  K A M A L".
//
//  Strategy: split a line by 2+ consecutive spaces (word boundaries in
//  letter-spaced text); for each segment, if it's 3+ single-character
//  tokens separated by single spaces, collapse them. Body text
//  ("Responsive design", "API integration") is untouched because its
//  tokens are multi-character.
//
//  Also normalises non-breaking / em / en spaces and strips zero-width
//  characters that PDFs sometimes inject between letter-spaced glyphs.
// =============================================================================
export function collapseSpacedLetters(input: string): string {
  if (!input) return input;
  // Normalise common non-ASCII whitespace (NBSP, narrow NBSP, ideographic
  // space, em/en space, etc.) to a plain ASCII space, and strip zero-width
  // glyphs that some PDF extractors inject between letter-spaced characters.
  const normalised = input
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (!/ /.test(normalised)) return normalised;
  // Split into "words" separated by 2+ spaces (the real word boundaries in
  // letter-spaced text). Then collapse any run of 3+ single-char tokens.
  return normalised
    .split(/ {2,}/)
    .map((segment) => {
      const tokens = segment.split(/ /).filter(Boolean);
      if (tokens.length >= 3 && tokens.every((t) => t.length === 1)) {
        return tokens.join('');
      }
      return segment;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class CvImportService {
  private readonly logger = new Logger(CvImportService.name);

  constructor(
    private readonly conversion: UniversalConversionService,
    private readonly profiles:   CvProfilesService,
    private readonly pptx:       PptxImportService,
    private readonly progress:   ImportProgressTracker,
    private readonly mappings:   CvMappingMemoryService,
    private readonly prisma:     PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  //  DOCX / PDF / HTML / MD → CvProfile
  // ---------------------------------------------------------------------------

  async importFromFile(profileId: string, buffer: Buffer, filename: string, mimetype?: string, opts?: { sectionMappings?: Record<string, SectionKey>; forceOcr?: boolean; userId?: string; jobId?: string; persist?: boolean }): Promise<{ profile: CvProfileDto; warnings: string[]; debug?: any; confidence?: ImportConfidence; quality?: any }> {
    if (!buffer?.length) throw new BadRequestException('Empty file buffer');
    const startedAt = Date.now();
    const jobId = opts?.jobId;
    const cancelCheck = () => !!(jobId && this.progress.isCancelled(jobId));
    const setProgress = (patch: any) => { if (jobId) this.progress.update(jobId, patch); };

    setProgress({ phase: 'extracting', percent: 5, message: 'Extracting text…' });
    const result = await this.conversion.convert({
      buffer, filename, mimetype, targetFormat: 'html',
    });
    const udm = result.document;
    const warnings: string[] = [];
    let usedOcr = false;
    let ocrConfidence: number | null = null;
    let ocrLangsUsed: string[] | undefined;

    // -----------------------------------------------------------------------
    //  Phase 42.7A / 43.1 / 43.1D — OCR fallback for sparse PDF extraction.
    //
    //  Many CV templates render section *bodies* as font-glyph paths with
    //  no ToUnicode map: the heading text comes through but the body
    //  underneath is invisible to the PDF text layer. That's how "Gray and
    //  Green Simple Professional CV Resume.pdf" got extracted as 4 lines
    //  even though the file is a real CV with experience/education/skills.
    //
    //  Trigger OCR when ANY of the following hold for a PDF:
    //    - caller passed forceOcr (Recovery Center button)
    //    - total extracted text is < 80 chars (truly empty extraction)
    //    - the parser produced fewer than 8 nodes (suspiciously thin — a
    //      complete CV has dozens of nodes; 8 catches the "name + a few
    //      headings + nothing else" failure mode).
    //
    //  `forceOcr` still bypasses every check for the Recovery Center button.
    // -----------------------------------------------------------------------
    const initialNodes = (udm.pages || []).flatMap((p: any) => p.nodes || []);
    const initialText  = initialNodes.map((n: any) => n.text || '').join('\n').trim();
    const isPdf        = (filename || '').toLowerCase().endsWith('.pdf') || mimetype === 'application/pdf';
    const extractionTooThin = initialNodes.length < 8;
    const shouldRunOcr = isPdf && (
      opts?.forceOcr ||
      initialText.length < 80 ||
      extractionTooThin
    );

    // Always log the OCR decision so the runtime path is visible regardless of outcome.
    this.logger.log(
      `[CV-IMPORT:OCR-CHECK] file=${filename} mime=${mimetype ?? 'unknown'} ` +
      `isPdf=${isPdf} initialTextChars=${initialText.length} initialNodes=${initialNodes.length} ` +
      `forceOcr=${!!opts?.forceOcr} thinExtraction=${extractionTooThin} shouldRunOcr=${shouldRunOcr}`
    );

    // Helper: run OCR on `buffer` and, on success, replace udm.pages with OCR lines.
    // Returns true if OCR produced usable text.
    const attemptOcr = async (reason: string): Promise<boolean> => {
      try {
        this.logger.log(`[CV-IMPORT:OCR-START] file=${filename} reason=${reason}`);
        let langs: string[];
        if (initialText.length < 50) {
          const sample = await sampleLanguageFromPdf(buffer, {
            onProgress: (info) => setProgress({
              phase: info.phase as any, percent: info.percent,
              message: info.message, detectedLang: info.detectedLang,
            }),
            cancelCheck,
          });
          langs = sample.langs;
        } else {
          langs = detectOcrLanguages(initialText);
        }
        ocrLangsUsed = langs;
        setProgress({ phase: 'rendering', percent: 10, message: `Preparing OCR (${langs.join(', ')})…` });
        const ocr = await runOcrOnPdf(buffer, {
          langs, maxPages: 5,
          onProgress: (info) => setProgress({
            phase: info.phase === 'recognising'      ? 'ocr-page'
                 : info.phase === 'downloading-pack' ? 'downloading-pack'
                 :                                     'rendering',
            percent: info.percent, message: info.message, page: info.page,
            pagesTotal: info.pagesTotal, packLang: info.packLang, packPercent: info.packPercent,
          }),
          cancelCheck,
        });
        if (cancelCheck()) return false;
        if (ocr.text.length > 100) {
          usedOcr = true;
          ocrConfidence = ocr.pageConfidences.length > 0
            ? Math.round(ocr.pageConfidences.reduce((s, c) => s + c, 0) / ocr.pageConfidences.length)
            : null;
          const ocrLines = ocr.text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
          // Always log the raw OCR text (first 3000 chars) so column-order bugs
          // are diagnosable without a local copy of the PDF.
          this.logger.log(
            `[CV-IMPORT:OCR-RAW] chars=${ocr.text.length} lines=${ocrLines.length}\n` +
            `${ocr.text.slice(0, 3000)}`
          );
          (udm as any).pages = [{
            nodes: ocrLines.map((text) => ({ type: 'paragraph', text })),
            notes: undefined, background: undefined, title: undefined,
          }];
          this.logger.log(
            `[CV-IMPORT:OCR-DONE] chars=${ocr.text.length} nodes=${ocrLines.length} confidence=${ocrConfidence ?? '?'}`
          );
          warnings.push(`OCR fallback used (${ocr.pagesRendered} page(s), avg confidence ${ocrConfidence ?? '?'}%). Text quality may be lower than native extraction.`);
          return true;
        }
        this.logger.warn(`[CV-IMPORT:OCR-DONE] OCR returned only ${ocr.text.length} chars — below threshold`);
        warnings.push('OCR could not extract usable text — the document may be scanned at low resolution.');
        return false;
      } catch (e: any) {
        this.logger.error(
          `[CV-IMPORT:OCR-ERROR] message=${e?.message || e}\nstack=${e?.stack || '(no stack)'}`
        );
        warnings.push(
          `OCR failed: ${e?.message || e}. ` +
          `Check that pdftoppm (poppler-utils) and tesseract-ocr are installed on the server.`
        );
        return false;
      }
    };

    if (shouldRunOcr) {
      await attemptOcr('pre-walk');
      if (cancelCheck()) return this.cancelledResult(profileId, jobId, startedAt);
    }

    // -----------------------------------------------------------------------
    //  Phase 42.8D — merge learned mappings (workspace memory) with any
    //  caller-supplied ones; caller-supplied wins on conflict.
    //  Placed before runExtractionPass so the helper closes over it.
    // -----------------------------------------------------------------------
    let effectiveMappings: Record<string, SectionKey> = {};
    let appliedAutoMappingKeys: string[] = [];
    if (opts?.userId) {
      try {
        const learned = await this.mappings.forUser(opts.userId);
        effectiveMappings = { ...(learned as any), ...(opts?.sectionMappings || {}) };
      } catch { /* non-fatal */ }
    } else if (opts?.sectionMappings) {
      effectiveMappings = opts.sectionMappings as any;
    }

    // -----------------------------------------------------------------------
    //  Phase 42.6 / 43.1 / 43.1E — heading promotion + walk.
    //
    //  Extracted into a helper so it can be called twice: once on the native
    //  PDF text layer, and again (if the post-walk OCR trigger fires) on the
    //  OCR-synthesised page nodes.
    //
    //  The helper closes over `effectiveMappings` and `appliedAutoMappingKeys`.
    // -----------------------------------------------------------------------
    const runExtractionPass = (pages: any[]) => {
      // -- Phase 43.1C + 42.6 — heading promotion + allLines build --
      let passAllLines: string[] = [];
      for (const page of pages) {
        const newNodes: any[] = [];
        for (const node of page.nodes) {
          let t = collapseSpacedLetters((node as any).text || '');
          if (t) passAllLines.push(t);
          if (node.type === 'paragraph' && /[\r\n]/.test(t)) {
            const lines = t.split(/[\r\n]+/).map((s: string) => collapseSpacedLetters(s.trim())).filter(Boolean);
            for (const line of lines) {
              if (looksLikeHeading(line)) {
                newNodes.push({ ...node, type: 'heading', text: line });
              } else {
                newNodes.push({ ...node, type: 'paragraph', text: line });
              }
            }
          } else {
            const clone = { ...node, text: t };
            if (clone.type === 'paragraph' && looksLikeHeading(t)) clone.type = 'heading';
            newNodes.push(clone);
          }
        }
        (page as any).nodes = newNodes;
      }
      // Rebuild allLines from promoted nodes.
      passAllLines = [];
      for (const page of pages) {
        for (const node of page.nodes) {
          const t = (node as any).text || '';
          if (t) passAllLines.push(t);
        }
      }

      // -- Heading walk --
      const passSections: Partial<Record<keyof CvProfileDto, string[]>> = {};
      const passDetectedHeadings: string[] = [];
      const passUnknownHeadings:  string[] = [];
      let passCurrentSection: keyof CvProfileDto | null = null;
      const passPersonal: any = {};
      let passSummaryParts: string[] = [];
      let passInSummary = false;
      let passInPersonal = false;
      let passLineIdx = 0;
      let passNameLineIdx = -1; // line index at which fullName was captured

      for (const page of pages) {
        for (const node of page.nodes) {
          const t = ((node as any).text || '').trim();
          if (node.type === 'heading') {
            const raw  = t;
            const norm = normaliseHeading(raw);
            if (PERSONAL_HEADINGS.has(norm)) {
              passDetectedHeadings.push(raw);
              passCurrentSection = null; passInSummary = false; passInPersonal = true; passLineIdx++;
              continue;
            }
            if (passLineIdx < 6 && !passPersonal.fullName && looksLikePersonName(raw)) {
              passPersonal.fullName = toTitleCase(raw);
              passNameLineIdx = passLineIdx;
              passLineIdx++;
              continue;
            }
            passDetectedHeadings.push(raw);
            const mapped: SectionKey | null = (effectiveMappings && effectiveMappings[norm]) || null;
            if (mapped) appliedAutoMappingKeys.push(norm);
            const key: SectionKey | null = mapped || classifyHeadingMultiLang(raw);
            if (key === 'summary') {
              passCurrentSection = null; passInSummary = true; passInPersonal = false;
            } else if (key) {
              passCurrentSection = key as keyof CvProfileDto;
              passSections[passCurrentSection] = passSections[passCurrentSection] || [];
              passInSummary = false; passInPersonal = false;
            } else {
              // Content-preservation rule:
              // PDF/OCR often promotes content lines into heading nodes because
              // they are bold, uppercase, or visually large. Examples:
              //   "Frontend Development freelancer" inside Experience
              //   "ERJAN HIGH SCHOOL" inside Education
              // Treating those as unknown section breaks silently drops the
              // bullets/descriptions that follow. Unknown headings encountered
              // while a real section is already open are content for that
              // section, not separators.
              if (passCurrentSection) {
                passSections[passCurrentSection] = passSections[passCurrentSection] || [];
                passSections[passCurrentSection]!.push(raw);
                passLineIdx++;
                continue; // keep the current section open
              }
              passCurrentSection = null; passInSummary = false; passInPersonal = false;
              if (norm && norm.length < 40) passUnknownHeadings.push(raw);
            }
            passLineIdx++;
            continue;
          }
          if (passInSummary && node.type === 'paragraph') {
            const _smLine = (node.text || '').trim();
            const _smIsContact = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(_smLine) ||
                                 /^\+?\d[\d\s().-]{5,}$/.test(_smLine) ||
                                 /linkedin\.com|github\.com/i.test(_smLine);
            const _smNorm = normaliseAnchorHeading(_smLine);
            const _smIsHeading = matchAnchorKey(_smNorm) !== null ||
                                 SUMMARY_HEADINGS.has(_smNorm) ||
                                 PERSONAL_HEADINGS.has(_smNorm);
            if (_smLine && !_smIsContact && !_smIsHeading) {
              passSummaryParts.push(_smLine);
            }
            passLineIdx++;
            continue;
          }
          if (passInPersonal && node.type === 'paragraph') {
            collectPersonal(passPersonal, node.text || '');
            passLineIdx++;
            continue;
          }
          if (passCurrentSection) {
            const text = textFor(node);
            if (text) passSections[passCurrentSection]!.push(text);
          } else {
            const _lineText = ((node as any).text || '').trim();
            // Headline: first short title-like line within 3 nodes of the name,
            // not contact info, not a known section heading.
            if (
              passPersonal.fullName &&
              !passPersonal.headline &&
              passNameLineIdx >= 0 &&
              passLineIdx <= passNameLineIdx + 3 &&
              _lineText.length > 0
            ) {
              const _hasContact = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(_lineText) ||
                                  /(\+?\d[\d\s().-]{6,})/.test(_lineText) ||
                                  /linkedin\.com|github\.com|https?:\/\//i.test(_lineText);
              if (!_hasContact) {
                const _normHl = normaliseHeading(_lineText);
                const _isSection = !!SECTION_HEADINGS[_normHl] ||
                                   SUMMARY_HEADINGS.has(_normHl) ||
                                   PERSONAL_HEADINGS.has(_normHl);
                const _wc = _lineText.split(/\s+/).length;
                if (!_isSection && _wc >= 2 && _wc <= 8 && _lineText.length <= 80) {
                  passPersonal.headline = _lineText;
                }
              }
            }
            collectPersonal(passPersonal, _lineText);
          }
          passLineIdx++;
        }
      }
      if (passSummaryParts.length > 0) passPersonal.summary = passSummaryParts.join(' ');

      return {
        allLines:         passAllLines,
        sections:         passSections,
        detectedHeadings: passDetectedHeadings,
        unknownHeadings:  passUnknownHeadings,
        personal:         passPersonal,
      };
    };

    // --- First extraction pass (native text layer or pre-walk OCR output) ---
    let { allLines, sections, detectedHeadings, unknownHeadings, personal } =
      runExtractionPass(udm.pages);

    // -----------------------------------------------------------------------
    //  Phase 43.1E — post-walk OCR trigger.
    //
    //  Some CV templates keep section headings in the text layer but render
    //  the body content as glyph paths (no ToUnicode map). The pre-walk OCR
    //  trigger catches the "4 nodes total" case, but a rarer variant emits
    //  more nodes (>= 8) while still producing zero mapped sections (the extra
    //  nodes are dividers, blank lines, or photo placeholders).
    //
    //  If: isPdf AND OCR hasn't run yet AND we detected at least one heading
    //      AND zero section content was mapped → the body was invisible to the
    //      text layer. Trigger OCR and redo the extraction pass.
    // -----------------------------------------------------------------------
    if (isPdf && !usedOcr && detectedHeadings.length > 0 && Object.keys(sections).length === 0) {
      this.logger.log(
        `[CV-IMPORT:OCR-CHECK] post-walk trigger file=${filename} ` +
        `isPdf=true initialNodes=${initialNodes.length} headings=${detectedHeadings.length} ` +
        `mappedSections=0 thinExtraction=${extractionTooThin} shouldRunOcr=true`
      );
      const ocrOk = await attemptOcr('post-walk-zero-sections');
      if (cancelCheck()) return this.cancelledResult(profileId, jobId, startedAt);
      if (ocrOk) {
        // Redo extraction on OCR-synthesised pages.
        ({ allLines, sections, detectedHeadings, unknownHeadings, personal } =
          runExtractionPass(udm.pages));
      }
    }

    // -----------------------------------------------------------------------
    //  Phase 43.2 — post-extraction OCR section reclassification.
    //
    //  Always log post-OCR state BEFORE reclassification so the raw read
    //  order from tesseract is visible in the logs.
    // -----------------------------------------------------------------------
    if (usedOcr) {
      const preEduLen   = sections.education?.length ?? 0;
      const preSkillLen = sections.skills?.length ?? 0;
      const preLangLen  = ((sections as any).languages)?.length ?? 0;
      this.logger.log(
        `[CV-IMPORT:POST-OCR-SECTIONS] ` +
        `detectedHeadings=${JSON.stringify(detectedHeadings.slice(0, 20))} ` +
        `mappedSections=${JSON.stringify(Object.keys(sections))} ` +
        `educationLines=${preEduLen} skillsLines=${preSkillLen} languagesLines=${preLangLen}`
      );
      if (preEduLen > 0) {
        this.logger.log(
          `[CV-IMPORT:OCR-EDU-CONTENT] first10=${JSON.stringify((sections.education || []).slice(0, 10))}`
        );
      }

      // Phase 43.2 — always run resolveOcrSections (anchor scan + reclassification).
      const shouldReclassify = educationIsPolluted(sections.education || []);
      this.logger.log(
        `[CV-IMPORT:RECLASSIFY-CHECK] usedOcr=true educationLen=${preEduLen} ` +
        `skillsLen=${preSkillLen} languagesLen=${preLangLen} shouldReclassify=${shouldReclassify}`
      );
      resolveOcrSections(allLines, sections, (msg) => this.logger.log(msg));

      // Phase 43.3 — summary recovery.
      // If the heading-walk left personal.summary empty (happens when OCR reads
      // profile text BEFORE the PROFILE heading), scan allLines for a PROFILE /
      // SUMMARY heading and collect the text that immediately follows it.
      if (!personal.summary) {
        let summaryStart = -1;
        let summaryEnd   = allLines.length;
        for (let i = 0; i < allLines.length; i++) {
          const norm = normaliseAnchorHeading(allLines[i]);
          if (SUMMARY_HEADINGS.has(norm)) {
            summaryStart = i + 1;
          } else if (summaryStart >= 0 && matchAnchorKey(normaliseAnchorHeading(allLines[i]))) {
            summaryEnd = i;
            break;
          }
        }
        if (summaryStart >= 0 && summaryStart < summaryEnd) {
          const summaryLines = allLines
            .slice(summaryStart, summaryEnd)
            .map(l => l.trim())
            .filter(l => l.length > 20); // paragraph-length lines only
          if (summaryLines.length > 0) {
            personal.summary = summaryLines.join(' ');
            this.logger.log(`[CV-IMPORT:SUMMARY-RECOVERY] recovered ${summaryLines.length} lines as summary`);
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    //  Phase 42.6 — fallback heuristics. If no real headings matched,
    //  scan every line for date / degree / skill-cluster signals.
    // -----------------------------------------------------------------------
    let usedFallback = false;
    if (Object.keys(sections).length === 0) {
      usedFallback = true;
      const fb = fallbackExtract(allLines);
      if (fb.experience.length)     sections.experience     = fb.experience;
      if (fb.education.length)      sections.education      = fb.education;
      if (fb.skills.length)         sections.skills         = fb.skills;
      if (fb.certifications.length) sections.certifications = fb.certifications;
      if (!personal.summary && fb.summary) personal.summary = fb.summary;
    }

    // Also do a full-text personal pass — names + contacts often live in
    // mid-document blocks too (e.g. address blocks).
    for (const line of allLines) collectPersonal(personal, line);

    const payload: Partial<CvProfileDto> = { personal };
    for (const key of Object.keys(sections) as (keyof CvProfileDto)[]) {
      const lines = sections[key] || [];
      payload[key] = mapLinesToSection(key, lines) as any;
    }

    // Capture experience entries BEFORE semantic enrichment for debug trace.
    const parsedExpBefore = (payload.experience as any[] | undefined)?.map((e) => ({
      role: e.role, company: e.company, location: e.location,
      start: e.start, end: e.end,
      bulletCount: (e.bullets || []).length,
      bullets: [...(e.bullets || [])],
      rawLines: [...(e.rawLines || [])],
    })) ?? [];

    // Phase 42.7I — canonical skill names (React.js / NodeJS / JS → canonical).
    if (payload.experience) {
      payload.experience = preserveExperienceSemantics(payload.experience as any[]);
    }
    if (payload.skills) {
      payload.skills = (payload.skills as any[]).map((s) => ({ ...s, name: canonicalSkill(s.name || '') }));
    }

    const semanticMetrics = buildSemanticImportMetrics(allLines, payload);
    const semanticIssues = validateSemanticImport(semanticMetrics, payload);
    for (const issue of semanticIssues.warnings) warnings.push(issue);
    if (semanticIssues.failures.length) {
      this.logger.warn(
        `[CV-IMPORT:SEMANTIC-FAIL] file=${filename} metrics=${JSON.stringify(semanticMetrics)} ` +
        `failures=${JSON.stringify(semanticIssues.failures)}`
      );
      throw new BadRequestException(
        `Import failed semantic preservation validation: ${semanticIssues.failures.join('; ')}`
      );
    }
    this.logger.log(`[CV-IMPORT:SEMANTIC] file=${filename} metrics=${JSON.stringify(semanticMetrics)}`);
    // Phase 42.7H — duplicate detection (surface to UI; don't auto-delete).
    const dupSkills = findDuplicateSkills((payload.skills as any) || []);
    const dupExp    = findDuplicateExperiences((payload.experience as any) || []);
    if (dupSkills.length > 0) {
      warnings.push(`${dupSkills.length} skill duplicate group(s) detected — e.g. "${dupSkills[0].variants.slice(0,3).join(', ')}".`);
    }
    if (dupExp.length > 0) {
      warnings.push(`${dupExp.length} duplicate experience entry/entries detected.`);
    }

    // Build warnings + debug payload.
    const extractedCounts: Record<string, number> = {};
    for (const k of Object.keys(sections) as (keyof CvProfileDto)[]) {
      extractedCounts[k] = (payload[k] as any[])?.length || 0;
    }

    if (Object.keys(sections).length === 0) {
      warnings.push('No section headings or date patterns recognised — only personal info was extracted. Try "Analyze this CV" for a stronger pass, or paste the text manually.');
    } else if (usedFallback) {
      warnings.push('No standard headings detected — sections inferred from date / degree / skill-cluster patterns. Review carefully before saving.');
    }
    if (unknownHeadings.length > 0) {
      warnings.push(`Unrecognised section headings: ${unknownHeadings.slice(0, 5).join(', ')}${unknownHeadings.length > 5 ? ' (+ more)' : ''}.`);
    }

    const shouldPersist = opts?.persist !== false;
    const profile = shouldPersist
      ? await this.profiles.replaceFromImport(profileId, fileSourceFor(filename), payload)
      : this.profileSnapshot(profileId, payload, fileSourceFor(filename));

    // Phase 42.6 — dev-mode debug payload, surfaced by the frontend import trace panel.
    const parsedExpAfter = ((payload.experience as any[] | undefined) || []).map((e) => ({
      role: e.role, company: e.company, location: e.location,
      start: e.start, end: e.end,
      bulletCount: (e.bullets || []).length + (e.achievements || []).length,
      bullets: [...(e.bullets || [])],
      achievements: [...(e.achievements || [])],
    }));
    const debug = process.env.NODE_ENV !== 'production' ? {
      rawTextPreview:    allLines.join('\n').slice(0, 2000),
      allLines:          allLines.slice(0, 500),
      sectionLines:      Object.fromEntries(
        Object.entries(sections).map(([k, lines]) => [k, (lines || []).slice(0, 120)])
      ),
      parsedExpBefore,
      parsedExpAfter,
      detectedHeadings:  detectedHeadings.slice(0, 30),
      unknownHeadings:   unknownHeadings.slice(0, 30),
      mappedSections:    extractedCounts,
      usedFallback,
      totalLines:        allLines.length,
      semantic:          semanticMetrics,
    } : undefined;

    // Phase 42.7D — confidence engine.
    const confidence = computeConfidence(payload, {
      headingsDetected: detectedHeadings.length - unknownHeadings.length,
      headingsUnknown:  unknownHeadings.length,
      usedFallback,
    });

    // Phase 43.1B — SINGLE SOURCE OF TRUTH.
    //
    // Every UI widget (top counts row, score bars, detected/missing chips,
    // overall pill) MUST read from the same normalised report. Previously
    // `extractedCounts` was built from `payload[k].length` while
    // `confidence.detected` was built from `detectedSections(payload)` —
    // both derived from the same `payload`, but the frontend ALSO computed
    // its own counts from `res.profile.experience.length`, which is a
    // post-save object and can drift (e.g. after Prisma trims invalid rows).
    //
    // The canonical counts below cover every section the scoring model
    // knows about, even ones that ended up with zero items, so the UI
    // never has to guess.
    const canonicalCounts = {
      personal:       Object.keys(personal || {}).filter((k) => personal[k]).length,
      summary:        (personal?.summary ? 1 : 0),
      experience:     (payload.experience as any[] | undefined)?.length     ?? 0,
      education:      (payload.education  as any[] | undefined)?.length     ?? 0,
      skills:         (payload.skills     as any[] | undefined)?.length     ?? 0,
      languages:      ((payload as any).languages as any[] | undefined)?.length ?? 0,
      projects:       ((payload as any).projects as any[] | undefined)?.length  ?? 0,
      certifications: ((payload as any).certifications as any[] | undefined)?.length ?? 0,
      awards:         ((payload as any).awards as any[] | undefined)?.length    ?? 0,
      publications:   ((payload as any).publications as any[] | undefined)?.length ?? 0,
      references:     ((payload as any).references as any[] | undefined)?.length    ?? 0,
    };

    // Phase 42.7E — quality report payload.
    const quality = {
      score:    confidence.overall,
      band:     confidence.band,
      detected: confidence.detected,
      missing:  confidence.missing,
      counts:   extractedCounts,
      // Phase 43.1B — canonical block (single source of truth).
      canonical: {
        counts:      canonicalCounts,
        detected:    confidence.detected,
        missing:     confidence.missing,
        bands:       confidence.bands,
        overall:     confidence.overall,
        band:        confidence.band,
      },
      duplicates: {
        skills:      dupSkills.map((g) => ({ canonical: g.canonical, variants: g.variants })),
        experiences: dupExp.map((g) => g.rep),
      },
      semantic: semanticMetrics,
      ocr: usedOcr ? { used: true, avgConfidence: ocrConfidence } : { used: false },
      usedFallback,
      unknownHeadings: unknownHeadings.slice(0, 20),
    };

    // Phase 43.1C — always-on debug log so the runtime path is visible
    // (regardless of NODE_ENV) without forcing the caller to dig into the
    // `debug` payload. Useful for diagnosing "score = 9" reports from
    // production CVs that don't match the dev fixture.
    this.logger.log(
      `[CV-IMPORT] file=${filename} lines=${allLines.length} ` +
      `headings.detected=${detectedHeadings.length} headings.unknown=${unknownHeadings.length} ` +
      `mapped=${JSON.stringify(extractedCounts)} ` +
      `canonical=${JSON.stringify(canonicalCounts)} ` +
      `detected=[${(confidence.detected || []).join(',')}] ` +
      `bands=${JSON.stringify(confidence.bands)} ` +
      `overall=${confidence.overall} band=${confidence.band} usedFallback=${usedFallback} usedOcr=${usedOcr}`
    );
    if (detectedHeadings.length > 0) {
      this.logger.log(`[CV-IMPORT] detectedHeadings=${JSON.stringify(detectedHeadings.slice(0, 20))}`);
    }
    if (unknownHeadings.length > 0) {
      this.logger.log(`[CV-IMPORT] unknownHeadings=${JSON.stringify(unknownHeadings.slice(0, 20))}`);
    }

    // Phase 42.8E — persist any explicit mappings the caller passed so future
    // imports auto-apply them.
    if (opts?.sectionMappings && opts.userId) {
      try { await this.mappings.upsertMany(opts.userId, opts.sectionMappings as any); } catch { /* non-fatal */ }
    }

    // Phase 42.8C + 42.8G — persist the import event (analytics + history).
    if (opts?.userId) {
      const event: ImportEvent = {
        filename, mimetype, bytes: buffer.length,
        durationMs:          Date.now() - startedAt,
        ocrUsed:             usedOcr,
        ocrLangsUsed,
        ocrAvgConfidence:    ocrConfidence,
        confidenceOverall:   confidence.overall,
        confidenceBand:      confidence.band,
        detected:            confidence.detected as string[],
        missing:             confidence.missing  as string[],
        counts:              extractedCounts,
        unknownHeadings:     unknownHeadings.slice(0, 20),
        duplicatesCount:     { skills: dupSkills.length, experience: dupExp.length },
        warnings,
        appliedAutoMappings: appliedAutoMappingKeys,
        failed:              false,
      };
      try {
        await this.prisma.cvAnalysisSnapshot.create({
          data: {
            userId:      opts.userId,
            profileId,
            kind:        'import',
            label:       filename,
            score:       confidence.overall,
            atsScore:    null,
            analysisJson: event as any,
            profileJson:  null,
          },
        });
      } catch (e) { this.logger.warn(`Persist import event failed: ${(e as any)?.message || e}`); }
    }

    setProgress({ phase: 'done', percent: 100, message: 'Done', result: { ok: true, confidence: confidence.overall } });
    this.logger.log(
      `[CV-IMPORT:FINAL-CANONICAL] ` +
      `summary=${!!(personal?.summary)} ` +
      `experience=${(profile as any).experience?.length ?? 0} ` +
      `education=${(profile as any).education?.length ?? 0} ` +
      `skills=${(profile as any).skills?.length ?? 0} ` +
      `languages=${(profile as any).languages?.length ?? 0} ` +
      `overall=${confidence.overall} band=${confidence.band}`
    );
    this.logger.log(
      `[CV-IMPORT:FINAL-RESPONSE] ` +
      `profile.experience=${(profile as any).experience?.length ?? 0} ` +
      `profile.education=${(profile as any).education?.length ?? 0} ` +
      `profile.skills=${(profile as any).skills?.length ?? 0} ` +
      `profile.languages=${(profile as any).languages?.length ?? 0} ` +
      `quality.canonical.counts=${JSON.stringify(canonicalCounts)} ` +
      `overall=${confidence.overall} band=${confidence.band}`
    );
    return { profile, warnings, debug, confidence, quality };
  }

  // -------------------------------------------------------------------------
  //  Phase 42.8A — early-exit helper when the user cancels mid-OCR.
  // -------------------------------------------------------------------------
  private async cancelledResult(profileId: string, jobId: string | undefined, startedAt: number): Promise<any> {
    if (jobId) this.progress.update(jobId, { phase: 'cancelled', percent: 0, message: 'Cancelled' });
    const profile = await this.profiles.get(profileId);
    return {
      profile, warnings: ['Import cancelled by user.'], debug: undefined,
      confidence: { overall: 0, band: 'review', bands: { heading: 0, sections: 0, skills: 0, experience: 0, education: 0 }, detected: [], missing: [] } as any,
      quality: { score: 0, band: 'review', detected: [], missing: [], counts: {}, duplicates: { skills: [], experiences: [] }, ocr: { used: false }, usedFallback: false, unknownHeadings: [] },
    };
  }

  private profileSnapshot(profileId: string, payload: Partial<CvProfileDto>, source: 'linkedin'|'docx'|'pdf'): CvProfileDto {
    const now = new Date().toISOString();
    return {
      id: profileId,
      userId: '',
      personal: (payload as any).personal ?? {},
      experience: ((payload as any).experience as any[]) ?? [],
      education: ((payload as any).education as any[]) ?? [],
      skills: ((payload as any).skills as any[]) ?? [],
      languages: ((payload as any).languages as any[]) ?? [],
      projects: ((payload as any).projects as any[]) ?? [],
      certifications: ((payload as any).certifications as any[]) ?? [],
      awards: ((payload as any).awards as any[]) ?? [],
      publications: ((payload as any).publications as any[]) ?? [],
      references: ((payload as any).references as any[]) ?? [],
      importSource: source,
      importedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ---------------------------------------------------------------------------
  //  LinkedIn export JSON → CvProfile
  // ---------------------------------------------------------------------------

  async importFromLinkedIn(profileId: string, linkedin: any): Promise<{ profile: CvProfileDto; warnings: string[] }> {
    if (!linkedin || typeof linkedin !== 'object') throw new BadRequestException('LinkedIn payload missing or not an object');
    const warnings: string[] = [];

    const personal = {
      fullName: linkedin.firstName && linkedin.lastName ? `${linkedin.firstName} ${linkedin.lastName}` : linkedin.fullName,
      headline: linkedin.headline,
      location: typeof linkedin.location === 'string' ? linkedin.location : linkedin.location?.name,
      summary:  linkedin.summary,
      linkedin: linkedin.publicProfileUrl || linkedin.profileUrl,
      email:    linkedin.email,
      website:  linkedin.website,
    };

    const experience = (linkedin.positions || linkedin.experience || []).map((p: any, i: number) => ({
      id:       p.id || `exp-li-${i}`,
      company:  p.companyName || p.company || '',
      role:     p.title || p.role || '',
      location: typeof p.location === 'string' ? p.location : p.location?.name,
      start:    p.startDate?.year ? `${p.startDate.year}${p.startDate.month ? `-${String(p.startDate.month).padStart(2, '0')}` : ''}` : (p.start || ''),
      end:      p.endDate?.year   ? `${p.endDate.year}${p.endDate.month ? `-${String(p.endDate.month).padStart(2, '0')}` : ''}` : p.end,
      bullets:  Array.isArray(p.description) ? p.description : (p.description ? String(p.description).split('\n').filter(Boolean) : []),
      description: Array.isArray(p.description) ? p.description.join('\n') : (p.description ? String(p.description) : ''),
    }));

    const education = (linkedin.educations || linkedin.education || []).map((e: any, i: number) => ({
      id:          e.id || `edu-li-${i}`,
      institution: e.schoolName || e.school || '',
      degree:      e.degree || e.degreeName,
      field:       e.fieldOfStudy || e.field,
      start:       e.startDate?.year ? String(e.startDate.year) : (e.start || ''),
      end:         e.endDate?.year   ? String(e.endDate.year)   : e.end,
      gpa:         e.grade,
      honors:      e.activities ? [String(e.activities)] : undefined,
    }));

    const skills = (linkedin.skills || []).map((s: any, i: number) => ({
      id:       `skill-li-${i}`,
      name:     typeof s === 'string' ? s : (s.name || s.skill || ''),
      category: 'technical' as const,
    })).filter((s: any) => s.name);

    const languages = (linkedin.languages || []).map((l: any, i: number) => ({
      id:          `lang-li-${i}`,
      name:        typeof l === 'string' ? l : l.language || l.name,
      proficiency: (l.proficiency || 'conversational').toLowerCase(),
    })).filter((l: any) => l.name);

    const certifications = (linkedin.certifications || []).map((c: any, i: number) => ({
      id:           c.id || `cert-li-${i}`,
      name:         c.name,
      issuer:       c.authority || c.issuer,
      date:         c.startDate?.year ? String(c.startDate.year) : c.date,
      url:          c.url,
      credentialId: c.licenseNumber,
    })).filter((c: any) => c.name);

    if (experience.length === 0 && education.length === 0) {
      warnings.push('LinkedIn payload had no positions or educations; profile may be sparse.');
    }

    const profile = await this.profiles.replaceFromImport(profileId, 'linkedin', {
      personal, experience, education, skills, languages, certifications,
    });
    return { profile, warnings };
  }
}

// =============================================================================
//  Heading + text helpers (Phase 42.6)
// =============================================================================

function normaliseHeading(s: string): string {
  // Phase 43.1C — defensive collapse so "P R O F I L E" → "profile" even
  // when called outside the main extraction pipeline.
  return collapseSpacedLetters(s || '')
    .toLowerCase()
    .replace(/[:.\-–—\s]+$/, '')      // trailing punctuation / em-dashes / spaces
    .replace(/^[:.\-–—\s]+/, '')
    .replace(/[‘’]/g, "'")  // smart quotes
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function looksLikeHeading(text: string): boolean {
  if (!text) return false;
  const t = text.trim();
  if (t.length === 0 || t.length > 50) return false;
  // Reject if ends with sentence punctuation (likely a real sentence).
  if (/[.!?]$/.test(t) && !t.endsWith('Inc.') && !t.endsWith('Ltd.')) return false;
  // Reject if contains digits (typical body content).
  if (/\d/.test(t)) return false;
  // Accept if ALL CAPS or Title Case + short.
  const isAllCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
  const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(t.replace(/[&,]/g, ' '));
  const norm = normaliseHeading(t);
  const isShortKnown = !!SECTION_HEADINGS[norm] || SUMMARY_HEADINGS.has(norm) || PERSONAL_HEADINGS.has(norm);
  return isAllCaps || isTitleCase || isShortKnown;
}

function matchHeadingBySubstring(norm: string): keyof CvProfileDto | null {
  for (const [alias, key] of Object.entries(SECTION_HEADINGS)) {
    if (norm.includes(alias)) return key;
  }
  return null;
}

function collectPersonal(personal: any, text: string) {
  const t = (text || '').trim();
  if (!t) return;
  if (!personal.fullName && /^[A-Z][A-Za-z\s.'-]+$/.test(t) && t.length < 60 && !/\d/.test(t) && t.split(/\s+/).length >= 2 && t.split(/\s+/).length <= 5) {
    personal.fullName = t;
  }
  const emailMatch    = t.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  if (!personal.email && emailMatch) personal.email = emailMatch[0];
  const phoneMatch    = t.match(/(\+?\d[\d\s().-]{6,})/);
  if (!personal.phone && phoneMatch && phoneMatch[0].replace(/\D/g, '').length >= 7) personal.phone = phoneMatch[0].trim();
  const linkedinMatch = t.match(/linkedin\.com\/in\/[\w-]+/i);
  if (!personal.linkedin && linkedinMatch) personal.linkedin = linkedinMatch[0];
  const githubMatch   = t.match(/github\.com\/[\w-]+/i);
  if (!personal.github && githubMatch) personal.github = githubMatch[0];
  const websiteMatch  = t.match(/\bhttps?:\/\/[^\s]+/i);
  if (!personal.website && websiteMatch && !/linkedin|github/i.test(websiteMatch[0])) personal.website = websiteMatch[0];
}

// =============================================================================
//  Phase 43.2 — institution-name detection.
//
//  School / university names look like headings (ALL CAPS, no digits) but are
//  content under the education section, not section breaks. Recognising them
//  keeps the education section open so that SKILLS / LANGUAGES headings that
//  follow can be correctly detected as separate sections.
// =============================================================================

const INSTITUTION_KEYWORDS_RE = /\b(high\s*school|secondary\s*school|middle\s*school|university|college|institute|academy|polytechnic|conservatory|seminary|gymnasium|grammar\s*school|preparatory\s*school|lycee|lyc[ée]e)\b/i;
const DEGREE_WORD_RE = /\b(bachelor|master|phd|ph\.d|doctorate|mba|b\.sc|m\.sc|b\.a|m\.a|b\.eng|m\.eng|diploma|associate|hnd|hnc)\b/i;

function looksLikeInstitution(text: string): boolean {
  const t = (text || '').trim();
  // Must not be a recognised CV section (those are handled by classifyHeadingMultiLang).
  // Must look like a school name or a degree statement.
  return INSTITUTION_KEYWORDS_RE.test(t) || DEGREE_WORD_RE.test(t);
}

// =============================================================================
//  Phase 43.2 — OCR section reclassification.
//
//  When tesseract reads a two-column CV (left sidebar: EDUCATION / SKILLS /
//  LANGUAGES; right main: PROFILE / WORK EXPERIENCE) it can produce text where
//  the sidebar body content (skills, languages) appears BEFORE the SKILLS /
//  LANGUAGES heading lines in reading order. That makes everything land under
//  EDUCATION (section stays open until the next recognised heading).
//
//  After the extraction pass, if education has > 3 items while skills or
//  languages have 0, scan education content and redistribute lines whose
//  content type matches skills or languages.
// =============================================================================

// =============================================================================
//  Phase 43.2 helpers — used by resolveOcrSections.
// =============================================================================

const KNOWN_LANGUAGE_RE = /\b(arabic|english|french|spanish|german|turkish|portuguese|italian|dutch|russian|chinese|mandarin|japanese|korean|hebrew|persian|urdu|hindi|indonesian|malay|thai|vietnamese|polish|czech|hungarian|romanian|greek|swedish|danish|norwegian|finnish|bulgarian|serbian|croatian|ukrainian|catalan|afrikaans|swahili|tagalog|bahasa)\b/i;
// Proficiency levels that may appear on a separate line from the language name in OCR output.
const OCR_PROFICIENCY_RE = /\b(native|fluent|proficient|conversational|basic|basics|intermediate|advanced|beginner|bilingual|elementary|mother\s*tongue|first\s*language)\b/i;

// Action verbs that begin experience bullets, not skill names.
const SKILL_ACTION_VERB_RE = /^(develop|manag|coordinat|creat|review|led|lead|build|built|design|implement|achiev|establish|maintain|provid|ensur|deliver|work(ed|ing)?|prepar|analys|analyz|support|assist|handl|conduct|perform|execut|produc|complet|monitor|supervis|train|mentor|organiz|research|evaluat|resolv|process|collaborat|communicat|negotiat|launch|spearhead|oversaw|oversee|improv|increas|reduc|facilitat|utiliz|leverag|deploy|integrat|automat|optimiz|generat|troubleshoot|troubleshot|troubleshot|inspect|analyz)\w*\b/i;

// True when a line is clearly education content (institution, year, degree).
// Everything else in an education section is a candidate for reclassification.
function isEducationLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^\d{4}$/.test(t)) return true;                    // bare year "2009"
  if (/^\d{4}[-–—]\d{4}$/.test(t)) return true;          // year range "2008-2009"
  if (DATE_RANGE_RE.test(t)) return true;                 // "Sep 2008 – Jun 2009"
  if (INSTITUTION_KEYWORDS_RE.test(t)) return true;       // "High School", "University"
  if (DEGREE_WORD_RE.test(t)) return true;                // "Bachelor", "PhD"
  if (DEGREE_RE.test(t)) return true;                     // "BSc", "MSc"
  if (/\bGPA\b/i.test(t) && /\d/.test(t)) return true;   // "GPA: 3.8"
  return false;
}

// True when a line looks like "Language [Proficiency]".
// Handles OCR separator variants: "Arabic: native", "Arabic - native", "Arabic (native)".
function looksLikeOcrLanguageLine(line: string): boolean {
  const raw = line.trim();
  // Strip separators before testing so "Arabic: native" → "Arabic native"
  const t = raw.replace(/[():\-–—/|,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return false;
  if (!KNOWN_LANGUAGE_RE.test(t)) return false;
  if (/\d{4,}/.test(t)) return false;           // year or phone
  // Count only meaningful words (2+ alpha letters) to ignore OCR rating dots/circles
  const meaningfulWords = t.split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w));
  return meaningfulWords.length >= 1 && meaningfulWords.length <= 5;
}

// True when a line looks like a professional skill name.
// Rejects: contact info, education, language lines, experience bullets (action verbs),
// full sentences (> 5 words AND ends with period).
function looksLikeOcrSkillLine(line: string): boolean {
  const raw = line.trim();
  // Strip trailing OCR punctuation before word-count/length checks.
  const t = raw.replace(/[.!?,;:]$/, '').trim();
  if (!t || t.length > 60) return false;
  // Personal-contact markers
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(t)) return false;
  if (/https?:\/\//i.test(t)) return false;
  if (/linkedin\.com|github\.com/i.test(t)) return false;
  if (/^\+?\d[\d\s().-]{5,}$/.test(t)) return false;
  if (/\d{4,}/.test(t)) return false;
  // Section headings are not skills
  if (matchAnchorKey(normaliseAnchorHeading(t))) return false;
  // Education and language lines handled separately
  if (isEducationLine(t)) return false;
  if (looksLikeOcrLanguageLine(t)) return false;
  // Experience bullets start with strong action verbs — test against content
  // after stripping leading OCR bullet chars so "« Integrated…" is caught.
  const content = t.replace(/^[«»•*+\-–—\s]+/, '').trim();
  if (SKILL_ACTION_VERB_RE.test(content) || SKILL_ACTION_VERB_RE.test(t)) return false;
  // Reject article/pronoun-started phrases ("A highly motivated…", "It provides…")
  if (/^(a|an|the|i|we|you|they|it|its|our|their|my|this|that)\b/i.test(content)) return false;
  // Long sentences ending with period are likely experience/profile bullets
  if (/[.!?]$/.test(raw) && raw.split(/\s+/).length > 5) return false;
  // Bare proficiency words alone are not skills (OCR column artefact)
  if (/^(native|fluent|proficient|conversational|basic|basics|intermediate|advanced|beginner|bilingual)$/i.test(t)) return false;
  // Sentence-fragment endings from the main column (e.g. "clients.", "travel experience.")
  if (/[.!?]$/.test(raw) && /^[a-z]/.test(t)) return false;
  // Conjunction-start fragments ("and services.", "or team members.")
  if (/^(and|or|for|the|a|an|in|of|to|by|at|as|its|their|our)\b/i.test(t) && /[.!?]$/.test(raw)) return false;
  // Reject if first meaningful word is a known section heading (e.g. "SKILLS end services…")
  const firstMeaningful = t.split(/\s+/).find(w => /[a-zA-Z]{2,}/.test(w)) ?? '';
  if (firstMeaningful && matchAnchorKey(normaliseAnchorHeading(firstMeaningful))) return false;
  // Reject OCR-corrupted heading tokens (e.g. "é PROFILE" → normalised "profile")
  const normFull = normaliseAnchorHeading(t);
  if (matchAnchorKey(normFull) || SUMMARY_HEADINGS.has(normFull)) return false;
  // Count only meaningful words (2+ alpha letters) to ignore OCR rating dots/circles
  const meaningfulWords = t.split(/\s+/).filter(w => /[a-zA-Z]{2,}/.test(w));
  // Require at least one word with 3+ letters (rejects "EE —", "CL", etc.)
  if (!meaningfulWords.some(w => w.length >= 3)) return false;
  return meaningfulWords.length >= 1 && meaningfulWords.length <= 6;
}

// Extract the sidebar prefix from a two-column OCR merged line.
// e.g. "«Arabic (native) + Reviewed customer feedback..." → "«Arabic (native)"
// e.g. "* Responsive design for various devices..."     → "* Responsive design"
// Returns null when no merged pattern is detected.
function extractOcrSidebarPrefix(line: string): string | null {
  // Pattern 1: explicit mid-line bullet separator (« skill * main, * skill + main)
  const m1 = line.match(/^(.{2,50}?)\s+[+*]\s+\S.{15,}$/);
  if (m1 && m1[1].trim().length >= 2) return m1[1].trim();

  // Pattern 2: BULLET-prefixed capitalized skill phrase, followed by a preposition/
  // conjunction that introduces the merged main-column sentence fragment.
  // Requires at least one sidebar bullet char to avoid false matches on plain prose.
  // e.g. "* Responsive design for various devices..." → "* Responsive design"
  // e.g. "+ Mobile app development and interests."   → "+ Mobile app development"
  const m2 = line.match(
    /^([«»•*+\-–—]+\s*[A-Z][A-Za-z/\s\-]{2,35}?)\s+\b(for|of|in|to|by|at|and|or|with|on|from|across|using)\b.{10,}$/
  );
  if (m2 && m2[1].trim().length >= 4) return m2[1].trim();

  // Pattern 3: bullet + exactly 2-word skill phrase, then lowercase continuation.
  // Handles "« Front-end development stakeholders throughout..." → "« Front-end development"
  // where there is no preposition/conjunction separating the columns.
  const m3 = line.match(
    /^([«»•*+\-–—]+\s*[A-Z][A-Za-z/\-]+\s+[A-Za-z/\-]+)\s+[a-z].{15,}$/
  );
  if (m3 && m3[1].trim().length >= 5) return m3[1].trim();

  return null;
}

function extractOcrRemainder(line: string, prefix: string): string {
  if (!line || !prefix) return '';
  const idx = line.indexOf(prefix);
  const rest = idx >= 0 ? line.slice(idx + prefix.length) : '';
  return rest.trim();
}

function extractAnchorRemainder(line: string): string {
  const trimmed = String(line || '').trim();
  if (!trimmed) return '';
  const m = trimmed.match(/^(skills?|languages?|contact|education|work\s+experience|experience)\b\s*(.+)$/i);
  if (!m) return '';
  return normalizeOcrExperienceLeak(m[2]);
}

function normalizeOcrExperienceLeak(line: string): string {
  let t = String(line || '').trim();
  if (!t) return '';
  t = t
    .replace(/^[|,.;:\s]+/, '')
    .replace(/^[«»•*+\-–—]+\s*/, '+ ')
    .replace(/^\.?\s*\+\s*/, '+ ')
    .replace(/^(?:ee|cl|q|©|afpleeier|come|mail)\b\s*/i, '')
    .replace(/\b(?:aps\s+othesg|afpleeier\s+come\s+mail)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim();

  const role = t.match(/^(?:\d+\s*)?(?:fees?\s+)?(.+?\b(?:operator|manager|developer|engineer|designer|consultant|freelancer|specialist|coordinator|assistant|lead|director)\b.*?\b(?:19|20)\d{2}\s*[-–—]\s*(?:present|current|now|(?:19|20)\d{2}))$/i);
  if (role) t = role[1].trim();

  return t
    .replace(/\s+([,.])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isExperienceRoleLeak(line: string): boolean {
  const t = normalizeOcrExperienceLeak(line);
  if (!t) return false;
  if (looksLikeOcrSkillLine(t) || looksLikeOcrLanguageLine(t)) return false;
  return /\b(?:operator|manager|developer|engineer|designer|consultant|freelancer|specialist|coordinator|assistant|lead|director)\b/i.test(t) &&
    /\b(?:19|20)\d{2}\s*[-–—]\s*(?:present|current|now|(?:19|20)\d{2})\b/i.test(t);
}

function isExperienceLeakLine(line: string, previousExperienceLines: string[] = []): boolean {
  const t = normalizeOcrExperienceLeak(line);
  if (!t) return false;
  if (isExperienceRoleLeak(t)) return true;
  if (looksLikeOcrSkillLine(t) || looksLikeOcrLanguageLine(t)) return false;
  if (isEducationLine(t) && !SKILL_ACTION_VERB_RE.test(t.replace(/^[+*«»•\-\s]+/, ''))) return false;

  const content = t.replace(/^[+*«»•\-\s]+/, '').trim();
  if (SKILL_ACTION_VERB_RE.test(content)) return true;
  if (/^(members|management|and|or|for|to|by|with|in|on|at|from|clients?|tour|travel|satisfaction|concerns|services?)\b/i.test(content) && previousExperienceLines.length > 0) {
    return true;
  }
  if (content.split(/\s+/).length >= 4 && /[.!?]$/.test(content) && previousExperienceLines.length > 0) {
    return true;
  }
  return false;
}

// True when education looks polluted (too many lines or mixed content).
function educationIsPolluted(edu: string[]): boolean {
  return edu.length > 3 || edu.some(looksLikeOcrSkillLine) || edu.some(looksLikeOcrLanguageLine);
}

// =============================================================================
//  Phase 43.3 — resolveOcrSections
//
//  For two-column OCR CVs Tesseract can read sidebar body content (skills /
//  languages) BEFORE the corresponding sidebar headings. This means the
//  heading-walk leaves skills and languages empty while education swallows
//  everything. resolveOcrSections fixes this with three strategies:
//
//  Pass A — bidirectional heading-anchor scan.
//    Finds section headings in allLines.  For each heading checks forward
//    content (between heading and next heading) AND backward content (between
//    previous heading and this heading).  Backward content is used when
//    forward content is empty — this is the reversed-column-order case.
//
//  Pass B — direct content-based reclassification from education.
//    Scans every education line and moves skill/language lines to the right
//    section.  Runs unconditionally so it complements Pass A.
//
//  Hard cap — education is trimmed to real edu lines only (year / degree /
//    institution) when it still has > 3 entries after the two passes.
//
//  Mutates sections IN PLACE.  Returns true when anything changed.
// =============================================================================

// Normalise a line for anchor-heading comparison.
// Handles letter-spaced headings ("S K I L L S" → "SKILLS") via
// collapseSpacedLetters which was already applied during heading promotion,
// but we re-apply here defensively.
function normaliseAnchorHeading(text: string): string {
  return collapseSpacedLetters(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fuzzy section-heading lookup: exact ANCHOR_SECTION_MAP match first, then
// prefix/pattern rules for common variants.
function matchAnchorKey(norm: string): keyof CvProfileDto | null {
  if (ANCHOR_SECTION_MAP[norm]) return ANCHOR_SECTION_MAP[norm];
  if (/^skills?$/.test(norm))                                       return 'skills';
  if (/^(key|core|technical|professional|main)\s+skills?/.test(norm)) return 'skills';
  if (/^languages?$/.test(norm))                                    return 'languages';
  if (/^languages?\s+(spoken|proficiency|used|known)/.test(norm))   return 'languages';
  if (/^education/.test(norm))                                      return 'education';
  if (/^academic\s+(background|history|qualifications?)/.test(norm)) return 'education';
  if (/^(work\s+)?experience$/.test(norm))                          return 'experience';
  if (/^professional\s+(experience|background|history)/.test(norm)) return 'experience';
  return null;
}

// Section headings recognised by the anchor scan (exact normalised keys).
const ANCHOR_SECTION_MAP: Record<string, keyof CvProfileDto> = {
  'skills': 'skills', 'key skills': 'skills', 'skill': 'skills',
  'core skills': 'skills', 'technical skills': 'skills', 'professional skills': 'skills',
  'languages': 'languages', 'language proficiency': 'languages',
  'languages spoken': 'languages', 'languages known': 'languages',
  'education': 'education', 'academic background': 'education',
  'educational background': 'education',
  'experience': 'experience', 'work experience': 'experience',
  'professional experience': 'experience', 'career history': 'experience',
  'projects': 'projects', 'certifications': 'certifications',
  'achievements': 'certifications',
};

function resolveOcrSections(
  allLines: string[],
  sections: Partial<Record<keyof CvProfileDto, string[]>>,
  log: (msg: string) => void,
): boolean {
  let changed = false;

  // ---- Diagnostic: dump raw OCR lines with indexes (first 100) -----------
  {
    const dump = allLines.slice(0, 100);
    log(`[CV-IMPORT:OCR-LINE]\n${dump.map((l, i) => `${i}: "${l}"`).join('\n')}`);
    log(`[CV-IMPORT:OCR-LINE-NORMALIZED]\n${dump.map((l, i) => `${i}: "${normaliseAnchorHeading(l)}"`).join('\n')}`);
  }

  // ---- Pass A: forward-only heading-anchor scan --------------------------
  // NOTE: we intentionally do NOT use backward content here.  For two-column
  // CVs where OCR reads sidebar content before the sidebar heading, the
  // "backward" content of SKILLS/LANGUAGES includes a mix of skill, language
  // AND education lines — assigning it wholesale to sections.skills causes
  // duplication when Pass B then also processes the same lines from education.
  // Pass B (below) is the correct mechanism for reversed-column-order CVs.
  const anchors: { idx: number; key: keyof CvProfileDto; norm: string }[] = [];
  for (let i = 0; i < allLines.length; i++) {
    const norm = normaliseAnchorHeading(allLines[i]);
    const key  = matchAnchorKey(norm);
    if (key) anchors.push({ idx: i, key, norm });
  }

  log(`[CV-IMPORT:ANCHOR-SCAN] count=${anchors.length} anchors=${JSON.stringify(
    anchors.map(a => ({ section: a.key, norm: a.norm, idx: a.idx }))
  )}`);

  for (let a = 0; a < anchors.length; a++) {
    const { idx, key } = anchors[a];
    const nextIdx = a + 1 < anchors.length ? anchors[a + 1].idx : allLines.length;
    const forwardLines = allLines.slice(idx + 1, nextIdx)
      .map(l => l.trim()).filter(l => l.length > 0);

    log(`[CV-IMPORT:ANCHOR-RANGE] section=${key} start=${idx + 1} end=${nextIdx} lines=${JSON.stringify(forwardLines)}`);

    if (forwardLines.length === 0) continue;

    const current = (sections as any)[key] as string[] | undefined;
    const curLen  = current?.length ?? 0;

    if (key === 'education') {
      // Replace only when anchor content is shorter (cleaner = single-degree entry).
      if (curLen > forwardLines.length) {
        log(`[CV-IMPORT:ANCHOR-ASSIGN] education ${curLen}→${forwardLines.length} (anchor cleaner)`);
        sections.education = forwardLines; changed = true;
      }
    } else if (curLen === 0) {
      log(`[CV-IMPORT:ANCHOR-ASSIGN] ${key} 0→${forwardLines.length}`);
      (sections as any)[key] = forwardLines; changed = true;
    }
  }

  // ---- Pass B: content-based reclassification from education --------------
  // Primary mechanism for reversed-column-order CVs: scan every education
  // line and move skill/language content to the right section.
  {
    const edu  = sections.education          || [];
    const skls = sections.skills             || [];
    const lngs = (sections as any).languages || [];

    log(`[CV-IMPORT:RECLASSIFY-START] educationLen=${edu.length} skillsLen=${skls.length} languagesLen=${lngs.length}`);

    const realEdu:   string[] = [];
    const newSkills: string[] = [];
    const newLangs:  string[] = [];
    const newExp:    string[] = [];

    for (let i = 0; i < edu.length; i++) {
      const line         = edu[i];
      const sidebarPfx   = extractOcrSidebarPrefix(line);
      const remainder    = sidebarPfx ? extractOcrRemainder(line, sidebarPfx) : '';
      const testLine     = sidebarPfx ?? line;
      const isLang       = looksLikeOcrLanguageLine(testLine);
      const isSkill      = !isLang && looksLikeOcrSkillLine(testLine);
      const isEdu        = isEducationLine(line);
      log(`[CV-IMPORT:OCR-EDU-LINE] index=${i} line="${line}" skillLike=${isSkill} languageLike=${isLang} educationLike=${isEdu}${sidebarPfx ? ` prefix="${sidebarPfx}"` : ''}`);

      if (sidebarPfx) {
        const pfxIsEdu = isEducationLine(testLine);
        const pfxIsAnchor = !!matchAnchorKey(normaliseAnchorHeading(testLine));
        const pfxIsExperienceAction = SKILL_ACTION_VERB_RE.test(normalizeOcrExperienceLeak(testLine).replace(/^[+*«»•\-\s]+/, ''));
        if (isLang) newLangs.push(testLine);
        else if (isSkill) newSkills.push(testLine);
        else if (pfxIsEdu) realEdu.push(testLine);

        const expRemainder = normalizeOcrExperienceLeak(remainder);
        if (!pfxIsExperienceAction && expRemainder && isExperienceLeakLine(expRemainder, newExp)) {
          newExp.push(expRemainder);
          log(`[CV-IMPORT:RECLASSIFY-MOVE] education→experience remainder="${expRemainder}"`);
        }
        const fullExpLine = normalizeOcrExperienceLeak(line);
        if (!isLang && !isSkill && !pfxIsEdu && !pfxIsAnchor && isExperienceLeakLine(fullExpLine, newExp)) {
          newExp.push(fullExpLine);
          log(`[CV-IMPORT:RECLASSIFY-MOVE] education→experience mergedLine="${fullExpLine}"`);
          continue;
        }
        if (isLang || isSkill || pfxIsEdu || pfxIsAnchor || expRemainder) continue;
      }

      const anchorRemainder = extractAnchorRemainder(line);
      if (anchorRemainder && isExperienceLeakLine(anchorRemainder, newExp)) {
        newExp.push(anchorRemainder);
        log(`[CV-IMPORT:RECLASSIFY-MOVE] education→experience anchorRemainder="${anchorRemainder}"`);
        continue;
      }

      const expLine = normalizeOcrExperienceLeak(line);
      if (isExperienceRoleLeak(expLine) || isExperienceLeakLine(expLine, newExp)) {
        newExp.push(expLine);
        log(`[CV-IMPORT:RECLASSIFY-MOVE] education→experience line="${expLine}"`);
        continue;
      }

      if (isLang)  { newLangs.push(testLine);  continue; }
      if (isSkill) { newSkills.push(testLine); continue; }
      realEdu.push(line);
    }

    sections.education = realEdu;
    if (newExp.length > 0) {
      const existing = new Set((sections.experience || []).map(s => s.toLowerCase().trim()));
      const fresh = newExp.filter(s => !existing.has(s.toLowerCase().trim()));
      if (fresh.length > 0) {
        sections.experience = [...(sections.experience || []), ...fresh];
        log(`[CV-IMPORT:RECLASSIFY-MOVE] education→experience ${fresh.length} lines`);
        changed = true;
      }
    }
    if (newSkills.length > 0) {
      // De-duplicate: don't add lines already present in sections.skills.
      const existing = new Set(skls.map(s => s.toLowerCase().trim()));
      const fresh    = newSkills.filter(s => !existing.has(s.toLowerCase().trim()));
      if (fresh.length > 0) {
        sections.skills = [...skls, ...fresh];
        log(`[CV-IMPORT:RECLASSIFY-MOVE] education→skills ${fresh.length} lines`);
        changed = true;
      }
    }
    if (newLangs.length > 0) {
      const existing = new Set(lngs.map((s: string) => s.toLowerCase().trim()));
      const fresh    = newLangs.filter(s => !existing.has(s.toLowerCase().trim()));
      if (fresh.length > 0) {
        (sections as any).languages = [...lngs, ...fresh];
        log(`[CV-IMPORT:RECLASSIFY-MOVE] education→languages ${fresh.length} lines`);
        changed = true;
      }
    }
  }

  // ---- Hard clamp: education must ONLY contain real education lines --------
  // Applied unconditionally (not gated on count) — any non-education line
  // left in the section after Pass B is discarded.
  {
    const edu = sections.education || [];
    const clamped = edu.filter(l => isEducationLine(l));
    if (clamped.length < edu.length) {
      log(`[CV-IMPORT:EDU-HARD-CLAMP] ${edu.length}→${clamped.length} (kept only institution/year/degree lines)`);
      sections.education = clamped; changed = true;
    }
  }

  // ---- Pass C: full allLines sweep for unclaimed skills / languages -------
  // Catches skill and language lines that the heading-walk sent to
  // collectPersonal (CONTACT section, pre-heading area) or any heading that
  // wasn't a tracked section — Pass B only scans education, so those lines
  // would be permanently lost without this sweep.
  {
    // Helper: extract the matched language word for dedup (language word only,
    // ignoring proficiency tail so "Arabic" and "Arabic native" don't both get added).
    const langWord = (s: string): string => {
      const m = KNOWN_LANGUAGE_RE.exec(
        s.replace(/[():\-–—/|,]/g, ' ').replace(/\s+/g, ' ')
      );
      return m ? m[0].toLowerCase() : '';
    };

    // Build a normalised set of every line already assigned to any section.
    const claimedNorm = new Set<string>();
    for (const key of Object.keys(sections)) {
      for (const line of ((sections as any)[key] as string[] | undefined) || []) {
        claimedNorm.add(line.toLowerCase().trim());
      }
    }

    // Skill dedup: normalize trailing punctuation so "Skill." and "Skill" are the same.
    const normSkill = (s: string) => s.toLowerCase().trim().replace(/[.!?,;:]$/, '');
    const existingSkills = new Set((sections.skills || []).map(normSkill));

    // Language dedup: match by language word (not full string).
    const existingLangWords = new Set(
      ((sections as any).languages || []).map((s: string) => langWord(s))
    );

    // Pre-scan: detect split language lines where the proficiency word appears on
    // the line immediately following the language name (e.g. "Arabic\nnative").
    const extendedLines = [...allLines];
    for (let i = 0; i < allLines.length - 1; i++) {
      const lineA = allLines[i].trim();
      const lineB = allLines[i + 1].trim();
      if (
        KNOWN_LANGUAGE_RE.test(lineA) &&
        !KNOWN_LANGUAGE_RE.test(lineB) &&
        OCR_PROFICIENCY_RE.test(lineB) &&
        lineB.split(/\s+/).length <= 2
      ) {
        extendedLines.push(`${lineA} ${lineB}`); // synthetic combined candidate
      }
    }

    const freshSkills: string[] = [];
    const freshLangs:  string[] = [];

    for (const line of extendedLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const normLine = trimmed.toLowerCase().trim();
      if (claimedNorm.has(normLine)) {
        if (KNOWN_LANGUAGE_RE.test(trimmed)) {
          log(`[CV-IMPORT:LANG-CANDIDATE] line="${trimmed}" matched=false reason=claimed-by-section`);
        }
        continue;
      }
      if (matchAnchorKey(normaliseAnchorHeading(trimmed))) continue;

      // Try to extract sidebar prefix from merged OCR lines before classifying.
      const sidebarPfx = extractOcrSidebarPrefix(trimmed);
      const testLine   = sidebarPfx ?? trimmed;
      const storeAs    = sidebarPfx ?? trimmed;

      // ---- Language candidate ----
      const isLang = looksLikeOcrLanguageLine(testLine);
      const lw     = langWord(testLine);
      if (KNOWN_LANGUAGE_RE.test(testLine)) {
        // Always log lang candidates for diagnostics.
        let reason = 'no-known-language-match';
        if (isLang && lw && existingLangWords.has(lw)) reason = 'duplicate-lang-word';
        else if (isLang) reason = 'matched';
        else if (/\d{4,}/.test(testLine)) reason = 'has-year-digit';
        else if (testLine.split(/\s+/).length > 5) reason = 'too-many-words';
        log(`[CV-IMPORT:LANG-CANDIDATE] line="${trimmed}" testLine="${testLine}" matched=${isLang && lw !== '' && !existingLangWords.has(lw)} reason=${reason}`);
      }
      if (isLang && lw && !existingLangWords.has(lw)) {
        freshLangs.push(storeAs);
        existingLangWords.add(lw);
        claimedNorm.add(normLine);
        continue;
      }

      // ---- Skill candidate ----
      const isSkill = !isLang && looksLikeOcrSkillLine(testLine);
      const ns      = normSkill(storeAs);
      // Log skill candidates that have a reasonable word count but fail.
      if (!isSkill && !isLang && !isEducationLine(trimmed) &&
          trimmed.split(/\s+/).length >= 1 && trimmed.split(/\s+/).length <= 8 &&
          trimmed.length <= 80 && !matchAnchorKey(normaliseAnchorHeading(trimmed))) {
        let reason = 'unknown';
        const t = trimmed.replace(/[.!?,;:]$/, '').trim();
        if (t.length > 60)                                   reason = 'too-long';
        else if (/\d{4,}/.test(t))                           reason = 'has-year-digit';
        else if (SKILL_ACTION_VERB_RE.test(t))               reason = 'action-verb';
        else if (/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length > 5) reason = 'long-sentence';
        else if (t.split(/\s+/).length > 6)                  reason = 'too-many-words';
        else if (looksLikeOcrLanguageLine(t))                reason = 'is-language';
        else if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(t))    reason = 'email';
        else if (/https?:\/\//i.test(t))                     reason = 'url';
        log(`[CV-IMPORT:SKILL-CANDIDATE] line="${trimmed}" matched=false reason=${reason}`);
      }
      if (isSkill && !existingSkills.has(ns)) {
        freshSkills.push(storeAs);
        existingSkills.add(ns);
        claimedNorm.add(normLine);
        log(`[CV-IMPORT:SKILL-CANDIDATE] line="${trimmed}" storeAs="${storeAs}" matched=true`);
      }
    }

    // Language rescue: scan experience/skills/certifications for language lines that
    // were claimed by the wrong section due to reversed OCR column order.
    for (const key of ['experience', 'skills', 'certifications'] as const) {
      const arr = (sections as any)[key] as string[] | undefined;
      if (!arr?.length) continue;
      const kept: string[] = [];
      for (const line of arr) {
        const trimmed = line.trim();
        const lw = langWord(trimmed);
        if (looksLikeOcrLanguageLine(trimmed) && lw && !existingLangWords.has(lw)) {
          freshLangs.push(trimmed);
          existingLangWords.add(lw);
          log(`[CV-IMPORT:LANG-CANDIDATE] line="${trimmed}" matched=true reason=rescued-from-${key}`);
          changed = true;
        } else {
          kept.push(line);
        }
      }
      (sections as any)[key] = kept;
    }

    if (freshLangs.length > 0) {
      (sections as any).languages = [...((sections as any).languages || []), ...freshLangs];
      changed = true;
    }
    if (freshSkills.length > 0) {
      sections.skills = [...(sections.skills || []), ...freshSkills];
      changed = true;
    }
    log(`[CV-IMPORT:PASS-C-DONE] recovered skills=${freshSkills.length} languages=${freshLangs.length}`);
  }

  log(
    `[CV-IMPORT:RECLASSIFY-DONE] educationLen=${sections.education?.length ?? 0} ` +
    `skillsLen=${sections.skills?.length ?? 0} ` +
    `languagesLen=${(sections as any).languages?.length ?? 0}`
  );

  return changed;
}

// =============================================================================
//  Phase 42.6 — fallback heuristics when no headings detected.
//
//  Scans every line for known patterns:
//    - lines with a "YYYY – YYYY" or "Month YYYY – Present" pattern → experience
//    - lines containing degree keywords (BSc / MSc / PhD / Bachelor / Master) → education
//    - lines with comma/pipe-separated tokens (≥ 3 tokens, each ≤ 25 chars) → skills
//    - lines with certification keywords (Certified, Certificate, License) → certifications
// =============================================================================

const DATE_RANGE_RE = /(\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?\d{4}\s*[-–—to]+\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:\d{4}|Present|Current|Now)/i;
const DEGREE_RE     = /\b(B\.?Sc\.?|M\.?Sc\.?|Ph\.?D\.?|MBA|B\.?A\.?|M\.?A\.?|B\.?Eng\.?|M\.?Eng\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate|Doctoral)\b/i;
const CERT_RE       = /\b(Certified|Certificate|Certification|License|Licensed|Accredit(?:ed|ation))\b/i;
const SKILL_CLUSTER_RE = /(?:[\w.+#-]{1,25}(?:\s*[,|·•]\s*)){2,}[\w.+#-]{1,25}/;
const BULLET_PREFIX_RE = /^\s*[•●◦▪‣–\-*]\s+/;

function fallbackExtract(lines: string[]) {
  const experience:     string[] = [];
  const education:      string[] = [];
  const skills:         string[] = [];
  const certifications: string[] = [];
  let   summary:        string   = '';

  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] || '').trim();
    if (!raw) continue;
    const stripped = raw.replace(BULLET_PREFIX_RE, '').trim();

    if (DATE_RANGE_RE.test(stripped)) {
      experience.push(stripped);
      // Grab the next 1-3 bullet-like lines as bullets for this role.
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = (lines[j] || '').trim();
        if (!next) break;
        if (DATE_RANGE_RE.test(next)) break;     // next role
        if (BULLET_PREFIX_RE.test(next) || /^[A-Z]/.test(next)) {
          experience.push('  - ' + next.replace(BULLET_PREFIX_RE, '').trim());
        }
      }
      continue;
    }

    if (DEGREE_RE.test(stripped) && stripped.length < 200) {
      education.push(stripped);
      continue;
    }

    if (CERT_RE.test(stripped) && stripped.length < 160) {
      certifications.push(stripped);
      continue;
    }

    if (SKILL_CLUSTER_RE.test(stripped) && stripped.length < 300) {
      skills.push(stripped);
      continue;
    }
  }

  // Summary fallback — first long paragraph if nothing else picked it up.
  if (!summary) {
    for (const line of lines) {
      const t = line.trim();
      if (t.length > 120 && t.length < 600 && !DATE_RANGE_RE.test(t) && !DEGREE_RE.test(t)) {
        summary = t;
        break;
      }
    }
  }

  return { experience, education, skills, certifications, summary };
}

// =============================================================================
//  Semantic preservation helpers
// =============================================================================

const SENTENCE_LINE_RE = /\b[a-z]{3,}\b.*[.!?]?$/i;
const METRIC_RE = /(?:\$|€|£)?\b\d+(?:[.,]\d+)?\s?(?:%|k|m|bn|users?|clients?|customers?|projects?|teams?|revenue|sales|hours?|days?|weeks?|months?|years?|markets?|countries?|pages?|requests?|apis?)\b/i;
const TECH_WORDS = [
  'html', 'css', 'javascript', 'typescript', 'react', 'next.js', 'nextjs', 'vue', 'angular',
  'node.js', 'nodejs', 'express', 'nestjs', 'python', 'django', 'flask', 'java', 'spring',
  'php', 'laravel', 'ruby', 'rails', 'swift', 'kotlin', 'sql', 'postgresql', 'mysql',
  'mongodb', 'redis', 'graphql', 'rest', 'restful', 'api', 'aws', 'azure', 'gcp',
  'docker', 'kubernetes', 'git', 'github', 'figma', 'tailwind', 'bootstrap',
];

function preserveExperienceSemantics(items: any[]): any[] {
  return (items || []).map((item, index) => {
    const itemBullets = Array.isArray(item.bullets) ? item.bullets : splitSemanticLines(item.bullets);
    const itemAchievements = Array.isArray(item.achievements) ? item.achievements : splitSemanticLines(item.achievements);
    const itemTechnologies = Array.isArray(item.technologies) ? item.technologies : splitSemanticLines(item.technologies);
    const itemMetrics = Array.isArray(item.metrics) ? item.metrics : splitSemanticLines(item.metrics);
    const itemProjects = Array.isArray(item.projects) ? item.projects : splitSemanticLines(item.projects);
    const sourceLines = [
      ...(Array.isArray(item.description) ? item.description : splitSemanticLines(item.description)),
      ...(item.rawText ? splitSemanticLines(item.rawText) : []),
      ...itemBullets,
      ...itemAchievements,
      ...itemProjects,
    ].map(cleanSemanticLine).filter(Boolean);

    const bullets = uniquePreserveOrder([
      ...itemBullets,
      ...sourceLines.filter((line) => isBulletLikeLine(line)),
    ]);
    const achievements = uniquePreserveOrder([
      ...itemAchievements,
      ...bullets.filter((line) => METRIC_RE.test(line) || /^(achieved|improved|increased|reduced|launched|delivered|led|built|created|optimized|automated)\b/i.test(line)),
    ]);
    const metrics = uniquePreserveOrder([
      ...itemMetrics,
      ...sourceLines.filter((line) => METRIC_RE.test(line)),
    ]);
    const technologies = uniquePreserveOrder([
      ...itemTechnologies,
      ...extractTechnologies(sourceLines.join(' ')),
    ]);
    const projects = uniquePreserveOrder([
      ...itemProjects,
      ...sourceLines.filter((line) => /\b(project|platform|dashboard|website|application|app|system|portal)\b/i.test(line) && !bullets.includes(line)),
    ]);
    const descriptionLines = uniquePreserveOrder([
      ...splitSemanticLines(item.description),
      ...sourceLines.filter((line) => !bullets.includes(line) && SENTENCE_LINE_RE.test(line) && !isLikelyTitleLine(line)),
    ]);

    return {
      ...item,
      id: item.id || `exp-${index}`,
      role: item.role || '',
      company: item.company || '',
      start: item.start || '',
      end: item.end || '',
      description: descriptionLines.join('\n'),
      bullets,
      achievements,
      technologies,
      metrics,
      projects,
      rawText: uniquePreserveOrder([
        ...splitSemanticLines(item.rawText),
        item.role,
        item.company,
        item.location,
        ...sourceLines,
      ]).join('\n'),
    };
  });
}

function buildSemanticImportMetrics(allLines: string[], payload: Partial<CvProfileDto>) {
  const originalLineCount = (allLines || []).filter((line) => line.trim()).length;
  const originalBulletCount = (allLines || []).filter((line) => isBulletLikeLine(line)).length;
  const originalParagraphCount = countParagraphLikeLines(allLines || []);
  const experience = ((payload.experience as any[]) || []);
  // Count bullets broadly: experience.bullets + achievements + bullet-like summary lines.
  // The original count covers the whole document, so the preserved count must too.
  const preservedBulletCount = experience.reduce((sum, exp) => {
    return sum + (exp.bullets || []).length + (exp.achievements || []).length;
  }, 0) + (payload.personal?.summary
    ? splitSemanticLines(payload.personal.summary).filter(isBulletLikeLine).length
    : 0);
  const preservedParagraphCount = experience.reduce((sum, exp) => sum + countParagraphLikeLines(splitSemanticLines(exp.description)), 0) +
    (payload.personal?.summary ? countParagraphLikeLines(splitSemanticLines(payload.personal.summary)) : 0);
  const preservedExperienceTextLines = experience.reduce((sum, exp) => {
    return sum + uniquePreserveOrder([
      exp.role, exp.company, exp.location, exp.description,
      ...(exp.bullets || []), ...(exp.achievements || []), ...(exp.technologies || []),
      ...(exp.metrics || []), ...(exp.projects || []),
    ]).filter(Boolean).length;
  }, 0);
  const droppedLineCount = Math.max(0, originalBulletCount - preservedBulletCount);
  const semanticConfidenceScore = Math.max(0, Math.min(100, Math.round(
    55 +
    Math.min(25, preservedBulletCount * 4) +
    Math.min(10, preservedParagraphCount * 3) +
    Math.min(10, preservedExperienceTextLines * 0.8) -
    Math.min(30, droppedLineCount * 8)
  )));
  return {
    originalLineCount,
    originalBulletCount,
    preservedBulletCount,
    originalParagraphCount,
    preservedParagraphCount,
    preservedExperienceTextLines,
    droppedLineCount,
    semanticConfidenceScore,
  };
}

function validateSemanticImport(metrics: ReturnType<typeof buildSemanticImportMetrics>, payload: Partial<CvProfileDto>) {
  const warnings: string[] = [];
  const failures: string[] = [];
  const experience = ((payload.experience as any[]) || []);
  const education = ((payload.education as any[]) || []);
  const hasExperienceDetail = experience.some((exp) =>
    !!exp.description ||
    ((exp.bullets || []).length > 0) ||
    ((exp.achievements || []).length > 0) ||
    ((exp.rawText || '').split(/\n+/).filter((line: string) => isBulletLikeLine(line)).length > 0)
  );
  if (metrics.originalBulletCount >= 3 && metrics.preservedBulletCount === 0) {
    const message = `${metrics.originalBulletCount} achievement bullet(s) from the source were not mapped to experience entries.`;
    warnings.push(`${message} Import was stopped to prevent data loss.`);
    failures.push(message);
  } else if (metrics.originalBulletCount >= 3 && metrics.droppedLineCount > 0) {
    warnings.push(`${metrics.droppedLineCount} source bullet(s) may need review after import.`);
  }
  if (experience.length > 0 && metrics.originalLineCount >= 12 && !hasExperienceDetail) {
    const message = 'Experience entries have no descriptions or bullets.';
    warnings.push(`${message} Import was stopped to prevent semantic collapse.`);
    failures.push(message);
  }
  if (payload.personal?.summary && payload.personal.summary.trim().split(/\s+/).length < 6 && metrics.originalParagraphCount > 0) {
    const message = 'Summary looks very short compared with the imported document.';
    warnings.push(message);
    failures.push(message);
  }
  if (metrics.originalLineCount >= 18 && experience.length === 0) {
    const message = 'No experience entries were preserved from a CV-like document.';
    warnings.push(message);
    failures.push(message);
  }
  if (metrics.originalLineCount >= 18 && education.length === 0 && /school|university|college|academy|bachelor|master|diploma|degree|education/i.test(JSON.stringify(payload))) {
    const message = 'Education content appears present but no education entries were preserved.';
    warnings.push(message);
    failures.push(message);
  }
  return { warnings, failures };
}

function splitSemanticLines(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(splitSemanticLines);
  return String(value)
    .split(/\r?\n+/)
    .map(cleanSemanticLine)
    .filter(Boolean);
}

function cleanSemanticLine(value: any): string {
  return String(value || '').replace(/^[•·\-–—*+►◆▪▸▶\s]+/, '').replace(/\s+/g, ' ').trim();
}

function uniquePreserveOrder(values: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values || []) {
    const cleaned = cleanSemanticLine(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
  }
  return out;
}

function isBulletLikeLine(line: string): boolean {
  const cleaned = cleanSemanticLine(line);
  if (!cleaned) return false;
  return /^[•·\-–—*+►◆▪▸▶]\s/.test(String(line || '').trim()) ||
    /^(achiev|analys|analyz|assist|automat|build|built|collaborat|communicat|complet|conduct|coordinat|creat|deliver|deploy|design|develop|ensur|establish|evaluat|execut|facilitat|generat|handl|implement|improv|increas|inspect|integrat|launch|lead|led|leverag|maintain|manag|mentor|monitor|negotiat|optimiz|organiz|oversaw|oversee|perform|prepar|process|produc|provid|reduc|research|resolv|review|spearhead|supervis|support|train|troubleshoot|troubleshot|utiliz|work)\w*\b/i.test(cleaned);
}

function countParagraphLikeLines(lines: string[]): number {
  return (lines || []).filter((line) => cleanSemanticLine(line).split(/\s+/).length >= 8).length;
}

function isLikelyTitleLine(line: string): boolean {
  const cleaned = cleanSemanticLine(line);
  if (!cleaned) return false;
  if (DATE_RANGE_RE.test(cleaned)) return true;
  if (cleaned.split(/\s+/).length <= 5 && !/[.!?]$/.test(cleaned) && !isBulletLikeLine(cleaned)) return true;
  return false;
}

function extractTechnologies(text: string): string[] {
  const lower = String(text || '').toLowerCase();
  return TECH_WORDS.filter((tech) => {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  }).map((tech) => tech === 'nextjs' ? 'Next.js' : tech === 'nodejs' ? 'Node.js' : tech.toUpperCase() === tech ? tech : tech.replace(/\b\w/g, (c) => c.toUpperCase()));
}

// =============================================================================
//  Existing helpers
// =============================================================================

function textFor(node: any): string {
  if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'quote') return node.text || '';
  if (node.type === 'list' && Array.isArray(node.items)) {
    return node.items.map((i: any) => typeof i === 'string' ? i : i.text).join('\n');
  }
  return '';
}

function fileSourceFor(filename: string): 'linkedin'|'docx'|'pdf' {
  const f = (filename || '').toLowerCase();
  if (f.endsWith('.pdf'))  return 'pdf';
  if (f.endsWith('.docx') || f.endsWith('.doc')) return 'docx';
  return 'docx';
}

function mapLinesToSection(key: keyof CvProfileDto, lines: string[]): any[] {
  switch (key) {
    case 'experience': {
      // =======================================================================
      //  State-machine experience parser.
      //
      //  States:
      //    HEADER  — reading role / company / date / location lines
      //    BODY    — reading bullet points and descriptions
      //
      //  The parser does two pre-passes before the state machine:
      //    1. Join hyphen-broken lines   ("sys-\ntems" → "systems")
      //    2. Join lowercase-continuation lines ("...JavaScript\nframeworks." →
      //       "...JavaScript frameworks.") so multi-line bullets are intact.
      //
      //  All lines that don't match known patterns are preserved in `rawLines`
      //  so nothing is silently discarded.
      // =======================================================================

      const pureDateRe = /^(\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4})\s*[-–—to]+\s*(\d{4}|present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4})\s*(?:[,.]?\s*(?:full[ -]?time|part[ -]?time|remote|freelance|contract|intern(?:ship)?))?$/i;
      const inlineDateRe = /(\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4})\s*[-–—to]+\s*(\d{4}|present|current|now|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{4})/i;
      const bulletVerbRe = /^(achiev|analys|analyz|assist|automat|build|built|collaborat|communicat|complet|conduct|coordinat|creat|deliver|deploy|design|develop|ensur|establish|evaluat|execut|facilitat|generat|handl|implement|improv|increas|inspect|integrat|launch|lead|led|leverag|maintain|manag|mentor|monitor|negotiat|optimiz|organiz|oversaw|oversee|perform|plan|prepar|process|produc|provid|reduc|research|resolv|review|respons|spearhead|supervis|support|train|troubleshoot|troubleshot|utiliz|work)\w*\b/i;
      const EMPLOY_RE = /\b(freelance[r]?|contractor|contract|part[\s-]time|full[\s-]time|remote|intern(?:ship)?|consultant|self[\s-]employed|temporary|temp)\b/i;

      const cleanBullet = (s: string) => s.replace(/^[•·\-–—*+►◆▪▸▶\s]+/, '').trim();

      // Strip OCR/emoji map-pin prefixes ("Q jordan" → "jordan", "📍 Amman" → "Amman").
      const stripLocPrefix = (s: string) =>
        s.replace(/^📍\s*/u, '')
         .replace(/^[Q⌖◈]\s+/, '')
         .trim();

      // A line looks like a location ("City, Country") — not a role like "Dev, freelancer".
      const isLocation = (s: string): boolean => {
        const stripped = stripLocPrefix(s);
        if (!stripped || /\d/.test(stripped)) return false;
        if (stripped.length < s.length) return true;         // had a prefix → location
        if (EMPLOY_RE.test(stripped)) return false;          // "freelancer" → role
        if (bulletVerbRe.test(cleanBullet(stripped))) return false; // action verb → bullet
        if (!stripped.includes(',')) return false;
        const parts = stripped.split(',').map((p) => p.trim());
        return parts.length >= 2 && parts.length <= 3 && parts.every((p) => {
          const wc = p.split(/\s+/).filter(Boolean).length;
          return wc >= 1 && wc <= 3 && !EMPLOY_RE.test(p);
        });
      };

      // ── Pre-pass 1: join hyphen-broken lines ──────────────────────────────
      const pass1: string[] = [];
      for (const raw of lines) {
        if (pass1.length > 0 && pass1[pass1.length - 1].trimEnd().endsWith('-')) {
          const prev = pass1[pass1.length - 1].trimEnd();
          pass1[pass1.length - 1] = prev.slice(0, -1) + raw.trim();
        } else {
          pass1.push(raw);
        }
      }

      // ── Pre-pass 2: join plain lowercase-continuation lines ───────────────
      // "...using HTML, CSS, and JavaScript\nframeworks." → one line.
      // Only join when previous line has no terminal punctuation and current
      // starts lowercase — strong signal of PDF text-wrap, not a new sentence.
      const processed: string[] = [];
      for (const raw of pass1) {
        const t = raw.trim();
        if (!t) { processed.push(raw); continue; }
        if (
          processed.length > 0 &&
          /^[a-z]/.test(t) &&
          !pureDateRe.test(t)
        ) {
          const prev = processed[processed.length - 1].trim();
          if (prev && /[a-zA-Z,]$/.test(prev) && !/[.!?;]\s*$/.test(prev)) {
            processed[processed.length - 1] = prev + ' ' + t;
            continue;
          }
        }
        processed.push(raw);
      }

      // ── State machine ─────────────────────────────────────────────────────
      type ParseState = 'HEADER' | 'BODY';
      const out: any[] = [];
      let cur: any = null;
      let state: ParseState = 'HEADER';

      const newEntry = (role = ''): any => {
        const e: any = { id: `exp-${out.length}`, role, company: '', location: '', start: '', end: '', bullets: [], rawLines: [] };
        out.push(e);
        cur = e;
        state = 'HEADER';
        return e;
      };

      const applyDate = (entry: any, m: RegExpMatchArray) => {
        if (!entry.start) entry.start = m[1];
        if (!entry.end)   entry.end   = /present|current|now/i.test(m[2]) ? '' : m[2];
      };

      for (let i = 0; i < processed.length; i++) {
        const l       = processed[i];
        const trimmed = l.trim();
        if (!trimmed) continue;

        cur?.rawLines?.push(trimmed);

        // ── Known section headings that leaked in (column artifacts) ─────────
        const _ng = normaliseHeading(trimmed);
        if (SECTION_HEADINGS[_ng] || SUMMARY_HEADINGS.has(_ng) || PERSONAL_HEADINGS.has(_ng)) continue;

        // ── Date line ─────────────────────────────────────────────────────────
        const dateM = trimmed.match(pureDateRe);
        if (dateM) {
          if (!cur) newEntry();
          if (state === 'BODY' && cur.start) {
            // Second date line while already in bullet body → next role.
            // Back-fill: if the immediately preceding non-empty processed line was
            // a role-title candidate (not a bullet or date), move it to the new entry.
            newEntry();
          }
          applyDate(cur, dateM);
          continue;
        }

        // ── DOCX indented bullet ("  - …") ────────────────────────────────────
        if (l.startsWith('  - ')) {
          if (!cur) newEntry();
          cur.bullets.push(l.slice(4).trim());
          state = 'BODY';
          continue;
        }

        // ── Explicit bullet character or "- text" ─────────────────────────────
        if (/^[•·►◆▪▸▶*]\s/.test(trimmed) || /^-\s+\S/.test(trimmed)) {
          if (!cur) newEntry();
          cur.bullets.push(cleanBullet(trimmed));
          state = 'BODY';
          continue;
        }

        // ── DOCX role — Company (em-dash or @) ────────────────────────────────
        const dashM = trimmed.match(/^(.+?)\s+[—@]\s+(.+?)(?:\s*\((.+?)\))?$/);
        if (dashM) {
          newEntry(dashM[1].trim());
          cur.company = dashM[2].trim().replace(/\s*\(.+\)$/, '');
          const dr = trimmed.match(inlineDateRe);
          if (dr) applyDate(cur, dr as any);
          continue;
        }

        // ── Location line ─────────────────────────────────────────────────────
        if (isLocation(trimmed)) {
          if (!cur) newEntry();
          if (!cur.location) cur.location = stripLocPrefix(trimmed);
          continue;
        }

        // ── Action-verb bullet ────────────────────────────────────────────────
        if (bulletVerbRe.test(cleanBullet(trimmed))) {
          if (!cur) newEntry();
          cur.bullets.push(cleanBullet(trimmed));
          state = 'BODY';
          continue;
        }

        // ── Continuation: starts lowercase while in BODY ──────────────────────
        if (state === 'BODY' && cur && cur.bullets.length > 0 && /^[a-z]/.test(trimmed)) {
          cur.bullets[cur.bullets.length - 1] += ' ' + trimmed;
          continue;
        }

        // ── Remaining text: role title, company, or unknown ───────────────────
        // Look one line ahead: if the NEXT non-empty line is a date, this is a
        // new role title (extremely reliable signal).
        let nextNonEmpty: string | null = null;
        for (let j = i + 1; j < processed.length; j++) {
          const t = processed[j].trim();
          if (t) { nextNonEmpty = t; break; }
        }
        const nextIsDate = !!nextNonEmpty && pureDateRe.test(nextNonEmpty);

        if (!cur) {
          // Very first content line
          newEntry(trimmed);
          const dr = trimmed.match(inlineDateRe);
          if (dr) { cur.role = trimmed.replace(dr[0], '').trim().replace(/[-–—,.\s]+$/, '').trim() || trimmed; applyDate(cur, dr as any); }
          continue;
        }

        if (state === 'HEADER') {
          if (!cur.role) {
            cur.role = trimmed;
            const dr = trimmed.match(inlineDateRe);
            if (dr) { cur.role = trimmed.replace(dr[0], '').trim().replace(/[-–—,.\s]+$/, '').trim() || trimmed; applyDate(cur, dr as any); }
          } else if (!cur.company && !cur.start && trimmed.length < 60 && !/^\d/.test(trimmed)) {
            // Company on separate line (no date seen yet, short non-digit line)
            cur.company = trimmed;
          } else if (nextIsDate || EMPLOY_RE.test(trimmed)) {
            // Another title before a date, or employment-type word → new role
            newEntry(trimmed);
          } else {
            // Unknown line in header — preserve as company if empty, else discard to rawLines
            if (!cur.company) cur.company = trimmed;
          }
        } else {
          // state === 'BODY'
          if (nextIsDate || EMPLOY_RE.test(trimmed)) {
            // New role title detected via look-ahead
            newEntry(trimmed);
          } else if (trimmed.split(/\s+/).length >= 4 && !isLocation(trimmed)) {
            // Sentence-length line in body → treat as a bullet (no action verb but still content)
            cur.bullets.push(cleanBullet(trimmed));
          }
          // Short unknown line in body → ignore (likely an artefact or heading fragment)
        }
      }

      return out
        .map((e: any) => ({
          ...e,
          rawText: [e.role, e.company, e.location, ...(e.bullets || [])].filter(Boolean).join('\n'),
        }))
        .filter((e: any) => e.role || e.company || (e.bullets || []).length > 0 || e.description);
    }
    case 'education': {
      // Phase 43.3 — group education lines into records.
      // A bare-year or date-range line is metadata for the preceding institution
      // line, not a separate education record. If there is only ONE institution-
      // keyword line across all lines, merge everything into a single record
      // (common for single-school CVs: "ERJAN HIGH SCHOOL" + "2008-2009").
      const isDateOnlyLine = (l: string) =>
        /^\d{4}([-–—]\d{4})?\s*$/.test(l.trim()) || DATE_RANGE_RE.test(l.trim());
      const hasInstitutionKw = (l: string) =>
        INSTITUTION_KEYWORDS_RE.test(l) || DEGREE_WORD_RE.test(l) || DEGREE_RE.test(l);

      const institutionCount = lines.filter(hasInstitutionKw).length;
      let groups: string[][];
      if (institutionCount <= 1) {
        // All lines for one institution → single group.
        groups = lines.length > 0 ? [lines.slice()] : [];
      } else {
        // Multiple institutions: date-only lines attach to preceding group.
        groups = [];
        for (const l of lines) {
          if (isDateOnlyLine(l) && groups.length > 0) {
            groups[groups.length - 1].push(l);
          } else {
            groups.push([l]);
          }
        }
      }

      return groups.map((grp, i) => {
        const joined = grp.join(' ');
        const dm = joined.match(/(\d{4})\s*[-–—to]+\s*(\d{4}|Present)/i);
        let degree: string | undefined;
        for (const l of grp) {
          if (/ph\.?d|doctor(?:ate|al)/i.test(l)) { degree = 'PhD'; break; }
          if (/master|mba|m\.?sc|m\.?a\b|m\.?eng/i.test(l)) { degree = 'Master'; break; }
          if (/bachelor|b\.?sc|b\.?a\b|b\.?eng/i.test(l)) { degree = 'Bachelor'; break; }
          if (/diploma|associate|h\.?n\.?d|foundation/i.test(l)) { degree = 'Diploma'; break; }
          if (/high\s*school|secondary\s*school|grammar\s*school|lyc[ée]e|gymnasium|preparatory/i.test(l)) { degree = 'High School'; break; }
          if (/university|college|institute|academy/i.test(l)) { degree = 'University'; break; }
        }
        const institution = joined
          .replace(/\(.+?\)/g, '')
          .replace(DATE_RANGE_RE, '')
          .replace(/\b\d{4}\b/g, '')
          .trim()
          .replace(/[,;\s]+$/, '');
        return {
          id: `edu-${i}`,
          institution,
          degree,
          start: dm?.[1] || '',
          end: dm?.[2] === 'Present' ? '' : (dm?.[2] || ''),
          honors: [],
        };
      });
    }
    case 'skills': {
      const cleanSkill = (s: string) =>
        s.replace(/^[«»•*+\-–—\s]+/, '').replace(/[.!?,;:]+$/, '').trim();
      return lines.flatMap((l) => l.split(/[,;•·|]/).map((s) => cleanSkill(s)).filter(Boolean))
                  .filter((s) => s.length > 1 && s.length < 60)
                  .map((name, i) => ({ id: `skill-${i}`, name, category: 'technical' as const }));
    }
    case 'languages': {
      const profRe = /\b(native|fluent|proficient|conversational|basic|basics|intermediate|advanced|beginner|bilingual|elementary)\b/i;
      const cleanLang = (raw: string) => {
        // Strip leading OCR bullet chars (« * • + - –)
        let s = raw.replace(/^[«»•*+\-–—\s]+/, '').trim();
        // Remove parenthetical proficiency tail or trailing sentence junk
        // Keep only up to the first sentence-ending fragment after the language word
        const kw = /\b(arabic|english|french|spanish|german|turkish|portuguese|italian|dutch|russian|chinese|mandarin|japanese|korean|hebrew|persian|urdu|hindi|indonesian|malay|thai|vietnamese|polish|czech|hungarian|romanian|greek|swedish|danish|norwegian|finnish|bulgarian|serbian|croatian|ukrainian|catalan|afrikaans|swahili|tagalog|bahasa)\b/i.exec(s);
        if (kw) {
          // Extract up to ~30 chars after the language keyword (covers "English (Fluent)")
          s = s.slice(kw.index, kw.index + 30).replace(/\s+[a-z].{10,}$/, '').trim();
        }
        return s.replace(/[.!?,;:]+$/, '').trim();
      };
      const proficiencyOf = (raw: string): string => {
        const m = profRe.exec(raw);
        if (!m) return 'fluent';
        const p = m[1].toLowerCase();
        if (p === 'native') return 'native';
        if (p === 'basic' || p === 'basics' || p === 'beginner' || p === 'elementary') return 'basic';
        if (p === 'intermediate' || p === 'conversational') return 'conversational';
        if (p === 'advanced' || p === 'proficient') return 'advanced';
        if (p === 'bilingual') return 'native';
        return 'fluent';
      };
      return lines.flatMap((l) => l.split(/[,;]/).map((s) => s.trim()).filter(Boolean))
                  .map((raw, i) => ({
                    id: `lang-${i}`,
                    name: cleanLang(raw),
                    proficiency: proficiencyOf(raw) as any,
                  }));
    }
    case 'projects':
      return lines.map((l, i) => ({ id: `proj-${i}`, name: l, description: '' }));
    case 'certifications':
      return lines.map((l, i) => ({ id: `cert-${i}`, name: l, issuer: '' }));
    case 'awards':
      return lines.map((l, i) => ({ id: `awd-${i}`, title: l }));
    case 'publications':
      return lines.map((l, i) => ({ id: `pub-${i}`, title: l }));
    case 'references':
      return lines.map((l, i) => ({ id: `ref-${i}`, name: l }));
    default:
      return [];
  }
}
