import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// =============================================================================
//  SafeContentEnhancementService
// =============================================================================
//  A safe, structure-preserving, idempotent content enhancement engine.
//
//  Design rules:
//    1. NEVER destroy paragraphs, headings, lists, tables or any HTML.
//    2. NEVER convert prose into bullet lists.
//    3. NEVER replace common words with corporate jargon (use → utilize, etc.).
//    4. NEVER touch URLs, emails, decimals, version numbers, abbreviations.
//    5. Pipeline MUST be idempotent: running enhance N times == running once.
//    6. Pipeline MUST be content-only: layout/template/pagination is untouched.
//    7. Pipeline MUST validate semantic integrity post-run and rollback on drift.
//    8. Quality scoring MUST measure real signals — never reward structural change.
// =============================================================================

// -----------------------------------------------------------------------------
//  Public types
// -----------------------------------------------------------------------------

export type Tone =
  | 'neutral'
  | 'business'
  | 'executive'
  | 'formal'
  | 'academic'
  | 'persuasive'
  | 'technical'
  | 'friendly';

export const VALID_TONES: readonly Tone[] = [
  'neutral', 'business', 'executive', 'formal',
  'academic', 'persuasive', 'technical', 'friendly',
] as const;

export interface EnhancementOptions {
  /** Apply conservative grammar, spelling, punctuation, and whitespace fixes */
  fixGrammar?: boolean;
  /** Simplify wordy phrases, remove redundancies — never replace with jargon */
  improveClarity?: boolean;
  /** Tone mode. If unknown / invalid, falls back to neutral (no-op) */
  tone?: Tone;

  // ---- Legacy aliases (mapped, never destructive) -------------------------
  /** Legacy alias of improveClarity */
  improveWriting?: boolean;
  // The following flags from the previous destructive engine are intentionally
  // ignored — they are kept here only so existing call sites do not break.
  restructure?: boolean;
  expand?: boolean;
  shorten?: boolean;
  professionalize?: boolean;
  makeEngaging?: boolean;
}

export interface ChangeEntry {
  type:
    | 'spelling'
    | 'grammar'
    | 'punctuation'
    | 'capitalization'
    | 'whitespace'
    | 'clarity'
    | 'redundancy'
    | 'tone';
  description: string;
  before: string;
  after: string;
  count: number;
}

export interface EnhancementResult {
  originalContent: string;
  enhancedContent: string;
  changes: ChangeEntry[];
  qualityBefore: number;
  qualityAfter: number;
  improvement: number;
  rolledBack: boolean;
  rollbackReason?: string;
  inputFormat: 'html' | 'text';
}

// -----------------------------------------------------------------------------
//  Internal types
// -----------------------------------------------------------------------------

type Rule = {
  pattern: RegExp;
  replacement: string | ((substring: string, ...args: any[]) => string);
  description: string;
  type: ChangeEntry['type'];
};

interface ProcessingContext {
  recordChange: (entry: ChangeEntry) => void;
}

// -----------------------------------------------------------------------------
//  Token protector — masks URLs, emails, decimals, abbreviations etc. so the
//  rule engine never touches them. Uses control chars unlikely to appear in
//  user text so the placeholder regex cannot collide with prose.
// -----------------------------------------------------------------------------

const PROTECT_OPEN  = 'P';   // SOH + P
const PROTECT_CLOSE = '';    // STX

