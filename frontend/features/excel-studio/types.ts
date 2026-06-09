export type ExcelIssueSeverity = 'critical' | 'warning' | 'info';

export type ExcelWorkbookOperationType =
  | 'setCellValue'
  | 'setFormula'
  | 'formatCell'
  | 'formatRange'
  | 'insertRow'
  | 'deleteRow'
  | 'insertColumn'
  | 'deleteColumn'
  | 'renameSheet'
  | 'createSheet'
  | 'deleteSheet'
  | 'moveSheet'
  | 'freezePane'
  | 'mergeCells'
  | 'unmergeCells';

export type ExcelWorkbookOperationStatus = 'approved' | 'undone';

export type ExcelWorkbookOperationInput = {
  type: ExcelWorkbookOperationType;
  sheetName?: string;
  target?: Record<string, any>;
  payload?: Record<string, any>;
  source?: 'user' | 'enhancement' | 'system';
};

export type ExcelWorkbookOperationRecord = ExcelWorkbookOperationInput & {
  id: string;
  projectId: string;
  userId: string;
  versionId?: string | null;
  sequence: number;
  target: Record<string, any>;
  payload: Record<string, any>;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  status: ExcelWorkbookOperationStatus;
  createdAt: string;
  undoneAt?: string | null;
  redoneAt?: string | null;
};

export type ExcelWorkbookSnapshotRecord = {
  id: string;
  projectId: string;
  userId: string;
  versionId?: string | null;
  label?: string | null;
  workbookPath: string;
  analysis: ExcelAnalysis;
  operationIds: string[];
  createdAt: string;
  restoredAt?: string | null;
};

export type ExcelWorkbookVersionRecord = {
  id: string;
  projectId: string;
  userId: string;
  versionNumber: number;
  label?: string | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  operationIds: string[];
  snapshotPath?: string | null;
  createdAt: string;
};

export type ExcelWorkbookDiff = {
  added: Array<Record<string, any>>;
  removed: Array<Record<string, any>>;
  changed: Array<Record<string, any>>;
};

export type ExcelCell = {
  address: string;
  row: number;
  column: number;
  value: string;
  rawValue?: string | number | boolean | Date | null;
  formula?: string;
  type?: string;
  formatted?: string;
  numberFormat?: string;
  isMerged?: boolean;
  mergeMaster?: boolean;
  mergeSpan?: { rows: number; columns: number };
  style?: {
    bold?: boolean;
    italic?: boolean;
    fillColor?: string;
    textColor?: string;
    horizontal?: string;
    vertical?: string;
  };
};

export type ExcelMergeRange = {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
};

export type ExcelWorksheet = {
  id: string;
  name: string;
  rows: number;
  columns: number;
  usedRange: string;
  hidden: boolean;
  mergedCells: number;
  formulas: number;
  blanks: number;
  duplicateRows: number;
  previewRows: string[][];
  cells: ExcelCell[][];
  merges: ExcelMergeRange[];
  columnWidths: number[];
  rowHeights: number[];
};

export type ExcelIssue = {
  id: string;
  severity: ExcelIssueSeverity;
  category: string;
  title: string;
  detail: string;
  sheet?: string;
  cell?: string;
  suggestedFix: string;
  autoFixable: boolean;
};

export type ExcelScores = {
  workbookQuality: number;
  formulaIntegrity: number;
  formattingConsistency: number;
  readability: number;
  dashboardReadiness: number;
  dataQuality: number;
  visualizationQuality: number;
  executiveReadiness: number;
  overall: number;
};

export type ExcelAnalysis = {
  summary: {
    sheets: number;
    rows: number;
    columns: number;
    tables: number;
    namedRanges: number;
    charts: number;
    pivots: number;
    formulas: number;
    validations: number;
    conditionalFormatting: number;
    hiddenSheets: number;
    mergedCells: number;
    duplicateRows: number;
    blankCells: number;
    dependencies: number;
  };
  scores: ExcelScores;
  scoreExplanations: Record<keyof ExcelScores, string[]>;
  issues: ExcelIssue[];
  worksheets: ExcelWorksheet[];
  recommendations: string[];
  auditGeneratedAt: string;
};

export type ExcelProject = {
  id: string;
  userId: string;
  title: string;
  filename: string;
  originalFilePath: string;
  mimeType: string;
  fileSize: number;
  status: 'analyzed' | 'enhanced' | 'archived';
  activeTemplateId: string;
  appliedActions: Array<{ id: string; action: string; label: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
  analysis: ExcelAnalysis;
  enhancementPlan: string[];
  exports: Array<{ id: string; format: string; createdAt: string }>;
};

export type ExcelTemplate = {
  id: string;
  name: string;
  category: 'finance' | 'dashboard' | 'operations' | 'sales' | 'executive';
  description: string;
  accent: string;
  strengths: string[];
};

export type ExcelScriptAnalysis = {
  workbookType: string;
  confidence: number;
  suggestedTitle: string;
  recommendedTemplateId: string;
  detectedSheets: string[];
  detectedMetrics: Array<{ label: string; value: string }>;
  detectedDimensions: string[];
  risks: string[];
  generationPlan: string[];
};

export type ExcelReports = {
  totalProjects: number;
  averageQuality: number;
  criticalIssues: number;
  warningIssues: number;
  recent: ExcelProject[];
  templateCoverage: Array<{ templateId: string; name: string; projects: number }>;
};
