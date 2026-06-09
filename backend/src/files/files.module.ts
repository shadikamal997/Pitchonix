import { Global, Module } from '@nestjs/common';
import { UploadedAssetService } from './uploaded-asset.service';

// Global so any upload path (brand kits, career, pdf-studio, etc.) can inject
// UploadedAssetService without per-module wiring.
@Global()
@Module({
  providers: [UploadedAssetService],
  exports: [UploadedAssetService],
})
export class FilesModule {}