const PROTECTED_PATTERNS: RegExp[] = [
  // URLs (http/https/ftp/www)
  /\b(?:https?|ftp):\/\/[^\s<>"']+/gi,
  /\bwww\.[^\s<>"']+/gi,
  // Email addresses
  /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/gi,
  // File names with common extensions
  /\b[\w.-]+\.(?:pdf|docx?|xlsx?|pptx?|png|jpe?g|gif|svg|webp|html?|css|json|csv|md|tsx?|jsx?|py|java|rb|go|rs|toml|yaml|yml|xml|sql|sh|env|lock)\b/gi,
  // Version numbers (v1.2.3, 1.2.3, etc.)
  /\bv?\d+(?:\.\d+){1,}\b/gi,
  // Money & decimals
  /\$\d+(?:[.,]\d+)*[KkMmBb]?\b/g,
  /\b\d+(?:\.\d+)+\b/g,
  // Percentages and units that look like sentences
  /\b\d+(?:\.\d+)?%/g,
  // Title abbreviations with trailing period
  /\b(?:Dr|Mr|Mrs|Ms|Mx|Prof|Sr|Jr|St|Ave|Rd|Blvd|Inc|Ltd|Corp|Co|Capt|Lt|Gen|Sgt|Sen|Rep|Hon|Rev|Fr|Bro|Sis|Hon|Maj|Col)\./g,
  // Country / org abbreviations
  /\b(?:U\.S\.A|U\.S|U\.K|E\.U|N\.A\.T\.O|U\.N|D\.C)\.?/g,
  // Latin & common abbreviations
  /\b(?:e\.g|i\.e|etc|vs|cf|al|et|No|Vol|pp|p\.s|a\.m|p\.m)\./gi,
  // Degrees
  /\b(?:Ph\.D|M\.D|B\.A|M\.A|B\.S|M\.S|Ed\.D|J\.D|L\.L\.B|D\.D\.S|D\.V\.M)\.?/g,
  // Quarter / month abbreviations attached to numbers (Q1, FY2024)
  /\b(?:Q[1-4]|FY|H[12])\d{0,4}\b/g,
];

class TokenProtector {
  private map = new Map<string, string>();
  private counter = 0;

  protect(text: string): string {
    let working = text;
    for (const pattern of PROTECTED_PATTERNS) {
      working = working.replace(pattern, (match) => {
        const key = `${PROTECT_OPEN}${this.counter++}${PROTECT_CLOSE}`;
        this.map.set(key, match);
        return key;
      });
    }
    return working;
  }

  restore(text: string): string {
    if (this.map.size === 0) return text;
    let working = text;
    // Restore by exact substring (placeholders are unique control-char tokens)
    for (const [key, original] of this.map) {
      if (working.includes(key)) {
        working = working.split(key).join(original);
      }
    }
    return working;
  }
}

// -----------------------------------------------------------------------------
//  Rule sets — every rule is wrong-form → right-form, hence idempotent.
// -----------------------------------------------------------------------------

const SPELLING_RULES: Rule[] = [
  { pattern: /\brecieve\b/gi,      replacement: 'receive',     description: 'Fixed spelling: recieve → receive',         type: 'spelling' },
  { pattern: /\brecieved\b/gi,     replacement: 'received',    description: 'Fixed spelling: recieved → received',       type: 'spelling' },
  { pattern: /\brecieving\b/gi,    replacement: 'receiving',   description: 'Fixed spelling: recieving → receiving',     type: 'spelling' },
  { pattern: /\bbeleive\b/gi,      replacement: 'believe',     description: 'Fixed spelling: beleive → believe',         type: 'spelling' },
  { pattern: /\bbeleived\b/gi,     replacement: 'believed',    description: 'Fixed spelling: beleived → believed',       type: 'spelling' },
  { pattern: /\bocurred\b/gi,      replacement: 'occurred',    description: 'Fixed spelling: ocurred → occurred',        type: 'spelling' },
  { pattern: /\boccured\b/gi,      replacement: 'occurred',    description: 'Fixed spelling: occured → occurred',        type: 'spelling' },
  { pattern: /\boccurence\b/gi,    replacement: 'occurrence',  description: 'Fixed spelling: occurence → occurrence',    type: 'spelling' },
  { pattern: /\bseperate\b/gi,     replacement: 'separate',    description: 'Fixed spelling: seperate → separate',       type: 'spelling' },
  { pattern: /\bseperately\b/gi,   replacement: 'separately',  description: 'Fixed spelling: seperately → separately',   type: 'spelling' },
  { pattern: /\bdefinately\b/gi,   replacement: 'definitely',  description: 'Fixed spelling: definately → definitely',   type: 'spelling' },
  { pattern: /\bneccessary\b/gi,   replacement: 'necessary',   description: 'Fixed spelling: neccessary → necessary',    type: 'spelling' },
  { pattern: /\baccomodate\b/gi,   replacement: 'accommodate', description: 'Fixed spelling: accomodate → accommodate',  type: 'spelling' },
  { pattern: /\bembarass\b/gi,     replacement: 'embarrass',   description: 'Fixed spelling: embarass → embarrass',      type: 'spelling' },
  { pattern: /\bharrass\b/gi,      replacement: 'harass',      description: 'Fixed spelling: harrass → harass',          type: 'spelling' },
  { pattern: /\bmillenium\b/gi,    replacement: 'millennium',  description: 'Fixed spelling: millenium → millennium',    type: 'spelling' },
  { pattern: /\bpriviledge\b/gi,   replacement: 'privilege',   description: 'Fixed spelling: priviledge → privilege',    type: 'spelling' },
  { pattern: /\bpriviliged\b/gi,   replacement: 'privileged',  description: 'Fixed spelling: priviliged → privileged',   type: 'spelling' },
  { pattern: /\bconsious\b/gi,     replacement: 'conscious',   description: 'Fixed spelling: consious → conscious',      type: 'spelling' },
  { pattern: /\bcommitee\b/gi,     replacement: 'committee',   description: 'Fixed spelling: commitee → committee',      type: 'spelling' },
  { pattern: /\balot\b/gi,         replacement: 'a lot',       description: 'Fixed: alot → a lot',                       type: 'spelling' },
  { pattern: /\birregardless\b/gi, replacement: 'regardless',  description: 'Fixed: irregardless → regardless',          type: 'spelling' },
  { pattern: /\btheirselves\b/gi,  replacement: 'themselves',  description: 'Fixed: theirselves → themselves',           type: 'spelling' },
  { pattern: /\bgonna\b/gi,        replacement: 'going to',    description: 'Expanded: gonna → going to',                type: 'spelling' },
  { pattern: /\bwanna\b/gi,        replacement: 'want to',     description: 'Expanded: wanna → want to',                 type: 'spelling' },
  { pattern: /\bgotta\b/gi,        replacement: 'have to',     description: 'Expanded: gotta → have to',                 type: 'spelling' },
  { pattern: /\bkinda\b/gi,        replacement: 'kind of',     description: 'Expanded: kinda → kind of',                 type: 'spelling' },
  { pattern: /\bsorta\b/gi,        replacement: 'sort of',     description: 'Expanded: sorta → sort of',                 type: 'spelling' },
  { pattern: /\bdunno\b/gi,        replacement: 'do not know', description: 'Expanded: dunno → do not know',             type: 'spelling' },
];

const GRAMMAR_RULES: Rule[] = [
  // Could/should/would of → have
  { pattern: /\b(could|should|would|might|must)\s+of\b/gi, replacement: '$1 have', description: 'Fixed "X of" → "X have"', type: 'grammar' },
  // there/their/they're confusion — only the clear-cut cases
  { pattern: /\btheir\s+is\b/gi,  replacement: 'there is',  description: 'Fixed: their is → there is',  type: 'grammar' },
  { pattern: /\btheir\s+are\b/gi, replacement: 'there are', description: 'Fixed: their are → there are', type: 'grammar' },
  { pattern: /\btheir\s+was\b/gi, replacement: 'there was', description: 'Fixed: their was → there was', type: 'grammar' },
  { pattern: /\btheir\s+were\b/gi, replacement: 'there were', description: 'Fixed: their were → there were', type: 'grammar' },
  // your → you're (only safe verb-form contexts)
  { pattern: /\byour\s+(going|doing|coming|being|making|using|trying|talking|writing|reading|saying|getting|having)\b/gi,
    replacement: "you're $1", description: "Fixed: your → you're", type: 'grammar' },
  // me/I — pronoun case in clear cases
  { pattern: /\bbetween\s+you\s+and\s+I\b/gi, replacement: 'between you and me', description: 'Fixed pronoun case', type: 'grammar' },
  // less → fewer for countable nouns
  { pattern: /\bless\s+(people|items|users|companies|customers|employees|members|students|workers|hours|days|years)\b/gi,
    replacement: 'fewer $1', description: 'Fixed: less → fewer with countable noun', type: 'grammar' },
  // a/an
  { pattern: /\ba\s+(hour|honest|honor|honour|heir|MBA|FBI|MRI|RSVP|SOS)\b/g,
    replacement: 'an $1', description: 'Fixed a/an before vowel sound', type: 'grammar' },
  { pattern: /\bA\s+(hour|honest|honor|honour|heir)\b/g,
    replacement: 'An $1', description: 'Fixed A/An before vowel sound', type: 'grammar' },
  { pattern: /\ban\s+(user|unique|university|union|European|one|once|uniform|useful|usual|UN)\b/g,
    replacement: 'a $1', description: 'Fixed a/an before consonant sound', type: 'grammar' },
  { pattern: /\bAn\s+(user|unique|university|union|European|one|once|uniform|useful|usual)\b/g,
    replacement: 'A $1', description: 'Fixed A/An before consonant sound', type: 'grammar' },
  // Verb tense slips
  { pattern: /\bshould\s+have\s+went\b/gi, replacement: 'should have gone', description: 'Fixed verb tense', type: 'grammar' },
  { pattern: /\bhas\s+went\b/gi, replacement: 'has gone', description: 'Fixed verb tense', type: 'grammar' },
  { pattern: /\bhave\s+went\b/gi, replacement: 'have gone', description: 'Fixed verb tense', type: 'grammar' },
  // then/than swapped in comparisons
  { pattern: /\b(more|less|greater|fewer|better|worse|larger|smaller|higher|lower)\s+then\b/gi,
    replacement: '$1 than', description: 'Fixed: then → than in comparison', type: 'grammar' },
];

const PUNCTUATION_RULES: Rule[] = [
  // Limit repeated exclamation/question marks to two
  { pattern: /([!?])\1{2,}/g, replacement: '$1$1', description: 'Limited repeated punctuation', type: 'punctuation' },
  // 4+ dots → ellipsis
  { pattern: /\.{4,}/g, replacement: '…', description: 'Normalized excessive dots to ellipsis', type: 'punctuation' },
  // Remove space before clausal/terminal punctuation
  { pattern: / +([,;:!?])/g, replacement: '$1', description: 'Removed space before punctuation', type: 'punctuation' },
];

const WHITESPACE_RULES: Rule[] = [
  { pattern: /[ \t]{2,}/g, replacement: ' ',  description: 'Collapsed multiple spaces',     type: 'whitespace' },
  { pattern: /[ \t]+$/gm,  replacement: '',   description: 'Removed trailing whitespace',   type: 'whitespace' },
];

const CAPITALIZATION_RULES: Rule[] = [
  // Standalone 'i' as pronoun → 'I'.
  // Match 'i' only when surrounded by non-letter/non-apostrophe characters.
  { pattern: /(^|[^A-Za-z'’])i(?=[^A-Za-z'’]|$)/g, replacement: '$1I',
    description: 'Capitalized standalone "I"', type: 'capitalization' },
];

const CLARITY_RULES: Rule[] = [
  // Wordy phrases → concise equivalents
  { pattern: /\bin\s+order\s+to\b/gi,         replacement: 'to',       description: 'Simplified "in order to" → "to"',       type: 'clarity' },
  { pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi, replacement: 'because', description: 'Simplified "due to the fact that" → "because"', type: 'clarity' },
  { pattern: /\bat\s+this\s+point\s+in\s+time\b/gi, replacement: 'now', description: 'Simplified to "now"', type: 'clarity' },
  { pattern: /\bat\s+the\s+present\s+time\b/gi, replacement: 'now',    description: 'Simplified to "now"', type: 'clarity' },
  { pattern: /\bin\s+close\s+proximity\s+to\b/gi, replacement: 'near', description: 'Simplified to "near"', type: 'clarity' },
  { pattern: /\bin\s+the\s+event\s+that\b/gi, replacement: 'if',       description: 'Simplified to "if"',   type: 'clarity' },
  { pattern: /\bin\s+the\s+near\s+future\b/gi, replacement: 'soon',    description: 'Simplified to "soon"', type: 'clarity' },
  { pattern: /\bprior\s+to\b/gi,              replacement: 'before',   description: 'Simplified "prior to" → "before"', type: 'clarity' },
  { pattern: /\bsubsequent\s+to\b/gi,         replacement: 'after',    description: 'Simplified "subsequent to" → "after"', type: 'clarity' },
  { pattern: /\bfor\s+the\s+purpose\s+of\b/gi, replacement: 'to',      description: 'Simplified "for the purpose of"', type: 'clarity' },
  { pattern: /\bwith\s+regard\s+to\b/gi,      replacement: 'about',    description: 'Simplified "with regard to" → "about"', type: 'clarity' },
  { pattern: /\bwith\s+reference\s+to\b/gi,   replacement: 'about',    description: 'Simplified "with reference to" → "about"', type: 'clarity' },
  { pattern: /\bthe\s+reason\s+why\s+is\s+because\b/gi, replacement: 'because', description: 'Removed redundancy', type: 'clarity' },
  { pattern: /\bgive\s+consideration\s+to\b/gi, replacement: 'consider', description: 'Simplified phrase', type: 'clarity' },
  { pattern: /\bmake\s+a\s+decision\b/gi,     replacement: 'decide',   description: 'Simplified phrase', type: 'clarity' },
  { pattern: /\bcome\s+to\s+the\s+conclusion\b/gi, replacement: 'conclude', description: 'Simplified phrase', type: 'clarity' },
  { pattern: /\bin\s+light\s+of\s+the\s+fact\s+that\b/gi, replacement: 'because', description: 'Simplified phrase', type: 'clarity' },
  // Idiom corrections
  { pattern: /\bfor\s+all\s+intensive\s+purposes\b/gi, replacement: 'for all intents and purposes', description: 'Fixed common idiom', type: 'clarity' },
  { pattern: /\bnip\s+it\s+in\s+the\s+butt\b/gi,       replacement: 'nip it in the bud',            description: 'Fixed idiom', type: 'clarity' },
  { pattern: /\bone\s+in\s+the\s+same\b/gi,            replacement: 'one and the same',             description: 'Fixed phrase', type: 'clarity' },
];

const REDUNDANCY_RULES: Rule[] = [
  { pattern: /\bunexpected\s+surprise\b/gi, replacement: 'surprise', description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\bfree\s+gift\b/gi,           replacement: 'gift',     description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\bend\s+result\b/gi,          replacement: 'result',   description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\bpast\s+history\b/gi,        replacement: 'history',  description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\bfuture\s+plans\b/gi,        replacement: 'plans',    description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\badvance\s+planning\b/gi,    replacement: 'planning', description: 'Removed redundant modifier', type: 'redundancy' },
  { pattern: /\brepeat\s+again\b/gi,        replacement: 'repeat',   description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\brevert\s+back\b/gi,         replacement: 'revert',   description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\bcombine\s+together\b/gi,    replacement: 'combine',  description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\bmerge\s+together\b/gi,      replacement: 'merge',    description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\bmore\s+better\b/gi,         replacement: 'better',   description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\bmost\s+best\b/gi,           replacement: 'best',     description: 'Removed redundancy',         type: 'redundancy' },
  { pattern: /\bvery\s+unique\b/gi,         replacement: 'unique',   description: '"Unique" is absolute',       type: 'redundancy' },
  { pattern: /\bquite\s+unique\b/gi,        replacement: 'unique',   description: '"Unique" is absolute',       type: 'redundancy' },
  { pattern: /\bcompletely\s+unique\b/gi,   replacement: 'unique',   description: '"Unique" is absolute',       type: 'redundancy' },
  { pattern: /\b12\s+noon\b/gi,             replacement: 'noon',     description: 'Simplified time',            type: 'redundancy' },
  { pattern: /\b12\s+midnight\b/gi,         replacement: 'midnight', description: 'Simplified time',            type: 'redundancy' },
];

// Tone rules — explicit per-mode, no silent fallback.
const TONE_RULES: Record<Tone, Rule[]> = {
  neutral:    [],
  business:   [],
  executive:  [],
  persuasive: [],
  technical:  [],
  friendly:   [],
  formal:     buildFormalContractionRules(),
  academic:   buildFormalContractionRules(),  // academic inherits formal contractions
};

function buildFormalContractionRules(): Rule[] {
  const expand = (from: RegExp, to: string, label = '(formal)'): Rule => ({
    pattern: from,
    replacement: to,
    description: `Expanded contraction ${label}`,
    type: 'tone',
  });
  return [
    expand(/\bcan't\b/gi, 'cannot'),
    expand(/\bwon't\b/gi, 'will not'),
    expand(/\bdon't\b/gi, 'do not'),
    expand(/\bdidn't\b/gi, 'did not'),
    expand(/\bisn't\b/gi, 'is not'),
    expand(/\baren't\b/gi, 'are not'),
    expand(/\bwasn't\b/gi, 'was not'),
    expand(/\bweren't\b/gi, 'were not'),
    expand(/\bhasn't\b/gi, 'has not'),
    expand(/\bhaven't\b/gi, 'have not'),
    expand(/\bhadn't\b/gi, 'had not'),
    expand(/\bshouldn't\b/gi, 'should not'),
    expand(/\bwouldn't\b/gi, 'would not'),
    expand(/\bcouldn't\b/gi, 'could not'),
    expand(/\bdoesn't\b/gi, 'does not'),
    expand(/\bmustn't\b/gi, 'must not'),
    expand(/\bI'm\b/g,   'I am'),
    expand(/\bI've\b/g,  'I have'),
    expand(/\bI'll\b/g,  'I will'),
    expand(/\bI'd\b/g,   'I would'),
    expand(/\bit's\b/gi, 'it is'),
    expand(/\bthat's\b/gi, 'that is'),
    expand(/\bwe're\b/gi, 'we are'),
    expand(/\bthey're\b/gi, 'they are'),
    expand(/\byou're\b/gi, 'you are'),
    expand(/\byou've\b/gi, 'you have'),
    expand(/\bwe've\b/gi, 'we have'),
    expand(/\bthey've\b/gi, 'they have'),
    expand(/\byou'll\b/gi, 'you will'),
    expand(/\bwe'll\b/gi, 'we will'),
    expand(/\bthey'll\b/gi, 'they will'),
    expand(/\bhe's\b/gi, 'he is'),
    expand(/\bshe's\b/gi, 'she is'),
    expand(/\bthere's\b/gi, 'there is'),
    expand(/\bhere's\b/gi, 'here is'),
    expand(/\bwhat's\b/gi, 'what is'),
    expand(/\blet's\b/gi, 'let us'),
  ];
}

// -----------------------------------------------------------------------------
//  Service
// -----------------------------------------------------------------------------

@Injectable()
export class ContentEnhancementService {
  private readonly logger = new Logger(ContentEnhancementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Main entry point. Returns the original content unchanged if no enabled
   * option produced any safe change.
   */
  async enhanceContent(
    content: string,
    options: EnhancementOptions,
  ): Promise<EnhancementResult> {
    const inputFormat: 'html' | 'text' = /<[a-z][\s\S]*?>/i.test(content) ? 'html' : 'text';

    // Map legacy aliases — never enable destructive flags.
    const fixGrammar     = options.fixGrammar === true;
    const improveClarity = options.improveClarity === true || options.improveWriting === true;
    const tone: Tone     = VALID_TONES.includes(options.tone as Tone)
      ? (options.tone as Tone)
      : 'neutral';

    // Warn if a deprecated destructive flag is passed.
    if (options.restructure || options.expand || options.shorten || options.professionalize || options.makeEngaging) {
      this.logger.warn(
        'Ignoring deprecated destructive enhancement flag(s). ' +
        'These were removed because they damaged content.',
      );
    }

    this.logger.log(
      `Enhancing ${inputFormat} content (${content.length} chars) ` +
      `[fixGrammar=${fixGrammar} improveClarity=${improveClarity} tone=${tone}]`,
    );

    const aggregated = new Map<string, ChangeEntry>();
    const ctx: ProcessingContext = {
      recordChange: (entry) => {
        const key = `${entry.type}::${entry.description}`;
        const existing = aggregated.get(key);
        if (existing) {
          existing.count += entry.count;
          // Keep first-seen before/after pair
        } else {
          aggregated.set(key, { ...entry });
        }
      },
    };

    const enabledRules = this.selectRules(fixGrammar, improveClarity, tone);
    const qualityBefore = this.calculateQuality(content);

    let enhanced: string;
    try {
      enhanced = (inputFormat === 'html')
        ? this.processHtml(content, enabledRules, ctx)
        : this.processText(content, enabledRules, ctx);
    } catch (err) {
      this.logger.error('Enhancement failed; returning original content', err as Error);
      return this.buildUnchangedResult(content, qualityBefore, inputFormat);
    }

    // Semantic integrity check — rollback if structure changed.
    const driftReason = this.detectSemanticDrift(content, enhanced, inputFormat);
    if (driftReason) {
      this.logger.warn(`Semantic drift detected, rolling back: ${driftReason}`);
      return {
        ...this.buildUnchangedResult(content, qualityBefore, inputFormat),
        rolledBack: true,
        rollbackReason: driftReason,
      };
    }

    const qualityAfter = this.calculateQuality(enhanced);
    const improvement = qualityBefore > 0
      ? ((qualityAfter - qualityBefore) / qualityBefore) * 100
      : 0;

    const changes = Array.from(aggregated.values()).sort((a, b) => b.count - a.count);

    this.logger.log(
      `Enhancement complete: ${changes.length} unique change types, ` +
      `quality ${qualityBefore} → ${qualityAfter} (${improvement.toFixed(1)}%)`,
    );

    return {
      originalContent: content,
      enhancedContent: enhanced,
      changes,
      qualityBefore,
      qualityAfter,
      improvement,
      rolledBack: false,
      inputFormat,
    };
  }

  // ---------------------------------------------------------------------------
  //  Rule selection
  // ---------------------------------------------------------------------------

  private selectRules(
    fixGrammar: boolean,
    improveClarity: boolean,
    tone: Tone,
  ): Rule[] {
    const rules: Rule[] = [];
    if (fixGrammar) {
      // Spelling first — fewer surprises in downstream regex.
      rules.push(...SPELLING_RULES);
      rules.push(...GRAMMAR_RULES);
      rules.push(...PUNCTUATION_RULES);
      rules.push(...WHITESPACE_RULES);
      rules.push(...CAPITALIZATION_RULES);
    }
    if (improveClarity) {
      rules.push(...CLARITY_RULES);
      rules.push(...REDUNDANCY_RULES);
    }
    if (tone !== 'neutral') {
      rules.push(...(TONE_RULES[tone] || []));
    }
    return rules;
  }

  // ---------------------------------------------------------------------------
  //  HTML processing — tokenize tags vs. text, only transform text segments.
  //  Skips content inside <script>, <style>, <code>, <pre>, etc.
  // ---------------------------------------------------------------------------

  private processHtml(html: string, rules: Rule[], ctx: ProcessingContext): string {
    // Split into alternating segments. The capturing group keeps tags in the
    // result; even-indexed parts are text, odd-indexed parts are tags.
    const parts = html.split(/(<[^>]+>)/);

    const skipTags = new Set([
      'script', 'style', 'code', 'pre', 'kbd', 'samp', 'var', 'noscript', 'textarea',
    ]);
    let skipDepth = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isTag = (i % 2) === 1;

      if (isTag) {
        const tagMatch = part.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)/);
        if (tagMatch) {
          const isClosing = tagMatch[1] === '/';
          const tagName = tagMatch[2].toLowerCase();
          const isSelfClosing = /\/\s*>$/.test(part);
          if (skipTags.has(tagName)) {
            if (isClosing)         skipDepth = Math.max(0, skipDepth - 1);
            else if (!isSelfClosing) skipDepth++;
          }
        }
        continue;
      }

      // Text segment
      if (skipDepth > 0) continue;
      if (!part || !part.trim()) continue;

      const transformed = this.processText(part, rules, ctx);
      if (transformed !== part) {
        parts[i] = transformed;
      }
    }

    return parts.join('');
  }

  // ---------------------------------------------------------------------------
  //  Plain text processing
  // ---------------------------------------------------------------------------

  private processText(text: string, rules: Rule[], ctx: ProcessingContext): string {
    if (!text) return text;
    const protector = new TokenProtector();
    let working = protector.protect(text);

    for (const rule of rules) {
      // 1. Count matches (independent of replacement to keep accurate count
      //    even when replacement is a function).
      const countRe = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g')
        ? rule.pattern.flags
        : rule.pattern.flags + 'g');
      const matches = working.match(countRe);
      const count = matches ? matches.length : 0;
      if (count === 0) continue;

      // 2. Capture first sample of before/after for the diff entry.
      const sampleBefore = matches![0];
      let sampleAfter = '';

      // 3. Apply replacement.
      const replaced = working.replace(rule.pattern, (...args) => {
        const result = (typeof rule.replacement === 'function')
          ? (rule.replacement as Function).apply(null, args)
          : (args[0] as string).replace(rule.pattern, rule.replacement as string);
        if (!sampleAfter) sampleAfter = result;
        return result;
      });

      if (replaced !== working) {
        ctx.recordChange({
          type: rule.type,
          description: rule.description,
          before: sampleBefore,
          after: sampleAfter || sampleBefore,
          count,
        });
        working = replaced;
      }
    }

    return protector.restore(working);
  }

  // ---------------------------------------------------------------------------
  //  Semantic integrity validation
  //  Returns a reason if drift is detected, otherwise undefined.
  // ---------------------------------------------------------------------------

  private detectSemanticDrift(
    before: string,
    after: string,
    inputFormat: 'html' | 'text',
  ): string | undefined {
    if (inputFormat === 'html') {
      // Compare structural element counts — they MUST be identical.
      const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'blockquote'];
      for (const tag of tags) {
        const re = new RegExp(`<${tag}\\b`, 'gi');
        const beforeCount = (before.match(re) || []).length;
        const afterCount  = (after.match(re)  || []).length;
        if (beforeCount !== afterCount) {
          return `<${tag}> count changed (${beforeCount} → ${afterCount})`;
        }
      }
    }

    // Word-count delta — allow ±25% (clarity rules shrink, formal expands).
    const wordsBefore = countWords(stripTags(before));
    const wordsAfter  = countWords(stripTags(after));
    if (wordsBefore > 20) {
      const delta = Math.abs(wordsAfter - wordsBefore) / wordsBefore;
      if (delta > 0.25) {
        return `word count drift ${(delta * 100).toFixed(0)}% (${wordsBefore} → ${wordsAfter})`;
      }
    }

    // Paragraph count delta — in plain text only (HTML already covered above).
    if (inputFormat === 'text') {
      const paraBefore = before.split(/\n\s*\n/).filter(p => p.trim()).length;
      const paraAfter  = after.split(/\n\s*\n/).filter(p => p.trim()).length;
      if (paraBefore !== paraAfter) {
        return `paragraph count changed (${paraBefore} → ${paraAfter})`;
      }
    }

    return undefined;
  }

  // ---------------------------------------------------------------------------
  //  Honest quality score
  //  Range 0–100. Rewards readability and grammar, not structure changes.
  // ---------------------------------------------------------------------------

  private calculateQuality(content: string): number {
    const text = stripTags(content);
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = splitSentences(text);

    if (words.length < 5) return 50; // not enough to judge

    let score = 70; // baseline for well-formed text

    // 1. Grammar issue density — penalty
    const issues = this.countGrammarIssues(text);
    const issueDensity = issues / Math.max(1, words.length);
    score -= Math.min(25, Math.round(issueDensity * 1000)); // up to -25

    // 2. Sentence length sweet spot (avg 12–22 words)
    const avgSentLen = words.length / Math.max(1, sentences.length);
    if (avgSentLen >= 12 && avgSentLen <= 22) score += 10;
    else if (avgSentLen >= 8 && avgSentLen <= 30) score += 4;
    else if (avgSentLen > 40 || avgSentLen < 5) score -= 8;

    // 3. Sentence length variance — good writing varies (10–20% CV)
    if (sentences.length >= 3) {
      const lens = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
      const cv = coefficientOfVariation(lens);
      if (cv >= 0.25 && cv <= 0.7) score += 6;
    }

    // 4. Repetition penalty — fraction of words that are duplicates of the
    //    most common content word.
    const repetitionPenalty = this.estimateRepetition(words);
    score -= Math.min(15, Math.round(repetitionPenalty * 30));

    // 5. Bonus for non-trivial length (not a structural reward — a quality one)
    if (words.length >= 150) score += 3;
    if (words.length >= 400) score += 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countGrammarIssues(text: string): number {
    let issues = 0;
    const patterns = [
      /\btheir\s+(is|are|was|were)\b/gi,
      /\b(could|should|would|might|must)\s+of\b/gi,
      /\balot\b/gi,
      /\birregardless\b/gi,
      /\btheirselves\b/gi,
      /\brecieve\b/gi,
      /\bseperate\b/gi,
      /\bdefinately\b/gi,
      /\boccured\b/gi,
      /(^|[^A-Za-z'’])i([^A-Za-z'’]|$)/g,
      /[ \t]{2,}/g,
      / +[,;:!?]/g,
      /([!?])\1{2,}/g,
      /\b(more|less|greater|fewer)\s+then\b/gi,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) issues += m.length;
    }
    return issues;
  }

  private estimateRepetition(words: string[]): number {
    // Stopwords don't count toward repetition
    const stop = new Set([
      'the','a','an','and','or','but','if','of','in','on','at','to','for','from','by',
      'with','as','is','are','was','were','be','been','being','have','has','had','do',
      'does','did','this','that','these','those','it','its','i','you','he','she','we',
      'they','them','their','his','her','our','my','your','what','which','who','whom',
      'will','would','can','could','should','may','might','must','also','so','too','than','then',
    ]);
    const freq = new Map<string, number>();
    let contentWords = 0;
    for (const raw of words) {
      const w = raw.toLowerCase().replace(/[^\p{L}]/gu, '');
      if (!w || stop.has(w) || w.length < 4) continue;
      contentWords++;
      freq.set(w, (freq.get(w) || 0) + 1);
    }
    if (contentWords < 30) return 0;
    let top = 0;
    for (const c of freq.values()) if (c > top) top = c;
    return top / contentWords; // 0..1
  }

  // ---------------------------------------------------------------------------
  //  Helpers
  // ---------------------------------------------------------------------------

  private buildUnchangedResult(
    content: string,
    qualityBefore: number,
    inputFormat: 'html' | 'text',
  ): EnhancementResult {
    return {
      originalContent: content,
      enhancedContent: content,
      changes: [],
      qualityBefore,
      qualityAfter: qualityBefore,
      improvement: 0,
      rolledBack: false,
      inputFormat,
    };
  }

  /**
   * Persist enhancement decision (kept for back-compat with callers that
   * want a history record).
   */
  async saveEnhancement(
    documentId: string,
    enhancementType: string,
    result: EnhancementResult,
  ): Promise<void> {
    try {
      await this.prisma.contentEnhancement.create({
        data: {
          documentId,
          enhancementType,
          scope: 'full_document',
          originalContent: result.originalContent,
          enhancedContent: result.enhancedContent,
          changes: result.changes as any,
          qualityBefore: result.qualityBefore,
          qualityAfter: result.qualityAfter,
          improvement: result.improvement,
          aiModel: 'rule-based-safe',
          userAccepted: false,
        },
      });
      this.logger.log(`Saved enhancement record for document ${documentId}`);
    } catch (err) {
      this.logger.warn(`Could not save enhancement record: ${(err as Error).message}`);
    }
  }
}

// -----------------------------------------------------------------------------
//  Standalone helpers (kept outside the class for testability)
// -----------------------------------------------------------------------------

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  // Use protected-token approach to handle abbreviations
  const protector = new TokenProtector();
  const masked = protector.protect(text);
  const parts = masked
    .split(/(?<=[.!?])\s+(?=[A-Z"“‘'(])/)
    .map(s => s.trim())
    .filter(Boolean);
  return parts.map(p => protector.restore(p));
}

function coefficientOfVariation(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  if (mean === 0) return 0;
  const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance) / mean;
}
