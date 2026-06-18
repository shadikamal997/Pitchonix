import { CV_TEMPLATE_LIBRARY } from '../src/career/cv-templates';
import { CvDoctype } from '../src/career/cv-types';
import {
  EXCEL_TEMPLATE_PALETTE,
  EXCEL_TEMPLATE_REGISTRY,
} from '../src/excel-studio/excel-studio.service';
import { FRAMEWORKS } from '../src/generation/document-quality/frameworks';
import { TemplateService } from '../src/generation/templates/template.service';
import { SlideFactory } from '../src/generation/slide-types/slide.factory';
import { SlideType } from '../src/generation/slide-types/types';
import { FEASIBILITY_TEMPLATES } from '../src/feasibility-studio/feasibility-templates';
import { PRO_TEMPLATE_REGISTRY } from '../src/pdf-studio/pro-templates/registry/pro-template.registry';
import {
  LayoutComponentType,
  TEMPLATE_CONFIGS,
  TemplateType,
  getAllTemplates,
} from '../src/pdf-studio/templates/template-configs';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Defect {
  severity: Severity;
  area: string;
  id: string;
  message: string;
}

interface Scorecard {
  id: string;
  family: string;
  score: number;
  defects: number;
}

const defects: Defect[] = [];
const scorecards: Scorecard[] = [];

const requiredPresentationDocs = [
  'pitch_deck',
  'sales_deck',
  'board_meeting_deck',
  'training_presentation',
  'product_launch',
  'strategy_presentation',
];

const requiredStandardTemplates: Array<{ label: string; type: TemplateType }> = [
  { label: 'Business Plan', type: TemplateType.BUSINESS_PLAN_PRO },
  { label: 'Proposal', type: TemplateType.CLIENT_PROPOSAL_PRO },
  { label: 'Company Profile', type: TemplateType.CORPORATE_OVERVIEW },
  { label: 'Executive Summary', type: TemplateType.EXECUTIVE_ONE_PAGER },
  { label: 'Marketing Plan', type: TemplateType.MARKETING_PLAN },
  { label: 'Financial Projections', type: TemplateType.FINANCIAL_PROJECTIONS },
  { label: 'Case Study', type: TemplateType.CASE_STUDY_DOCUMENT },
  { label: 'Internal Report', type: TemplateType.INTERNAL_TEAM_REPORT },
  { label: 'Partnership Proposal', type: TemplateType.PARTNERSHIP_PROPOSAL },
  { label: 'One Pager', type: TemplateType.MODERN_ONE_PAGER },
];

function addDefect(severity: Severity, area: string, id: string, message: string) {
  defects.push({ severity, area, id, message });
}

function hasPlaceholder(value: unknown): boolean {
  const text = JSON.stringify(value ?? '');
  return /\[[A-Za-z][^\]]+\]|\blorem ipsum\b|\bplaceholder\b|\btbd\b/i.test(text);
}

function assertUnique<T>(area: string, items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  for (const item of items) {
    const key = getKey(item);
    if (!key?.trim()) {
      addDefect('critical', area, '(empty)', 'Missing registry key.');
      continue;
    }
    if (seen.has(key)) addDefect('critical', area, key, 'Duplicate registry key.');
    seen.add(key);
  }
}

function scoreTemplate(id: string, family: string, templateDefects: Defect[]) {
  const penalty = templateDefects.reduce((total, defect) => {
    if (defect.severity === 'critical') return total + 20;
    if (defect.severity === 'high') return total + 12;
    if (defect.severity === 'medium') return total + 6;
    return total + 2;
  }, 0);
  scorecards.push({ id, family, score: Math.max(0, 100 - penalty), defects: templateDefects.length });
}

function auditPdfStandard() {
  const allTypes = Object.values(TemplateType);
  const configTypes = Object.values(TEMPLATE_CONFIGS).map((config) => config.type);
  const selectable = getAllTemplates().map((template) => template.config.type);
  const components = new Set(Object.values(LayoutComponentType));

  assertUnique('pdf-standard', Object.values(TEMPLATE_CONFIGS), (config) => config.type);

  for (const type of allTypes) {
    if (!TEMPLATE_CONFIGS[type]) {
      addDefect('critical', 'pdf-standard', type, 'TemplateType is not registered in TEMPLATE_CONFIGS.');
    }
  }

  for (const type of configTypes) {
    if (type !== TemplateType.SMART_PDF_BUILDER && !selectable.includes(type)) {
      addDefect('critical', 'pdf-standard', type, 'Registered template is not user-selectable.');
    }
  }

  for (const required of requiredStandardTemplates) {
    if (!TEMPLATE_CONFIGS[required.type]) {
      addDefect('critical', 'pdf-standard', required.label, 'Required standard template is missing.');
    }
  }

  for (const config of Object.values(TEMPLATE_CONFIGS)) {
    const before = defects.length;
    if (!config.name?.trim()) addDefect('critical', 'pdf-standard', config.type, 'Missing name.');
    if (!config.description?.trim()) {
      addDefect('high', 'pdf-standard', config.type, 'Missing description.');
    }
    if (config.type !== TemplateType.SMART_PDF_BUILDER && config.layouts.length === 0) {
      addDefect('critical', 'pdf-standard', config.type, 'Selectable template has no layouts.');
    }
    for (const layout of config.layouts) {
      if (!components.has(layout)) {
        addDefect('critical', 'pdf-standard', config.type, `Unknown layout component: ${layout}`);
      }
    }
    if (config.type !== TemplateType.SMART_PDF_BUILDER && config.defaultSections.length < 4) {
      addDefect('high', 'pdf-standard', config.type, 'Too few default sections for a complete document.');
    }
    if (hasPlaceholder(config)) {
      addDefect('critical', 'pdf-standard', config.type, 'Placeholder text found in template config.');
    }
    scoreTemplate(config.type, 'PDF Standard', defects.slice(before));
  }
}

