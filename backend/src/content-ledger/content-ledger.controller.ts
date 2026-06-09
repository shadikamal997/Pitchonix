import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ContentLedgerService } from './content-ledger.service';
import { ContentCertificationService } from './content-certification.service';

/**
 * Phase Ω.CONTENT.2 — Universal Content Ledger API.
 * `sourceDocumentId` is the ledger grouping key for any module (a PDF document
 * id, feasibility project id, workbook id, deck id, …).
 */
@ApiTags('Content Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('content-ledger')
export class ContentLedgerController {
  constructor(
    private readonly ledger: ContentLedgerService,
    private readonly certification: ContentCertificationService,
  ) {}

  /**
   * Phase Ω.CONTENT.3 — platform-wide content safety certification.
   * The single source of truth: overall retention, per-module scores, broken
   * nodes, top loss reasons, certified vs uncertified modules.
   */
  @Get('certification')
  @ApiOperation({
    summary:
      'Platform-wide content safety certification (overallRetention, moduleScores, brokenNodes, topLossReasons, certified/uncertified modules)',
  })
  async getCertification() {
    const data = await this.certification.certifyPlatform();
    return { success: true, data };
  }

  /** Phase Ω.CONTENT.3 — certification for a single module. */
  @Get('certification/module/:module')
  @ApiOperation({ summary: 'Content safety certification for one module' })
  async certifyModule(@Param('module') module: string) {
    const data = await this.certification.certifyModule(module);
    return { success: !!data, data };
  }

  /** PHASE 10 — full content preservation report. */
  @Get('report/:id')
  @ApiOperation({
    summary:
      'Content preservation report (imported/rendered/exported/reopened/missing/retention/broken)',
  })
  async report(@Param('id') id: string) {
    const data = await this.ledger.calculatePreservation(id);
    return { success: true, data };
  }

  /** PHASE 4 — compact scorecard (headline numbers only). */
  @Get('scorecard/:id')
  @ApiOperation({ summary: 'Compact content retention scorecard' })
  async scorecard(@Param('id') id: string) {
    const r = await this.ledger.calculatePreservation(id);
    return {
      success: true,
      data: {
        sourceDocumentId: r.sourceDocumentId,
        modules: r.modules,
        imported: r.imported,
        rendered: r.rendered,
        exported: r.exported,
        reopened: r.reopened,
        missing: r.missing,
        retention: r.retention,
      },
    };
  }

  /** PHASE 5 — loss-only report (exact failure locations). */
  @Get('loss/:id')
  @ApiOperation({ summary: 'Broken/lost nodes with exact failure point and reason' })
  async loss(@Param('id') id: string) {
    const brokenNodes = await this.ledger.calculateLoss(id);
    return {
      success: true,
      data: { sourceDocumentId: id, count: brokenNodes.length, brokenNodes },
    };
  }
}
