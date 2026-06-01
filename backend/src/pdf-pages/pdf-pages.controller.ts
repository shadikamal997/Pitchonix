import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PdfPagesService } from './pdf-pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { GetUser } from '../auth/get-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('pdf-pages')
export class PdfPagesController {
  constructor(
    private readonly pdfPagesService: PdfPagesService,
    private readonly prisma: PrismaService,
  ) {}

  private async assertDocumentAccess(documentId: string, user: any) {
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { project: true },
    });
    if (!document) throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
    if (document.project?.userId && document.project.userId !== user?.id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }

  private async assertPageAccess(pageId: string, user: any) {
    const page = await this.prisma.pdfPage.findUnique({
      where: { id: pageId },
      include: { document: { include: { project: true } } },
    });
    if (!page) throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
    if (page.document?.project?.userId && page.document.project.userId !== user?.id) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    return page;
  }

  @Post()
  async create(@Body() createDto: any, @GetUser() user: any) {
    await this.assertDocumentAccess(createDto.documentId, user);
    return this.pdfPagesService.create(createDto);
  }

  @Get()
  async findAllByDocument(@Query('documentId') documentId: string, @GetUser() user: any) {
    await this.assertDocumentAccess(documentId, user);
    return this.pdfPagesService.findAllByDocument(documentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    await this.assertPageAccess(id, user);
    return this.pdfPagesService.findOne(id);
  }

  // Accept both PUT and PATCH so either verb saves correctly
  @Put(':id')
  async updatePut(@Param('id') id: string, @Body() updateDto: any, @GetUser() user: any) {
    await this.assertPageAccess(id, user);
    return this.pdfPagesService.update(id, updateDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: any, @GetUser() user: any) {
    await this.assertPageAccess(id, user);
    return this.pdfPagesService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @GetUser() user: any) {
    await this.assertPageAccess(id, user);
    return this.pdfPagesService.delete(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string, @GetUser() user: any) {
    await this.assertPageAccess(id, user);
    return this.pdfPagesService.duplicatePage(id);
  }

  @Post('reorder')
  async reorder(@Body() body: { documentId: string; pageIds: string[] }, @GetUser() user: any) {
    await this.assertDocumentAccess(body.documentId, user);
    return this.pdfPagesService.reorderPages(body.documentId, body.pageIds);
  }
}
