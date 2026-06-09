import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import AdmZip = require('adm-zip');
import { PrismaService } from '../prisma/prisma.service';
import { UploadedAssetService } from '../files/uploaded-asset.service';
import { ExcelLedgerService } from './excel-ledger.service';
import {
  ExcelStudioAnalysis,
  ExcelStudioCell,
  ExcelStudioIssue,
  ExcelStudioMergeRange,
  ExcelStudioProject,
  ExcelScriptAnalysis,
  ExcelStudioTemplate,
  ExcelStudioWorksheet,
  ExcelWorkbookDiff,
  ExcelWorkbookOperationInput,
  ExcelWorkbookOperationRecord,
} from './excel-studio.types';

const MAX_PREVIEW_ROWS = 80;

type GeneratedWorkbookSheet = { name: string; rows: any[][] };

// ── Template colour palette ────────────────────────────────────────────────
// ARGB hex strings for XLSX cell styles (Alpha + RGB, no #).
const TEMPLATE_PALETTE: Record<
  string,
  { header: string; accent: string; text: string; light: string }
> = {
  'executive-emerald': {
    header: 'FF4F7563',
    accent: 'FF355846',
    text: 'FFFFFFFF',
    light: 'FFE8F1EC',
  },
  'finance-midnight': {
    header: 'FF18241F',
    accent: 'FF2F4E43',
    text: 'FFFFFFFF',
    light: 'FFD6E4DD',
  },
  'sales-sage': { header: 'FF647C71', accent: 'FF4F7563', text: 'FFFFFFFF', light: 'FFEEF5F1' },
  'ops-copper': { header: 'FFA06B3D', accent: 'FF7A4F2A', text: 'FFFFFFFF', light: 'FFFAEEDB' },
  'dashboard-ivory': {
    header: 'FFC8A96A',
    accent: 'FF8C6210',
    text: 'FF111111',
    light: 'FFFFF8E8',
  },
  'investor-financial': {
    header: 'FF315E52',
    accent: 'FF1E3D35',
    text: 'FFFFFFFF',
    light: 'FFD6E8E2',
  },
  'corporate-reporting': {
    header: 'FF2F4858',
    accent: 'FF1C2F3C',
    text: 'FFFFFFFF',
    light: 'FFD8E2E8',
  },
  'board-reporting': {
    header: 'FF473C33',
    accent: 'FF2C2319',
    text: 'FFFFFFFF',
    light: 'FFEBE5DF',
  },
  'marketing-analytics': {
    header: 'FF6F5B7C',
    accent: 'FF4A3A56',
    text: 'FFFFFFFF',
    light: 'FFF0EBF5',
  },
  'startup-metrics': {
    header: 'FF355846',
    accent: 'FF263F34',
    text: 'FFFFFFFF',
    light: 'FFEEF5F1',
  },
  'financial-forecasting': {
    header: 'FF5B6042',
    accent: 'FF3B3F2A',
    text: 'FFFFFFFF',
    light: 'FFF0F1E8',
  },
  'management-reporting': {
    header: 'FF806443',
    accent: 'FF5A4530',
    text: 'FFFFFFFF',
    light: 'FFFAEEDB',
  },
};

@Injectable()
export class ExcelStudioService {
  private readonly workbookDir: string;

  private readonly templates: ExcelStudioTemplate[] = [
    {
      id: 'executive-emerald',
      name: 'Executive Emerald Board Pack',
      category: 'executive',
      description:
        'Premium executive summary, board-ready KPI bands, and calm Pitchonix green hierarchy.',
      accent: '#4F7563',
      strengths: ['Board summary', 'KPI storytelling', 'Audit-ready formatting'],
    },
    {
      id: 'finance-midnight',
      name: 'Finance Midnight Model',
      category: 'finance',
      description:
        'Dark finance dashboard styling with dependency-safe formula review and variance callouts.',
      accent: '#18241F',
      strengths: ['Formula integrity', 'Variance panels', 'Scenario readability'],
    },
    {
      id: 'sales-sage',
      name: 'Sales Sage Pipeline',
      category: 'sales',
      description:
        'Pipeline, quota, ARR, and funnel sheets with clear modern commercial reporting.',
      accent: '#7A988A',
      strengths: ['Revenue charts', 'Pipeline hygiene', 'Forecast scan flow'],
    },
    {
      id: 'ops-copper',
      name: 'Operations Copper Control',
      category: 'operations',
      description:
        'Operational workbooks with status grids, SLA bands, and exception-first review panels.',
      accent: '#A66F3F',
      strengths: ['Exception handling', 'SLA views', 'Process tables'],
    },
    {
      id: 'dashboard-ivory',
      name: 'Dashboard Ivory Studio',
      category: 'dashboard',
      description:
        'Clean visual dashboard system for stakeholder-ready scorecards and chart summaries.',
      accent: '#C8A96A',
      strengths: ['Dashboard layout', 'Chart recommendations', 'Presentation polish'],
    },
    {
      id: 'investor-financial',
      name: 'Investor Financial Model',
      category: 'finance',
      description:
        'VC-facing financial model with assumptions, runway, ARR, burn, and scenario review sheets.',
      accent: '#315E52',
      strengths: ['Investor KPIs', 'Runway review', 'Assumption audit'],
    },
    {
      id: 'corporate-reporting',
      name: 'Corporate Reporting Pack',
      category: 'executive',
      description:
        'Corporate reporting structure with department tabs, monthly variance, and management summary.',
      accent: '#2F4858',
      strengths: ['Management reporting', 'Variance hygiene', 'Department rollups'],
    },
    {
      id: 'board-reporting',
      name: 'Board Reporting System',
      category: 'executive',
      description:
        'Board-level workbook system with decision log, risk register, KPI cockpit, and appendix.',
      accent: '#473C33',
      strengths: ['Board pack', 'Risk register', 'Decision support'],
    },
    {
      id: 'marketing-analytics',
      name: 'Marketing Analytics Studio',
      category: 'dashboard',
      description:
        'Campaign, CAC, channel, funnel, and attribution review structure for marketing teams.',
      accent: '#6F5B7C',
      strengths: ['Campaign analysis', 'Funnel metrics', 'Channel scorecards'],
    },
    {
      id: 'startup-metrics',
      name: 'Startup Metrics Command Center',
      category: 'dashboard',
      description:
        'Founder-friendly KPI workbook with MRR, activation, retention, runway, and growth loops.',
      accent: '#355846',
      strengths: ['SaaS KPIs', 'Retention view', 'Founder dashboard'],
    },
    {
      id: 'financial-forecasting',
      name: 'Financial Forecasting System',
      category: 'finance',
      description:
        'Forecast-friendly workbook structure for assumptions, scenarios, actuals, and variance checks.',
      accent: '#5B6042',
      strengths: ['Forecast model', 'Scenario tabs', 'Variance checks'],
    },
    {
      id: 'management-reporting',
      name: 'Management Reporting Suite',
      category: 'operations',
      description:
        'Operator-grade weekly and monthly reporting pack with owner notes and exception logs.',
      accent: '#806443',
      strengths: ['Owner notes', 'Exception logs', 'Weekly cadence'],
    },
  ];

  private readonly logger = new Logger(ExcelStudioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadedAssets: UploadedAssetService,
    private readonly excelLedger: ExcelLedgerService,
  ) {
    this.workbookDir = path.join(process.cwd(), 'uploads', 'excel-studio', 'workbooks');
    fs.mkdirSync(this.workbookDir, { recursive: true });
  }

  /**
   * Phase Ω.CONTENT.2B — record the content ledger for a workbook import/render.
   * Best-effort; never fail an upload/analysis over ledger bookkeeping.
   */
  private async recordLedgerImport(projectId: string, buffer: Buffer) {
    try {
      const { imported } = await this.excelLedger.recordImport(projectId, buffer);
      this.logger.log(`Content ledger: imported ${imported} workbook node(s) for ${projectId}`);
    } catch (error: any) {
      this.logger.warn(
        `Content ledger import skipped for ${projectId}: ${error?.message || error}`,
      );
    }
  }

  /** Phase Ω.CONTENT.2B — mark exported, then reopen the exported XLSX and reconcile. */
  private async recordLedgerExportAndReopen(
    projectId: string,
    buffer: Buffer,
    operationsApplied: boolean,
  ) {
    try {
      await this.excelLedger.recordExport(projectId);
      const ops = operationsApplied ? await this.activeWorkbookOperations(projectId) : [];
      const result = await this.excelLedger.recordReopen(projectId, buffer, ops);
      this.logger.log(
        `Content ledger reopen ${projectId}: reopened=${result.reopened} mutated=${result.mutated} lost=${result.lost}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Content ledger export/reopen skipped for ${projectId}: ${error?.message || error}`,
      );
    }
  }

  // ── Storage helpers ────────────────────────────────────────────────────────

  private fromDb(row: any): ExcelStudioProject {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      filename: row.filename,
      originalFilePath: row.originalFilePath || '',
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      status: row.status,
      activeTemplateId: row.activeTemplateId,
      analysis: {
        ...row.analysis,
        summary: { errorCells: 0, blankRows: 0, blankColumns: 0, ...row.analysis?.summary },
        scoreExplanations: row.analysis?.scoreExplanations || {},
        worksheets: (row.analysis?.worksheets || []).map((s: any) => ({
          errorCells: 0,
          currencyLikeCells: 0,
          dateLikeCells: 0,
          numericCells: 0,
          blankRows: 0,
          blankColumns: 0,
          cells: [],
          merges: [],
          columnWidths: [],
          rowHeights: [],
          ...s,
        })),
      },
      enhancementPlan: Array.isArray(row.enhancementPlan) ? row.enhancementPlan : [],
      appliedActions: Array.isArray(row.appliedActions) ? row.appliedActions : [],
      exports: Array.isArray(row.exports) ? row.exports : [],
      sourceScript: row.sourceScript ?? undefined,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : (row.createdAt ?? new Date().toISOString()),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : (row.updatedAt ?? new Date().toISOString()),
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  listTemplates() {
    return this.templates;
  }

  async listProjects(userId: string) {
    const rows = await this.prisma.excelProject.findMany({
      where: { userId, status: { not: 'archived' } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => this.fromDb(r));
  }

  async getProject(userId: string, id: string): Promise<ExcelStudioProject> {
    const row = await this.prisma.excelProject.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Excel Studio project not found');
    return this.fromDb(row);
  }

  async createFromUpload(userId: string, file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing file (multipart field "file")');
    const filename = String(file.originalname || 'workbook.xlsx');
    if (!/\.(xlsx|xls|csv)$/i.test(filename)) {
      throw new BadRequestException('Excel Studio accepts XLSX, XLS, and CSV files only');
    }
    if (file.size > 50 * 1024 * 1024) throw new BadRequestException('File exceeds the 50 MB limit');

    const projectId = crypto.randomUUID();
    const safeExt = path.extname(filename).toLowerCase() || '.xlsx';
    const stored = `${projectId}${safeExt}`;
    const relPath = path.join('uploads', 'excel-studio', 'workbooks', stored);
    const diskPath = path.join(process.cwd(), relPath);
    fs.writeFileSync(diskPath, file.buffer);
    // Phase Ω.1E — ownership row for the uploaded workbook.
    await this.uploadedAssets.record({
      userId,
      publicPath: `/${relPath.split(path.sep).join('/')}`,
      storagePath: diskPath,
      module: 'excel',
      documentId: projectId,
      originalName: filename,
      mimeType: file.mimetype || 'application/octet-stream',
      sizeBytes: file.size || file.buffer.length,
    });

    const analysis = this.analyzeWorkbook(file.buffer, filename);
    const row = await this.prisma.excelProject.create({
      data: {
        id: projectId,
        userId,
        title: this.titleFromFilename(filename),
        filename,
        originalFilePath: relPath,
        mimeType: file.mimetype || 'application/octet-stream',
        fileSize: file.size || file.buffer.length,
        status: 'analyzed',
        activeTemplateId: 'executive-emerald',
        analysis: analysis as any,
        enhancementPlan: this.buildEnhancementPlan(analysis) as any,
        appliedActions: [],
        exports: [],
      },
    });
    await this.recordLedgerImport(projectId, file.buffer);
    return this.fromDb(row);
  }

  analyzeScript(rawScript: string): ExcelScriptAnalysis {
    const script = String(rawScript || '').trim();
    if (!script) throw new BadRequestException('Workbook script is required');
    const lower = script.toLowerCase();
    const workbookType = this.detectScriptWorkbookType(lower);
    const recommendedTemplateId = this.recommendTemplateForScript(workbookType, lower);
    const detectedSheets = this.extractRequestedSheets(script, workbookType);
    const detectedMetrics = this.extractMetrics(script);
    const detectedDimensions = this.extractDimensions(script);
    const risks = [
      ...(detectedMetrics.length === 0
        ? ['No explicit metrics detected; generated workbook will include starter KPI rows.']
        : []),
      ...(!/assumption|source|input/i.test(script)
        ? ['No source/assumption section mentioned; generator will add one for governance.']
        : []),
      ...(!/dashboard|summary|executive|board/i.test(script)
        ? ['No dashboard requested; generator will add an executive overview sheet.']
        : []),
    ];
    return {
      workbookType,
      confidence: this.scriptConfidence(script, detectedMetrics, detectedSheets),
      suggestedTitle: this.suggestTitleFromScript(script, workbookType),
      recommendedTemplateId,
      detectedSheets,
      detectedMetrics,
      detectedDimensions,
      risks,
      generationPlan: this.scriptGenerationPlan(
        workbookType,
        detectedSheets,
        recommendedTemplateId,
      ),
    };
  }

  async createFromScript(userId: string, body: any) {
    const rawScript = String(body?.script || body?.rawContent || '').trim();
    const analysis = this.analyzeScript(rawScript);
    const templateId = String(
      body?.templateId || analysis.recommendedTemplateId || 'executive-emerald',
    );
    const title = String(
      body?.title || analysis.suggestedTitle || 'Generated Excel Workbook',
    ).trim();
    const workbook = this.buildWorkbookFromScript(rawScript, title, templateId, analysis);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    return this.createGeneratedProject(userId, {
      title,
      filename: `${this.slug(title)}.xlsx`,
      buffer,
      templateId,
      sourceScript: rawScript,
    });
  }

  async updateProject(userId: string, id: string, body: any) {
    const existing = await this.getProject(userId, id);
    const row = await this.prisma.excelProject.update({
      where: { id },
      data: {
        title:
          typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : existing.title,
        activeTemplateId:
          typeof body?.activeTemplateId === 'string'
            ? body.activeTemplateId
            : existing.activeTemplateId,
        enhancementPlan: Array.isArray(body?.enhancementPlan)
          ? (body.enhancementPlan as any)
          : (existing.enhancementPlan as any),
        appliedActions: Array.isArray(body?.appliedActions)
          ? (body.appliedActions as any)
          : (existing.appliedActions as any),
      },
    });
    return this.fromDb(row);
  }

  async reAnalyzeProject(userId: string, id: string): Promise<ExcelStudioProject> {
    const project = await this.getProject(userId, id);
    const relPath = project.originalFilePath || '';
    const fullPath = relPath ? path.join(process.cwd(), relPath) : '';
    if (!fullPath || !fs.existsSync(fullPath)) {
      // Nothing to re-read — return current project (no-op rather than crash)
      return project;
    }
    const buffer = fs.readFileSync(fullPath);
    const analysis = this.analyzeWorkbook(buffer, project.filename);
    const row = await this.prisma.excelProject.update({
      where: { id },
      data: {
        analysis: analysis as any,
        enhancementPlan: this.buildEnhancementPlan(analysis, project.activeTemplateId) as any,
        status: 'analyzed',
      },
    });
    await this.recordLedgerImport(id, buffer);
    return this.fromDb(row);
  }

  private async createGeneratedProject(
    userId: string,
    input: {
      title: string;
      filename: string;
      buffer: Buffer;
      templateId: string;
      sourceScript: string;
    },
  ) {
    const projectId = crypto.randomUUID();
    const relPath = path.join('uploads', 'excel-studio', 'workbooks', `${projectId}.xlsx`);
    const diskPath = path.join(process.cwd(), relPath);
    fs.writeFileSync(diskPath, input.buffer);
    // Phase Ω.1E — ownership row for the generated workbook.
    await this.uploadedAssets.record({
      userId,
      publicPath: `/${relPath.split(path.sep).join('/')}`,
      storagePath: diskPath,
      module: 'excel',
      documentId: projectId,
      originalName: input.filename,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: input.buffer.length,
    });
    const analysis = this.analyzeWorkbook(input.buffer, input.filename);
    const row = await this.prisma.excelProject.create({
      data: {
        id: projectId,
        userId,
        title: input.title,
        filename: input.filename,
        originalFilePath: relPath,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: input.buffer.length,
        status: 'enhanced',
        activeTemplateId: input.templateId,
        analysis: analysis as any,
        enhancementPlan: [
          'Generated source data, assumptions, executive dashboard, audit, and template system sheets from the script.',
          ...this.buildEnhancementPlan(analysis, input.templateId),
        ] as any,
        appliedActions: [
          {
            id: crypto.randomUUID(),
            action: 'scriptGenerated',
            label: 'Generated workbook from script',
            createdAt: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            action: 'modernizeWorkbook',
            label: 'Applied template workbook system',
            createdAt: new Date().toISOString(),
          },
        ] as any,
        exports: [],
        sourceScript: input.sourceScript,
      },
    });
    await this.recordLedgerImport(projectId, input.buffer);
    return this.fromDb(row);
  }

  async duplicateProject(userId: string, id: string) {
    const project = await this.getProject(userId, id);
    const row = await this.prisma.excelProject.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        title: `${project.title} Copy`,
        filename: project.filename,
        originalFilePath: project.originalFilePath,
        mimeType: project.mimeType,
        fileSize: project.fileSize,
        status: project.status,
        activeTemplateId: project.activeTemplateId,
        analysis: project.analysis as any,
        enhancementPlan: project.enhancementPlan as any,
        appliedActions: project.appliedActions as any,
        exports: [],
        sourceScript: project.sourceScript,
      },
    });
    return this.fromDb(row);
  }

