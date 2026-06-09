import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentLedgerService } from '../content-ledger/content-ledger.service';
import { ContentNodeInput } from '../content-ledger/content-ledger.types';
import { FeasibilityAnalyzerService } from './feasibility-analyzer.service';
import { FEASIBILITY_TEMPLATES, getFeasibilityTemplate } from './feasibility-templates';
import { FeasibilityAnalysis, FeasibilitySectionCheck } from './feasibility-studio.types';

interface CreateFeasibilityInput {
  rawContent: string;
  title?: string;
  description?: string;
  industry?: string;
  studyType?: string;
  templateId?: string;
  brandKitId?: string;
}

@Injectable()
export class FeasibilityStudioService {
  private readonly logger = new Logger(FeasibilityStudioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyzer: FeasibilityAnalyzerService,
    private readonly ledger: ContentLedgerService,
  ) {}

  listTemplates() {
    return FEASIBILITY_TEMPLATES;
  }

  analyze(input: CreateFeasibilityInput) {
    if (!input.rawContent || input.rawContent.trim().length < 10) {
      throw new BadRequestException('Feasibility content must be at least 10 characters.');
    }
    return this.analyzer.analyze(input.rawContent, {
      title: input.title,
      industry: input.industry,
      studyType: input.studyType,
    });
  }

