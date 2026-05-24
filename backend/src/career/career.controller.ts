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
  @ApiOperation({ summary: 'Import an existing CV (DOCX/PDF/HTML/MD) into a profile (Phase 42L)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importFile(@Param('profileId') profileId: string, @UploadedFile() file: any) {
    if (!file?.buffer) throw new BadRequestException('Missing file (multipart field "file")');
    return this.importer.importFromFile(profileId, file.buffer, file.originalname || 'cv', file.mimetype);
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
}
