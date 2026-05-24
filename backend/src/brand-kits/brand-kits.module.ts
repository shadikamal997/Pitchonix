import { Module } from '@nestjs/common';
import { BrandKitsService } from './brand-kits.service';
import { BrandAuditService } from './brand-audit.service';
import { BrandAutofixService } from './brand-autofix.service';
import { BrandKitZipService } from './brand-kit-zip.service';
import { BrandKitsController } from './brand-kits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PrismaModule],
  controllers: [BrandKitsController],
  providers:   [BrandKitsService, BrandAuditService, BrandAutofixService, BrandKitZipService],
  exports:     [BrandKitsService, BrandAuditService, BrandAutofixService, BrandKitZipService],
})
export class BrandKitsModule {}
