import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query,
  UploadedFile, UseInterceptors, Res, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { BrandKitsService } from './brand-kits.service';
import { BrandAuditService } from './brand-audit.service';
import { BrandKitZipService } from './brand-kit-zip.service';
import { BrandAutofixService, FixCategory } from './brand-autofix.service';
import { CreateBrandKitDto } from './dto/create-brand-kit.dto';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

// =============================================================================
//  Phase 37 — BrandKitsController
//
//  Surface area:
//
//    Legacy (Phase 2):
//      POST   /brand-kits                       create
//      GET    /brand-kits                       list mine
//      GET    /brand-kits/:id                   detail
//      PATCH  /brand-kits/:id                   update
//      DELETE /brand-kits/:id                   delete
//
//    Phase 37 additions:
//      GET    /workspaces/:wsId/brand-kits      list for a workspace
//      POST   /brand-kits/:id/assets            add managed asset (logo, …)
//      DELETE /brand-kits/:id/assets/:assetId   remove asset
//      POST   /brand-kits/:id/apply/:deckId     apply to a deck
//      GET    /decks/:deckId/brand-audit        compliance score + issues
// =============================================================================

@ApiTags('Brand Kits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class BrandKitsController {
  constructor(
    private readonly brandKits: BrandKitsService,
    private readonly audit:     BrandAuditService,
    private readonly zip:       BrandKitZipService,
    private readonly autofix:   BrandAutofixService,
  ) {}

  // ---------- Legacy CRUD (unchanged paths) ----------

  @Post('brand-kits')
  @ApiOperation({ summary: 'Create a brand kit' })
  create(@GetUser() user: any, @Body() body: CreateBrandKitDto & { workspaceId?: string; description?: string; tokens?: any; voice?: any; identity?: any; isDefault?: boolean }) {
    return this.brandKits.create(user.id, body);
  }

  @Get('brand-kits')
  @ApiOperation({ summary: 'List my brand kits (legacy — workspace-scoped list lives elsewhere)' })
  findAll(@GetUser() user: any) {
    return this.brandKits.findAll(user.id);
  }

  @Get('brand-kits/:id')
  @ApiOperation({ summary: 'Get brand kit by ID' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKits.findOne(id, user.id);
  }

  @Patch('brand-kits/:id')
  @ApiOperation({ summary: 'Update brand kit' })
  update(@Param('id') id: string, @GetUser() user: any, @Body() body: UpdateBrandKitDto & { description?: string; tokens?: any; voice?: any; identity?: any; isDefault?: boolean }) {
    return this.brandKits.update(id, user.id, body);
  }

  @Delete('brand-kits/:id')
  @ApiOperation({ summary: 'Delete brand kit' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKits.remove(id, user.id);
  }

  // ---------- Phase 37M — workspace-scoped listing ----------

  @Get('workspaces/:workspaceId/brand-kits')
  @ApiOperation({ summary: 'List every brand kit in a workspace (Phase 37M)' })
  findForWorkspace(@Param('workspaceId') workspaceId: string) {
    return this.brandKits.findForWorkspace(workspaceId);
  }

  // ---------- Phase 37B/R — Asset management ----------

  @Post('brand-kits/:id/assets')
  @ApiOperation({ summary: 'Attach an asset (logo, image) to a brand kit' })
  addAsset(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() body: { kind: string; url: string; mimeType?: string; width?: number; height?: number; alt?: string },
  ) {
    return this.brandKits.addAsset(id, user.id, body);
  }

  @Delete('brand-kits/:id/assets/:assetId')
  @ApiOperation({ summary: 'Remove an asset from a brand kit' })
  removeAsset(@Param('id') id: string, @Param('assetId') assetId: string, @GetUser() user: any) {
    return this.brandKits.removeAsset(id, user.id, assetId);
  }

  // ---------- Phase 37K — One-click apply ----------

  @Post('brand-kits/:id/apply/:deckId')
  @ApiOperation({ summary: 'Apply this brand kit to a deck (Phase 37K)' })
  applyToDeck(@Param('id') id: string, @Param('deckId') deckId: string, @GetUser() user: any) {
    return this.brandKits.applyToDeck(id, deckId, user.id);
  }

  // ---------- Phase 37O/P — Audit ----------

  @Get('decks/:deckId/brand-audit')
  @ApiOperation({ summary: 'Compute the brand compliance score + issues for a deck (Phase 37O/P)' })
  auditDeck(@Param('deckId') deckId: string) {
    return this.audit.auditDeck(deckId);
  }

  // ---------- Phase 37.1B — Chart auto-rebrand ----------

  @Post('brand-kits/:id/rebrand-chart/:elementId')
  @ApiOperation({ summary: 'Apply brand chart palette to one chart element (Phase 37.1B)' })
  rebrandChart(@Param('id') id: string, @Param('elementId') elementId: string, @GetUser() user: any) {
    return this.brandKits.rebrandChartElement(id, elementId, user.id);
  }

  @Post('brand-kits/:id/rebrand-all-charts/:deckId')
  @ApiOperation({ summary: 'Apply brand chart palette to every chart on a deck' })
  rebrandAllCharts(@Param('id') id: string, @Param('deckId') deckId: string, @GetUser() user: any) {
    return this.brandKits.rebrandAllCharts(id, deckId, user.id);
  }

  // ---------- Phase 37.1F — Batch apply ----------

  @Post('brand-kits/:id/apply-batch')
  @ApiOperation({ summary: 'Apply this brand kit to many decks at once (Phase 37.1F)' })
  applyBatch(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() body: { deckIds?: string[]; workspaceId?: string },
  ) {
    return this.brandKits.applyToMany(id, user.id, body);
  }

  // ---------- Phase 37.1E — Import / export ----------

  @Get('brand-kits/:id/export')
  @ApiOperation({ summary: 'Serialise a brand kit to a portable JSON document (Phase 37.1E)' })
  exportKit(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKits.exportKit(id, user.id);
  }

  @Post('brand-kits/import')
  @ApiOperation({ summary: 'Import a brand kit from a portable JSON document (Phase 37.1E)' })
  importKit(@GetUser() user: any, @Body() body: { payload: any; workspaceId?: string }) {
    return this.brandKits.importKit(user.id, body?.payload, body?.workspaceId);
  }

  // ---------- Phase 37.1D — PDF Studio adapter ----------

  @Get('brand-kits/:id/pdf-studio-format')
  @ApiOperation({ summary: 'Resolve this brand kit into the PDF Studio internal format (Phase 37.1D)' })
  pdfFormat(@Param('id') id: string, @GetUser() user: any) {
    return this.brandKits.toPdfStudioBrand(id, user.id);
  }

  // ---------- Phase 37.2C — Portable ZIP export / import ----------

  @Get('brand-kits/:id/export-zip')
  @ApiOperation({ summary: 'Download a portable brand-kit.zip with embedded assets (Phase 37.2C)' })
  async exportZip(@Param('id') id: string, @GetUser() user: any, @Res() res: Response) {
    const buffer = await this.zip.exportZip(id, user.id);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="brand-kit-${id}.zip"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  }

  @Post('brand-kits/import-zip')
  @ApiOperation({ summary: 'Import a portable brand-kit.zip (Phase 37.2C)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importZip(
    @UploadedFile() file: any,
    @GetUser() user: any,
    @Query('workspaceId') workspaceId?: string,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('Missing zip file (expected multipart field "file")');
    }
    return this.zip.importZip(user.id, file.buffer, workspaceId);
  }

  // ---------- Phase 37.2E — Auto-fix actions ----------

  @Post('brand-kits/:id/autofix/:elementId')
  @ApiOperation({ summary: 'Auto-fix a brand-audit issue on one element (Phase 37.2E)' })
  applyAutofix(
    @Param('id') id: string,
    @Param('elementId') elementId: string,
    @GetUser() user: any,
    @Body() body: { category: FixCategory },
  ) {
    return this.autofix.fix(id, elementId, body.category, user.id);
  }
}
