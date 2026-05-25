import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
  UploadedFile, UseInterceptors, BadRequestException, Res, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { CvProfilesService }  from './cv-profiles.service';
import { CvDocumentsService } from './cv-documents.service';
import { CvTemplatesService } from './cv-templates.service';
import { CvImportService }    from './cv-import.service';
import { CvExportService, CvExportFormat } from './cv-export.service';
import { BrandKitsService } from '../brand-kits/brand-kits.service';
import { CvDoctype } from './cv-types';
import { CvAnalyzerService, CvProfileSnapshot } from './cv-analyzer.service';
import {
  CvSnapshotService, CvVariantsService, CvBenchmarkService,
  CvInterviewReadinessService, CvExportValidationService,
  CvTemplateInsightsService, VariantPreset, CvSnapshotKind,
} from './cv-pro.service';
import { ImportProgressTracker } from './cv-import-polish';
import { CvMappingMemoryService } from './cv-mapping-memory.service';
import { PrismaService } from '../prisma/prisma.service';
import { isPlatformAdmin } from '../admin/admin.controller';

// =============================================================================
//  Phase 42 — Career documents API.
//
//  Routes are grouped under /career for discoverability.
//
//    Profile:
//      GET    /career/profile
//      PATCH  /career/profile/personal
//      POST   /career/profile/:profileId/section/:section
//      PATCH  /career/profile/:profileId/section/:section/:itemId
//      DELETE /career/profile/:profileId/section/:section/:itemId
//      POST   /career/profile/:profileId/section/:section/reorder
//      POST   /career/profile/:profileId/import/linkedin    body: { payload }
//      POST   /career/profile/:profileId/import/file        multipart file
//
//    Documents:
//      GET    /career/documents?doctype=cv|resume|coverLetter|portfolio
//      POST   /career/documents
//      GET    /career/documents/:id
//      PATCH  /career/documents/:id
//      POST   /career/documents/:id/template     body: { templateId }
//      POST   /career/documents/:id/duplicate    body: { title?, variant? }
//      DELETE /career/documents/:id
//      POST   /career/documents/:id/export       query: format=pdf|docx|pptx|html|md
//
//    Templates:
//      GET    /career/templates?doctype=&category=
// =============================================================================

@ApiTags('Career')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('career')
export class CareerController {
  constructor(
    private readonly profiles:  CvProfilesService,
    private readonly documents: CvDocumentsService,
    private readonly templates: CvTemplatesService,
    private readonly importer:  CvImportService,
    private readonly exporter:  CvExportService,
    private readonly brandKits: BrandKitsService,
    private readonly analyzer:  CvAnalyzerService,
    private readonly snapshots: CvSnapshotService,
    private readonly variants:  CvVariantsService,
    private readonly benchmark: CvBenchmarkService,
    private readonly interview: CvInterviewReadinessService,
    private readonly preflight: CvExportValidationService,
    private readonly tplInsights: CvTemplateInsightsService,
    private readonly progress:    ImportProgressTracker,
    private readonly mappingMem:  CvMappingMemoryService,
    private readonly prisma:      PrismaService,
  ) {}

  // ─── Profile ────────────────────────────────────────────────────────────────

  @Get('profile')
  getProfile(@GetUser() user: any) {
    return this.profiles.getOrCreate(user.id);
  }

  @Patch('profile/personal')
  async patchPersonal(@GetUser() user: any, @Body() body: any) {
    const profile = await this.profiles.getOrCreate(user.id);
    return this.profiles.patchPersonal(profile.id, body || {});
  }

  @Post('profile/:profileId/section/:section')
  addSectionItem(@Param('profileId') profileId: string, @Param('section') section: string, @Body() body: any) {
    return this.profiles.addSectionItem(profileId, section as any, body || {});
  }

  @Patch('profile/:profileId/section/:section/:itemId')
  updateSectionItem(@Param('profileId') profileId: string, @Param('section') section: string, @Param('itemId') itemId: string, @Body() body: any) {
    return this.profiles.updateSectionItem(profileId, section as any, itemId, body || {});
  }

