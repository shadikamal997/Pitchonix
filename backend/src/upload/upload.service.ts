import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { UploadedAssetService } from '../files/uploaded-asset.service';

/** Owner metadata recorded with an upload so the /uploads gate can enforce ownership. */
export interface UploadOwner {
  userId: string;
  module?: string;
  projectId?: string | null;
  documentId?: string | null;
  visibility?: 'private' | 'shared' | 'public';
}

export interface UploadedFile {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly maxFileSize: number;
  private readonly allowedTypes: string[];

  constructor(
    private configService: ConfigService,
    private uploadedAssetService: UploadedAssetService,
  ) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
    this.allowedTypes = this.configService
      .get<string>('ALLOWED_FILE_TYPES', 'image/jpeg,image/png,image/jpg,image/webp')
      .split(',');

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    // Check file type
    if (!this.allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * Save and optimize image
   */
  async saveImage(file: Express.Multer.File, owner?: UploadOwner): Promise<UploadedFile> {
    this.validateFile(file);

    const filename = `${uuidv4()}${path.extname(file.originalname)}`;
    const filepath = path.join(this.uploadDir, filename);

    try {
      // Optimize image with sharp
      await sharp(file.buffer)
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85, progressive: true })
        .png({ quality: 85, compressionLevel: 9 })
        .webp({ quality: 85 })
        .toFile(filepath);

      const stats = await fs.stat(filepath);

      this.logger.log(`Image saved: ${filename} (${stats.size} bytes)`);

      const publicPath = `/uploads/${filename}`;

      // Phase Ω.1D — record ownership so the /uploads gate can owner-gate it.
      if (owner?.userId) {
        await this.uploadedAssetService.record({
          userId: owner.userId,
          publicPath,
          storagePath: filepath,
          module: owner.module || 'generic',
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: stats.size,
          projectId: owner.projectId ?? null,
          documentId: owner.documentId ?? null,
          visibility: owner.visibility ?? 'private',
        });
      }

      return {
        originalName: file.originalname,
        filename,
        path: filepath,
        url: publicPath,
        size: stats.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to save image: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to save image: ${error.message}`);
    }
  }

  /**
   * Save multiple images
   */
  async saveImages(files: Express.Multer.File[], owner?: UploadOwner): Promise<UploadedFile[]> {
    const results: UploadedFile[] = [];

    for (const file of files) {
      try {
        const uploaded = await this.saveImage(file, owner);
        results.push(uploaded);
      } catch (error) {
        this.logger.error(`Failed to save image: ${error.message}`);
        // Continue with other files
      }
    }

    return results;
  }

  /**
   * Delete image
   */
  async deleteImage(filename: string): Promise<void> {
    // Prevent path traversal: strip any directory components and confirm the
    // resolved path stays inside uploadDir before unlinking. A value like
    // "../../etc/passwd" would otherwise escape the uploads directory.
    const safeName = path.basename(filename);
    const filepath = path.resolve(this.uploadDir, safeName);
    const root = path.resolve(this.uploadDir);
    if (filepath !== root && !filepath.startsWith(root + path.sep)) {
      this.logger.warn(`Refusing to delete out-of-bounds path for input: ${filename}`);
      return;
    }

    try {
      await fs.unlink(filepath);
      this.logger.log(`Image deleted: ${safeName}`);
    } catch (error) {
      this.logger.error(`Failed to delete image: ${error.message}`);
      // Don't throw error if file doesn't exist
    }
  }

  /**
   * Delete multiple images
   */
  async deleteImages(filenames: string[]): Promise<void> {
    for (const filename of filenames) {
      await this.deleteImage(filename);
    }
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    file: Express.Multer.File,
    width: number = 300,
    height: number = 300,
    owner?: UploadOwner,
  ): Promise<UploadedFile> {
    this.validateFile(file);

    const filename = `thumb_${uuidv4()}${path.extname(file.originalname)}`;
    const filepath = path.join(this.uploadDir, filename);

    try {
      await sharp(file.buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      const stats = await fs.stat(filepath);
      const publicPath = `/uploads/${filename}`;

      if (owner?.userId) {
        await this.uploadedAssetService.record({
          userId: owner.userId,
          publicPath,
          storagePath: filepath,
          module: owner.module || 'generic',
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: stats.size,
          projectId: owner.projectId ?? null,
          visibility: owner.visibility ?? 'private',
        });
      }

      return {
        originalName: file.originalname,
        filename,
        path: filepath,
        url: publicPath,
        size: stats.size,
        mimetype: file.mimetype,
      };
    } catch (error) {
      this.logger.error(`Failed to generate thumbnail: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate thumbnail: ${error.message}`);
    }
  }
}
