import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'certification-reports');
fs.mkdirSync(outDir, { recursive: true });

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function rel(file) {
  return path.relative(root, file);
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const controllerFiles = walk(path.join(root, 'backend/src'), (file) => file.endsWith('.controller.ts'));
const publicAllowlist = [
  'backend/src/app.controller.ts',
  'backend/src/auth/auth.controller.ts',
  'backend/src/contact/contact.controller.ts',
  'backend/src/document-parser/document-parser.controller.ts',
  'backend/src/integrations/unsplash/unsplash.controller.ts',
];

const highRiskControllerPatterns = [
  'projects',
  'decks',
  'slides',
  'career',
  'pdf-studio',
  'excel-studio',
  'feasibility-studio',
  'brand-kits',
  'upload',
  'export',
  'workspaces',
  'sharing',
];

const findings = [];

for (const file of controllerFiles) {
  const relative = rel(file);
  const source = fs.readFileSync(file, 'utf8');
  const isAllowlistedPublic = publicAllowlist.includes(relative);
  const isHighRisk = highRiskControllerPatterns.some((pattern) => relative.includes(pattern));
  const hasController = /@Controller\(/.test(source);
  const hasGuard = /@UseGuards\([^)]*JwtAuthGuard/.test(source);
  const hasPublic = /@Public\(\)/.test(source);
  const hasSkipThrottle = /@SkipThrottle\(\)/.test(source);

  if (hasController && isHighRisk && !hasGuard && !isAllowlistedPublic) {
    findings.push({
      severity: 'critical',
      file: relative,
      message: 'High-risk controller does not declare JwtAuthGuard at class level.',
    });
  }
  if (hasSkipThrottle && (relative.includes('excel-studio') || relative.includes('feasibility-studio'))) {
    findings.push({
      severity: 'critical',
      file: relative,
      message: 'Studio controller has broad SkipThrottle; public analysis endpoints must be rate limited.',
    });
  }
  if (hasPublic && isHighRisk && !/analyze|templates|health|public|share|extract-text/.test(source)) {
    findings.push({
      severity: 'warning',
      file: relative,
      message: 'High-risk controller exposes @Public endpoint; manually verify intent and rate limiting.',
    });
  }
}

const authModule = read('backend/src/auth/auth.module.ts');
const main = read('backend/src/main.ts');

if (/your-super-secret-jwt-key-change-this-in-production/.test(authModule + main)) {
  findings.push({
    severity: 'critical',
    file: 'backend/src/auth/auth.module.ts',
    message: 'Insecure JWT fallback string still exists in runtime auth code.',
  });
}

if (/contentSecurityPolicy:\s*false/.test(main) && !/isProduction[\s\S]*contentSecurityPolicy:\s*isProduction/.test(main)) {
  findings.push({
    severity: 'critical',
    file: 'backend/src/main.ts',
    message: 'CSP is disabled without a production CSP branch.',
  });
}

if (!/JWT_SECRET must be set/.test(main) || !/JWT_SECRET must be set/.test(authModule)) {
  findings.push({
    severity: 'critical',
    file: 'backend/src/auth',
    message: 'JWT_SECRET hard-fail is not enforced by both bootstrap and JWT module registration.',
  });
}

const critical = findings.filter((finding) => finding.severity === 'critical');
const report = {
  generatedAt: new Date().toISOString(),
  controllersScanned: controllerFiles.length,
  findings,
  status: critical.length ? 'fail' : 'pass',
};

fs.writeFileSync(path.join(outDir, 'security-certification.json'), JSON.stringify(report, null, 2));
fs.writeFileSync(
  path.join(outDir, 'security-certification.md'),
  `# Security Certification

Generated: ${report.generatedAt}

Controllers scanned: ${report.controllersScanned}

Status: **${report.status.toUpperCase()}**

| Severity | File | Finding |
| --- | --- | --- |
${findings.length ? findings.map((finding) => `| ${finding.severity} | ${finding.file} | ${finding.message} |`).join('\n') : '| - | - | No blocking findings |'}
`,
);

if (critical.length) {
  console.error(`Security certification failed with ${critical.length} critical finding(s).`);
  for (const finding of critical) console.error(`${finding.file}: ${finding.message}`);
  process.exit(1);
}

console.log(`Security certification passed with ${findings.length} non-blocking finding(s).`);