  @Delete('profile/:profileId/section/:section/:itemId')
  removeSectionItem(@Param('profileId') profileId: string, @Param('section') section: string, @Param('itemId') itemId: string) {
    return this.profiles.removeSectionItem(profileId, section as any, itemId);
  }

  @Post('profile/:profileId/section/:section/reorder')
  reorderSection(@Param('profileId') profileId: string, @Param('section') section: string, @Body() body: { ids: string[] }) {
    return this.profiles.reorderSection(profileId, section as any, body?.ids ?? []);
  }

  @Post('profile/:profileId/import/linkedin')
  @ApiOperation({ summary: 'Import LinkedIn export JSON into a profile (Phase 42M)' })
  importLinkedIn(@Param('profileId') profileId: string, @Body() body: any) {
    return this.importer.importFromLinkedIn(profileId, body?.payload ?? body);
  }

  @Post('profile/:profileId/import/file')
  @ApiOperation({ summary: 'Import an existing CV (DOCX/PDF/HTML/MD) into a profile (Phase 42L + 42.7 + 42.8)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importFile(
    @GetUser() user: any,
    @Param('profileId') profileId: string,
    @UploadedFile() file: any,
    @Query('forceOcr') forceOcr?: string,
    @Query('jobId') clientJobId?: string,
    @Body('sectionMappings') sectionMappingsRaw?: any,
  ) {
    if (!file?.buffer) throw new BadRequestException('Missing file (multipart field "file")');
    let sectionMappings: Record<string, any> | undefined;
    if (sectionMappingsRaw) {
      try { sectionMappings = typeof sectionMappingsRaw === 'string' ? JSON.parse(sectionMappingsRaw) : sectionMappingsRaw; }
      catch { sectionMappings = undefined; }
    }
    // Phase 42.8A — accept a client-generated jobId so polling can start
    // before the response settles. Fall back to a server-generated one.
    const job = this.progress.newJob(clientJobId);
    const result = await this.importer.importFromFile(profileId, file.buffer, file.originalname || 'cv', file.mimetype, {
      sectionMappings: sectionMappings as any,
      forceOcr:        forceOcr === '1' || forceOcr === 'true',
      userId:          user.id,
      jobId:           job.jobId,
    });
    return { jobId: job.jobId, ...result };
  }

  // ===========================================================================
  //  Phase 42.8A — Progress polling + cancel
  // ===========================================================================
  @Get('profile/import/progress/:jobId')
  importProgress(@Param('jobId') jobId: string) {
    const p = this.progress.get(jobId);
    if (!p) throw new BadRequestException('Unknown jobId');
    return p;
  }

  @Post('profile/import/cancel/:jobId')
  importCancel(@Param('jobId') jobId: string) {
    return { ok: this.progress.cancel(jobId) };
  }

  // ===========================================================================
  //  Phase 42.8D + 42.8E — Section mapping memory CRUD
  // ===========================================================================
  @Get('import/mappings')
  listMappings(@GetUser() user: any) { return this.mappingMem.list(user.id); }

  @Patch('import/mappings/:id')
  updateMapping(@GetUser() user: any, @Param('id') id: string, @Body() body: { targetSection?: string; autoApply?: boolean }) {
    return this.mappingMem.update(user.id, id, body || {});
  }

  @Delete('import/mappings/:id')
  removeMapping(@GetUser() user: any, @Param('id') id: string) {
    return { ok: this.mappingMem.remove(user.id, id) };
  }

  @Delete('import/mappings')
  removeAllMappings(@GetUser() user: any) {
    return this.mappingMem.removeAll(user.id);
  }

  // ===========================================================================
  //  Phase 42.8G — Import history (per-user) — reads CvAnalysisSnapshot rows
  // ===========================================================================
  @Get('import/history')
  importHistory(@GetUser() user: any, @Query('limit') limit?: string) {
    return this.prisma.cvAnalysisSnapshot.findMany({
      where:   { userId: user.id, kind: 'import' },
      orderBy: { createdAt: 'desc' },
      take:    Math.max(1, Math.min(200, Number(limit || 50))),
      select:  { id: true, label: true, score: true, atsScore: true, createdAt: true, analysisJson: true },
    });
  }

  @Delete('import/history/:id')
  deleteImportHistory(@GetUser() user: any, @Param('id') id: string) {
    return this.prisma.cvAnalysisSnapshot.deleteMany({ where: { id, userId: user.id, kind: 'import' } });
  }

  // ===========================================================================
  //  Phase 42.8C + 42.8K — Admin import analytics
  // ===========================================================================
  @Get('import/analytics')
  async importAnalytics(@GetUser() user: any) {
    if (!await isPlatformAdmin(this.prisma, user.id)) throw new BadRequestException('Admin only');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60_000); // 30 days
    const rows = await this.prisma.cvAnalysisSnapshot.findMany({
      where: { kind: 'import', createdAt: { gte: since } },
      select: { score: true, atsScore: true, analysisJson: true, createdAt: true },
    });

    const total = rows.length;
    if (total === 0) {
      return { total: 0, since: since.toISOString(), avgConfidence: 0, ocrUsage: 0, avgDurationMs: 0, missingSections: {}, unknownHeadings: {}, skillNormalisations: {}, failureRate: 0, daily: [] };
    }

    let confSum = 0, durSum = 0, ocrCount = 0, failed = 0;
    const missingSections:    Record<string, number> = {};
    const unknownHeadings:    Record<string, number> = {};
    const langs:              Record<string, number> = {};
    const dailyMap:           Record<string, number> = {};
    for (const r of rows) {
      const ev = (r.analysisJson || {}) as any;
      confSum += r.score ?? ev.confidenceOverall ?? 0;
      durSum  += ev.durationMs ?? 0;
      if (ev.ocrUsed) ocrCount++;
      if (ev.failed)  failed++;
      for (const k of ev.missing  || []) missingSections[k] = (missingSections[k] || 0) + 1;
      for (const k of ev.unknownHeadings || []) unknownHeadings[k] = (unknownHeadings[k] || 0) + 1;
      for (const l of ev.ocrLangsUsed || []) langs[l] = (langs[l] || 0) + 1;
      const day = new Date(r.createdAt).toISOString().slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    const daily = Object.entries(dailyMap).sort(([a],[b]) => a.localeCompare(b)).map(([day, n]) => ({ day, n }));

    return {
      since:           since.toISOString(),
      total,
      avgConfidence:   Math.round(confSum / total),
      ocrUsage:        Math.round((ocrCount / total) * 100),
      avgDurationMs:   Math.round(durSum / total),
      failureRate:     Math.round((failed / total) * 100),
      missingSections: topN(missingSections, 8),
      unknownHeadings: topN(unknownHeadings, 12),
      langs:           topN(langs, 8),
      daily,
    };
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  @Get('documents')
  listDocuments(@GetUser() user: any, @Query('doctype') doctype?: CvDoctype) {
    return this.documents.listForUser(user.id, doctype);
  }

  @Get('documents/:id')
  getDocument(@Param('id') id: string) {
    return this.documents.findOne(id);
  }

  @Post('documents')
  async createDocument(@GetUser() user: any, @Body() body: {
    doctype: CvDoctype; title: string; templateId?: string; brandKitId?: string; variant?: string;
  }) {
    if (!body?.doctype) throw new BadRequestException('Missing doctype');
    const profile = await this.profiles.getOrCreate(user.id);
    return this.documents.create({
      userId:     user.id,
      profileId:  profile.id,
      doctype:    body.doctype,
      title:      body.title,
      templateId: body.templateId ?? null,
      brandKitId: body.brandKitId ?? null,
      variant:    body.variant,
    });
  }

  @Patch('documents/:id')
  updateDocument(@Param('id') id: string, @Body() body: any) {
    return this.documents.update(id, body || {});
  }

  @Post('documents/:id/template')
  switchTemplate(@Param('id') id: string, @Body() body: { templateId: string | null }) {
    return this.documents.switchTemplate(id, body?.templateId ?? null);
  }

  @Post('documents/:id/duplicate')
  duplicate(@Param('id') id: string, @Body() body: { title?: string; variant?: string }) {
    return this.documents.duplicate(id, body?.title, body?.variant);
  }

  @Delete('documents/:id')
  remove(@Param('id') id: string) {
    return this.documents.remove(id);
  }

  @Post('documents/:id/export')
  @ApiOperation({ summary: 'Export the document (PDF / DOCX / PPTX / HTML / MD)' })
  async export(@Param('id') id: string, @Query('format') format: string, @GetUser() user: any, @Res() res: Response) {
    const fmt = (format || 'pdf') as CvExportFormat;
    const doc = await this.documents.findOne(id);
    const profile = await this.profiles.get(doc.profileId);
    // Phase 42.1 — fetch BrandKit tokens when the document is linked to one.
    const brandTokens = await this.resolveBrandTokens(doc.brandKitId, user.id);
    const r = await this.exporter.export(fmt, profile, doc, brandTokens);
    const safe = (doc.title || 'document').replace(/[^a-z0-9.-]/gi, '_');
    res.setHeader('Content-Type', r.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${safe}.${r.extension}"`);
    res.setHeader('X-Pitchonix-Export-Duration-Ms', String(r.durationMs));
    if (r.mode) res.setHeader('X-Pitchonix-Export-Mode', r.mode);
    res.send(r.buffer);
  }

  /** Resolve BrandKit ID → { colors, fonts, logo } for the renderer. */
  private async resolveBrandTokens(brandKitId: string | null, userId: string): Promise<any> {
    if (!brandKitId) return undefined;
    try {
      const kit: any = await this.brandKits.findOne(brandKitId, userId);
      const tokens: any = kit.tokens || {};
      return {
        colors: {
          primary:    tokens.colors?.primary    ?? kit.primaryColor   ?? undefined,
          secondary:  tokens.colors?.secondary  ?? kit.secondaryColor ?? undefined,
          accent:     tokens.colors?.accent     ?? undefined,
          text:       tokens.colors?.text       ?? undefined,
          background: tokens.colors?.background ?? undefined,
        },
        fonts: {
          heading: tokens.typography?.heading?.family ?? kit.fontFamily ?? undefined,
          body:    tokens.typography?.body?.family    ?? kit.fontFamily ?? undefined,
        },
        logo: kit.logo ?? undefined,
      };
    } catch {
      // Brand kit unreadable (wrong owner / deleted) — fall through to template defaults.
      return undefined;
    }
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  @Get('templates')
  listTemplates(@Query('doctype') doctype?: CvDoctype, @Query('category') category?: string) {
    return this.templates.list({ doctype, category });
  }

  @Get('templates/count')
  countTemplates() {
    return this.templates.countByDoctype();
  }

  @Get('templates/insights')
  @ApiOperation({ summary: 'Phase 42.5A — 6-axis template performance radar (ATS / Visual / Executive / Creative / Readability / Print)' })
  async templatesInsights(@Query('doctype') doctype?: CvDoctype) {
    const list = await this.templates.list({ doctype: doctype || 'cv' });
    const rows = Array.isArray(list) ? list : ((list as any)?.items || []);
    return this.tplInsights.scoreMany(rows.map((t: any) => ({
      id: t.id, name: t.name, category: t.category, layout: t.layout,
    })));
  }

  // ===========================================================================
  //  Phase 42.3 — CV Intelligence Studio
  //
  //    POST /career/analyze/parse-file       multipart file  → { profile, warnings }
  //    POST /career/analyze                  body { profile } → CvQualityReport
  //    POST /career/analyze/apply-fix        body { profile, issueId, userInput? } → profile
  //    POST /career/analyze/recommend-templates  body { profile, report? } → template ranking
  //    POST /career/analyze/match-job        body { profile, jobDescription } → CvJobMatchReport
  //    POST /career/analyze/save             body { profile, doctype, title, templateId? }
  //                                          → creates a CvDocument from the cleaned profile
  // ===========================================================================

  @Post('analyze/parse-file')
  @ApiOperation({ summary: 'Phase 42.3A — parse an uploaded CV into a CvProfile snapshot (no DB write)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async analyzeParseFile(@GetUser() user: any, @UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing file (multipart field "file")');
    // Re-use the existing importer; route through a transient profile so we
    // don't clobber the user's saved profile. The transient profile is
    // returned to the client and then thrown away unless they choose Save.
    const transient = await this.profiles.getOrCreate(user.id);
    const { profile, warnings } = await this.importer.importFromFile(
      transient.id, file.buffer, file.originalname || 'cv', file.mimetype,
    );
    return { profile, warnings };
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Phase 42.3C — quality report for an in-memory CvProfile snapshot' })
  analyze(@Body() body: { profile: CvProfileSnapshot }) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    return this.analyzer.analyze(body.profile);
  }

  @Post('analyze/apply-fix')
  @ApiOperation({ summary: 'Phase 42.3F — apply one fix to a profile snapshot (user-initiated)' })
  applyFix(@Body() body: { profile: CvProfileSnapshot; issueId: string; userInput?: string }) {
    if (!body?.profile || !body?.issueId) throw new BadRequestException('Missing profile/issueId');
    return { profile: this.analyzer.applyFix(body.profile, body.issueId, body.userInput) };
  }

  @Post('analyze/recommend-templates')
  @ApiOperation({ summary: 'Phase 42.3H — template recommendations for a profile' })
  async recommendTemplates(@Body() body: { profile: CvProfileSnapshot; doctype?: CvDoctype }) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    const report = this.analyzer.analyze(body.profile);
    const tpl = await this.templates.list({ doctype: body.doctype || 'cv' });
    const slim = (Array.isArray(tpl) ? tpl : (tpl as any)?.items || []).map((t: any) => ({
      id: t.id, name: t.name, category: t.category, atsSafe: !!t.atsSafe,
    }));
    return this.analyzer.recommendTemplates(report, slim);
  }

  @Post('analyze/match-job')
  @ApiOperation({ summary: 'Phase 42.3I — match a profile against a pasted job description' })
  matchJob(@Body() body: { profile: CvProfileSnapshot; jobDescription: string }) {
    if (!body?.profile || !body?.jobDescription) throw new BadRequestException('Missing profile/jobDescription');
    return this.analyzer.matchJob(body.profile, body.jobDescription);
  }

  // ===========================================================================
  //  Phase 42.4 — PRO+ endpoints
  //
  //    POST /career/analyze/snapshot                     persist a snapshot
  //    GET  /career/analyze/snapshots                    list user snapshots
  //    GET  /career/analyze/snapshots/:id                full snapshot payload
  //    POST /career/analyze/snapshots/:id/restore        return its profileJson
  //    DELETE /career/analyze/snapshots/:id
  //    DELETE /career/analyze/snapshots                  bulk wipe
  //    POST /career/analyze/variants                     generate one CvDocument per preset
  //    GET  /career/analyze/variants/presets             list available presets
  //    POST /career/analyze/benchmark                    benchmark report from a profile
  //    POST /career/analyze/interview                    interview readiness from a profile
  //    POST /career/analyze/preflight                    export preflight warnings
  // ===========================================================================

  @Post('analyze/snapshot')
  @ApiOperation({ summary: 'Phase 42.4B — persist an analysis / job-match / benchmark / interview snapshot' })
  async snapshotSave(@GetUser() user: any, @Body() body: {
    kind:        CvSnapshotKind;
    profile:     CvProfileSnapshot;
    documentId?: string;
    label?:      string;
    analysisJson: any;
    score?:      number;
    atsScore?:   number;
  }) {
    if (!body?.kind || !body?.profile || !body?.analysisJson) throw new BadRequestException('Missing kind/profile/analysisJson');
    const transient = await this.profiles.getOrCreate(user.id);
    return this.snapshots.save({
      userId:     user.id,
      profileId:  transient.id,
      documentId: body.documentId ?? null,
      kind:       body.kind,
      label:      body.label,
      analysisJson: body.analysisJson,
      profileJson:  body.profile,
      score:      body.score,
      atsScore:   body.atsScore,
    });
  }

  @Get('analyze/snapshots')
  @ApiOperation({ summary: 'Phase 42.4B — list snapshots for the caller' })
  snapshotList(@GetUser() user: any, @Query('documentId') documentId?: string, @Query('kind') kind?: CvSnapshotKind) {
    return this.snapshots.list(user.id, { documentId, kind });
  }

  @Get('analyze/snapshots/:id')
  snapshotGet(@GetUser() user: any, @Param('id') id: string) {
    return this.snapshots.get(user.id, id);
  }

  @Post('analyze/snapshots/:id/restore')
  snapshotRestore(@GetUser() user: any, @Param('id') id: string) {
    return this.snapshots.restorePayload(user.id, id);
  }

  @Delete('analyze/snapshots/:id')
  snapshotDelete(@GetUser() user: any, @Param('id') id: string) {
    return this.snapshots.delete(user.id, id);
  }

  @Delete('analyze/snapshots')
  @ApiOperation({ summary: 'Phase 42.4M — bulk-delete all analysis history for the caller' })
  snapshotDeleteAll(@GetUser() user: any, @Query('profileId') profileId?: string) {
    return this.snapshots.deleteAll(user.id, { profileId });
  }

  @Post('analyze/variants')
  @ApiOperation({ summary: 'Phase 42.4C — generate one CvDocument per requested preset' })
  async variantsGenerate(@GetUser() user: any, @Body() body: {
    presets: VariantPreset[]; brandKitId?: string; profileId?: string;
  }) {
    if (!body?.presets?.length) throw new BadRequestException('Missing presets');
    const profile = body.profileId
      ? await this.profiles.get(body.profileId)
      : await this.profiles.getOrCreate(user.id);
    const tpl = await this.templates.list({ doctype: 'cv' });
    const slim = (Array.isArray(tpl) ? tpl : (tpl as any)?.items || []).map((t: any) => ({
      id: t.id, name: t.name, category: t.category, atsSafe: !!t.atsSafe,
    }));
    return this.variants.generate({
      userId: user.id, profileId: profile.id,
      presets: body.presets, brandKitId: body.brandKitId, templates: slim,
    });
  }

  @Get('analyze/variants/presets')
  variantsListPresets() {
    return this.variants.listPresets();
  }

  @Post('analyze/benchmark')
  @ApiOperation({ summary: 'Phase 42.4D — percentile-band benchmark for a profile' })
  benchmarkRun(@Body() body: { profile: CvProfileSnapshot }) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    const report = this.analyzer.analyze(body.profile);
    return this.benchmark.benchmark(report);
  }

  @Post('analyze/interview')
  @ApiOperation({ summary: 'Phase 42.4E — interview readiness for a profile' })
  interviewRun(@Body() body: { profile: CvProfileSnapshot }) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    return this.interview.analyze(body.profile);
  }

  @Post('analyze/preflight')
  @ApiOperation({ summary: 'Phase 42.4J — export-time preflight (warnings + recommendations)' })
  exportPreflight(@Body() body: { profile: CvProfileSnapshot }) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    return this.preflight.preflight(body.profile);
  }

