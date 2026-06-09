import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'certification-reports');
fs.mkdirSync(outDir, { recursive: true });

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function idsFromObjectArray(source, arrayName) {
  const marker = `export const ${arrayName}`;
  const start = source.indexOf(marker);
  if (start === -1) return [];
  const slice = source.slice(start);
  return [...slice.matchAll(/\bid:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
}

function idsFromTemplateCalls(source) {
  return [...source.matchAll(/\btemplate\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
}

function idsFromExportedTemplateObjects(source) {
  return [...source.matchAll(/export const TPL_[A-Z0-9_]+:\s*TemplateSpec\s*=\s*{[\s\S]*?\bid:\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
}

function namesFromCvLibrary(source) {
  return [...source.matchAll(/\bT\(\s*['"`][^'"`]+['"`]\s*,\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);
}

function unique(values) {
  return [...new Set(values)];
}

function duplicateValues(values) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  return [...dupes];
}

const slideSource = read('frontend/features/slide-editor/templates/registry.ts');
const pdfStandardSource = read('frontend/features/pdf-studio/templates/registry/templateRegistry.ts');
const pdfProSource = read('frontend/features/pdf-studio/pro-templates/registry/proTemplateRegistry.ts');
const cvSource = read('backend/src/career/cv-templates.ts');

const slideTemplates = idsFromExportedTemplateObjects(slideSource);
const standardPdfTemplates = idsFromObjectArray(pdfStandardSource, 'TEMPLATE_REGISTRY');
const proPdfTemplates = idsFromTemplateCalls(pdfProSource);
const cvTemplates = namesFromCvLibrary(cvSource);

const checks = [
  {
    name: 'Presentation templates',
    expectedMinimum: 20,
    count: unique(slideTemplates).length,
    duplicates: duplicateValues(slideTemplates),
  },
  {
    name: 'PDF standard templates',
    expectedMinimum: 30,
    count: unique(standardPdfTemplates).length,
    duplicates: duplicateValues(standardPdfTemplates),
  },
  {
    name: 'PDF pro templates',
    expectedMinimum: 20,
    count: unique(proPdfTemplates).length,
    duplicates: duplicateValues(proPdfTemplates),
  },
  {
    name: 'CV templates',
    expectedMinimum: 40,
    count: unique(cvTemplates).length,
    duplicates: duplicateValues(cvTemplates),
  },
];

const failures = checks.flatMap((check) => {
  const items = [];
  if (check.count < check.expectedMinimum) {
    items.push(`${check.name}: expected at least ${check.expectedMinimum}, found ${check.count}`);
  }
  if (check.duplicates.length) {
    items.push(`${check.name}: duplicate ids/names: ${check.duplicates.join(', ')}`);
  }
  return items;
});

const report = {
  generatedAt: new Date().toISOString(),
  checks,
  inventories: {
    slideTemplates: unique(slideTemplates),
    standardPdfTemplates: unique(standardPdfTemplates),
    proPdfTemplates: unique(proPdfTemplates),
    cvTemplates: unique(cvTemplates),
  },
  failures,
};

fs.writeFileSync(path.join(outDir, 'template-registry-certification.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, 'template-registry-certification.md'),
  `# Template Registry Certification

Generated: ${report.generatedAt}

| Registry | Count | Minimum | Duplicates | Status |
| --- | ---: | ---: | --- | --- |
${checks.map((check) => `| ${check.name} | ${check.count} | ${check.expectedMinimum} | ${check.duplicates.length ? check.duplicates.join(', ') : 'None'} | ${check.count >= check.expectedMinimum && !check.duplicates.length ? 'Pass' : 'Fail'} |`).join('\n')}

${failures.length ? `## Failures\n\n${failures.map((failure) => `- ${failure}`).join('\n')}\n` : '## Result\n\nAll registry inventory gates passed.\n'}
`,
);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Template registry certification passed: slides=${unique(slideTemplates).length}, cv=${unique(cvTemplates).length}, pdfStandard=${unique(standardPdfTemplates).length}, pdfPro=${unique(proPdfTemplates).length}`);