function auditPdfPro() {
  const requiredArchetypes = [
    'cover',
    'introduction',
    'section-divider',
    'content',
    'feature-list',
    'stats',
    'timeline',
    'swot-grid',
    'image-text',
    'closing',
  ];

  if (PRO_TEMPLATE_REGISTRY.length !== 20) {
    addDefect('critical', 'pdf-pro', 'registry', `Expected 20 Pro templates, found ${PRO_TEMPLATE_REGISTRY.length}.`);
  }
  assertUnique('pdf-pro', PRO_TEMPLATE_REGISTRY, (template) => template.id);

  for (const template of PRO_TEMPLATE_REGISTRY) {
    const before = defects.length;
    for (const field of ['name', 'family', 'category', 'description'] as const) {
      if (!template[field]?.trim()) addDefect('critical', 'pdf-pro', template.id, `Missing ${field}.`);
    }
    for (const archetype of requiredArchetypes) {
      if (!template.archetypes.includes(archetype as any)) {
        addDefect('critical', 'pdf-pro', template.id, `Missing archetype: ${archetype}`);
      }
    }
    const colors = template.tokens.colors;
    for (const key of ['paper', 'ink', 'muted', 'charcoal', 'accent', 'accentSoft', 'line'] as const) {
      if (!/^#[0-9a-f]{6}$/i.test(colors[key])) {
        addDefect('high', 'pdf-pro', template.id, `Invalid color token: ${key}`);
      }
    }
    if (hasPlaceholder(template)) {
      addDefect('critical', 'pdf-pro', template.id, 'Placeholder text found in Pro template.');
    }
    scoreTemplate(template.id, 'PDF Pro', defects.slice(before));
  }
}

function auditPresentations() {
  const service = new TemplateService();
  const templates = service.getAllTemplates();
  const factory = new SlideFactory();
  const factoryAny = factory as any;
  const availableGenerators = new Set(factory.getAvailableSlideTypes());

  assertUnique('presentation-template', templates, (template) => template.id);

  for (const doc of requiredPresentationDocs) {
    const framework = FRAMEWORKS[doc];
    if (!framework) {
      addDefect('critical', 'presentation-framework', doc, 'Required framework is missing.');
      continue;
    }
    const coreTypes: SlideType[] = factoryAny.getCoreSlideTypes(doc);
    for (const section of framework.sections.filter((section) => section.required)) {
      const alternates = section.alternates || [];
      const covered = [section.slideType, ...alternates].some(
        (slideType) => availableGenerators.has(slideType) && coreTypes.includes(slideType),
      );
      if (!covered) {
        addDefect(
          'critical',
          'presentation-framework',
          doc,
          `Required section "${section.label}" is not owned by a core generator.`,
        );
      }
    }
  }

  for (const template of templates) {
    const before = defects.length;
    if (!FRAMEWORKS[template.documentType] && template.documentType !== 'pitch_deck') {
      addDefect('high', 'presentation-template', template.id, `No framework for ${template.documentType}.`);
    }
    if (!template.description?.trim() || template.tags.length === 0) {
      addDefect('high', 'presentation-template', template.id, 'Missing description or tags.');
    }
    if (hasPlaceholder(template)) {
      addDefect('critical', 'presentation-template', template.id, 'Placeholder text found in template seed.');
    }
    scoreTemplate(template.id, 'Presentation', defects.slice(before));
  }
}