  @Post('analyze/save')
  @ApiOperation({ summary: 'Phase 42.3K — persist the improved profile + create a CvDocument from it' })
  async analyzeSave(
    @GetUser() user: any,
    @Body() body: {
      profile:    CvProfileSnapshot;
      doctype?:   CvDoctype;
      title?:     string;
      templateId?: string | null;
      brandKitId?: string | null;
      overwriteProfile?: boolean;
    },
  ) {
    if (!body?.profile) throw new BadRequestException('Missing profile');
    const transient = await this.profiles.getOrCreate(user.id);
    // Optionally overwrite the user's stored profile with the improved one
    // (default behaviour: yes — that's the whole point of the wizard).
    if (body.overwriteProfile !== false) {
      // Re-use replaceFromImport — it already overwrites every section JSON
      // column at once and stamps an import source for audit.
      await this.profiles.replaceFromImport(transient.id, 'docx', body.profile as any);
    }
    const doc = await this.documents.create({
      userId:     user.id,
      profileId:  transient.id,
      doctype:    body.doctype || 'cv',
      title:      body.title || 'Improved CV',
      templateId: body.templateId ?? null,
      brandKitId: body.brandKitId ?? null,
    });
    return { documentId: doc.id, profileId: transient.id };
  }
}

function topN(map: Record<string, number>, n: number) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ key: k, count: v }));
}