  async archiveProject(userId: string, id: string) {
    await this.getProject(userId, id); // ownership check
    await this.prisma.excelProject.update({ where: { id }, data: { status: 'archived' } });
    return { ok: true };
  }

  async enhanceProject(userId: string, id: string, templateId?: string) {
    const project = await this.getProject(userId, id);
    const template =
      this.templates.find((t) => t.id === templateId) ||
      this.templates.find((t) => t.id === project.activeTemplateId) ||
      this.templates[0];
    const plan = this.buildEnhancementPlan(project.analysis, template.id);
    const row = await this.prisma.excelProject.update({
      where: { id },
      data: { status: 'enhanced', activeTemplateId: template.id, enhancementPlan: plan as any },
    });
    return this.fromDb(row);
  }

  async applyAction(userId: string, id: string, action: string) {
    const project = await this.getProject(userId, id);
    const normalized = String(action || '').trim();
    if (!normalized) throw new BadRequestException('Missing Excel Studio action');
    const labels: Record<string, string> = {
      executiveSummary: 'Added executive summary sheet',
      auditSheet: 'Added workbook audit sheet',
      dashboardSheet: 'Added KPI dashboard sheet',
      standardizeHeaders: 'Standardized header presentation layer',
      freezeHeaderRow: 'Marked header rows for freeze panes',
      protectSource: 'Marked source sheets as protected',
      validateDuplicates: 'Ran duplicate row validation',
      reviewBlanks: 'Ran blank row and column review',
      formulaAudit: 'Ran formula dependency audit',
      modernizeWorkbook: 'Applied modern workbook presentation system',
    };
    const label = labels[normalized] || normalized.replace(/([A-Z])/g, ' $1').trim();
    const generatedOperations = this.operationsForEnhancementAction(project, normalized);
    for (const operation of generatedOperations) {
      await this.createWorkbookOperation(userId, id, operation);
    }
    const refreshed = await this.getProject(userId, id);
    const appliedActions = [
      ...(refreshed.appliedActions || []),
      { id: crypto.randomUUID(), action: normalized, label, createdAt: new Date().toISOString() },
    ];
    const enhancementPlan = Array.from(new Set([...(refreshed.enhancementPlan || []), label]));
    const row = await this.prisma.excelProject.update({
      where: { id },
      data: {
        status: 'enhanced',
        appliedActions: appliedActions as any,
        enhancementPlan: enhancementPlan as any,
      },
    });
    return this.fromDb(row);
  }

  async listWorkbookOperations(
    userId: string,
    id: string,
  ): Promise<ExcelWorkbookOperationRecord[]> {
    await this.getProject(userId, id);
    const rows = await (this.prisma as any).excelWorkbookOperation.findMany({
      where: { projectId: id, userId },
      orderBy: { sequence: 'asc' },
    });
    return rows.map((row: any) => this.operationFromDb(row));
  }

  async createWorkbookOperation(
    userId: string,
    id: string,
    input: ExcelWorkbookOperationInput,
  ): Promise<ExcelWorkbookOperationRecord> {
    const project = await this.getProject(userId, id);
    const type = String(input?.type || '').trim();
    if (!this.isSupportedOperationType(type))
      throw new BadRequestException(`Unsupported workbook operation: ${type || 'missing'}`);
    const workbook = await this.buildWorkbookWithOperations(project);
    const beforeState = this.captureOperationState(workbook, input);
    this.applyWorkbookOperationToWorkbook(workbook, input);
    const afterState = this.captureOperationState(workbook, input);
    const nextSequence = await this.nextOperationSequence(id);
    const version = await this.createVersionRow(userId, id, {
      label: `${nextSequence}: ${type}`,
      beforeState,
      afterState,
      operationIds: [],
      snapshotPath: '',
    });
    const row = await (this.prisma as any).excelWorkbookOperation.create({
      data: {
        id: crypto.randomUUID(),
        projectId: id,
        userId,
        versionId: version.id,
        sequence: nextSequence,
        type,
        sheetName: input.sheetName || (input.target as any)?.sheetName || null,
        target: (input.target || {}) as any,
        payload: (input.payload || {}) as any,
        beforeState: beforeState as any,
        afterState: afterState as any,
        source: input.source || 'user',
        status: 'approved',
      },
    });
    await (this.prisma as any).excelWorkbookVersion.update({
      where: { id: version.id },
      data: { operationIds: [row.id] as any },
    });
    await this.refreshProjectAnalysisFromOperations(userId, id);
    return this.operationFromDb(row);
  }

  async undoLastWorkbookOperation(userId: string, id: string) {
    await this.getProject(userId, id);
    const row = await (this.prisma as any).excelWorkbookOperation.findFirst({
      where: { projectId: id, userId, status: 'approved' },
      orderBy: { sequence: 'desc' },
    });
    if (!row) throw new BadRequestException('No approved workbook operation to undo');
    const updated = await (this.prisma as any).excelWorkbookOperation.update({
      where: { id: row.id },
      data: { status: 'undone', undoneAt: new Date() },
    });
    await this.refreshProjectAnalysisFromOperations(userId, id);
    return this.operationFromDb(updated);
  }

  async redoLastWorkbookOperation(userId: string, id: string) {
    await this.getProject(userId, id);
    const row = await (this.prisma as any).excelWorkbookOperation.findFirst({
      where: { projectId: id, userId, status: 'undone' },
      orderBy: { sequence: 'asc' },
    });
    if (!row) throw new BadRequestException('No undone workbook operation to redo');
    const updated = await (this.prisma as any).excelWorkbookOperation.update({
      where: { id: row.id },
      data: { status: 'approved', redoneAt: new Date() },
    });
    await this.refreshProjectAnalysisFromOperations(userId, id);
    return this.operationFromDb(updated);
  }

  async createWorkbookSnapshot(userId: string, id: string, label?: string) {
    const project = await this.getProject(userId, id);
    const workbook = await this.buildWorkbookWithOperations(project);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    const operations = await this.listWorkbookOperations(userId, id);
    const version = await this.createVersionRow(userId, id, {
      label: label || `Snapshot ${new Date().toISOString()}`,
      beforeState: null,
      afterState: { operationCount: operations.filter((op) => op.status === 'approved').length },
      operationIds: operations.filter((op) => op.status === 'approved').map((op) => op.id),
      snapshotPath: '',
    });
    const snapshotId = crypto.randomUUID();
    const relPath = path.join(
      'uploads',
      'excel-studio',
      'workbooks',
      `${id}-snapshot-${snapshotId}.xlsx`,
    );
    fs.writeFileSync(path.join(process.cwd(), relPath), buffer);
    await (this.prisma as any).excelWorkbookVersion.update({
      where: { id: version.id },
      data: { snapshotPath: relPath },
    });
    const row = await (this.prisma as any).excelWorkbookSnapshot.create({
      data: {
        id: snapshotId,
        projectId: id,
        userId,
        versionId: version.id,
        label: label || null,
        workbookPath: relPath,
        analysis: this.analyzeWorkbook(buffer, project.filename) as any,
        operationIds: operations.filter((op) => op.status === 'approved').map((op) => op.id) as any,
      },
    });
    return this.snapshotFromDb(row);
  }

  async listWorkbookSnapshots(userId: string, id: string) {
    await this.getProject(userId, id);
    const rows = await (this.prisma as any).excelWorkbookSnapshot.findMany({
      where: { projectId: id, userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: any) => this.snapshotFromDb(row));
  }

  async restoreWorkbookSnapshot(userId: string, id: string, snapshotId: string) {
    const project = await this.getProject(userId, id);
    const snapshot = await (this.prisma as any).excelWorkbookSnapshot.findFirst({
      where: { id: snapshotId, projectId: id, userId },
    });
    if (!snapshot) throw new NotFoundException('Workbook snapshot not found');
    const keep = new Set<string>(Array.isArray(snapshot.operationIds) ? snapshot.operationIds : []);
    await (this.prisma as any).excelWorkbookOperation.updateMany({
      where: { projectId: id, userId, id: { notIn: Array.from(keep) } },
      data: { status: 'undone', undoneAt: new Date() },
    });
    await (this.prisma as any).excelWorkbookOperation.updateMany({
      where: { projectId: id, userId, id: { in: Array.from(keep) } },
      data: { status: 'approved', redoneAt: new Date() },
    });
    await (this.prisma as any).excelWorkbookSnapshot.update({
      where: { id: snapshot.id },
      data: { restoredAt: new Date() },
    });
    await this.refreshProjectAnalysisFromOperations(userId, id);
    return this.getProject(userId, project.id);
  }

  async compareWorkbookSnapshots(
    userId: string,
    id: string,
    beforeSnapshotId: string,
    afterSnapshotId: string,
  ): Promise<ExcelWorkbookDiff> {
    await this.getProject(userId, id);
    const rows = await (this.prisma as any).excelWorkbookSnapshot.findMany({
      where: { projectId: id, userId, id: { in: [beforeSnapshotId, afterSnapshotId] } },
    });
    const before = rows.find((row: any) => row.id === beforeSnapshotId);
    const after = rows.find((row: any) => row.id === afterSnapshotId);
    if (!before || !after)
      throw new NotFoundException('Both workbook snapshots are required for comparison');
    return this.diffWorkbookBuffers(
      fs.readFileSync(path.join(process.cwd(), before.workbookPath)),
      fs.readFileSync(path.join(process.cwd(), after.workbookPath)),
    );
  }

  async getReports(userId: string) {
    const projects = await this.listProjects(userId);
    const total = projects.length;
    const average = total
      ? Math.round(projects.reduce((s, p) => s + p.analysis.scores.overall, 0) / total)
      : 0;
    const issues = projects.flatMap((p) => p.analysis.issues);
    return {
      totalProjects: total,
      averageQuality: average,
      criticalIssues: issues.filter((i) => i.severity === 'critical').length,
      warningIssues: issues.filter((i) => i.severity === 'warning').length,
      recent: projects.slice(0, 8),
      templateCoverage: this.templates.map((t) => ({
        templateId: t.id,
        name: t.name,
        projects: projects.filter((p) => p.activeTemplateId === t.id).length,
      })),
    };
  }

  private isSupportedOperationType(type: string) {
    return new Set([
      'setCellValue',
      'setFormula',
      'formatCell',
      'formatRange',
      'insertRow',
      'deleteRow',
      'insertColumn',
      'deleteColumn',
      'renameSheet',
      'createSheet',
      'deleteSheet',
      'moveSheet',
      'freezePane',
      'mergeCells',
      'unmergeCells',
    ]).has(type);
  }

  private operationFromDb(row: any): ExcelWorkbookOperationRecord {
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      versionId: row.versionId,
      sequence: row.sequence,
      type: row.type,
      sheetName: row.sheetName || undefined,
      target: row.target || {},
      payload: row.payload || {},
      beforeState: row.beforeState || null,
      afterState: row.afterState || null,
      status: row.status,
      source: row.source || 'user',
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      undoneAt: row.undoneAt instanceof Date ? row.undoneAt.toISOString() : row.undoneAt,
      redoneAt: row.redoneAt instanceof Date ? row.redoneAt.toISOString() : row.redoneAt,
    } as ExcelWorkbookOperationRecord;
  }

