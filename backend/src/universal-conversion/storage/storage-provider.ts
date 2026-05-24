// =============================================================================
//  Phase 41.2D — ConversionStorageProvider interface.
//
//  All conversion-storage backends implement this contract. The lineage
//  service holds a single provider injected at construction; switching from
//  local disk to S3 / GCS / Azure is one env-var change + an `pnpm add`
//  of the chosen SDK.
//
//  Methods:
//    save()       persist a fresh binary; returns a public URL/handle
//    read()       fetch the binary back (used by restore())
//    delete()     remove the binary; idempotent
//    list()       optional admin helper (returns all keys under a prefix)
//    healthcheck() optional probe used by /convert/storage/diagnostics
//
//  Why URLs not just paths: every backend has a different naming model.
//  Local disk uses `/uploads/converted/<uuid>.ext`; S3 returns either a
//  signed URL or a bare s3:// reference. The interface returns whatever
//  the front-end should embed in the UI.
// =============================================================================

export interface SavedFile {
  /** Stable handle to retrieve the binary later (`read(handle)`). */
  handle:   string;
  /** Public URL the editor + dashboard can embed. */
  url:      string;
  bytes:    number;
}

export interface StorageHealth {
  ok:         boolean;
  provider:   string;
  bucket?:    string;
  error?:     string;
  latencyMs?: number;
}

export interface ConversionStorageProvider {
  readonly name: 'local' | 's3' | 'gcs' | 'azure';

  /** Persist a binary. `originalFilename` is a hint for content-type / extension. */
  save(buffer: Buffer, originalFilename: string, mimetype?: string): Promise<SavedFile>;

  /** Read the binary back; throws if missing. */
  read(handle: string): Promise<Buffer>;

  /** Remove the binary; non-throwing if it's already gone. */
  delete(handle: string): Promise<void>;

  /** Optional listing — not all providers expose this efficiently. */
  list?(prefix?: string): Promise<Array<{ handle: string; url: string; bytes?: number }>>;

  /** Optional health probe. */
  healthcheck?(): Promise<StorageHealth>;
}
