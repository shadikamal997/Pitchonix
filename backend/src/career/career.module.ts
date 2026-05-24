import { Module } from '@nestjs/common';
import { CareerController } from './career.controller';
import { CvProfilesService }  from './cv-profiles.service';
import { CvDocumentsService } from './cv-documents.service';
import { CvTemplatesService } from './cv-templates.service';
import { CvImportService }    from './cv-import.service';
import { CvExportService }    from './cv-export.service';
import { UniversalConversionModule } from '../universal-conversion/universal-conversion.module';
import { PptxImportModule }   from '../pptx-import/pptx-import.module';
import { BrandKitsModule }    from '../brand-kits/brand-kits.module';

@Module({
  imports:     [UniversalConversionModule, PptxImportModule, BrandKitsModule],
  controllers: [CareerController],
  providers:   [CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService, CvExportService],
  exports:     [CvProfilesService, CvDocumentsService, CvTemplatesService, CvImportService, CvExportService],
})
export class CareerModule {}
