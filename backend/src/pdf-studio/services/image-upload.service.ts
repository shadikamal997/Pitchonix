import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as crypto from 'crypto';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export interface ImageUploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'images');

  constructor(private prisma: PrismaService) {
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir() {
    try {
      await mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ensured: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error('Failed to create upload directory', error);
    }
  }

  /**
   * Upload image from buffer
   */
  async uploadImage(
    buffer: Buffer,
    originalName: string,
    mimetype: string,
    userId?: string,
  ): Promise<ImageUploadResult> {
    try {
      // Generate unique filename
      const fileExt = path.extname(originalName);
      const hash = crypto.randomBytes(16).toString('hex');
      const filename = `${hash}${fileExt}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save file
      await writeFile(filePath, buffer);

      // Create database record (optional - for tracking)
      const imageRecord = await this.prisma.uploadedImage.create({
        data: {
          filename,
          originalName,
          mimetype,
          size: buffer.length,
          path: filePath,
          url: `/uploads/images/${filename}`,
          userId,
        },
      });

      this.logger.log(`Image uploaded successfully: ${filename} (${buffer.length} bytes)`);

      return {
        id: imageRecord.id,
        url: imageRecord.url,
        filename,
        size: buffer.length,
        mimetype,
      };
    } catch (error) {
      this.logger.error('Image upload failed', error);
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload image from base64
   */
  async uploadImageFromBase64(
    base64: string,
    filename: string,
    userId?: string,
  ): Promise<ImageUploadResult> {
    // Extract mimetype and data from data URL
    const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image data');
    }

    const mimetype = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    return this.uploadImage(buffer, filename, mimetype, userId);
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      const image = await this.prisma.uploadedImage.findUnique({
        where: { id: imageId },
      });

      if (!image) {
        throw new Error('Image not found');
      }

      // Delete file
      await unlink(image.path);

      // Delete database record
      await this.prisma.uploadedImage.delete({
        where: { id: imageId },
      });

      this.logger.log(`Image deleted: ${image.filename}`);
    } catch (error) {
      this.logger.error('Image deletion failed', error);
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Get image by ID
   */
  async getImage(imageId: string) {
    return await this.prisma.uploadedImage.findUnique({
      where: { id: imageId },
    });
  }

  /**
   * List user images
   */
  async listUserImages(userId: string, limit = 50) {
    return await this.prisma.uploadedImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Validate image
   */
  validateImage(mimetype: string, size: number): { valid: boolean; error?: string } {
    // Check mimetype
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(mimetype)) {
      return {
        valid: false,
        error: 'Invalid image type. Allowed: JPEG, PNG, WebP, GIF',
      };
    }

    // Check size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (size > maxSize) {
      return {
        valid: false,
        error: 'Image too large. Maximum size: 10MB',
      };
    }

    return { valid: true };
  }
}
