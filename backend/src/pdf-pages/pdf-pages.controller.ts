import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { PdfPagesService } from './pdf-pages.service';

@Controller('pdf-pages')
export class PdfPagesController {
  constructor(private readonly pdfPagesService: PdfPagesService) {}

  @Post()
  async create(@Body() createDto: any) {
    return this.pdfPagesService.create(createDto);
  }

  @Get()
  async findAllByDocument(@Query('documentId') documentId: string) {
    return this.pdfPagesService.findAllByDocument(documentId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pdfPagesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.pdfPagesService.update(id, updateDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.pdfPagesService.delete(id);
  }

  @Post(':id/duplicate')
  async duplicate(@Param('id') id: string) {
    return this.pdfPagesService.duplicatePage(id);
  }

  @Post('reorder')
  async reorder(@Body() body: { documentId: string; pageIds: string[] }) {
    return this.pdfPagesService.reorderPages(body.documentId, body.pageIds);
  }
}
