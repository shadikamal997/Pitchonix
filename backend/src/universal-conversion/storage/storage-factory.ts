import { Logger } from '@nestjs/common';
import { ConversionStorageProvider } from './storage-provider';
import { LocalStorageProvider } from './local-storage-provider';
import { S3StorageProvider }    from './s3-storage-provider';
import { GCSStorageProvider }   from './gcs-storage-provider';
import { AzureBlobProvider }    from './azure-storage-provider';

// =============================================================================
//  Phase 41.2D — Storage factory.
//
//  Reads CONVERSION_STORAGE (default "local") and instantiates the matching
//  provider. Cloud providers dynamic-load their SDK; if the SDK isn't
//  installed yet, save() throws with a clear install hint.
//
//  Supported values:
//      local        (default)
//      s3
//      gcs / google
//      azure / blob
// =============================================================================

const logger = new Logger('ConversionStorageFactory');

export function createConversionStorage(): ConversionStorageProvider {
  const mode = (process.env.CONVERSION_STORAGE || 'local').toLowerCase();
  switch (mode) {
    case 's3':                return new S3StorageProvider();
    case 'gcs': case 'google':return new GCSStorageProvider();
    case 'azure': case 'blob':return new AzureBlobProvider();
    case 'local':
    default:
      if (mode !== 'local') logger.warn(`Unknown CONVERSION_STORAGE="${mode}" — falling back to local`);
      return new LocalStorageProvider();
  }
}
