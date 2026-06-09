import { Page, Route } from '@playwright/test';

const jsonHeaders = {
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

const fixtureProject = {
  id: 'e2e-project',
  title: 'E2E Project',
  name: 'E2E Project',
  status: 'completed',
  type: 'pitch-deck',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  decks: [
    {
      id: 'e2e-deck',
      title: 'E2E Deck',
      slides: [
        { id: 'e2e-slide', title: 'Cover', order: 1, elementTree: [], elements: [] },
      ],
    },
  ],
};

const fixtureDocument = {
  id: 'e2e-document',
  title: 'E2E Document',
  status: 'ready',
  templateId: 'executive',
  pages: [{ id: 'page-1', blocks: [] }],
  content: {},
};

const fixtureExcelProject = {
  id: 'e2e-document',
  userId: 'e2e-user',
  title: 'E2E Workbook',
  filename: 'e2e-workbook.xlsx',
  originalFilePath: '/tmp/e2e-workbook.xlsx',
  mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  fileSize: 24576,
  status: 'analyzed',
  activeTemplateId: 'executive-dashboard',
  appliedActions: [],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  enhancementPlan: ['Standardize headers', 'Freeze header row'],
  exports: [],
  analysis: {
    summary: {
      sheets: 1,
      rows: 4,
      columns: 4,
      tables: 1,
      namedRanges: 0,
      charts: 0,
      pivots: 0,
      formulas: 1,
      validations: 0,
      conditionalFormatting: 0,
      hiddenSheets: 0,
      mergedCells: 0,
      duplicateRows: 0,
      blankCells: 1,
      dependencies: 1,
    },
    scores: {
      workbookQuality: 86,
      formulaIntegrity: 92,
      formattingConsistency: 80,
      readability: 88,
      dashboardReadiness: 74,
      dataQuality: 84,
      visualizationQuality: 70,
      executiveReadiness: 78,
      overall: 84,
    },
    scoreExplanations: {
      workbookQuality: ['Clear workbook structure.'],
      formulaIntegrity: ['Formula references are intact.'],
      formattingConsistency: ['Headers are mostly consistent.'],
      readability: ['Sheet is easy to scan.'],
      dashboardReadiness: ['Needs KPI rollup.'],
      dataQuality: ['Few blanks detected.'],
      visualizationQuality: ['No charts yet.'],
      executiveReadiness: ['Can support board export.'],
      overall: ['Ready for enhancement.'],
    },
    issues: [],
    recommendations: ['Freeze header row', 'Create executive dashboard'],
    auditGeneratedAt: new Date(0).toISOString(),
    worksheets: [
      {
        id: 'sheet-1',
        name: 'Revenue',
        rows: 4,
        columns: 4,
        usedRange: 'A1:D4',
        hidden: false,
        mergedCells: 0,
        formulas: 1,
        blanks: 1,
        duplicateRows: 0,
        previewRows: [
          ['Month', 'Revenue', 'Cost', 'Profit'],
          ['Jan', '12000', '7000', '5000'],
          ['Feb', '15000', '8200', '6800'],
          ['Total', '27000', '15200', '=B4-C4'],
        ],
        cells: [
          [
            { address: 'A1', row: 1, column: 1, value: 'Month', style: { bold: true } },
            { address: 'B1', row: 1, column: 2, value: 'Revenue', style: { bold: true } },
            { address: 'C1', row: 1, column: 3, value: 'Cost', style: { bold: true } },
            { address: 'D1', row: 1, column: 4, value: 'Profit', style: { bold: true } },
          ],
          [
            { address: 'A2', row: 2, column: 1, value: 'Jan' },
            { address: 'B2', row: 2, column: 2, value: '12000', rawValue: 12000 },
            { address: 'C2', row: 2, column: 3, value: '7000', rawValue: 7000 },
            { address: 'D2', row: 2, column: 4, value: '5000', rawValue: 5000 },
          ],
        ],
        merges: [],
        columnWidths: [16, 16, 16, 16],
        rowHeights: [24, 22, 22, 22],
      },
    ],
  },
};

const fixtureExcelTemplate = {
  id: 'executive-dashboard',
  name: 'Executive Dashboard',
  category: 'executive',
  description: 'Board-ready workbook enhancement.',
  accent: '#4F7563',
  strengths: ['Scorecards', 'Dashboards'],
};

const fixtureFeasibilityAnalysis = {
  projectName: 'E2E Feasibility Study',
  businessObjective: 'Validate the market, financial, technical, and operational feasibility of the project.',
  studyType: 'investor_feasibility',
  industry: 'SaaS',
  detectedSignals: { market: ['Customer demand'], finance: ['Revenue model'] },
  sections: [
    {
      key: 'market',
      title: 'Market Feasibility',
      status: 'present',
      confidence: 0.9,
      evidence: ['Market demand is supported by customer interviews.'],
      guidance: 'Keep the market sizing evidence visible.',
    },
  ],
  scores: {
    marketScore: 82,
    financialScore: 78,
    technicalScore: 84,
    operationalScore: 80,
    riskScore: 76,
    overallScore: 80,
  },
  warnings: ['Add sensitivity analysis before investor export.'],
  recommendations: ['Clarify assumptions', 'Add go/no-go criteria'],
  recommendation: 'Proceed with mitigations',
  preservation: {
    originalCharacters: 1200,
    originalWords: 180,
    preservedCharacters: 1200,
    preservationRate: 1,
  },
};

const fixtureFeasibilityProject = {
  id: 'e2e-document',
  userId: 'e2e-user',
  projectId: 'e2e-project',
  pdfDocumentId: 'e2e-document',
  title: 'E2E Feasibility Study',
  description: 'Feasibility route smoke fixture.',
  industry: 'SaaS',
  studyType: 'investor_feasibility',
  score: 80,
  status: 'ready',
  analysis: fixtureFeasibilityAnalysis,
  recommendations: fixtureFeasibilityAnalysis.recommendations,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

const fixtureFeasibilityTemplate = {
  id: 'investor-feasibility-report',
  name: 'Investor Feasibility Report',
  description: 'Decision-ready investor feasibility study.',
  studyTypes: ['investor_feasibility', 'market_feasibility'],
  pdfTemplateType: 'pro',
  proTemplateId: 'investor-feasibility',
  sections: ['market', 'financial', 'technical', 'risk'],
  scorecardStyle: 'investor',
};

function bodyFor(url: string) {
  const path = new URL(url).pathname;
  if (path.includes('/auth/me')) return { id: 'e2e-user', email: 'e2e@pitchonix.test' };
  if (path.includes('/excel-studio/templates')) return { data: [fixtureExcelTemplate], templates: [fixtureExcelTemplate] };
  if (path.includes('/excel-studio/projects/e2e-document/operations')) return { data: [], operations: [] };
  if (path.includes('/excel-studio/projects/e2e-document/snapshots')) return { data: [], snapshots: [] };
  if (path.includes('/excel-studio/projects/e2e-document')) return { data: fixtureExcelProject, project: fixtureExcelProject };
  if (path.includes('/excel-studio/projects')) return { data: [fixtureExcelProject], projects: [fixtureExcelProject] };
  if (path.includes('/excel-studio')) return { data: fixtureExcelProject, project: fixtureExcelProject };
  if (path.includes('/feasibility-studio/templates')) return { data: [fixtureFeasibilityTemplate], templates: [fixtureFeasibilityTemplate] };
  if (path.includes('/feasibility-studio/projects/e2e-document/outputs')) {
    return {
      data: {
        pdf: { status: 'ready', href: '/pdf-studio/editor/e2e-document' },
        docx: { status: 'ready' },
      },
    };
  }
  if (path.includes('/feasibility-studio/projects/e2e-document')) {
    return { data: fixtureFeasibilityProject, project: fixtureFeasibilityProject };
  }
  if (path.includes('/feasibility-studio/projects')) {
    return { data: [fixtureFeasibilityProject], projects: [fixtureFeasibilityProject] };
  }
  if (path.includes('/feasibility-studio')) return { data: fixtureFeasibilityProject, project: fixtureFeasibilityProject };
  if (path.includes('/projects/e2e-project') || path.includes('/projects/test-project')) {
    return fixtureProject;
  }
  if (path.endsWith('/projects')) return { data: [fixtureProject], projects: [fixtureProject] };
  if (path.includes('/decks')) return { data: fixtureProject.decks[0], slides: fixtureProject.decks[0].slides };
  if (path.includes('/slides')) return { data: fixtureProject.decks[0].slides[0], elements: [] };
  if (path.includes('/brand-kits')) return { data: [], brandKits: [] };
  if (path.includes('/workspaces')) return { data: [], workspaces: [] };
  if (path.includes('/notifications')) return { unread: 0, data: [] };
  if (path.includes('/analytics')) return { data: {}, summary: {} };
  if (path.includes('/career')) return { data: fixtureDocument, document: fixtureDocument, profile: {} };
  if (path.includes('/pdf-studio')) return { data: fixtureDocument, document: fixtureDocument };
  if (path.includes('/convert')) return { data: [], jobs: [] };
  return { data: {}, ok: true };
}

async function fulfillJson(route: Route) {
  await route.fulfill({
    status: 200,
    headers: jsonHeaders,
    body: JSON.stringify(bodyFor(route.request().url())),
  });
}

export async function installApiMocks(page: Page) {
  await page.route('**/api/**', fulfillJson);
}