  async listProjects(userId: string) {
    return (this.prisma as any).feasibilityProject.findMany({
      where: { userId, project: { archivedAt: null } },
      orderBy: { updatedAt: 'desc' },
      include: {
        project: true,
        pdfDocument: true,
        assessments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async getProject(userId: string, id: string) {
    const project = await (this.prisma as any).feasibilityProject.findFirst({
      where: { id, userId },
      include: {
        project: true,
        pdfDocument: { include: { pages: { orderBy: { order: 'asc' } } } },
        assessments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project) throw new NotFoundException('Feasibility project not found.');
    if (await this.needsStructuredPdfRepair(project)) {
      await this.repairStructuredPdfPages(project);
      const repaired = await (this.prisma as any).feasibilityProject.findFirst({
        where: { id, userId },
        include: {
          project: true,
          pdfDocument: { include: { pages: { orderBy: { order: 'asc' } } } },
          assessments: { orderBy: { createdAt: 'desc' } },
        },
      });
      await this.markLedgerReopened(repaired);
      return repaired;
    }
    await this.markLedgerReopened(project);
    return project;
  }

  async repairPdfDocumentIfNeeded(pdfDocumentId: string): Promise<boolean> {
    const project = await (this.prisma as any).feasibilityProject.findFirst({
      where: { pdfDocumentId },
      include: {
        project: true,
        pdfDocument: { include: { pages: { orderBy: { order: 'asc' } } } },
        assessments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!project || !(await this.needsStructuredPdfRepair(project))) return false;
    await this.repairStructuredPdfPages(project);
    return true;
  }

  async createProject(userId: string, input: CreateFeasibilityInput) {
    const analysis = this.analyze(input);
    const template = getFeasibilityTemplate(input.templateId);
    const title = input.title?.trim() || analysis.projectName || 'Feasibility Study';
    const description = input.description?.trim() || analysis.businessObjective;

    const workspaceMember = await this.prisma.workspaceMember.findFirst({
      where: { userId },
      select: { workspaceId: true },
    });

    const project = await this.prisma.project.create({
      data: {
        userId,
        name: title,
        description,
        documentType: 'feasibility_study',
        documentFormat: 'pdf',
        industry: input.industry || analysis.industry,
        status: 'draft',
        audience: 'executives',
        tone: 'strategic',
        businessInfo: {
          feasibility: {
            studyType: analysis.studyType,
            recommendation: analysis.recommendation,
            score: analysis.scores.overallScore,
          },
        } as any,
        ...(workspaceMember?.workspaceId ? { workspaceId: workspaceMember.workspaceId } : {}),
      },
    });

    const pdfDocument = await this.prisma.pdfDocument.create({
      data: {
        projectId: project.id,
        title,
        description,
        documentType: 'feasibility_study',
        brandKitId: input.brandKitId,
        templateType: template.pdfTemplateType,
        proTemplateId: template.proTemplateId || null,
        status: 'draft',
        qualityScore: analysis.scores.overallScore,
        exportReady: analysis.scores.overallScore >= 70,
        outline: {
          type: 'feasibility_study',
          templateId: template.id,
          templateName: template.name,
          sections: template.sections,
          detectedStudyType: analysis.studyType,
        } as any,
        metadata: {
          feasibilityStudio: true,
          feasibilityTemplateId: template.id,
          analysis,
          sourcePreservation: analysis.preservation,
        } as any,
      },
    });

    const feasibilityProject = await (this.prisma as any).feasibilityProject.create({
      data: {
        userId,
        projectId: project.id,
        pdfDocumentId: pdfDocument.id,
        title,
        description,
        industry: input.industry || analysis.industry,
        studyType: analysis.studyType,
        score: analysis.scores.overallScore,
        status: 'draft',
        analysis: analysis as any,
        recommendations: analysis.recommendations as any,
        sourceMetadata: {
          originalCharacterCount: input.rawContent.length,
          templateId: template.id,
        } as any,
      },
    });

    await (this.prisma as any).feasibilityAssessment.create({
      data: {
        feasibilityProjectId: feasibilityProject.id,
        marketScore: analysis.scores.marketScore,
        financialScore: analysis.scores.financialScore,
        technicalScore: analysis.scores.technicalScore,
        operationalScore: analysis.scores.operationalScore,
        riskScore: analysis.scores.riskScore,
        overallScore: analysis.scores.overallScore,
        missingSections: analysis.sections.filter((section) => section.status !== 'present') as any,
        warnings: analysis.warnings as any,
        recommendations: analysis.recommendations as any,
      },
    });

    await this.persistReportPages(pdfDocument.id, input.rawContent, analysis, template.id);
    await this.prisma.project.update({
      where: { id: project.id },
      data: {
        businessInfo: {
          feasibility: {
            feasibilityProjectId: feasibilityProject.id,
            pdfDocumentId: pdfDocument.id,
            studyType: analysis.studyType,
            recommendation: analysis.recommendation,
            score: analysis.scores.overallScore,
            templateId: template.id,
          },
        } as any,
        qualityScore: analysis.scores.overallScore,
      },
    });

    return this.getProject(userId, feasibilityProject.id);
  }

  async updateProject(userId: string, id: string, patch: any) {
    await this.getProject(userId, id);
    await (this.prisma as any).feasibilityProject.update({
      where: { id },
      data: {
        ...(typeof patch.title === 'string' ? { title: patch.title } : {}),
        ...(typeof patch.description === 'string' ? { description: patch.description } : {}),
        ...(typeof patch.industry === 'string' ? { industry: patch.industry } : {}),
        ...(typeof patch.status === 'string' ? { status: patch.status } : {}),
      },
    });
    return this.getProject(userId, id);
  }

  async enhanceProject(userId: string, id: string) {
    const project = await this.getProject(userId, id);
    const source = this.collectSourceText(
      project.pdfDocument?.pages || [],
      project.pdfDocument?.metadata,
    );
    if (!source) return project;

    const analysis = this.analyzer.analyze(source, {
      title: project.title,
      industry: project.industry,
      studyType: project.studyType,
    });

    await (this.prisma as any).feasibilityProject.update({
      where: { id },
      data: {
        score: analysis.scores.overallScore,
        analysis: analysis as any,
        recommendations: analysis.recommendations as any,
        status: 'reviewed',
      },
    });
    await (this.prisma as any).feasibilityAssessment.create({
      data: {
        feasibilityProjectId: id,
        marketScore: analysis.scores.marketScore,
        financialScore: analysis.scores.financialScore,
        technicalScore: analysis.scores.technicalScore,
        operationalScore: analysis.scores.operationalScore,
        riskScore: analysis.scores.riskScore,
        overallScore: analysis.scores.overallScore,
        missingSections: analysis.sections.filter((section) => section.status !== 'present') as any,
        warnings: analysis.warnings as any,
        recommendations: analysis.recommendations as any,
      },
    });
    await this.prisma.pdfDocument.update({
      where: { id: project.pdfDocumentId },
      data: {
        qualityScore: analysis.scores.overallScore,
        exportReady: analysis.scores.overallScore >= 70,
        metadata: {
          ...(project.pdfDocument?.metadata || {}),
          feasibilityStudio: true,
          feasibilityTemplateId: project.sourceMetadata?.templateId,
          analysis,
          sourcePreservation: analysis.preservation,
        } as any,
      },
    });
    await this.prisma.pdfPage.deleteMany({ where: { documentId: project.pdfDocumentId } });
    await this.persistReportPages(
      project.pdfDocumentId,
      source,
      analysis,
      project.sourceMetadata?.templateId || 'investor-feasibility-report',
    );
    return this.getProject(userId, id);
  }

  async duplicateProject(userId: string, id: string) {
    const source = await this.getProject(userId, id);
    const rawContent =
      this.collectSourceText(source.pdfDocument?.pages || [], source.pdfDocument?.metadata) ||
      this.pagesToText(source.pdfDocument?.pages || []);
    return this.createProject(userId, {
      rawContent,
      title: `${source.title} Copy`,
      description: source.description,
      industry: source.industry,
      studyType: source.studyType,
      templateId: source.sourceMetadata?.templateId,
      brandKitId: source.pdfDocument?.brandKitId,
    });
  }

  async archiveProject(userId: string, id: string) {
    const feasibility = await this.getProject(userId, id);
    await this.prisma.project.update({
      where: { id: feasibility.projectId },
      data: { archivedAt: new Date(), status: 'archived' },
    });
    await (this.prisma as any).feasibilityProject.update({
      where: { id },
      data: { status: 'archived' },
    });
    return { ok: true };
  }

  async deleteProject(userId: string, id: string) {
    const feasibility = await this.getProject(userId, id);
    const pdfDocumentId = feasibility.pdfDocumentId || feasibility.pdfDocument?.id;
    await this.prisma.project.delete({ where: { id: feasibility.projectId } });
    // Phase Ω.CONTENT.2 — ledger nodes are keyed by document id (no FK), so
    // clear them explicitly to avoid orphans after the cascade delete.
    if (pdfDocumentId) {
      await this.ledger
        .resetDocument(pdfDocumentId)
        .catch((error: any) =>
          this.logger.warn(
            `Ledger cleanup skipped for ${pdfDocumentId}: ${error?.message || error}`,
          ),
        );
    }
    return { ok: true };
  }

  outputsFor(project: any) {
    const pdfDocumentId = project?.pdfDocumentId || project?.pdfDocument?.id;
    return {
      report: {
        status: pdfDocumentId ? 'ready' : 'missing',
        href: pdfDocumentId ? `/pdf-studio/editor/${pdfDocumentId}` : null,
        exportFormats: ['pdf', 'docx', 'html'],
      },
      executiveSummary: {
        status: 'available_in_report',
        note: 'Executive summary is generated as the first report section and can be exported from PDF Studio.',
      },
      investorDeck: {
        status: 'not_generated',
        note: 'Deck generation will use the Presentation Engine in the next cross-format phase.',
      },
      financialModel: {
        status: 'not_generated',
        note: 'Excel financial model generation will use Excel Studio once assumptions are confirmed.',
      },
    };
  }

  private async persistReportPages(
    documentId: string,
    rawContent: string,
    analysis: FeasibilityAnalysis,
    templateId: string,
  ) {
    const sourceChunks = this.chunkText(rawContent, 550);
    const weakSections = analysis.sections.filter((section) => section.status !== 'present');
    const presentSections = analysis.sections.filter((section) => section.status === 'present');
    const scoreMetrics = [
      {
        label: 'Overall feasibility',
        value: `${analysis.scores.overallScore}%`,
        detail: analysis.recommendation,
      },
      {
        label: 'Market readiness',
        value: `${analysis.scores.marketScore}%`,
        detail: this.sectionStatus(analysis, 'market_analysis'),
      },
      {
        label: 'Financial readiness',
        value: `${analysis.scores.financialScore}%`,
        detail: this.sectionStatus(analysis, 'revenue_assumptions'),
      },
      {
        label: 'Technical readiness',
        value: `${analysis.scores.technicalScore}%`,
        detail: this.sectionStatus(analysis, 'technical_feasibility'),
      },
      {
        label: 'Operational readiness',
        value: `${analysis.scores.operationalScore}%`,
        detail: this.sectionStatus(analysis, 'operational_feasibility'),
      },
      {
        label: 'Risk readiness',
        value: `${analysis.scores.riskScore}%`,
        detail: this.sectionStatus(analysis, 'risk_assessment'),
      },
    ];
    const pages = [
      {
        pageType: 'cover',
        title: analysis.projectName,
        archetype: 'cover',
        text: JSON.stringify({
          title: analysis.projectName,
          subtitle: `${this.label(analysis.studyType)} · ${analysis.recommendation}`,
          description: analysis.businessObjective,
          score: analysis.scores.overallScore,
          overview: scoreMetrics.slice(1).map((metric) => `${metric.label}: ${metric.value}`),
        }),
        structured: {
          templateId,
          title: analysis.projectName,
          subtitle: `${this.label(analysis.studyType)} · ${analysis.recommendation}`,
          paragraphs: [analysis.businessObjective],
          bullets: scoreMetrics
            .slice(1)
            .map((metric) => `${metric.label}: ${metric.value} (${metric.detail})`),
          metrics: scoreMetrics,
        },
      },
      {
        pageType: 'stats',
        title: 'Feasibility Scorecard',
        archetype: 'stats',
        text: this.renderScorecard(analysis),
        structured: {
          templateId,
          title: 'Feasibility Scorecard',
          subtitle: analysis.recommendation,
          paragraphs: [
            analysis.businessObjective,
            `Pitchonix preserved ${analysis.preservation.preservationRate}% of the imported source content while adding feasibility scoring, warnings, and decision recommendations.`,
          ],
          bullets: scoreMetrics.map((metric) => `${metric.label}: ${metric.detail}`),
          metrics: scoreMetrics,
        },
      },
      {
        pageType: 'feature_list',
        title: 'Readiness Gaps & Warnings',
        archetype: 'feature-list',
        text: this.renderSectionReview(weakSections, analysis.warnings),
        structured: {
          templateId,
          title: 'Readiness Gaps & Warnings',
          paragraphs: [
            weakSections.length
              ? `${weakSections.length} feasibility area${weakSections.length === 1 ? '' : 's'} need more evidence before this study is board-ready.`
              : 'All core feasibility areas have supporting evidence.',
          ],
          bullets: [
            ...weakSections.map((section) => `${section.title}: ${section.guidance}`),
            ...analysis.warnings,
          ],
          sections: weakSections,
          warnings: analysis.warnings,
          metrics: [
            {
              label: 'Ready sections',
              value: String(presentSections.length),
              detail: 'Detected as present',
            },
            {
              label: 'Gaps',
              value: String(weakSections.length),
              detail: 'Weak or missing sections',
            },
            {
              label: 'Warnings',
              value: String(analysis.warnings.length),
              detail: 'Validation findings',
            },
          ],
        },
      },
      {
        pageType: 'timeline',
        title: 'Recommendations',
        archetype: 'timeline',
        text: analysis.recommendations.map((item, index) => `${index + 1}. ${item}`).join('\n'),
        structured: {
          templateId,
          title: 'Recommended Next Actions',
          paragraphs: [
            `The study currently recommends: ${analysis.recommendation}. Resolve the following items before treating the report as final.`,
          ],
          bullets: analysis.recommendations,
          metrics: [
            {
              label: 'Action items',
              value: String(analysis.recommendations.length),
              detail: 'Generated recommendations',
            },
            {
              label: 'Decision',
              value: `${analysis.scores.overallScore}%`,
              detail: analysis.recommendation,
            },
          ],
        },
      },
      ...sourceChunks.map((chunk, index) => ({
        pageType: 'source_content',
        title:
          sourceChunks.length > 1
            ? `Original Source Content ${index + 1}`
            : 'Original Source Content',
        archetype: 'content',
        text: chunk,
        structured: {
          templateId,
          title:
            sourceChunks.length > 1
              ? `Original Source Content ${index + 1}`
              : 'Original Source Content',
          paragraphs: this.sourceParagraphs(chunk),
          bullets: [],
          metrics: [
            {
              label: 'Preserved source',
              value: `${analysis.preservation.preservationRate}%`,
              detail: 'Original content retained',
            },
          ],
        },
      })),
    ];

    await this.prisma.pdfPage.createMany({
      data: pages.map((page, index) => ({
        documentId,
        order: index + 1,
        pageNumber: index + 1,
        pageType: page.pageType,
        title: page.title,
        content: {
          text: page.text,
          template: templateId,
          feasibilityStudio: true,
          feasibilityReport: page.structured,
          archetype: page.archetype,
          images: [],
          charts: [],
        } as any,
        blocks: this.blocksForStructuredPage(page.title, page.text, page.structured) as any,
        styles: { visualStyle: 'feasibility', templateId, archetype: page.archetype } as any,
      })),
    });

    // Phase Ω.CONTENT.2 — emit the content ledger for this render. Every
    // structured node is imported then immediately marked rendered to its page.
    await this.emitLedger(documentId, templateId);
  }

  /**
   * Phase Ω.CONTENT.2 — derive ledger entries from the persisted report pages.
   * Used both when emitting (import + render) and on reopen, so the content
   * hashes are computed identically and the proof chain stays consistent.
   */
  private ledgerEntriesFromPages(
    pages: any[],
  ): Array<Omit<ContentNodeInput, 'sourceDocumentId'> & { destination: string }> {
    const sorted = [...(pages || [])].sort(
      (a, b) => Number(a.order || a.pageNumber || 0) - Number(b.order || b.pageNumber || 0),
    );
    const entries: Array<Omit<ContentNodeInput, 'sourceDocumentId'> & { destination: string }> = [];
    for (const page of sorted) {
      const order = Number(page.order || page.pageNumber || 0);
      const destination = `page_${order}`;
      const pageType: string = page.pageType || 'content';
      const fr = page.content?.feasibilityReport || {};
      const base = {
        module: 'feasibility' as const,
        sourceType: 'feasibility_study',
        sectionId: pageType,
      };
      if (page.title?.trim()) {
        entries.push({ ...base, type: 'heading', content: String(page.title), destination });
      }
      for (const paragraph of fr.paragraphs || []) {
        if (String(paragraph || '').trim())
          entries.push({ ...base, type: 'paragraph', content: String(paragraph), destination });
      }
      for (const metric of fr.metrics || []) {
        entries.push({
          ...base,
          type: 'metric',
          content: `${metric.label}: ${metric.value}`,
          metadata: { detail: metric.detail },
          destination,
        });
      }
      const bulletType =
        pageType === 'timeline'
          ? 'recommendation'
          : pageType === 'feature_list'
            ? 'risk'
            : 'bullet';
      for (const bullet of fr.bullets || []) {
        if (String(bullet || '').trim())
          entries.push({ ...base, type: bulletType, content: String(bullet), destination });
      }
    }
    return entries;
  }

  /** Phase Ω.CONTENT.2 — (re)build the ledger for a feasibility document. */
  private async emitLedger(documentId: string, templateId: string): Promise<void> {
    try {
      const pages = await this.prisma.pdfPage.findMany({
        where: { documentId },
        orderBy: { order: 'asc' },
      });
      const entries = this.ledgerEntriesFromPages(pages);
      if (!entries.length) return;
      await this.ledger.resetDocument(documentId);
      const created = await this.ledger.recordImport(
        entries.map((e) => ({
          module: e.module,
          sourceDocumentId: documentId,
          sourceType: e.sourceType,
          sectionId: e.sectionId,
          type: e.type,
          content: e.content,
          metadata: e.metadata,
        })),
      );
      const destinationByNodeId: Record<string, string> = {};
      created.forEach((node, index) => {
        destinationByNodeId[node.id] = entries[index].destination;
      });
      await this.ledger.recordRender(documentId, {
        renderer: 'feasibility-report',
        template: templateId,
        destinationByNodeId,
      });
    } catch (error: any) {
      this.logger.warn(`Content ledger emit skipped for ${documentId}: ${error?.message || error}`);
    }
  }

  /** Phase Ω.CONTENT.2 — mark ledger nodes reopened when a report is reloaded. */
  private async markLedgerReopened(project: any): Promise<void> {
    try {
      const documentId = project?.pdfDocumentId || project?.pdfDocument?.id;
      const pages = project?.pdfDocument?.pages;
      if (!documentId || !Array.isArray(pages) || !pages.length) return;
      const present = this.ledgerEntriesFromPages(pages)
        .map((e) => ({ hash: this.ledger.hash(e.content) }))
        .filter((p) => p.hash) as Array<{ hash: string }>;
      if (present.length)
        await this.ledger.recordReopen(documentId, { present, renderer: 'feasibility-report' });
    } catch (error: any) {
      this.logger.warn(`Content ledger reopen skipped: ${error?.message || error}`);
    }
  }

  private renderScorecard(analysis: FeasibilityAnalysis): string {
    return [
      `Overall Feasibility: ${analysis.scores.overallScore}%`,
      `Market Readiness: ${analysis.scores.marketScore}%`,
      `Financial Readiness: ${analysis.scores.financialScore}%`,
      `Technical Readiness: ${analysis.scores.technicalScore}%`,
      `Operational Readiness: ${analysis.scores.operationalScore}%`,
      `Risk Readiness: ${analysis.scores.riskScore}%`,
      `Recommendation: ${analysis.recommendation}`,
      '',
      analysis.businessObjective,
    ].join('\n');
  }

  private renderSectionReview(sections: FeasibilitySectionCheck[], warnings: string[]): string {
    const statusLines = sections.map((section) => {
      const evidence = section.evidence.length
        ? ` Evidence: ${this.compactEvidence(section.evidence[0])}`
        : '';
      return `${section.title}: ${section.status.toUpperCase()} (${section.confidence}%). ${section.guidance}${evidence}`;
    });
    return [...statusLines, '', 'Warnings:', ...warnings.map((warning) => `- ${warning}`)].join(
      '\n',
    );
  }

  private blocksForStructuredPage(title: string, text: string, structured?: any) {
    if (!structured) return this.blocksForText(title, text);
    const blocks = [
      { id: `${title}-heading`, type: 'heading', content: title },
      ...(structured.paragraphs || []).map((paragraph: string, index: number) => ({
        id: `${title}-paragraph-${index}`,
        type: 'paragraph',
        content: paragraph,
      })),
      ...(structured.metrics?.length
        ? [
            {
              id: `${title}-metrics`,
              type: 'metrics',
              content: structured.metrics
                .map((metric: any) => `${metric.label}: ${metric.value}`)
                .join('\n'),
              items: structured.metrics,
            },
          ]
        : []),
      ...(structured.bullets?.length
        ? [
            {
              id: `${title}-bullets`,
              type: 'bullet_list',
              content: structured.bullets.map((bullet: string) => `- ${bullet}`).join('\n'),
              items: structured.bullets,
            },
          ]
        : []),
    ];
    return blocks;
  }

  private blocksForText(title: string, text: string) {
    return [
      { id: `${title}-heading`, type: 'heading', content: title },
      ...text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, index) => ({
          id: `${title}-paragraph-${index}`,
          type: 'paragraph',
          content: paragraph,
        })),
    ];
  }

  private chunkText(text: string, maxWords: number): string[] {
    const words = String(text || '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length <= maxWords) return [String(text || '').trim()].filter(Boolean);
    const chunks: string[] = [];
    for (let index = 0; index < words.length; index += maxWords) {
      chunks.push(words.slice(index, index + maxWords).join(' '));
    }
    return chunks;
  }

  private pagesToText(pages: any[]): string {
    return pages
      .map((page) => page?.content?.text || page?.title || '')
      .filter(Boolean)
      .join('\n\n');
  }

  private collectSourceText(pages: any[], metadata?: any): string {
    const metadataSource = String(metadata?.sourceText || '').trim();
    if (metadataSource.length >= 10) return metadataSource;
    return [...(pages || [])]
      .filter((page) => page?.pageType === 'source_content')
      .sort((a, b) => Number(a.order || a.pageNumber || 0) - Number(b.order || b.pageNumber || 0))
      .map((page) => String(page?.content?.text || '').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  private countWords(value: string): number {
    return String(value || '')
      .split(/\s+/)
      .filter(Boolean).length;
  }

  private async needsStructuredPdfRepair(project: any): Promise<boolean> {
    const pdfDocument = project?.pdfDocument;
    if (!pdfDocument?.id || !pdfDocument?.metadata?.feasibilityStudio) return false;
    const pages = Array.isArray(pdfDocument.pages) ? pdfDocument.pages : [];
    if (pages.length === 0) return false;
    return (
      pages.some((page: any) => !page?.content?.feasibilityReport) ||
      pages.some(
        (page: any) =>
          page?.pageType === 'source_content' && this.countWords(page?.content?.text || '') > 700,
      ) ||
      pages.some(
        (page: any) =>
          page?.pageType === 'feature_list' && this.countWords(page?.content?.text || '') > 700,
      )
    );
  }

  private async repairStructuredPdfPages(project: any) {
    const pdfDocumentId = project.pdfDocumentId || project.pdfDocument?.id;
    if (!pdfDocumentId) return;
    const source =
      this.collectSourceText(project.pdfDocument?.pages || [], project.pdfDocument?.metadata) ||
      this.pagesToText(project.pdfDocument?.pages || []);
    if (!source || source.trim().length < 10) return;
    const analysis = this.analyzer.analyze(source, {
      title: project.title,
      industry: project.industry,
      studyType: project.studyType,
    });
    const templateId =
      project.sourceMetadata?.templateId ||
      project.pdfDocument?.metadata?.feasibilityTemplateId ||
      'investor-feasibility-report';
    await this.prisma.pdfDocument.update({
      where: { id: pdfDocumentId },
      data: {
        qualityScore: analysis.scores.overallScore,
        exportReady: analysis.scores.overallScore >= 70,
        metadata: {
          ...(project.pdfDocument?.metadata || {}),
          feasibilityStudio: true,
          feasibilityTemplateId: templateId,
          analysis,
          sourcePreservation: analysis.preservation,
        } as any,
      },
    });
    await this.prisma.pdfPage.deleteMany({ where: { documentId: pdfDocumentId } });
    await this.persistReportPages(pdfDocumentId, source, analysis, templateId);
    await (this.prisma as any).feasibilityProject.update({
      where: { id: project.id },
      data: {
        score: analysis.scores.overallScore,
        analysis: analysis as any,
        recommendations: analysis.recommendations as any,
      },
    });
  }

  private sectionStatus(analysis: FeasibilityAnalysis, key: string): string {
    const section = analysis.sections.find((item) => item.key === key);
    return section
      ? `${section.status.replace(/_/g, ' ')} · ${section.confidence}% confidence`
      : 'Not detected';
  }

  private compactEvidence(value: string): string {
    const normalized = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    return normalized;
  }

  private sourceParagraphs(value: string): string[] {
    const paragraphs = String(value || '')
      .split(/\n{2,}/)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (paragraphs.length > 0) return paragraphs;
    const text = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return [];
    const sentences = text
      .match(/[^.!?]+[.!?]+/g)
      ?.map((item) => item.trim())
      .filter(Boolean) || [text];
    const chunks: string[] = [];
    for (let index = 0; index < sentences.length; index += 3) {
      chunks.push(sentences.slice(index, index + 3).join(' '));
    }
    return chunks;
  }

  private label(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
