import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CvDoctype, CvDocumentDto, CvDocumentContent,
  DEFAULT_CV_SECTION_ORDER, DEFAULT_RESUME_SECTION_ORDER,
} from './cv-types';

// =============================================================================
//  Phase 42B-E + 42H-I — CvDocumentsService.
//
//  CRUD over CvDocument rows. Each document is profile-linked, doctype-tagged,
//  and carries a `content` payload whose shape depends on the doctype.
//
//  Doctype defaults:
//    cv          → DEFAULT_CV_SECTION_ORDER
//    resume      → DEFAULT_RESUME_SECTION_ORDER (compact, 1-page friendly)
//    coverLetter → empty letter scaffold with sensible defaults
//    portfolio   → empty showcase scaffold
//
//  Variants (Phase 42I): a `variant` string lets users tag job-specific
//  copies (e.g. "Google Engineering", "Consulting Tier-1"). Multiple
//  documents can share a profile + doctype but differ on variant.
// =============================================================================

@Injectable()
export class CvDocumentsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Read
  // ---------------------------------------------------------------------------

  listForUser(userId: string, doctype?: CvDoctype) {
    return this.prisma.cvDocument.findMany({
      where: { userId, ...(doctype ? { doctype } : {}) },
      orderBy: { updatedAt: 'desc' },
    }).then((rows) => rows.map(toDto));
  }

  async findOne(id: string): Promise<CvDocumentDto> {
    const row = await this.prisma.cvDocument.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('CvDocument not found');
    return toDto(row);
  }

  // ---------------------------------------------------------------------------
  //  Create / Update
  // ---------------------------------------------------------------------------

  async create(input: {
    userId:      string;
    profileId:   string;
    doctype:     CvDoctype;
    title:       string;
    templateId?: string | null;
    brandKitId?: string | null;
    variant?:    string;
    content?:    CvDocumentContent;
  }): Promise<CvDocumentDto> {
    const content: CvDocumentContent = input.content ?? defaultContent(input.doctype);
    const row = await this.prisma.cvDocument.create({
      data: {
        userId:     input.userId,
        profileId:  input.profileId,
        doctype:    input.doctype,
        title:      input.title.trim() || defaultTitle(input.doctype),
        templateId: input.templateId ?? null,
        brandKitId: input.brandKitId ?? null,
        variant:    input.variant ?? null,
        content:    content as any,
      },
    });
    return toDto(row);
  }

  async update(id: string, patch: Partial<Pick<CvDocumentDto, 'title'|'templateId'|'brandKitId'|'variant'|'content'|'thumbnailUrl'|'lastExportUrl'>>): Promise<CvDocumentDto> {
    await this.findOne(id);
    const row = await this.prisma.cvDocument.update({
      where: { id },
      data:  patch as any,
    });
    return toDto(row);
  }

  /** Phase 42G — swap template without losing content. */
  async switchTemplate(id: string, templateId: string | null): Promise<CvDocumentDto> {
    return this.update(id, { templateId });
  }

  async duplicate(id: string, newTitle?: string, newVariant?: string): Promise<CvDocumentDto> {
    const src = await this.findOne(id);
    const row = await this.prisma.cvDocument.create({
      data: {
        userId:     src.userId,
        profileId:  src.profileId,
        doctype:    src.doctype,
        title:      newTitle?.trim() || `${src.title} (copy)`,
        templateId: src.templateId,
        brandKitId: src.brandKitId,
        variant:    newVariant ?? src.variant,
        content:    src.content as any,
      },
    });
    return toDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.cvDocument.delete({ where: { id } });
  }
}

// =============================================================================
//  Defaults
// =============================================================================

function defaultContent(doctype: CvDoctype): CvDocumentContent {
  switch (doctype) {
    case 'cv':
      return { sectionOrder: DEFAULT_CV_SECTION_ORDER };
    case 'resume':
      return { sectionOrder: DEFAULT_RESUME_SECTION_ORDER };
    case 'coverLetter':
      return {
        greeting:  'Dear Hiring Manager,',
        intro:     '',
        body:      [''],
        closing:   'Thank you for your consideration.',
        signature: '',
      } as any;
    case 'portfolio':
      return {
        sections: [
          { key: 'about',    title: 'About me' },
          { key: 'projects', title: 'Selected work' },
        ],
        showcaseProjectIds: [],
      } as any;
    default:
      throw new BadRequestException(`Unknown doctype "${doctype}"`);
  }
}

function defaultTitle(doctype: CvDoctype): string {
  switch (doctype) {
    case 'cv':           return 'Untitled CV';
    case 'resume':       return 'Untitled Resume';
    case 'coverLetter':  return 'Untitled Cover Letter';
    case 'portfolio':    return 'Untitled Portfolio';
    default:             return 'Untitled';
  }
}

function toDto(row: any): CvDocumentDto {
  return {
    id:            row.id,
    profileId:     row.profileId,
    userId:        row.userId,
    doctype:       row.doctype,
    title:         row.title,
    templateId:    row.templateId,
    brandKitId:    row.brandKitId,
    variant:       row.variant,
    content:       row.content,
    thumbnailUrl:  row.thumbnailUrl,
    lastExportUrl: row.lastExportUrl,
    createdAt:     row.createdAt.toISOString(),
    updatedAt:     row.updatedAt.toISOString(),
  };
}
