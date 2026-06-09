export type ExcelStudioIssueSeverity = 'critical' | 'warning' | 'info';

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

export interface ExcelWorkbookOperationInput {
  type: ExcelWorkbookOperationType;
  sheetName?: string;
  target?: Record<string, any>;
  payload?: Record<string, any>;
  source?: 'user' | 'enhancement' | 'system';
}

export interface ExcelWorkbookOperationRecord extends ExcelWorkbookOperationInput {
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
}

export interface ExcelWorkbookSnapshotRecord {
  id: string;
  projectId: string;
  userId: string;
  versionId?: string | null;
  label?: string | null;
  workbookPath: string;
  analysis: ExcelStudioAnalysis;
  operationIds: string[];
  createdAt: string;
  restoredAt?: string | null;
}

export interface ExcelWorkbookVersionRecord {
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
}

export interface ExcelWorkbookDiff {
  added: Array<Record<string, any>>;
  removed: Array<Record<string, any>>;
  changed: Array<Record<string, any>>;
}

export interface ExcelStudioCell {
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
}

export interface ExcelStudioMergeRange {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export interface ExcelStudioWorksheet {
  id: string;
  name: string;
  rows: number;
  columns: number;
  usedRange: string;
  hidden: boolean;
  mergedCells: number;
  formulas: number;
  errorCells: number;
  currencyLikeCells: number;
  dateLikeCells: number;
  numericCells: number;
  blanks: number;
  blankRows: number;
  blankColumns: number;
  duplicateRows: number;
  previewRows: string[][];
  cells: ExcelStudioCell[][];
  merges: ExcelStudioMergeRange[];
  columnWidths: number[];
  rowHeights: number[];
}

export interface ExcelStudioIssue {
  id: string;
  severity: ExcelStudioIssueSeverity;
  category: string;
  title: string;
  detail: string;
  sheet?: string;
  cell?: string;
  suggestedFix: string;
  autoFixable: boolean;
}

export interface ExcelStudioScores {
  workbookQuality: number;
  formulaIntegrity: number;
  formattingConsistency: number;
  readability: number;
  dashboardReadiness: number;
  dataQuality: number;
  visualizationQuality: number;
  executiveReadiness: number;
  overall: number;
}

export interface ExcelStudioAnalysis {
  summary: {
    sheets: number;
    rows: number;
    columns: number;
    tables: number;
    namedRanges: number;
    charts: number;
    pivots: number;
    formulas: number;
    errorCells: number;
    validations: number;
    conditionalFormatting: number;
    hiddenSheets: number;
    mergedCells: number;
    duplicateRows: number;
    blankRows: number;
    blankColumns: number;
    blankCells: number;
    dependencies: number;
  };
  scores: ExcelStudioScores;
  scoreExplanations: Record<keyof ExcelStudioScores, string[]>;
  issues: ExcelStudioIssue[];
  worksheets: ExcelStudioWorksheet[];
  recommendations: string[];
  auditGeneratedAt: string;
}

export interface ExcelStudioProject {
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
  analysis: ExcelStudioAnalysis;
  enhancementPlan: string[];
  exports: Array<{ id: string; format: string; createdAt: string }>;
  sourceScript?: string;
}

export interface ExcelStudioTemplate {
  id: string;
  name: string;
  category: 'finance' | 'dashboard' | 'operations' | 'sales' | 'executive';
  description: string;
  accent: string;
  strengths: string[];
}

export interface ExcelScriptAnalysis {
  workbookType: string;
  confidence: number;
  suggestedTitle: string;
  recommendedTemplateId: string;
  detectedSheets: string[];
  detectedMetrics: Array<{ label: string; value: string }>;
  detectedDimensions: string[];
  risks: string[];
  generationPlan: string[];
}