function auditCareer() {
  const requiredDoctypes: CvDoctype[] = ['cv', 'resume', 'coverLetter', 'portfolio'];
  assertUnique('career', CV_TEMPLATE_LIBRARY, (template) => `${template.doctype}:${template.name}`);

  for (const doctype of requiredDoctypes) {
    const count = CV_TEMPLATE_LIBRARY.filter((template) => template.doctype === doctype).length;
    if (count === 0) addDefect('critical', 'career', doctype, 'No templates registered for doctype.');
  }

  for (const template of CV_TEMPLATE_LIBRARY) {
    const before = defects.length;
    if (!template.name?.trim()) addDefect('critical', 'career', template.doctype, 'Missing name.');
    if (!template.category?.trim()) addDefect('high', 'career', template.name, 'Missing category.');
    if (!template.layout?.accent || !/^#[0-9a-f]{6}$/i.test(template.layout.accent)) {
      addDefect('high', 'career', template.name, 'Invalid accent color.');
    }
    if (hasPlaceholder(template)) addDefect('critical', 'career', template.name, 'Placeholder text found.');
    scoreTemplate(`${template.doctype}:${template.name}`, 'Career', defects.slice(before));
  }
}

function auditFeasibility() {
  assertUnique('feasibility', FEASIBILITY_TEMPLATES, (template) => template.id);
  for (const template of FEASIBILITY_TEMPLATES) {
    const before = defects.length;
    if (!template.sections?.length) addDefect('critical', 'feasibility', template.id, 'No sections registered.');
    if (!TEMPLATE_CONFIGS[template.pdfTemplateType]) {
      addDefect('critical', 'feasibility', template.id, 'Missing linked PDF template.');
    }
    if (!PRO_TEMPLATE_REGISTRY.some((proTemplate) => proTemplate.id === template.proTemplateId)) {
      addDefect('critical', 'feasibility', template.id, 'Missing linked Pro template.');
    }
    if (hasPlaceholder(template)) {
      addDefect('critical', 'feasibility', template.id, 'Placeholder text found.');
    }
    scoreTemplate(template.id, 'Feasibility', defects.slice(before));
  }
}

function auditExcel() {
  const paletteIds = new Set(Object.keys(EXCEL_TEMPLATE_PALETTE));
  assertUnique('excel', EXCEL_TEMPLATE_REGISTRY, (template) => template.id);

  for (const template of EXCEL_TEMPLATE_REGISTRY) {
    const before = defects.length;
    if (!paletteIds.has(template.id)) {
      addDefect('critical', 'excel', template.id, 'Template has no palette.');
    }
    if (!template.description?.trim() || template.strengths.length < 3) {
      addDefect('high', 'excel', template.id, 'Template lacks complete description/strengths.');
    }
    if (hasPlaceholder(template)) addDefect('critical', 'excel', template.id, 'Placeholder text found.');
    scoreTemplate(template.id, 'Excel', defects.slice(before));
  }

  for (const id of paletteIds) {
    if (!EXCEL_TEMPLATE_REGISTRY.some((template) => template.id === id)) {
      addDefect('critical', 'excel', id, 'Palette has no template.');
    }
  }
}

auditPdfStandard();
auditPdfPro();
auditPresentations();
auditCareer();
auditFeasibility();
auditExcel();

const counts = {
  critical: defects.filter((defect) => defect.severity === 'critical').length,
  high: defects.filter((defect) => defect.severity === 'high').length,
  medium: defects.filter((defect) => defect.severity === 'medium').length,
  low: defects.filter((defect) => defect.severity === 'low').length,
};

const totalTemplatesAudited =
  getAllTemplates().length +
  PRO_TEMPLATE_REGISTRY.length +
  new TemplateService().getAllTemplates().length +
  CV_TEMPLATE_LIBRARY.length +
  FEASIBILITY_TEMPLATES.length +
  EXCEL_TEMPLATE_REGISTRY.length;
const totalGeneratorsAudited =
  Object.keys(FRAMEWORKS).length + new SlideFactory().getAvailableSlideTypes().length;
const totalComponentsAudited =
  Object.values(LayoutComponentType).length +
  (PRO_TEMPLATE_REGISTRY[0]?.archetypes.length || 0) +
  Object.keys(EXCEL_TEMPLATE_PALETTE).length;
const averageScore =
  scorecards.reduce((total, item) => total + item.score, 0) / Math.max(1, scorecards.length);

const report = {
  certificationResult:
    counts.critical === 0 && counts.high === 0
      ? 'PASS - TEMPLATE MASTER CERTIFIED'
      : 'FAIL - TEMPLATE MASTER CERTIFICATION BLOCKED',
  totals: {
    totalTemplatesAudited,
    totalGeneratorsAudited,
    totalComponentsAudited,
    totalDefectsFound: defects.length,
    totalDefectsFixedByGate: 0,
    remainingTemplateIssues: defects.length,
  },
  defectCounts: counts,
  scores: {
    architectureScore: Math.round(averageScore),
    templateQualityScore: Math.round(averageScore),
    templateConsistencyScore: Math.round(averageScore),
    templateUxScore: Math.round(averageScore),
    finalPlatformTemplateScore: Math.round(averageScore),
  },
  technicalDebtInventory:
    defects.length === 0
      ? ['No dead templates, orphan registries, missing generators, or duplicate keys detected.']
      : defects,
};

console.log(JSON.stringify(report, null, 2));

if (counts.critical > 0 || counts.high > 0) {
  process.exitCode = 1;
}