  private snapshotFromDb(row: any) {
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      versionId: row.versionId,
      label: row.label,
      workbookPath: row.workbookPath,
      analysis: row.analysis,
      operationIds: Array.isArray(row.operationIds) ? row.operationIds : [],
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      restoredAt: row.restoredAt instanceof Date ? row.restoredAt.toISOString() : row.restoredAt,
    };
  }

  private async nextOperationSequence(projectId: string) {
    const latest = await (this.prisma as any).excelWorkbookOperation.findFirst({
      where: { projectId },
      orderBy: { sequence: 'desc' },
    });
    return Number(latest?.sequence || 0) + 1;
  }

  private async createVersionRow(
    userId: string,
    projectId: string,
    input: {
      label?: string;
      beforeState?: any;
      afterState?: any;
      operationIds?: string[];
      snapshotPath?: string;
    },
  ) {
    const latest = await (this.prisma as any).excelWorkbookVersion.findFirst({
      where: { projectId },
      orderBy: { versionNumber: 'desc' },
    });
    return (this.prisma as any).excelWorkbookVersion.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        userId,
        versionNumber: Number(latest?.versionNumber || 0) + 1,
        label: input.label || null,
        beforeState: input.beforeState ?? null,
        afterState: input.afterState ?? null,
        operationIds: input.operationIds || [],
        snapshotPath: input.snapshotPath || null,
      },
    });
  }

  private async activeWorkbookOperations(
    projectId: string,
  ): Promise<ExcelWorkbookOperationInput[]> {
    const rows = await (this.prisma as any).excelWorkbookOperation.findMany({
      where: { projectId, status: 'approved' },
      orderBy: { sequence: 'asc' },
    });
    return rows.map((row: any) => ({
      type: row.type,
      sheetName: row.sheetName || undefined,
      target: row.target || {},
      payload: row.payload || {},
      source: row.source || 'user',
    }));
  }

  private async buildWorkbookWithOperations(project: ExcelStudioProject) {
    const workbook = this.readOriginalWorkbook(project);
    const operations = await this.activeWorkbookOperations(project.id);
    for (const operation of operations) {
      this.applyWorkbookOperationToWorkbook(workbook, operation);
    }
    return workbook;
  }

  private async refreshProjectAnalysisFromOperations(userId: string, projectId: string) {
    const project = await this.getProject(userId, projectId);
    const workbook = await this.buildWorkbookWithOperations(project);
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    const analysis = this.analyzeWorkbook(buffer, project.filename);
    await this.prisma.excelProject.update({
      where: { id: projectId },
      data: {
        analysis: analysis as any,
        enhancementPlan: this.buildEnhancementPlan(analysis, project.activeTemplateId) as any,
      },
    });
  }

  private captureOperationState(workbook: XLSX.WorkBook, operation: ExcelWorkbookOperationInput) {
    const sheetName = this.resolveOperationSheetName(workbook, operation);
    const target = operation.target || {};
    if (
      operation.type === 'renameSheet' ||
      operation.type === 'deleteSheet' ||
      operation.type === 'moveSheet'
    ) {
      return { sheetNames: [...workbook.SheetNames], sheetName };
    }
    if (operation.type === 'createSheet') {
      return {
        sheetNames: [...workbook.SheetNames],
        exists: Boolean(sheetName && workbook.Sheets[sheetName]),
      };
    }
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) return { sheetName, missing: true };
    const range = this.operationRange(operation);
    if (range) {
      return {
        sheetName,
        range: XLSX.utils.encode_range(range),
        cells: this.captureRangeCells(sheet, range),
      };
    }
    const address = this.operationAddress(operation);
    return {
      sheetName,
      address,
      cell: address ? this.cloneCell((sheet as any)[address]) : undefined,
    };
  }

  private applyWorkbookOperationToWorkbook(
    workbook: XLSX.WorkBook,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheetName = this.resolveOperationSheetName(workbook, operation);
    switch (operation.type) {
      case 'setCellValue':
        return this.applySetCellValue(workbook, sheetName, operation);
      case 'setFormula':
        return this.applySetFormula(workbook, sheetName, operation);
      case 'formatCell':
      case 'formatRange':
        return this.applyFormatOperation(workbook, sheetName, operation);
      case 'insertRow':
        return this.applyInsertRowsOrColumns(workbook, sheetName, operation, 'row', 1);
      case 'deleteRow':
        return this.applyInsertRowsOrColumns(workbook, sheetName, operation, 'row', -1);
      case 'insertColumn':
        return this.applyInsertRowsOrColumns(workbook, sheetName, operation, 'column', 1);
      case 'deleteColumn':
        return this.applyInsertRowsOrColumns(workbook, sheetName, operation, 'column', -1);
      case 'renameSheet':
        return this.applyRenameSheet(
          workbook,
          sheetName,
          String(operation.payload?.name || operation.payload?.newName || 'Sheet'),
        );
      case 'createSheet':
        return this.applyCreateSheet(workbook, operation);
      case 'deleteSheet':
        return this.applyDeleteSheet(workbook, sheetName);
      case 'moveSheet':
        return this.applyMoveSheet(
          workbook,
          sheetName,
          Number(operation.payload?.index ?? operation.target?.index ?? 0),
        );
      case 'freezePane':
        return this.applyFreezePane(workbook, sheetName, operation);
      case 'mergeCells':
        return this.applyMergeCells(workbook, sheetName, operation);
      case 'unmergeCells':
        return this.applyUnmergeCells(workbook, sheetName, operation);
    }
  }

  private resolveOperationSheetName(
    workbook: XLSX.WorkBook,
    operation: ExcelWorkbookOperationInput,
  ) {
    const requested =
      operation.sheetName ||
      String(operation.target?.sheetName || operation.payload?.sheetName || '');
    if (requested && workbook.Sheets[requested]) return requested;
    return requested || workbook.SheetNames[0];
  }

  private operationAddress(operation: ExcelWorkbookOperationInput) {
    const target = operation.target || {};
    if (typeof target.address === 'string') return target.address.toUpperCase();
    if (Number.isInteger(target.row) && Number.isInteger(target.column)) {
      return XLSX.utils.encode_cell({ r: Number(target.row), c: Number(target.column) });
    }
    return undefined;
  }

  private operationRange(operation: ExcelWorkbookOperationInput): XLSX.Range | undefined {
    const target = operation.target || {};
    if (typeof target.range === 'string') return XLSX.utils.decode_range(target.range);
    if (target.start && target.end)
      return {
        s: { r: Number(target.start.row), c: Number(target.start.column) },
        e: { r: Number(target.end.row), c: Number(target.end.column) },
      };
    const address = this.operationAddress(operation);
    if (address) {
      const cell = XLSX.utils.decode_cell(address);
      return { s: cell, e: cell };
    }
    return undefined;
  }

  private captureRangeCells(sheet: XLSX.WorkSheet, range: XLSX.Range) {
    const cells: Record<string, any> = {};
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const address = XLSX.utils.encode_cell({ r, c });
        cells[address] = this.cloneCell((sheet as any)[address]);
      }
    }
    return cells;
  }

  private cloneCell(cell: any) {
    return cell ? JSON.parse(JSON.stringify(cell)) : null;
  }

  private ensureSheet(workbook: XLSX.WorkBook, sheetName?: string) {
    const name = sheetName || workbook.SheetNames[0] || 'Sheet1';
    if (!workbook.Sheets[name]) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([[]]),
        this.safeSheetName(name),
      );
    }
    return workbook.Sheets[name] || workbook.Sheets[workbook.SheetNames[0]];
  }

  private applySetCellValue(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const address = this.operationAddress(operation);
    if (!address)
      throw new BadRequestException('setCellValue requires target.address or target.row/column');
    const value = operation.payload?.value ?? '';
    (sheet as any)[address] = this.valueToCell(value);
    this.expandSheetRef(sheet, address);
  }

  private applySetFormula(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const address = this.operationAddress(operation);
    if (!address)
      throw new BadRequestException('setFormula requires target.address or target.row/column');
    const formula = String(operation.payload?.formula || '').replace(/^=/, '');
    (sheet as any)[address] = { t: 'n', f: formula, v: operation.payload?.cachedValue ?? 0 };
    this.expandSheetRef(sheet, address);
  }

  private valueToCell(value: any) {
    if (typeof value === 'number' && Number.isFinite(value)) return { t: 'n', v: value };
    if (typeof value === 'boolean') return { t: 'b', v: value };
    if (value instanceof Date) return { t: 'd', v: value };
    return { t: 's', v: String(value ?? '') };
  }

  private expandSheetRef(sheet: XLSX.WorkSheet, address: string) {
    const cell = XLSX.utils.decode_cell(address);
    const current = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : { s: cell, e: cell };
    current.s.r = Math.min(current.s.r, cell.r);
    current.s.c = Math.min(current.s.c, cell.c);
    current.e.r = Math.max(current.e.r, cell.r);
    current.e.c = Math.max(current.e.c, cell.c);
    sheet['!ref'] = XLSX.utils.encode_range(current);
  }

  private applyFormatOperation(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const range = this.operationRange(operation);
    if (!range)
      throw new BadRequestException(`${operation.type} requires a target range or address`);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const address = XLSX.utils.encode_cell({ r, c });
        if (!(sheet as any)[address]) (sheet as any)[address] = { t: 's', v: '' };
        (sheet as any)[address].s = this.mergeCellStyles(
          (sheet as any)[address].s,
          operation.payload?.style || operation.payload || {},
        );
      }
    }
  }

  private mergeCellStyles(existing: any, incoming: any) {
    const next = { ...(existing || {}) };
    if (incoming.bold !== undefined || incoming.italic !== undefined || incoming.textColor) {
      next.font = {
        ...(next.font || {}),
        bold: incoming.bold,
        italic: incoming.italic,
        color: incoming.textColor ? { rgb: this.toArgb(incoming.textColor) } : next.font?.color,
      };
    }
    if (incoming.fillColor)
      next.fill = {
        ...(next.fill || {}),
        fgColor: { rgb: this.toArgb(incoming.fillColor) },
        patternType: 'solid',
      };
    if (incoming.numberFormat) next.numFmt = incoming.numberFormat;
    if (incoming.horizontal || incoming.vertical)
      next.alignment = {
        ...(next.alignment || {}),
        horizontal: incoming.horizontal,
        vertical: incoming.vertical,
      };
    if (incoming.protection) next.protection = incoming.protection;
    return next;
  }

  private toArgb(color: string) {
    const hex = String(color || '')
      .replace(/^#/, '')
      .toUpperCase();
    if (hex.length === 8) return hex;
    if (hex.length === 6) return `FF${hex}`;
    return 'FFFFFFFF';
  }

  private applyInsertRowsOrColumns(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
    axis: 'row' | 'column',
    direction: 1 | -1,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const ref = sheet['!ref']
      ? XLSX.utils.decode_range(sheet['!ref'])
      : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };
    const index = Number(operation.target?.index ?? operation.target?.[axis] ?? 0);
    const count = Math.max(1, Number(operation.payload?.count || 1));
    const metadata = this.captureWorksheetMetadata(sheet);

    // Collect all non-metadata keys preserving full cell objects (formulas included)
    const cellKeys = Object.keys(sheet).filter((k) => !k.startsWith('!'));
    const newSheet: Record<string, any> = {};

    for (const key of cellKeys) {
      const decoded = XLSX.utils.decode_cell(key);
      let newR = decoded.r;
      let newC = decoded.c;
      if (axis === 'row') {
        if (direction > 0) {
          // Insert: shift rows at or after `index` down by count
          if (newR >= index) newR += count;
        } else {
          // Delete: drop rows in [index, index+count), shift the rest up
          if (newR >= index && newR < index + count) continue; // deleted
          if (newR >= index + count) newR -= count;
        }
      } else {
        if (direction > 0) {
          if (newC >= index) newC += count;
        } else {
          if (newC >= index && newC < index + count) continue;
          if (newC >= index + count) newC -= count;
        }
      }
      newSheet[XLSX.utils.encode_cell({ r: newR, c: newC })] = sheet[key];
    }

    // Rebuild !ref
    let minR = Infinity,
      minC = Infinity,
      maxR = -Infinity,
      maxC = -Infinity;
    for (const key of Object.keys(newSheet)) {
      const { r, c } = XLSX.utils.decode_cell(key);
      if (r < minR) minR = r;
      if (c < minC) minC = c;
      if (r > maxR) maxR = r;
      if (c > maxC) maxC = c;
    }
    const newRef =
      minR <= maxR && minC <= maxC
        ? XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } })
        : XLSX.utils.encode_range(ref);

    const shiftedMetadata = this.shiftWorksheetMetadata(metadata, axis, direction, index, count);
    for (const key of Object.keys(sheet)) delete (sheet as any)[key];
    Object.assign(sheet, shiftedMetadata);
    sheet['!ref'] = newRef;
    Object.assign(sheet, newSheet);
  }

  private captureWorksheetMetadata(sheet: XLSX.WorkSheet): Record<string, any> {
    const metadata: Record<string, any> = {};
    for (const key of Object.keys(sheet)) {
      if (key.startsWith('!')) metadata[key] = this.cloneCell((sheet as any)[key]);
    }
    return metadata;
  }

  private shiftWorksheetMetadata(
    metadata: Record<string, any>,
    axis: 'row' | 'column',
    direction: 1 | -1,
    index: number,
    count: number,
  ): Record<string, any> {
    const next = { ...metadata };
    if (Array.isArray(next['!merges'])) {
      next['!merges'] = next['!merges']
        .map((merge: XLSX.Range) => this.shiftRange(merge, axis, direction, index, count))
        .filter(Boolean);
    }
    if (axis === 'row' && Array.isArray(next['!rows'])) {
      next['!rows'] = this.shiftIndexedMetadata(next['!rows'], direction, index, count);
    }
    if (axis === 'column' && Array.isArray(next['!cols'])) {
      next['!cols'] = this.shiftIndexedMetadata(next['!cols'], direction, index, count);
    }
    return next;
  }

  private shiftRange(
    range: XLSX.Range,
    axis: 'row' | 'column',
    direction: 1 | -1,
    index: number,
    count: number,
  ): XLSX.Range | null {
    const next: XLSX.Range = JSON.parse(JSON.stringify(range));
    const start = axis === 'row' ? next.s.r : next.s.c;
    const end = axis === 'row' ? next.e.r : next.e.c;
    if (direction > 0) {
      if (start >= index) {
        if (axis === 'row') {
          next.s.r += count;
          next.e.r += count;
        } else {
          next.s.c += count;
          next.e.c += count;
        }
      } else if (end >= index) {
        if (axis === 'row') next.e.r += count;
        else next.e.c += count;
      }
      return next;
    }

    const deleteEnd = index + count - 1;
    if (start >= index && end <= deleteEnd) return null;
    if (end < index) return next;
    if (start > deleteEnd) {
      if (axis === 'row') {
        next.s.r -= count;
        next.e.r -= count;
      } else {
        next.s.c -= count;
        next.e.c -= count;
      }
      return next;
    }
    if (axis === 'row') {
      next.s.r = start >= index ? index : next.s.r;
      next.e.r = Math.max(next.s.r, next.e.r - Math.min(count, Math.max(0, deleteEnd - start + 1)));
    } else {
      next.s.c = start >= index ? index : next.s.c;
      next.e.c = Math.max(next.s.c, next.e.c - Math.min(count, Math.max(0, deleteEnd - start + 1)));
    }
    return next;
  }

  private shiftIndexedMetadata(
    items: any[],
    direction: 1 | -1,
    index: number,
    count: number,
  ): any[] {
    const shifted: any[] = [];
    items.forEach((item, originalIndex) => {
      if (direction > 0) {
        shifted[originalIndex >= index ? originalIndex + count : originalIndex] = item;
        return;
      }
      if (originalIndex >= index && originalIndex < index + count) return;
      shifted[originalIndex >= index + count ? originalIndex - count : originalIndex] = item;
    });
    return shifted;
  }

  private applyRenameSheet(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    nextNameRaw: string,
  ) {
    if (!sheetName || !workbook.Sheets[sheetName])
      throw new BadRequestException('renameSheet requires an existing sheet');
    const nextName = this.uniqueSheetName(workbook, nextNameRaw);
    workbook.Sheets[nextName] = workbook.Sheets[sheetName];
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.map((name) => (name === sheetName ? nextName : name));
  }

  private applyCreateSheet(workbook: XLSX.WorkBook, operation: ExcelWorkbookOperationInput) {
    const name = this.uniqueSheetName(
      workbook,
      String(
        operation.payload?.name || operation.sheetName || operation.target?.sheetName || 'Sheet',
      ),
    );
    const rows = Array.isArray(operation.payload?.rows) ? operation.payload.rows : [[]];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
  }

  private applyDeleteSheet(workbook: XLSX.WorkBook, sheetName: string | undefined) {
    if (!sheetName || !workbook.Sheets[sheetName])
      throw new BadRequestException('deleteSheet requires an existing sheet');
    if (workbook.SheetNames.length <= 1)
      throw new BadRequestException('Cannot delete the last worksheet');
    delete workbook.Sheets[sheetName];
    workbook.SheetNames = workbook.SheetNames.filter((name) => name !== sheetName);
  }

  private applyMoveSheet(workbook: XLSX.WorkBook, sheetName: string | undefined, index: number) {
    if (!sheetName || !workbook.Sheets[sheetName])
      throw new BadRequestException('moveSheet requires an existing sheet');
    const names = workbook.SheetNames.filter((name) => name !== sheetName);
    names.splice(Math.max(0, Math.min(index, names.length)), 0, sheetName);
    workbook.SheetNames = names;
  }

  private applyFreezePane(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    (sheet as any)['!freeze'] = {
      xSplit: Number(operation.payload?.columns ?? operation.target?.columns ?? 0),
      ySplit: Number(operation.payload?.rows ?? operation.target?.rows ?? 1),
    };
  }

  private applyMergeCells(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const range = this.operationRange(operation);
    if (!range) throw new BadRequestException('mergeCells requires a target range');
    sheet['!merges'] = [...(sheet['!merges'] || []), range];
  }

  private applyUnmergeCells(
    workbook: XLSX.WorkBook,
    sheetName: string | undefined,
    operation: ExcelWorkbookOperationInput,
  ) {
    const sheet = this.ensureSheet(workbook, sheetName);
    const range = this.operationRange(operation);
    if (!range) {
      sheet['!merges'] = [];
      return;
    }
    const encoded = XLSX.utils.encode_range(range);
    sheet['!merges'] = (sheet['!merges'] || []).filter(
      (merge) => XLSX.utils.encode_range(merge) !== encoded,
    );
  }

  private diffWorkbookBuffers(beforeBuffer: Buffer, afterBuffer: Buffer): ExcelWorkbookDiff {
    const before = XLSX.read(beforeBuffer, {
      type: 'buffer',
      cellFormula: true,
      cellDates: true,
      cellStyles: true,
      raw: false,
    });
    const after = XLSX.read(afterBuffer, {
      type: 'buffer',
      cellFormula: true,
      cellDates: true,
      cellStyles: true,
      raw: false,
    });
    return this.diffWorkbooks(before, after);
  }

  private diffWorkbooks(before: XLSX.WorkBook, after: XLSX.WorkBook): ExcelWorkbookDiff {
    const added: Array<Record<string, any>> = [];
    const removed: Array<Record<string, any>> = [];
    const changed: Array<Record<string, any>> = [];
    const beforeSheets = new Set(before.SheetNames);
    const afterSheets = new Set(after.SheetNames);
    for (const sheetName of after.SheetNames)
      if (!beforeSheets.has(sheetName)) added.push({ type: 'sheet', sheetName });
    for (const sheetName of before.SheetNames)
      if (!afterSheets.has(sheetName)) removed.push({ type: 'sheet', sheetName });
    for (const sheetName of before.SheetNames.filter((name) => afterSheets.has(name))) {
      const beforeCells = this.flatSheetCells(before.Sheets[sheetName]);
      const afterCells = this.flatSheetCells(after.Sheets[sheetName]);
      const keys = new Set([...Object.keys(beforeCells), ...Object.keys(afterCells)]);
      for (const address of keys) {
        const oldCell = beforeCells[address];
        const newCell = afterCells[address];
        if (!oldCell && newCell) added.push({ type: 'cell', sheetName, address, value: newCell });
        else if (oldCell && !newCell)
          removed.push({ type: 'cell', sheetName, address, value: oldCell });
        else if (JSON.stringify(oldCell) !== JSON.stringify(newCell))
          changed.push({ type: 'cell', sheetName, address, before: oldCell, after: newCell });
      }
      const beforeMerges = new Set(
        (before.Sheets[sheetName]?.['!merges'] || []).map((merge) =>
          XLSX.utils.encode_range(merge),
        ),
      );
      const afterMerges = new Set(
        (after.Sheets[sheetName]?.['!merges'] || []).map((merge) => XLSX.utils.encode_range(merge)),
      );
      for (const merge of afterMerges)
        if (!beforeMerges.has(merge)) added.push({ type: 'merge', sheetName, range: merge });
      for (const merge of beforeMerges)
        if (!afterMerges.has(merge)) removed.push({ type: 'merge', sheetName, range: merge });
    }
    return { added, removed, changed };
  }

  private flatSheetCells(sheet: XLSX.WorkSheet) {
    const out: Record<string, any> = {};
    for (const key of Object.keys(sheet || {})) {
      if (key.startsWith('!')) continue;
      const cell: any = (sheet as any)[key];
      out[key] = {
        value: cell?.v ?? null,
        formula: cell?.f ?? null,
        type: cell?.t ?? null,
        formatted: cell?.w ?? null,
        style: cell?.s ?? null,
      };
    }
    return out;
  }

  private operationsForEnhancementAction(
    project: ExcelStudioProject,
    action: string,
  ): ExcelWorkbookOperationInput[] {
    const firstSheet = project.analysis.worksheets[0]?.name || 'Sheet1';
    const headerStyle = {
      fillColor: '#263F34',
      textColor: '#FFFFFF',
      bold: true,
      horizontal: 'center',
    };
    const allHeaderFormats = project.analysis.worksheets.map((sheet) => ({
      type: 'formatRange' as const,
      sheetName: sheet.name,
      target: { range: `A1:${this.columnName(Math.max(0, sheet.columns - 1))}1` },
      payload: { style: headerStyle },
      source: 'enhancement' as const,
    }));
    const operations: Record<string, ExcelWorkbookOperationInput[]> = {
      executiveSummary: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Summary', rows: this.summaryRows(project) },
          source: 'enhancement',
        },
      ],
      auditSheet: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Audit', rows: this.auditRows(project) },
          source: 'enhancement',
        },
      ],
      dashboardSheet: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Dashboard', rows: this.dashboardRows(project) },
          source: 'enhancement',
        },
      ],
      standardizeHeaders: allHeaderFormats,
      freezeHeaderRow: [
        {
          type: 'freezePane',
          sheetName: firstSheet,
          target: { rows: 1, columns: 0 },
          payload: { rows: 1, columns: 0 },
          source: 'enhancement',
        },
      ],
      protectSource: project.analysis.worksheets.map((sheet) => ({
        type: 'formatRange' as const,
        sheetName: sheet.name,
        target: { range: sheet.usedRange || 'A1:A1' },
        payload: { style: { protection: { locked: true } } },
        source: 'enhancement' as const,
      })),
      validateDuplicates: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Duplicate Review', rows: this.duplicateReviewRows(project) },
          source: 'enhancement',
        },
      ],
      reviewBlanks: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Blank Review', rows: this.blankReviewRows(project) },
          source: 'enhancement',
        },
      ],
      formulaAudit: [
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Formula Audit', rows: this.formulaAuditRows(project) },
          source: 'enhancement',
        },
      ],
      modernizeWorkbook: [
        ...allHeaderFormats,
        {
          type: 'freezePane',
          sheetName: firstSheet,
          target: { rows: 1, columns: 0 },
          payload: { rows: 1, columns: 0 },
          source: 'enhancement',
        },
        {
          type: 'createSheet',
          payload: { name: 'Pitchonix Template System', rows: this.templateSystemRows(project) },
          source: 'enhancement',
        },
      ],
    };
    return operations[action] || [];
  }

  private summaryRows(project: ExcelStudioProject) {
    return [
      ['Pitchonix Excel Studio Summary'],
      ['Workbook', project.title],
      ['Original file', project.filename],
      ['Template', project.activeTemplateId],
      ['Overall score', project.analysis.scores.overall],
      ['Formula integrity', project.analysis.scores.formulaIntegrity],
      ['Data quality', project.analysis.scores.dataQuality],
      ['Dashboard ready', project.analysis.scores.dashboardReadiness],
      [],
      ['Sheets', project.analysis.summary.sheets],
      ['Rows', project.analysis.summary.rows],
      ['Formulas', project.analysis.summary.formulas],
      ['Error cells', project.analysis.summary.errorCells],
      ['Duplicate rows', project.analysis.summary.duplicateRows],
      ['Blank rows', project.analysis.summary.blankRows],
    ];
  }

  private auditRows(project: ExcelStudioProject) {
    return [
      ['Severity', 'Category', 'Sheet', 'Issue', 'Detail', 'Suggested fix', 'Auto-fixable'],
      ...project.analysis.issues.map((issue) => [
        issue.severity,
        issue.category,
        issue.sheet || '',
        issue.title,
        issue.detail,
        issue.suggestedFix,
        issue.autoFixable ? 'Yes' : 'No',
      ]),
    ];
  }

  private dashboardRows(project: ExcelStudioProject) {
    return [
      ['Metric', 'Value'],
      ['Overall Quality', project.analysis.scores.overall],
      ['Formula Integrity', project.analysis.scores.formulaIntegrity],
      ['Readability', project.analysis.scores.readability],
      ['Executive Readiness', project.analysis.scores.executiveReadiness],
      ['Tables Detected', project.analysis.summary.tables],
      ['Issues Detected', project.analysis.issues.length],
    ];
  }

  private duplicateReviewRows(project: ExcelStudioProject) {
    return [
      ['Sheet', 'Duplicate preview rows', 'Recommendation'],
      ...project.analysis.worksheets.map((sheet) => [
        sheet.name,
        sheet.duplicateRows,
        sheet.duplicateRows
          ? 'Review duplicate rows before cleanup.'
          : 'No duplicate preview rows detected.',
      ]),
    ];
  }

  private blankReviewRows(project: ExcelStudioProject) {
    return [
      ['Sheet', 'Blank rows', 'Blank columns', 'Blank cells', 'Recommendation'],
      ...project.analysis.worksheets.map((sheet) => [
        sheet.name,
        sheet.blankRows,
        sheet.blankColumns,
        sheet.blanks,
        sheet.blankRows || sheet.blankColumns
          ? 'Review blanks before table conversion.'
          : 'No major blank structure issue detected.',
      ]),
    ];
  }

  private formulaAuditRows(project: ExcelStudioProject) {
    return [
      ['Sheet', 'Formula count', 'Error cells', 'Recommendation'],
      ...project.analysis.worksheets.map((sheet) => [
        sheet.name,
        sheet.formulas,
        sheet.errorCells,
        sheet.errorCells
          ? 'Fix formula errors before executive export.'
          : 'Formula structure appears stable in parsed range.',
      ]),
    ];
  }

  async exportProject(userId: string, id: string, format: string) {
    const project = await this.getProject(userId, id);
    const normalized = String(format || 'json').toLowerCase();
    const exportRec = {
      id: crypto.randomUUID(),
      format: normalized,
      createdAt: new Date().toISOString(),
    };
    const exports = [...(project.exports || []), exportRec];
    await this.prisma.excelProject.update({ where: { id }, data: { exports: exports as any } });

    if (normalized === 'original-xlsx' || normalized === 'original') {
      const ext = path.extname(project.filename).toLowerCase() || '.xlsx';
      const body = this.readOriginalWorkbookBuffer(project);
      // Original export = the imported workbook unchanged → reopen with no ops.
      if (/\.xlsx?$/.test(ext) && Buffer.isBuffer(body))
        await this.recordLedgerExportAndReopen(id, body, false);
      return {
        filename: `${this.slug(project.title)}-original${ext}`,
        contentType: this.contentTypeForExtension(ext),
        body,
      };
    }
    if (normalized === 'xlsx' || normalized === 'enhanced-xlsx') {
      const body = await this.buildEnhancedWorkbook(project, 'xlsx');
      // Enhanced export = original + applied operation log → reopen operation-aware.
      await this.recordLedgerExportAndReopen(id, body, true);
      return {
        filename: `${this.slug(project.title)}-pitchonix-enhanced.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body,
      };
    }
    if (normalized === 'xls' || normalized === 'enhanced-xls') {
      return {
        filename: `${this.slug(project.title)}-pitchonix-enhanced.xls`,
        contentType: 'application/vnd.ms-excel',
        body: await this.buildEnhancedWorkbook(project, 'xls'),
      };
    }
    if (
      normalized === 'comparison-xlsx' ||
      normalized === 'before-after-xlsx' ||
      normalized === 'board-package-xlsx'
    ) {
      return {
        filename: `${this.slug(project.title)}-${normalized}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: await this.buildPackageWorkbook(project, normalized),
      };
    }
    if (
      normalized === 'audit-pdf' ||
      normalized === 'executive-pdf' ||
      normalized === 'dashboard-pdf'
    ) {
      // buildReportPdf may fall back to HTML when Puppeteer is unavailable —
      // never mislabel HTML bytes as application/pdf. Honor its real type.
      const report = await this.buildReportPdf(project, normalized);
      return {
        filename: `${this.slug(project.title)}-${normalized}.${report.extension}`,
        contentType: report.mimetype,
        body: report.buffer,
      };
    }
    if (
      normalized === 'audit-csv' ||
      normalized === 'executive-report' ||
      normalized === 'change-log' ||
      normalized === 'issue-report'
    ) {
      return {
        filename: `${this.slug(project.title)}-${normalized}.csv`,
        contentType: 'text/csv',
        body:
          normalized === 'change-log'
            ? this.buildChangeLogCsv(project)
            : this.buildAuditCsv(project),
      };
    }
    if (normalized === 'csv') {
      const workbook = await this.buildWorkbookWithOperations(project);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(firstSheet, {
        header: 1,
        raw: false,
        defval: '',
      });
      return {
        filename: `${this.slug(project.title)}.csv`,
        contentType: 'text/csv',
        body: rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n'),
      };
    }
    return {
      filename: `${this.slug(project.title)}.json`,
      contentType: 'application/json',
      body: JSON.stringify(project, null, 2),
    };
  }

  // ── Workbook analysis ──────────────────────────────────────────────────────

  private analyzeWorkbook(buffer: Buffer, filename: string): ExcelStudioAnalysis {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        cellFormula: true,
        cellDates: true,
        cellStyles: true,
        raw: false,
      });
    } catch (error: any) {
      throw new BadRequestException(`Could not read workbook: ${error?.message || 'invalid file'}`);
    }

    const workbookSheets = workbook.Workbook?.Sheets || [];
    const worksheets: ExcelStudioWorksheet[] = workbook.SheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name];
      const ref = sheet?.['!ref'] || 'A1:A1';
      const range = XLSX.utils.decode_range(ref);
      const rows = Math.max(0, range.e.r - range.s.r + 1);
      const columns = Math.max(0, range.e.c - range.s.c + 1);
      const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: false });
      const previewRows = data
        .slice(0, MAX_PREVIEW_ROWS)
        .map((row) => row.map((cell) => String(cell ?? '')));
      const formulaCount = this.countFormulaCells(sheet);
      const inspection = this.inspectWorksheet(sheet, previewRows, rows, columns);
      const duplicateRows = this.countDuplicateRows(previewRows);
      const merges = this.getMergeRanges(sheet);
      const cells = this.buildCellGrid(sheet, range, merges);
      return {
        id: this.slug(name) || `sheet-${index + 1}`,
        name,
        rows,
        columns,
        usedRange: ref,
        hidden: Boolean(workbookSheets[index]?.Hidden),
        mergedCells: sheet?.['!merges']?.length || 0,
        formulas: formulaCount,
        errorCells: inspection.errorCells,
        currencyLikeCells: inspection.currencyLikeCells,
        dateLikeCells: inspection.dateLikeCells,
        numericCells: inspection.numericCells,
        blanks: inspection.blankCells,
        blankRows: inspection.blankRows,
        blankColumns: inspection.blankColumns,
        duplicateRows,
        previewRows,
        cells,
        merges,
        columnWidths: (sheet?.['!cols'] || []).map((col: any) => Number(col?.wch || col?.wpx || 0)),
        rowHeights: (sheet?.['!rows'] || []).map((row: any) => Number(row?.hpt || row?.hpx || 0)),
      };
    });

    const summary = {
      sheets: worksheets.length,
      rows: worksheets.reduce((s, w) => s + w.rows, 0),
      columns: worksheets.reduce((s, w) => Math.max(s, w.columns), 0),
      tables: worksheets.filter((w) => w.rows > 1 && w.columns > 1).length,
      namedRanges: workbook.Workbook?.Names?.length || 0,
      charts: 0,
      pivots: 0,
      formulas: worksheets.reduce((s, w) => s + w.formulas, 0),
      errorCells: worksheets.reduce((s, w) => s + w.errorCells, 0),
      validations: 0,
      conditionalFormatting: 0,
      hiddenSheets: worksheets.filter((w) => w.hidden).length,
      mergedCells: worksheets.reduce((s, w) => s + w.mergedCells, 0),
      duplicateRows: worksheets.reduce((s, w) => s + w.duplicateRows, 0),
      blankRows: worksheets.reduce((s, w) => s + w.blankRows, 0),
      blankColumns: worksheets.reduce((s, w) => s + w.blankColumns, 0),
      blankCells: worksheets.reduce((s, w) => s + w.blanks, 0),
      dependencies: worksheets.reduce((s, w) => s + w.formulas, 0),
    };

    const issues = this.detectIssues(worksheets, filename);
    const scores = this.scoreWorkbook(summary, issues);
    return {
      summary,
      scores,
      scoreExplanations: this.explainScores(summary, issues, scores),
      issues,
      worksheets,
      recommendations: this.buildRecommendations(summary, issues),
      auditGeneratedAt: new Date().toISOString(),
    };
  }

  private getMergeRanges(sheet: XLSX.WorkSheet): ExcelStudioMergeRange[] {
    return (sheet?.['!merges'] || []).map((merge: XLSX.Range) => ({
      startRow: merge.s.r,
      startColumn: merge.s.c,
      endRow: merge.e.r,
      endColumn: merge.e.c,
    }));
  }

  private buildCellGrid(
    sheet: XLSX.WorkSheet,
    range: XLSX.Range,
    merges: ExcelStudioMergeRange[],
  ): ExcelStudioCell[][] {
    const maxRows = Math.min(MAX_PREVIEW_ROWS, Math.max(1, range.e.r - range.s.r + 1));
    const maxCols = Math.min(40, Math.max(1, range.e.c - range.s.c + 1));
    const grid: ExcelStudioCell[][] = [];
    for (let r = range.s.r; r < range.s.r + maxRows; r++) {
      const row: ExcelStudioCell[] = [];
      for (let c = range.s.c; c < range.s.c + maxCols; c++) {
        const address = XLSX.utils.encode_cell({ r, c });
        const cell: any = sheet[address] || {};
        const merge = merges.find(
          (m) => r >= m.startRow && r <= m.endRow && c >= m.startColumn && c <= m.endColumn,
        );
        const mergeMaster = Boolean(merge && merge.startRow === r && merge.startColumn === c);
        const display = cell.w ?? cell.v ?? '';
        row.push({
          address,
          row: r,
          column: c,
          value: String(display ?? ''),
          rawValue: cell.v instanceof Date ? cell.v.toISOString() : (cell.v ?? null),
          formula: cell.f ? String(cell.f) : undefined,
          type: cell.t ? String(cell.t) : undefined,
          formatted: cell.w ? String(cell.w) : undefined,
          numberFormat: cell.z ? String(cell.z) : undefined,
          isMerged: Boolean(merge),
          mergeMaster,
          mergeSpan: mergeMaster
            ? {
                rows: merge.endRow - merge.startRow + 1,
                columns: merge.endColumn - merge.startColumn + 1,
              }
            : undefined,
          style: this.readCellStyle(cell.s),
        });
      }
      grid.push(row);
    }
    return grid;
  }

  private readCellStyle(style: any): ExcelStudioCell['style'] | undefined {
    if (!style) return undefined;
    const fillColor = style.fill?.fgColor?.rgb || style.fill?.fgColor?.theme;
    const textColor = style.font?.color?.rgb || style.font?.color?.theme;
    return {
      bold: Boolean(style.font?.bold),
      italic: Boolean(style.font?.italic),
      fillColor: fillColor ? String(fillColor).replace(/^FF/i, '#') : undefined,
      textColor: textColor ? String(textColor).replace(/^FF/i, '#') : undefined,
      horizontal: style.alignment?.horizontal,
      vertical: style.alignment?.vertical,
    };
  }

  // ── Issue detection ────────────────────────────────────────────────────────

  private detectIssues(worksheets: ExcelStudioWorksheet[], filename: string): ExcelStudioIssue[] {
    const issues: ExcelStudioIssue[] = [];
    const add = (issue: Omit<ExcelStudioIssue, 'id'>) =>
      issues.push({ id: crypto.randomUUID(), ...issue });
    if (!worksheets.length) {
      add({
        severity: 'critical',
        category: 'structure',
        title: 'Workbook has no readable sheets',
        detail: `${filename} did not expose any readable worksheet data.`,
        suggestedFix: 'Re-upload a valid XLSX, XLS, or CSV file.',
        autoFixable: false,
      });
    }
    const normalizedNames = new Map<string, string[]>();
    for (const sheet of worksheets) {
      const key = sheet.name
        .toLowerCase()
        .replace(/\s*\(\d+\)\s*$/g, '')
        .trim();
      normalizedNames.set(key, [...(normalizedNames.get(key) || []), sheet.name]);
    }
    for (const names of normalizedNames.values()) {
      if (names.length > 1)
        add({
          severity: 'warning',
          category: 'structure',
          title: 'Potential duplicate sheets',
          detail: `Sheets ${names.join(', ')} look like duplicate versions of the same worksheet.`,
          suggestedFix:
            'Consolidate duplicate sheets or clearly label source, working, and final tabs.',
          autoFixable: false,
        });
    }
    for (const sheet of worksheets) {
      if (sheet.rows === 0 || sheet.columns === 0)
        add({
          severity: 'warning',
          category: 'structure',
          title: 'Empty worksheet',
          detail: `${sheet.name} has no usable cells.`,
          sheet: sheet.name,
          suggestedFix: 'Remove the sheet or add a clear purpose and source data.',
          autoFixable: true,
        });
      if (sheet.duplicateRows > 0)
        add({
          severity: 'warning',
          category: 'data-quality',
          title: 'Duplicate rows detected',
          detail: `${sheet.name} has ${sheet.duplicateRows} duplicate row(s) in the preview range.`,
          sheet: sheet.name,
          suggestedFix:
            'Review duplicates before cleanup; Excel Studio will not delete source rows without approval.',
          autoFixable: false,
        });
      if (sheet.errorCells > 0)
        add({
          severity: 'critical',
          category: 'formula-integrity',
          title: 'Formula or cell errors detected',
          detail: `${sheet.name} contains ${sheet.errorCells} error cell(s), including possible #REF!, #VALUE!, #DIV/0!, or #N/A values.`,
          sheet: sheet.name,
          suggestedFix:
            'Open the formula audit, review source references, and fix the underlying workbook logic before executive export.',
          autoFixable: false,
        });
      if (sheet.blankRows > 0)
        add({
          severity: 'warning',
          category: 'data-quality',
          title: 'Blank rows inside used range',
          detail: `${sheet.name} has ${sheet.blankRows} blank row(s) inside the detected used range.`,
          sheet: sheet.name,
          suggestedFix:
            'Review whether blank rows are separators or accidental gaps before creating structured tables.',
          autoFixable: true,
        });
      if (sheet.blankColumns > 0)
        add({
          severity: 'warning',
          category: 'data-quality',
          title: 'Blank columns inside used range',
          detail: `${sheet.name} has ${sheet.blankColumns} blank column(s) inside the detected used range.`,
          sheet: sheet.name,
          suggestedFix:
            'Review blank columns before table conversion; they often break pivots and charts.',
          autoFixable: true,
        });
      if (sheet.mergedCells > 8)
        add({
          severity: 'info',
          category: 'formatting',
          title: 'Heavy merged-cell usage',
          detail: `${sheet.name} uses ${sheet.mergedCells} merged cell range(s), which can hurt sorting and dashboard layout.`,
          sheet: sheet.name,
          suggestedFix:
            'Replace decorative merged regions with styled headers and table-safe spacing.',
          autoFixable: true,
        });
      if (sheet.mergedCells > 0 && sheet.rows > 1)
        add({
          severity: sheet.mergedCells > 8 ? 'warning' : 'info',
          category: 'formatting',
          title: 'Merged cells present',
          detail: `${sheet.name} uses ${sheet.mergedCells} merged cell range(s).`,
          sheet: sheet.name,
          suggestedFix:
            'Keep merged cells only in presentation headers; avoid them in source tables.',
          autoFixable: true,
        });
      if (sheet.blanks > sheet.rows * Math.max(sheet.columns, 1) * 0.35)
        add({
          severity: 'info',
          category: 'readability',
          title: 'Sparse used range',
          detail: `${sheet.name} contains many blank cells inside the detected used range.`,
          sheet: sheet.name,
          suggestedFix: 'Tighten the used range and separate notes from structured data.',
          autoFixable: true,
        });
      if (sheet.hidden)
        add({
          severity: 'info',
          category: 'governance',
          title: 'Hidden worksheet',
          detail: `${sheet.name} is hidden and should be reviewed before sharing externally.`,
          sheet: sheet.name,
          suggestedFix:
            'Document the sheet purpose or remove hidden operational data before export.',
          autoFixable: false,
        });
      if (sheet.currencyLikeCells > 0 && sheet.numericCells > 0)
        add({
          severity: 'info',
          category: 'formatting',
          title: 'Mixed currency and numeric-looking values',
          detail: `${sheet.name} mixes ${sheet.currencyLikeCells} currency-like cell(s) with ${sheet.numericCells} numeric cell(s).`,
          sheet: sheet.name,
          suggestedFix:
            'Standardize accounting and number formats before board or investor export.',
          autoFixable: true,
        });
    }
    return issues;
  }

  // ── Scoring ────────────────────────────────────────────────────────────────

  private scoreWorkbook(summary: ExcelStudioAnalysis['summary'], issues: ExcelStudioIssue[]) {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const infos = issues.filter((i) => i.severity === 'info').length;
    const penalty = critical * 22 + warnings * 8 + infos * 3;
    const dataQuality = this.clamp(
      100 -
        summary.duplicateRows * 5 -
        summary.blankRows * 4 -
        summary.blankColumns * 5 -
        Math.round(summary.blankCells / 60) -
        summary.errorCells * 12,
    );
    const formulaIntegrity =
      summary.formulas > 0
        ? this.clamp(98 - summary.errorCells * 22 - critical * 12 - warnings * 3)
        : this.clamp(84 - summary.errorCells * 20);
    const formattingConsistency = this.clamp(
      96 - summary.mergedCells * 2 - summary.blankColumns * 4 - infos * 2,
    );
    const readability = this.clamp(
      94 -
        warnings * 4 -
        summary.blankRows * 2 -
        summary.blankColumns * 3 -
        Math.min(20, Math.round(summary.sheets / 3)),
    );
    const dashboardReadiness = this.clamp(
      74 + Math.min(18, summary.tables * 4) - warnings * 5 - summary.errorCells * 5,
    );
    const visualizationQuality = this.clamp(
      summary.charts > 0 ? 88 : 68 + Math.min(14, summary.tables * 3),
    );
    const executiveReadiness = this.clamp(
      Math.round((readability + dashboardReadiness + visualizationQuality) / 3),
    );
    const workbookQuality = this.clamp(100 - penalty);
    const overall = this.clamp(
      Math.round(
        (workbookQuality +
          formulaIntegrity +
          formattingConsistency +
          readability +
          dashboardReadiness +
          dataQuality +
          visualizationQuality +
          executiveReadiness) /
          8,
      ),
    );
    return {
      workbookQuality,
      formulaIntegrity,
      formattingConsistency,
      readability,
      dashboardReadiness,
      dataQuality,
      visualizationQuality,
      executiveReadiness,
      overall,
    };
  }

  private explainScores(
    summary: ExcelStudioAnalysis['summary'],
    issues: ExcelStudioIssue[],
    scores: ExcelStudioAnalysis['scores'],
  ): ExcelStudioAnalysis['scoreExplanations'] {
    const critical = issues.filter((i) => i.severity === 'critical').length;
    const warnings = issues.filter((i) => i.severity === 'warning').length;
    const infos = issues.filter((i) => i.severity === 'info').length;
    return {
      workbookQuality: [
        `${summary.sheets} real worksheet(s), ${summary.rows} row(s), and ${summary.formulas} formula cell(s) were detected from the uploaded workbook.`,
        `${critical} critical, ${warnings} warning, and ${infos} informational audit signal(s) affected the score.`,
      ],
      formulaIntegrity:
        summary.formulas > 0
          ? [
              `${summary.formulas} formula cell(s) preserved for review.`,
              `${summary.errorCells} error cell(s) were detected.`,
            ]
          : [
              'No formulas were detected, so this score reflects workbook stability rather than formula depth.',
            ],
      formattingConsistency: [
        `${summary.mergedCells} merged range(s), ${summary.blankColumns} blank column(s), and ${summary.hiddenSheets} hidden sheet(s) were detected.`,
      ],
      readability: [
        `${summary.blankRows} blank row(s) and ${summary.blankColumns} blank column(s) may affect scanning flow.`,
        `${summary.sheets} sheet(s) are available in workbook navigation.`,
      ],
      dashboardReadiness: [
        `${summary.tables} table-like sheet(s) and ${summary.formulas} formula(s) can support dashboards.`,
        summary.errorCells
          ? 'Formula errors reduce dashboard confidence.'
          : 'No formula errors were found in the readable range.',
      ],
      dataQuality: [
        `${summary.duplicateRows} duplicate preview row(s), ${summary.blankRows} blank row(s), and ${summary.blankCells} blank cell(s) were detected.`,
      ],
      visualizationQuality: [
        summary.charts > 0
          ? `${summary.charts} chart object(s) were detected.`
          : 'No chart objects are exposed by the workbook parser; dashboard readiness is inferred from table-like ranges.',
      ],
      executiveReadiness: [
        `Executive readiness combines readability (${scores.readability}), dashboard readiness (${scores.dashboardReadiness}), and visualization quality (${scores.visualizationQuality}).`,
      ],
      overall: [
        'Overall score is the average of workbook quality, formula integrity, formatting, readability, dashboard readiness, data quality, visualization quality, and executive readiness.',
      ],
    };
  }

  // ── Export & styling ───────────────────────────────────────────────────────

  private async buildEnhancedWorkbook(
    project: ExcelStudioProject,
    bookType: 'xlsx' | 'xls' = 'xlsx',
  ) {
    const workbook = await this.buildWorkbookWithOperations(project);
    const operations = await this.activeWorkbookOperations(project.id);
    let buffer = XLSX.write(workbook, { type: 'buffer', bookType, cellStyles: true });
    if (bookType === 'xlsx') buffer = this.applyFreezePaneXml(buffer, workbook, operations);
    return buffer;
  }

  // ── XLSX cell styling helpers ──────────────────────────────────────────────

  /**
   * Append a sheet with template-specific cell styling applied to the header
   * row and key label cells. XLSX SheetJS open-source supports `s` (style)
   * on individual cell objects when `cellStyles: true` is passed to write().
   */
  private appendStyledSheet(
    workbook: XLSX.WorkBook,
    name: string,
    rows: any[][],
    palette: { header: string; accent: string; text: string; light: string },
  ) {
    const safeName = this.uniqueSheetName(workbook, name);
    const ws = XLSX.utils.aoa_to_sheet(rows);

    const headerStyle = {
      fill: { fgColor: { rgb: palette.header }, patternType: 'solid' as const },
      font: { bold: true, color: { rgb: palette.text }, sz: 11 },
      border: { bottom: { style: 'medium', color: { rgb: palette.accent } } },
      alignment: { horizontal: 'left' as const, vertical: 'center' as const, wrapText: false },
    };
    const labelStyle = {
      fill: { fgColor: { rgb: palette.light }, patternType: 'solid' as const },
      font: { bold: true, color: { rgb: palette.accent }, sz: 10 },
      alignment: { horizontal: 'left' as const },
    };
    const titleStyle = {
      fill: { fgColor: { rgb: palette.accent }, patternType: 'solid' as const },
      font: { bold: true, color: { rgb: palette.text }, sz: 14 },
      alignment: { horizontal: 'left' as const },
    };

    // Row 0 = title row (big title style)
    if (rows[0]) {
      const titleRef = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (ws[titleRef]) ws[titleRef].s = titleStyle;
    }
    // Row 1 = header row (column labels)
    if (rows[1]) {
      for (let c = 0; c < rows[1].length; c++) {
        const ref = XLSX.utils.encode_cell({ r: 1, c });
        if (ws[ref]) ws[ref].s = headerStyle;
      }
    }
    // Column A for data rows = label style
    for (let r = 2; r < rows.length; r++) {
      if (!rows[r] || rows[r].length === 0) continue;
      const ref = XLSX.utils.encode_cell({ r, c: 0 });
      if (ws[ref] && ws[ref].v !== undefined && ws[ref].v !== '') ws[ref].s = labelStyle;
    }

    // Set column widths
    ws['!cols'] = [
      { wch: 28 },
      { wch: 20 },
      { wch: 14 },
      { wch: 40 },
      { wch: 50 },
      { wch: 40 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(workbook, ws, safeName);
  }

  // ── Template content rows ──────────────────────────────────────────────────

  private templateSystemRows(project: ExcelStudioProject) {
    const base: any[][] = [
      ['Template System'],
      ['Template', project.activeTemplateId, 'Workbook', project.title],
      [],
    ];
    const systems: Record<string, any[][]> = {
      'executive-emerald': [
        ['Board KPI', 'Current', 'Status', 'Owner'],
        [
          'Overall Quality',
          project.analysis.scores.overall,
          this.scoreStatus(project.analysis.scores.overall),
          'Workbook Owner',
        ],
        [
          'Formula Integrity',
          project.analysis.scores.formulaIntegrity,
          this.scoreStatus(project.analysis.scores.formulaIntegrity),
          'Finance',
        ],
        [
          'Executive Readiness',
          project.analysis.scores.executiveReadiness,
          this.scoreStatus(project.analysis.scores.executiveReadiness),
          'Leadership',
        ],
      ],
      'finance-midnight': [
        ['Model Control', 'Value', 'Risk'],
        [
          'Formula count',
          project.analysis.summary.formulas,
          project.analysis.summary.errorCells ? 'High' : 'Normal',
        ],
        [
          'Error cells',
          project.analysis.summary.errorCells,
          project.analysis.summary.errorCells ? 'Critical' : 'Clear',
        ],
        ['Named ranges', project.analysis.summary.namedRanges, 'Review'],
      ],
      'sales-sage': [
        ['Sales Workbook Lens', 'Value', 'Action'],
        ['Tables detected', project.analysis.summary.tables, 'Convert to pipeline views'],
        ['Duplicate rows', project.analysis.summary.duplicateRows, 'Review duplicate accounts'],
        [
          'Dashboard readiness',
          project.analysis.scores.dashboardReadiness,
          'Prepare revenue scorecard',
        ],
      ],
      'ops-copper': [
        ['Operations Control', 'Signal', 'Action'],
        ['Blank rows', project.analysis.summary.blankRows, 'Clean handoff gaps'],
        ['Blank columns', project.analysis.summary.blankColumns, 'Stabilize tables'],
        ['Hidden sheets', project.analysis.summary.hiddenSheets, 'Review governance'],
      ],
      'dashboard-ivory': [
        ['Dashboard Widget', 'Source', 'Recommended visual'],
        ['Quality score', 'Workbook audit', 'KPI card'],
        ['Issues by severity', 'Audit issues', 'Stacked bar'],
        ['Sheet size', 'Worksheet map', 'Table heatmap'],
      ],
      'investor-financial': [
        ['Investor Metric', 'Value', 'Board Question'],
        ['Runway / ARR inputs', 'Detected in source workbook', 'Are assumptions traceable?'],
        ['Formula errors', project.analysis.summary.errorCells, 'Can investors trust outputs?'],
        [
          'Source protection',
          project.appliedActions.some((a) => a.action === 'protectSource') ? 'Marked' : 'Pending',
          'Is model governance clear?',
        ],
      ],
      'corporate-reporting': [
        ['Reporting Layer', 'Purpose', 'Cadence'],
        ['Executive Summary', 'Leadership scan', 'Monthly'],
        ['Variance Review', 'Explain deltas', 'Monthly'],
        ['Department Rollup', 'Ownership clarity', 'Weekly'],
      ],
      'board-reporting': [
        ['Board Pack Section', 'Purpose', 'Risk'],
        ['Decision Log', 'Track asks and approvals', 'Governance'],
        ['Risk Register', 'Expose operational and finance risks', 'High'],
        ['Appendix', 'Preserve detail without clutter', 'Low'],
      ],
      'marketing-analytics': [
        ['Marketing Lens', 'Metric Family', 'Visualization'],
        ['Funnel', 'Leads / conversion', 'Funnel chart'],
        ['Channel Mix', 'Spend / performance', 'Stacked bar'],
        ['CAC Signal', 'Cost efficiency', 'Trend card'],
      ],
      'startup-metrics': [
        ['Founder Metric', 'Source Signal', 'Visualization'],
        ['MRR / ARR', 'Revenue table', 'Growth card'],
        ['Activation', 'User table', 'Cohort tile'],
        ['Retention', 'Usage table', 'Retention curve'],
      ],
      'financial-forecasting': [
        ['Forecast Area', 'Workbook Signal', 'Control'],
        ['Assumptions', 'Input sheets', 'Lock source values'],
        ['Scenarios', 'Formula dependencies', 'Compare cases'],
        ['Actuals vs Forecast', 'Tables', 'Variance summary'],
      ],
      'management-reporting': [
        ['Management Section', 'Signal', 'Owner Action'],
        ['Weekly Scorecard', 'KPIs', 'Assign owner notes'],
        ['Exception Log', 'Issues', 'Resolve blockers'],
        ['Operating Rhythm', 'Sheets', 'Set reporting cadence'],
      ],
    };
    return [...base, ...(systems[project.activeTemplateId] || systems['executive-emerald'])];
  }

  private scoreStatus(score: number) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Needs review';
    return 'At risk';
  }

  // ── Workbook I/O helpers ───────────────────────────────────────────────────

  private readOriginalWorkbook(project: ExcelStudioProject) {
    const fullPath = project.originalFilePath
      ? path.join(process.cwd(), project.originalFilePath)
      : '';
    if (fullPath && fs.existsSync(fullPath)) {
      return XLSX.read(fs.readFileSync(fullPath), {
        type: 'buffer',
        cellFormula: true,
        cellDates: true,
        cellStyles: true,
        raw: false,
      });
    }
    const wb = XLSX.utils.book_new();
    for (const sheet of project.analysis.worksheets || []) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet(sheet.previewRows || [[]]),
        this.safeSheetName(sheet.name),
      );
    }
    return wb;
  }

  private readOriginalWorkbookBuffer(project: ExcelStudioProject) {
    const fullPath = project.originalFilePath
      ? path.join(process.cwd(), project.originalFilePath)
      : '';
    if (fullPath && fs.existsSync(fullPath)) return fs.readFileSync(fullPath);
    return XLSX.write(this.readOriginalWorkbook(project), {
      type: 'buffer',
      bookType: 'xlsx',
      cellStyles: true,
    });
  }

  private contentTypeForExtension(ext: string) {
    const normalized = ext.toLowerCase();
    if (normalized === '.csv') return 'text/csv';
    if (normalized === '.xls') return 'application/vnd.ms-excel';
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }

  private applyFreezePaneXml(
    buffer: Buffer,
    workbook: XLSX.WorkBook,
    operations: ExcelWorkbookOperationInput[],
  ) {
    const freezes = operations.filter((operation) => operation.type === 'freezePane');
    if (!freezes.length) return buffer;
    try {
      const zip = new AdmZip(buffer);
      for (const operation of freezes) {
        const sheetName = this.resolveOperationSheetName(workbook, operation);
        const sheetIndex = workbook.SheetNames.indexOf(sheetName || '');
        if (sheetIndex < 0) continue;
        const entryName = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
        const entry = zip.getEntry(entryName);
        if (!entry) continue;
        const rows = Number(operation.payload?.rows ?? operation.target?.rows ?? 1);
        const columns = Number(operation.payload?.columns ?? operation.target?.columns ?? 0);
        const topLeftCell = `${this.columnName(Math.max(0, columns))}${Math.max(1, rows + 1)}`;
        const paneAttrs = [
          columns > 0 ? `xSplit="${columns}"` : '',
          rows > 0 ? `ySplit="${rows}"` : '',
          `topLeftCell="${topLeftCell}"`,
          `activePane="${rows > 0 && columns > 0 ? 'bottomRight' : rows > 0 ? 'bottomLeft' : 'topRight'}"`,
          'state="frozen"',
        ]
          .filter(Boolean)
          .join(' ');
        const sheetViews = `<sheetViews><sheetView workbookViewId="0"><pane ${paneAttrs}/><selection pane="${rows > 0 && columns > 0 ? 'bottomRight' : rows > 0 ? 'bottomLeft' : 'topRight'}" activeCell="${topLeftCell}" sqref="${topLeftCell}"/></sheetView></sheetViews>`;
        let xml = entry.getData().toString('utf8');
        xml = xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, '');
        xml = xml.replace('<sheetData>', `${sheetViews}<sheetData>`);
        zip.updateFile(entryName, Buffer.from(xml, 'utf8'));
      }
      return zip.toBuffer();
    } catch {
      return buffer;
    }
  }

  private appendGeneratedSheetsPreservingOriginal(
    project: ExcelStudioProject,
    generatedSheets: GeneratedWorkbookSheet[],
  ) {
    const original = this.readOriginalWorkbookBuffer(project);
    if (!/\.xlsx$/i.test(project.filename) || !generatedSheets.length) {
      const workbook = this.readOriginalWorkbook(project);
      const palette =
        TEMPLATE_PALETTE[project.activeTemplateId] || TEMPLATE_PALETTE['executive-emerald'];
      for (const sheet of generatedSheets)
        this.appendStyledSheet(workbook, sheet.name, sheet.rows, palette);
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    }

    const zip = new AdmZip(original);
    const workbookEntry = zip.getEntry('xl/workbook.xml');
    const relsEntry = zip.getEntry('xl/_rels/workbook.xml.rels');
    const contentTypesEntry = zip.getEntry('[Content_Types].xml');
    if (!workbookEntry || !relsEntry || !contentTypesEntry) {
      const workbook = this.readOriginalWorkbook(project);
      const palette =
        TEMPLATE_PALETTE[project.activeTemplateId] || TEMPLATE_PALETTE['executive-emerald'];
      for (const sheet of generatedSheets)
        this.appendStyledSheet(workbook, sheet.name, sheet.rows, palette);
      return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    }

    let workbookXml = workbookEntry.getData().toString('utf8');
    let relsXml = relsEntry.getData().toString('utf8');
    let contentTypesXml = contentTypesEntry.getData().toString('utf8');
    const existingNames = new Set([
      ...project.analysis.worksheets.map((sheet) => sheet.name.toLowerCase()),
      ...Array.from(workbookXml.matchAll(/<sheet\b[^>]*\bname="([^"]+)"/g)).map((match) =>
        this.xmlDecode(match[1]).toLowerCase(),
      ),
    ]);
    let nextSheetFile = this.nextWorksheetFileIndex(zip);
    let nextSheetId = this.nextWorkbookSheetId(workbookXml);
    let nextRid = this.nextRelationshipId(relsXml);
    const sheetXmlSnippets: string[] = [];
    const relSnippets: string[] = [];
    const contentTypeSnippets: string[] = [];

    for (const generated of generatedSheets) {
      const safeName = this.uniqueSheetNameFromSet(existingNames, generated.name);
      existingNames.add(safeName.toLowerCase());
      const sheetPath = `xl/worksheets/sheet${nextSheetFile}.xml`;
      zip.addFile(sheetPath, Buffer.from(this.buildWorksheetXml(generated.rows), 'utf8'));
      sheetXmlSnippets.push(
        `<sheet name="${this.xmlAttr(safeName)}" sheetId="${nextSheetId}" r:id="rId${nextRid}"/>`,
      );
      relSnippets.push(
        `<Relationship Id="rId${nextRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${nextSheetFile}.xml"/>`,
      );
      contentTypeSnippets.push(
        `<Override PartName="/xl/worksheets/sheet${nextSheetFile}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      );
      nextSheetFile++;
      nextSheetId++;
      nextRid++;
    }

    workbookXml = workbookXml.replace('</sheets>', `${sheetXmlSnippets.join('')}</sheets>`);
    relsXml = relsXml.replace('</Relationships>', `${relSnippets.join('')}</Relationships>`);
    contentTypesXml = contentTypesXml.replace(
      '</Types>',
      `${contentTypeSnippets.join('')}</Types>`,
    );
    zip.updateFile('xl/workbook.xml', Buffer.from(workbookXml, 'utf8'));
    zip.updateFile('xl/_rels/workbook.xml.rels', Buffer.from(relsXml, 'utf8'));
    zip.updateFile('[Content_Types].xml', Buffer.from(contentTypesXml, 'utf8'));
    return zip.toBuffer();
  }

  private nextWorksheetFileIndex(zip: AdmZip) {
    const indexes = zip
      .getEntries()
      .map((entry) => entry.entryName.match(/^xl\/worksheets\/sheet(\d+)\.xml$/)?.[1])
      .filter(Boolean)
      .map(Number);
    return Math.max(0, ...indexes) + 1;
  }

  private nextWorkbookSheetId(workbookXml: string) {
    const ids = Array.from(workbookXml.matchAll(/\bsheetId="(\d+)"/g)).map((match) =>
      Number(match[1]),
    );
    return Math.max(0, ...ids) + 1;
  }

  private nextRelationshipId(relsXml: string) {
    const ids = Array.from(relsXml.matchAll(/\bId="rId(\d+)"/g)).map((match) => Number(match[1]));
    return Math.max(0, ...ids) + 1;
  }

  private uniqueSheetNameFromSet(existing: Set<string>, desired: string) {
    const base = this.safeSheetName(desired);
    if (!existing.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base.slice(0, 27)} ${i}`.slice(0, 31);
      if (!existing.has(candidate.toLowerCase())) return candidate;
    }
    return `${base.slice(0, 24)} ${Date.now().toString().slice(-5)}`;
  }

  private buildWorksheetXml(rows: any[][]) {
    const sheetData = rows
      .map((row, rowIndex) => {
        const rowNumber = rowIndex + 1;
        const cells = (row || [])
          .map((value, columnIndex) => this.buildOpenXmlCell(value, rowNumber, columnIndex))
          .join('');
        return `<row r="${rowNumber}">${cells}</row>`;
      })
      .join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`;
  }

  private buildOpenXmlCell(value: any, rowNumber: number, columnIndex: number) {
    const ref = `${this.columnName(columnIndex)}${rowNumber}`;
    if (value === null || value === undefined || value === '') return `<c r="${ref}"/>`;
    if (typeof value === 'number' && Number.isFinite(value))
      return `<c r="${ref}" t="n"><v>${value}</v></c>`;
    if (typeof value === 'boolean') return `<c r="${ref}" t="b"><v>${value ? 1 : 0}</v></c>`;
    return `<c r="${ref}" t="inlineStr"><is><t>${this.xmlText(value)}</t></is></c>`;
  }

  private columnName(index: number) {
    let label = '';
    let value = index + 1;
    while (value > 0) {
      const mod = (value - 1) % 26;
      label = String.fromCharCode(65 + mod) + label;
      value = Math.floor((value - mod) / 26);
    }
    return label;
  }

  private async buildPackageWorkbook(project: ExcelStudioProject, format: string) {
    const workbook = await this.buildWorkbookWithOperations(project);
    const palette =
      TEMPLATE_PALETTE[project.activeTemplateId] || TEMPLATE_PALETTE['executive-emerald'];
    this.appendStyledSheet(
      workbook,
      'Pitchonix Comparison',
      [
        ['Before / After Workbook'],
        [
          'Source preservation',
          'Pass',
          'Original sheets and cells are preserved; Pitchonix reports are additive in this package export.',
        ],
        ['Original workbook', project.filename],
        ['Sheets', project.analysis.summary.sheets],
        ['Rows', project.analysis.summary.rows],
        ['Formulas', project.analysis.summary.formulas],
        ['Merged ranges', project.analysis.summary.mergedCells],
        ['Export type', format],
      ],
      palette,
    );
    this.appendStyledSheet(
      workbook,
      'Pitchonix Audit',
      [
        ['Severity', 'Category', 'Sheet', 'Issue', 'Detail', 'Suggested fix', 'Auto-fixable'],
        ...project.analysis.issues.map((issue) => [
          issue.severity,
          issue.category,
          issue.sheet || '',
          issue.title,
          issue.detail,
          issue.suggestedFix,
          issue.autoFixable ? 'Yes' : 'No',
        ]),
      ],
      palette,
    );
    this.appendStyledSheet(
      workbook,
      'Pitchonix Change Log',
      [
        ['Action', 'Label', 'Created at'],
        ...(project.appliedActions.length
          ? project.appliedActions.map((action) => [action.action, action.label, action.createdAt])
          : [['No user-approved workbook actions have been applied.', '', '']]),
      ],
      palette,
    );
    if (format === 'board-package-xlsx') {
      this.appendStyledSheet(
        workbook,
        'Pitchonix Board Summary',
        [
          ['Board Package Summary'],
          ['Overall score', project.analysis.scores.overall],
          ['Formula integrity', project.analysis.scores.formulaIntegrity],
          ['Data quality', project.analysis.scores.dataQuality],
          ['Executive readiness', project.analysis.scores.executiveReadiness],
        ],
        palette,
      );
    }
    let buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    buffer = this.applyFreezePaneXml(
      buffer,
      workbook,
      await this.activeWorkbookOperations(project.id),
    );
    return buffer;
  }

  private async buildReportPdf(
    project: ExcelStudioProject,
    format: string,
  ): Promise<{ buffer: Buffer; mimetype: string; extension: string }> {
    const html = this.buildReportHtml(project, format);
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        });
        return { buffer: Buffer.from(pdf), mimetype: 'application/pdf', extension: 'pdf' };
      } finally {
        await browser.close();
      }
    } catch (err) {
      // Puppeteer unavailable/failed — return the HTML report honestly labeled
      // as text/html rather than serving HTML bytes under a .pdf filename.
      // eslint-disable-next-line no-console
      console.warn(
        `[excel-studio] buildReportPdf: PDF render failed, returning HTML report (${(err as any)?.message})`,
      );
      return { buffer: Buffer.from(html, 'utf8'), mimetype: 'text/html', extension: 'html' };
    }
  }

  private buildReportHtml(project: ExcelStudioProject, format: string) {
    const rows = project.analysis.issues
      .map(
        (issue) => `
      <tr><td>${this.escapeHtml(issue.severity)}</td><td>${this.escapeHtml(issue.category)}</td><td>${this.escapeHtml(issue.sheet || '')}</td><td>${this.escapeHtml(issue.title)}</td><td>${this.escapeHtml(issue.suggestedFix)}</td></tr>
    `,
      )
      .join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Inter,Arial,sans-serif;color:#111;background:#f7f6f2;margin:0;padding:28px}
      .hero{background:#263f34;color:white;border-radius:18px;padding:26px;margin-bottom:18px}
      h1{margin:0 0 8px;font-size:28px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.card{background:white;border:1px solid #dedbd2;border-radius:14px;padding:14px}.score{font-size:24px;font-weight:800;color:#355846}table{width:100%;border-collapse:collapse;background:white;border-radius:14px;overflow:hidden}td,th{border:1px solid #dedbd2;padding:8px;font-size:11px;vertical-align:top}th{background:#355846;color:white;text-align:left}
    </style></head><body>
      <section class="hero"><h1>${this.escapeHtml(format.replace(/-/g, ' ').toUpperCase())}</h1><div>${this.escapeHtml(project.title)} · source preserved from ${this.escapeHtml(project.filename)}</div></section>
      <section class="grid">
        <div class="card"><div>Overall</div><div class="score">${project.analysis.scores.overall}</div></div>
        <div class="card"><div>Formula integrity</div><div class="score">${project.analysis.scores.formulaIntegrity}</div></div>
        <div class="card"><div>Data quality</div><div class="score">${project.analysis.scores.dataQuality}</div></div>
        <div class="card"><div>Executive readiness</div><div class="score">${project.analysis.scores.executiveReadiness}</div></div>
      </section>
      <table><thead><tr><th>Severity</th><th>Category</th><th>Sheet</th><th>Issue</th><th>Suggested fix</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No issues detected.</td></tr>'}</tbody></table>
    </body></html>`;
  }

  private appendSheet(workbook: XLSX.WorkBook, name: string, rows: any[][]) {
    const safeName = this.uniqueSheetName(workbook, name);
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), safeName);
  }

  private hasSheet(workbook: XLSX.WorkBook, name: string) {
    return workbook.SheetNames.some((n) => n.toLowerCase() === name.toLowerCase());
  }

  private uniqueSheetName(workbook: XLSX.WorkBook, desired: string) {
    const base = this.safeSheetName(desired);
    const existing = new Set(workbook.SheetNames.map((n) => n.toLowerCase()));
    if (!existing.has(base.toLowerCase())) return base;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base.slice(0, 27)} ${i}`.slice(0, 31);
      if (!existing.has(candidate.toLowerCase())) return candidate;
    }
    return `${base.slice(0, 24)} ${Date.now().toString().slice(-5)}`;
  }

  /** Sanitize a string into a valid Excel sheet name (≤31 chars, no special chars). */
  private safeSheetName(raw: string): string {
    return (
      String(raw || 'Sheet')
        .replace(/[:\\/?*\[\]]/g, '') // strip Excel-illegal chars
        .replace(/\s+/g, ' ') // collapse whitespace
        .trim()
        .slice(0, 31) || // Excel hard limit
      'Sheet'
    );
  }

  private buildAuditCsv(project: ExcelStudioProject) {
    const rows = [
      ['Workbook', project.title],
      ['Original file', project.filename],
      ['Overall score', String(project.analysis.scores.overall)],
      [],
      ['Severity', 'Category', 'Sheet', 'Issue', 'Detail', 'Suggested fix'],
      ...project.analysis.issues.map((i) => [
        i.severity,
        i.category,
        i.sheet || '',
        i.title,
        i.detail,
        i.suggestedFix,
      ]),
    ];
    return rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n');
  }

  private buildChangeLogCsv(project: ExcelStudioProject) {
    const rows = [
      ['Workbook', project.title],
      ['Original file', project.filename],
      [],
      ['Action', 'Label', 'Created at'],
      ...(project.appliedActions.length
        ? project.appliedActions.map((a) => [a.action, a.label, a.createdAt])
        : [['No user-approved workbook actions have been applied.', '', '']]),
    ];
    return rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n');
  }

  private csvCell(value: any) {
    const raw = String(value ?? '');
    const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  }

  private escapeHtml(value: any) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private xmlAttr(value: any) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private xmlText(value: any) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private xmlDecode(value: string) {
    return String(value || '')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  // ── Script-based generation ────────────────────────────────────────────────

  private buildWorkbookFromScript(
    script: string,
    title: string,
    templateId: string,
    analysis: ExcelScriptAnalysis,
  ) {
    const workbook = XLSX.utils.book_new();
    const metrics = analysis.detectedMetrics.length
      ? analysis.detectedMetrics
      : [
          { label: 'Revenue', value: '100000' },
          { label: 'Customers', value: '1000' },
          { label: 'Growth Rate', value: '12%' },
          { label: 'Operating Cost', value: '42000' },
        ];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const palette = TEMPLATE_PALETTE[templateId] || TEMPLATE_PALETTE['executive-emerald'];

    this.appendStyledSheet(
      workbook,
      'Executive Summary',
      [
        [title],
        [
          'Generated by',
          'Pitchonix Excel Studio',
          'Template',
          templateId,
          'Type',
          analysis.workbookType,
          'Confidence',
          `${analysis.confidence}%`,
        ],
        [],
        ['Metric', 'Value', 'Note'],
        ...metrics.slice(0, 8).map((m) => [m.label, m.value, 'Script-derived']),
        [],
        ['Generation Plan'],
        ...analysis.generationPlan.map((item) => [item]),
      ],
      palette,
    );

    this.appendStyledSheet(
      workbook,
      'Source Data',
      [
        ['Period', ...metrics.slice(0, 5).map((m) => m.label)],
        ...months.map((mo, idx) => [
          mo,
          ...metrics.slice(0, 5).map((m, mi) => this.projectMetricValue(m.value, idx, mi)),
        ]),
      ],
      palette,
    );

    this.appendStyledSheet(
      workbook,
      'Assumptions',
      [
        ['Assumption', 'Value', 'Source', 'Owner'],
        ['Growth rate', this.firstPercent(metrics) || '10%', 'Script/default', 'Finance'],
        ['Forecast periods', months.length, 'Pitchonix default', 'Operations'],
        ['Currency', this.detectCurrency(script) || 'USD', 'Script/default', 'Finance'],
        ['Data protection', 'Source data preserved', 'Pitchonix rule', 'Workbook Owner'],
      ],
      palette,
    );

    this.appendStyledSheet(
      workbook,
      'Dashboard',
      [
        ['Dashboard Widget', 'Metric', 'Value', 'Recommended Visual'],
        ['KPI Card', metrics[0]?.label || 'Revenue', metrics[0]?.value || '', 'Large KPI'],
        ['Trend Widget', metrics[1]?.label || 'Growth', metrics[1]?.value || '', 'Line chart'],
        ['Scorecard', 'Workbook readiness', 'Generated', 'Status table'],
        ['Forecast Widget', 'Six period projection', 'Available', 'Column chart'],
      ],
      palette,
    );

    for (const sheetName of analysis.detectedSheets) {
      if (this.isSystemScriptSheet(sheetName)) continue;
      if (this.hasSheet(workbook, sheetName)) continue;
      this.appendStyledSheet(
        workbook,
        sheetName,
        this.scaffoldRequestedSheet(sheetName, metrics, months),
        palette,
      );
    }

    this.appendStyledSheet(
      workbook,
      'Audit',
      [
        ['Check', 'Status', 'Comment'],
        ['Source data generated', 'Pass', 'Workbook has editable source data sheet'],
        ['Assumptions separated', 'Pass', 'Assumptions sheet added'],
        ['Dashboard added', 'Pass', 'Executive dashboard sheet added'],
        ['Template system applied', 'Pass', templateId],
        ...analysis.risks.map((r) => ['Script risk', 'Review', r]),
      ],
      palette,
    );

    this.appendStyledSheet(
      workbook,
      'Script',
      [['Original Script'], ...script.split(/\r?\n/).map((line) => [line])],
      palette,
    );

    // Build a lightweight stub project to pass to templateSystemRows
    const stub = {
      id: 'script-preview',
      userId: '',
      title,
      filename: '',
      originalFilePath: '',
      mimeType: '',
      fileSize: 0,
      status: 'enhanced',
      activeTemplateId: templateId,
      appliedActions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      analysis: {
        summary: {
          sheets: 0,
          rows: 0,
          columns: 0,
          tables: 0,
          namedRanges: 0,
          charts: 0,
          pivots: 0,
          formulas: 0,
          errorCells: 0,
          validations: 0,
          conditionalFormatting: 0,
          hiddenSheets: 0,
          mergedCells: 0,
          duplicateRows: 0,
          blankRows: 0,
          blankColumns: 0,
          blankCells: 0,
          dependencies: 0,
        },
        scores: {
          workbookQuality: 92,
          formulaIntegrity: 92,
          formattingConsistency: 92,
          readability: 92,
          dashboardReadiness: 92,
          dataQuality: 92,
          visualizationQuality: 92,
          executiveReadiness: 92,
          overall: 92,
        },
        scoreExplanations: {} as any,
        issues: [],
        worksheets: [],
        recommendations: [],
        auditGeneratedAt: new Date().toISOString(),
      },
      enhancementPlan: [],
      exports: [],
    } as ExcelStudioProject;

    this.appendStyledSheet(
      workbook,
      'Pitchonix Template System',
      this.templateSystemRows(stub),
      palette,
    );
    return workbook;
  }

  private scaffoldRequestedSheet(
    sheetName: string,
    metrics: Array<{ label: string; value: string }>,
    periods: string[],
  ) {
    const lower = sheetName.toLowerCase();
    if (/forecast|projection|plan/.test(lower)) {
      return [
        ['Period', ...metrics.slice(0, 5).map((m) => m.label)],
        ...periods.map((p, idx) => [
          p,
          ...metrics.slice(0, 5).map((m, mi) => this.projectMetricValue(m.value, idx + 1, mi)),
        ]),
      ];
    }
    if (/pipeline|sales|crm/.test(lower)) {
      return [
        ['Stage', 'Count', 'Value', 'Conversion'],
        ['Lead', 120, metrics[0]?.value || 100000, '22%'],
        ['Qualified', 48, metrics[0]?.value || 100000, '40%'],
        ['Proposal', 18, metrics[0]?.value || 100000, '38%'],
        ['Closed', 8, metrics[0]?.value || 100000, '44%'],
      ];
    }
    if (/inventory|stock|sku/.test(lower)) {
      return [
        ['SKU', 'Item', 'Quantity', 'Reorder Point', 'Status'],
        ['SKU-001', 'Core Item', 120, 80, 'Healthy'],
        ['SKU-002', 'Watch Item', 42, 50, 'Review'],
      ];
    }
    return [
      [sheetName],
      ['Metric', 'Value', 'Notes'],
      ...metrics.slice(0, 8).map((m) => [m.label, m.value, 'Generated from script']),
    ];
  }

  private isSystemScriptSheet(sheetName: string) {
    const SYSTEM = new Set([
      'executive summary',
      'source data',
      'assumptions',
      'dashboard',
      'audit',
      'script',
      'pitchonix template system',
    ]);
    return SYSTEM.has(sheetName.trim().toLowerCase());
  }

  // ── Script analysis helpers ────────────────────────────────────────────────

  private detectScriptWorkbookType(lower: string) {
    if (/forecast|runway|burn|cash|financial|revenue|arr|mrr|budget/.test(lower))
      return 'Financial Forecast';
    if (/sales|pipeline|quota|deal|crm|lead|customer/.test(lower)) return 'Sales Dashboard';
    if (/marketing|campaign|cac|channel|funnel|conversion/.test(lower))
      return 'Marketing Analytics';
    if (/inventory|stock|sku|warehouse|reorder/.test(lower)) return 'Inventory Workbook';
    if (/operations|sla|ticket|process|capacity/.test(lower)) return 'Operations Dashboard';
    if (/board|executive|management|reporting|kpi/.test(lower)) return 'Management Reporting';
    return 'Business Workbook';
  }

  private recommendTemplateForScript(workbookType: string, lower: string) {
    if (workbookType.includes('Financial'))
      return /investor|fundraise|vc/.test(lower) ? 'investor-financial' : 'financial-forecasting';
    if (workbookType.includes('Sales')) return 'sales-sage';
    if (workbookType.includes('Marketing')) return 'marketing-analytics';
    if (workbookType.includes('Inventory') || workbookType.includes('Operations'))
      return 'ops-copper';
    if (workbookType.includes('Management')) return 'management-reporting';
    return 'executive-emerald';
  }

  private extractRequestedSheets(script: string, workbookType: string): string[] {
    // Only explicit "Sheets: A, B, C" style instructions may create tabs.
    // Prose that merely mentions worksheets must never become worksheet names.
    const fromLines = script
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.match(/^(?:sheets?|tabs?|worksheets?)\s*[:=-]\s*(.+)$/i)?.[1] || '')
      .filter(Boolean)
      .flatMap((line) => line.split(/[,|;]/))
      .map((part) => {
        // Clean up — remove leading bullets, numbers, parentheses
        return part
          .replace(/^[\s\-•*\d.]+/, '')
          .replace(/\([^)]*\)/g, '')
          .trim();
      })
      .filter((name) => this.isPlausibleSheetInstructionName(name))
      // Sanitize to a safe sheet name (≤31 chars, no illegal chars)
      .map((name) => this.safeSheetName(name))
      .filter(Boolean);

    const defaults = ['Executive Summary', 'Source Data', 'Assumptions', 'Dashboard', 'Audit'];
    if (/financial|forecast/i.test(workbookType)) defaults.splice(2, 0, 'Forecast');
    if (/sales/i.test(workbookType)) defaults.splice(2, 0, 'Pipeline');
    return Array.from(new Set([...fromLines, ...defaults])).slice(0, 10);
  }

  private isPlausibleSheetInstructionName(name: string) {
    const clean = name.replace(/\s+/g, ' ').trim();
    if (clean.length < 2 || clean.length > 31) return false;
    if (clean.split(' ').length > 5) return false;
    if (/[.!?]$/.test(clean)) return false;
    if (/^(based|written|scientists|systems?|these|this|that)\b/i.test(clean)) return false;
    return true;
  }

  private extractMetrics(script: string) {
    const metrics: Array<{ label: string; value: string }> = [];
    const patterns = [
      /([A-Z][A-Za-z0-9 /&%-]{2,40})[ \t]*[:=][ \t]*([$€£]?[ \t]?[-+]?\d[\d,.]*%?)/g,
      /([$€£][ \t]?[-+]?\d[\d,.]*%?)[ \t]+([A-Za-z][A-Za-z0-9 /&%-]{2,40})/g,
      /\b(\d[\d,.]*%)[ \t]+([A-Za-z][A-Za-z0-9 /&%-]{2,40})/g,
    ];
    const invalidLabels = new Set(['sheet', 'sheets', 'tab', 'tabs', 'worksheet', 'worksheets']);
    for (const pattern of patterns) {
      for (const match of script.matchAll(pattern)) {
        const first = match[1]?.trim();
        const second = match[2]?.trim();
        if (!first || !second) continue;
        const valueFirst = /^[$€£]?\s?[-+]?\d/.test(first);
        const label = (valueFirst ? second : first).replace(/\s+/g, ' ').trim().slice(0, 42);
        if (invalidLabels.has(label.toLowerCase())) continue;
        metrics.push({ label, value: (valueFirst ? first : second).replace(/\s+/g, ' ') });
      }
    }
    const seen = new Set<string>();
    return metrics
      .filter((m) => {
        const k = `${m.label}:${m.value}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 16);
  }

  private extractDimensions(script: string) {
    const dims = new Set<string>();
    for (const w of [
      'region',
      'channel',
      'product',
      'segment',
      'department',
      'owner',
      'month',
      'quarter',
      'customer',
      'campaign',
      'sku',
    ]) {
      if (new RegExp(`\\b${w}\\b`, 'i').test(script)) dims.add(w);
    }
    return Array.from(dims);
  }

  private scriptConfidence(script: string, metrics: any[], sheets: string[]) {
    let score = 45;
    if (script.length > 120) score += 15;
    if (metrics.length > 0) score += Math.min(25, metrics.length * 5);
    if (sheets.length > 3) score += 10;
    if (/dashboard|summary|forecast|report|model|template/i.test(script)) score += 5;
    return this.clamp(score);
  }

  private suggestTitleFromScript(script: string, workbookType: string) {
    const titleLine = script
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => /^title\s*[:=-]/i.test(l));
    if (titleLine) return titleLine.replace(/^title\s*[:=-]\s*/i, '').slice(0, 80);
    const firstLine = script
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l.length > 10);
    if (firstLine && firstLine.length <= 80) return firstLine.replace(/^create\s+/i, '');
    return `${workbookType} Workbook`;
  }

  private scriptGenerationPlan(workbookType: string, sheets: string[], templateId: string) {
    return [
      `Create ${workbookType.toLowerCase()} workbook`,
      `Apply ${this.templates.find((t) => t.id === templateId)?.name || templateId} template system`,
      `Generate ${sheets.slice(0, 6).join(', ')} sheets`,
      'Separate source data from assumptions and dashboards',
      'Add audit and governance tabs for production review',
    ];
  }

  // ── Low-level workbook helpers ─────────────────────────────────────────────

  private projectMetricValue(value: string, periodIndex: number, metricIndex: number) {
    const normalized = String(value || '').replace(/[, $€£]/g, '');
    const numeric = Number.parseFloat(normalized);
    if (!Number.isFinite(numeric)) return value;
    const projected = numeric * (1 + periodIndex * 0.06 + metricIndex * 0.015);
    if (/%$/.test(value)) return `${Math.round(projected * 10) / 10}%`;
    if (/[$€£]/.test(value)) return Math.round(projected);
    return Math.round(projected);
  }

  private firstPercent(metrics: Array<{ value: string }>) {
    return metrics.find((m) => /%/.test(m.value))?.value;
  }

  private detectCurrency(script: string) {
    if (/€|eur/i.test(script)) return 'EUR';
    if (/£|gbp/i.test(script)) return 'GBP';
    if (/aed/i.test(script)) return 'AED';
    if (/jod/i.test(script)) return 'JOD';
    if (/\$|usd/i.test(script)) return 'USD';
    return '';
  }

  private buildRecommendations(
    summary: ExcelStudioAnalysis['summary'],
    issues: ExcelStudioIssue[],
  ) {
    const recs = [
      'Preserve source data and calculations; apply improvements as presentation, formatting, and review layers.',
      'Create an executive summary sheet with KPIs, risks, and workbook owner notes.',
      'Convert key data ranges into structured tables before building charts or dashboards.',
    ];
    if (summary.formulas > 0)
      recs.push('Add formula dependency review and highlight hard-coded constants near formulas.');
    if (summary.mergedCells > 0)
      recs.push(
        'Reduce merged cells in data tables to improve sorting, filtering, and export reliability.',
      );
    if (issues.some((i) => i.category === 'data-quality'))
      recs.push('Resolve duplicates and suspicious blanks only after user approval.');
    return recs;
  }

  private buildEnhancementPlan(analysis: ExcelStudioAnalysis, templateId = 'executive-emerald') {
    return [
      `Apply ${this.templates.find((t) => t.id === templateId)?.name || 'Executive'} visual system.`,
      'Add workbook cover and executive summary sheet.',
      'Standardize headers, number formats, spacing, and table borders without changing source values.',
      'Create dashboard-ready KPI blocks from detected tables.',
      'Add an audit sheet with issues, owner notes, and export readiness checks.',
      ...analysis.recommendations.slice(0, 4),
    ];
  }

  private countFormulaCells(sheet: XLSX.WorkSheet) {
    return Object.keys(sheet || {}).filter(
      (k) => !k.startsWith('!') && Boolean((sheet as any)[k]?.f),
    ).length;
  }

  private inspectWorksheet(
    sheet: XLSX.WorkSheet,
    rows: string[][],
    totalRows: number,
    totalColumns: number,
  ) {
    const errorLiterals = new Set([
      '#REF!',
      '#VALUE!',
      '#DIV/0!',
      '#N/A',
      '#NAME?',
      '#NUM!',
      '#NULL!',
    ]);
    let errorCells = 0,
      currencyLikeCells = 0,
      dateLikeCells = 0,
      numericCells = 0;
    for (const key of Object.keys(sheet || {})) {
      if (key.startsWith('!')) continue;
      const cell: any = (sheet as any)[key];
      const value = String(cell?.w ?? cell?.v ?? '').trim();
      const formula = String(cell?.f ?? '').toUpperCase();
      if (
        cell?.t === 'e' ||
        errorLiterals.has(value.toUpperCase()) ||
        /#REF!|#VALUE!|#DIV\/0!|#N\/A|#NAME\?|#NUM!|#NULL!/.test(formula)
      )
        errorCells++;
      if (
        /^[$€£]\s?[-+]?\d/.test(value) ||
        /[-+]?\d[\d,]*(\.\d+)?\s?(USD|EUR|GBP|AED|SAR|JOD)$/i.test(value)
      )
        currencyLikeCells++;
      if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value) || /^\d{4}-\d{2}-\d{2}$/.test(value))
        dateLikeCells++;
      if (cell?.t === 'n' || /^[-+]?\d[\d,]*(\.\d+)?%?$/.test(value)) numericCells++;
    }
    const normalizedRows = Array.from({ length: totalRows }, (_, r) => {
      const row = rows[r] || [];
      return Array.from({ length: totalColumns }, (_, c) => String(row[c] ?? '').trim());
    });
    const blankRows = normalizedRows.filter((row) => row.every((c) => !c)).length;
    let blankColumns = 0;
    for (let c = 0; c < totalColumns; c++)
      if (normalizedRows.every((row) => !row[c])) blankColumns++;
    const blankCells = normalizedRows.reduce((s, row) => s + row.filter((c) => !c).length, 0);
    return {
      errorCells,
      currencyLikeCells,
      dateLikeCells,
      numericCells,
      blankRows,
      blankColumns,
      blankCells,
    };
  }

  private countDuplicateRows(rows: string[][]) {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const row of rows.slice(1)) {
      const key = row.map((c) => String(c).trim().toLowerCase()).join('|');
      if (!key.replace(/\|/g, '')) continue;
      if (seen.has(key)) duplicates++;
      seen.add(key);
    }
    return duplicates;
  }

  private titleFromFilename(filename: string) {
    return (
      filename
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || 'Untitled workbook'
    );
  }

  private slug(value: string) {
    return (
      String(value || 'workbook')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 64) || 'workbook'
    );
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
}
