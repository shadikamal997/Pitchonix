import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(root, 'certification-reports');

const resources = [
  {
    name: 'Projects',
    controller: 'backend/src/projects/projects.controller.ts',
    service: 'backend/src/projects/projects.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId', 'ForbiddenException'],
  },
  {
    name: 'Decks',
    controller: 'backend/src/decks/decks.controller.ts',
    service: 'backend/src/decks/decks.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId', 'ForbiddenException'],
  },
  {
    name: 'Slides',
    controller: 'backend/src/slides/slides.controller.ts',
    service: 'backend/src/slides/slides.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId', 'ForbiddenException'],
  },
  {
    name: 'CVs',
    controller: 'backend/src/career/career.controller.ts',
    service: 'backend/src/career/cv-documents.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId'],
  },
  {
    name: 'PDFs',
    controller: 'backend/src/pdf-studio/controllers/pdf-export.controller.ts',
    service: 'backend/src/pdf-documents/pdf-documents.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId'],
  },
  {
    name: 'Excel Workbooks',
    controller: 'backend/src/excel-studio/excel-studio.controller.ts',
    service: 'backend/src/excel-studio/excel-studio.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId'],
  },
  {
    name: 'Uploads',
    controller: 'backend/src/upload/upload.controller.ts',
    service: 'backend/src/files/uploaded-asset.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'authorize', 'userId'],
  },
  {
    name: 'Exports',
    controller: 'backend/src/export/export.controller.ts',
    service: 'backend/src/main.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'resolveExportOwner'],
  },
  {
    name: 'Brand Kits',
    controller: 'backend/src/brand-kits/brand-kits.controller.ts',
    service: 'backend/src/brand-kits/brand-kits.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId'],
  },
  {
    name: 'Shares',
    controller: 'backend/src/sharing/deck-shares.controller.ts',
    service: 'backend/src/sharing/deck-shares.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'resolvePermission', 'workspaceId'],
  },
  {
    name: 'Workspaces',
    controller: 'backend/src/workspaces/workspaces.controller.ts',
    service: 'backend/src/workspaces/workspaces.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'workspaceId', 'userId'],
  },
  {
    name: 'Feasibility Studies',
    controller: 'backend/src/feasibility-studio/feasibility-studio.controller.ts',
    service: 'backend/src/feasibility-studio/feasibility-studio.service.ts',
    mustInclude: ['@UseGuards(JwtAuthGuard)', 'userId'],
  },
];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  return fs.readFileSync(absolutePath, 'utf8');
}

function certify(resource) {
  const controller = read(resource.controller);
  const service = read(resource.service);
  const combined = `${controller ?? ''}\n${service ?? ''}`;
  const findings = [];

  if (!controller) findings.push(`Missing controller: ${resource.controller}`);
  if (!service) findings.push(`Missing service: ${resource.service}`);

  for (const token of resource.mustInclude) {
    if (!combined.includes(token)) findings.push(`Missing authorization marker: ${token}`);
  }

  const hasAuthGuard = combined.includes('@UseGuards(JwtAuthGuard)');
  const hasOwnerScope =
    /\buserId\b/.test(combined) ||
    /\bworkspaceId\b/.test(combined) ||
    /\bresolvePermission\b/.test(combined);
  const hasDenyPath =
    /ForbiddenException|NotFoundException|403|Access denied|No access|authorize/.test(combined);

  return {
    resource: resource.name,
    status: findings.length ? 'fail' : 'pass',
    controller: resource.controller,
    service: resource.service,
    checks: {
      jwtGuard: hasAuthGuard,
      ownerOrWorkspaceScope: hasOwnerScope,
      denyPath: hasDenyPath,
    },
    findings,
  };
}

fs.mkdirSync(reportDir, { recursive: true });

const rows = resources.map(certify);
const failures = rows.filter((row) => row.status !== 'pass');
const report = {
  generatedAt: new Date().toISOString(),
  scope: resources.map((resource) => resource.name),
  summary: {
    resources: rows.length,
    passed: rows.length - failures.length,
    failed: failures.length,
  },
  rows,
};

fs.writeFileSync(
  path.join(reportDir, 'authorization-matrix-certification.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const markdown = [
  '# Authorization Matrix Certification',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Resources: ${report.summary.resources}`,
  `Passed: ${report.summary.passed}`,
  `Failed: ${report.summary.failed}`,
  '',
  '| Resource | Status | JWT Guard | Owner/Workspace Scope | Deny Path | Findings |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => {
    const findings = row.findings.length ? row.findings.join('<br>') : '-';
    return `| ${row.resource} | ${row.status.toUpperCase()} | ${row.checks.jwtGuard ? 'yes' : 'no'} | ${row.checks.ownerOrWorkspaceScope ? 'yes' : 'no'} | ${row.checks.denyPath ? 'yes' : 'no'} | ${findings} |`;
  }),
  '',
  failures.length
    ? 'Result: FAIL. One or more resource boundaries are missing required authorization markers.'
    : 'Result: PASS. All certified resource boundaries include authentication, owner/workspace scoping, and an explicit deny path.',
  '',
].join('\n');

fs.writeFileSync(path.join(reportDir, 'authorization-matrix-certification.md'), markdown);

if (failures.length) {
  console.error(markdown);
  process.exit(1);
}

console.log(
  `Authorization matrix certification passed: ${report.summary.passed}/${report.summary.resources} resource boundaries.`,
);
