import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AssetVisibility = 'private' | 'shared' | 'public';

export interface RecordAssetInput {
  userId: string;
  publicPath: string; // served URL, e.g. /uploads/images/<uuid>.png
  storagePath: string; // disk path
  module: string; // brand_kit | career_photo | cv_document | pdf_studio | presentation | pptx_import | excel | convert | generic
  originalName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  projectId?: string | null;
  documentId?: string | null;
  workspaceId?: string | null;
  visibility?: AssetVisibility;
  checksum?: string | null;
}

/**
 * Phase Ω.1D — owns the per-file UploadedAsset records that back the /uploads
 * ownership gate. Recording is best-effort: a metadata write must never break
 * the actual upload, but a missing record means the file falls back to the
 * auth-gate (or is denied under strict mode).
 */
@Injectable()
export class UploadedAssetService {
  private readonly logger = new Logger(UploadedAssetService.name);

  constructor(private prisma: PrismaService) {}

  /** Upsert by publicPath so re-uploads / re-records don't hit unique conflicts. */
  async record(input: RecordAssetInput) {
    if (!input.userId || !input.publicPath || !input.storagePath) return null;
    const data = {
      userId: input.userId,
      module: input.module,
      storagePath: input.storagePath,
      publicPath: input.publicPath,
      originalName: input.originalName ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      projectId: input.projectId ?? null,
      documentId: input.documentId ?? null,
      workspaceId: input.workspaceId ?? null,
      visibility: input.visibility ?? 'private',
      checksum: input.checksum ?? null,
      deletedAt: null,
    };
    try {
      return await this.prisma.uploadedAsset.upsert({
        where: { publicPath: input.publicPath },
        create: data,
        update: { ...data },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to record UploadedAsset ${input.publicPath}: ${(err as any)?.message}`,
      );
      return null;
    }
  }

  findByPublicPath(publicPath: string) {
    return this.prisma.uploadedAsset.findUnique({
      where: { publicPath },
      select: {
        userId: true,
        visibility: true,
        deletedAt: true,
        projectId: true,
        project: { select: { userId: true } },
      },
    });
  }

  /**
   * Ownership decision for the gate.
   *   true  → allow   (owner / parent-owner / public)
   *   false → deny     (someone else's private/shared asset, or soft-deleted)
   *   null  → unknown  (no record) → caller decides (auth fallback or strict deny)
   */
  async authorize(publicPath: string, userId: string | undefined): Promise<boolean | null> {
    const asset = await this.findByPublicPath(publicPath);
    if (!asset) return null;
    if (asset.deletedAt) return false;
    if (asset.visibility === 'public') return true;
    if (!userId) return false;
    if (asset.userId === userId) return true;
    if (asset.project?.userId && asset.project.userId === userId) return true;
    // private or shared owned by someone else (a valid signed token, checked
    // earlier in the gate, is the only other way in for `shared`).
    return false;
  }
}
