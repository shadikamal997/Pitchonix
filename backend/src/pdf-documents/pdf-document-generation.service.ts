import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PageFactory } from '../pdf-pages/page.factory';
import { WizardInput } from '../generation/slide-types/types';

export interface GeneratePdfDocumentDto {
  projectId: string;
  documentType: string;
  input: WizardInput;
}

@Injectable()
export class PdfDocumentGenerationService {
  constructor(
    private prisma: PrismaService,
    private pageFactory: PageFactory,
  ) {}

  /**
   * Generate a complete PDF document with all pages
   */
  async generatePdfDocument(dto: GeneratePdfDocumentDto) {
    const { projectId, documentType, input } = dto;

    // Create PDF document entity
    const pdfDocument = await this.createPdfDocument(projectId, documentType, input);

    // Generate pages using page factory
    const pages = await this.pageFactory.generatePages(documentType, input);

    // Save pages to database
    await this.savePages(pdfDocument.id, pages);

    // Update project status
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: 'completed' },
    });

    // Return complete document with pages
    return this.prisma.pdfDocument.findUnique({
      where: { id: pdfDocument.id },
      include: {
        pages: {
          orderBy: { order: 'asc' },
        },
        project: true,
        brandKit: true,
      },
    });
  }

  /**
   * Create PDF document entity
   */
  private async createPdfDocument(
    projectId: string,
    documentType: string,
    input: WizardInput,
  ) {
    const title = this.generateTitle(documentType, input);
    
    return this.prisma.pdfDocument.create({
      data: {
        projectId,
        title,
        documentType,
        description: `AI-generated ${this.formatDocumentType(documentType)}`,
        status: 'draft',
      },
    });
  }

  /**
   * Save pages to database
   */
  private async savePages(pdfDocumentId: string, pages: any[]) {
    const pageData = pages.map((page, index) => ({
      documentId: pdfDocumentId,
      order: index + 1,
      pageType: page.type || 'content',
      title: page.title || '',
      content: page.content || {},
    }));

    await this.prisma.pdfPage.createMany({
      data: pageData,
    });
  }

  /**
   * Generate document title
   */
  private generateTitle(documentType: string, input: WizardInput): string {
    const companyName = input.companyName || 'Company';
    const typeMap: Record<string, string> = {
      business_plan: 'Business Plan',
      proposal: 'Proposal',
      company_profile: 'Company Profile',
      executive_summary: 'Executive Summary',
      marketing_plan: 'Marketing Plan',
      financial_projection: 'Financial Projections',
      case_study: 'Case Study',
      internal_report: 'Internal Report',
      partnership_proposal: 'Partnership Proposal',
      one_pager: 'One Pager',
    };

    const docType = typeMap[documentType] || 'Document';
    return `${companyName} - ${docType}`;
  }

  /**
   * Format document type for display
   */
  private formatDocumentType(type: string): string {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
