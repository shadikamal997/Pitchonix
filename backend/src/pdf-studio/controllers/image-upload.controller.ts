import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageUploadService } from '../services/image-upload.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../auth/get-user.decorator';

@Controller('pdf-studio/images')
@UseGuards(JwtAuthGuard)
export class ImageUploadController {
  private readonly logger = new Logger(ImageUploadController.name);

  constructor(private imageUploadService: ImageUploadService) {}

  /**
   * Upload image file
   * POST /api/pdf-studio/images/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @GetUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = user?.id;
    this.logger.log('Image upload request received');

    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    const validation = this.imageUploadService.validateImage(file.mimetype, file.size);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    try {
      const result = await this.imageUploadService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Image upload failed', error);
      throw new BadRequestException('Failed to upload image');
    }
  }

  /**
   * Upload image from base64
   * POST /api/pdf-studio/images/upload-base64
   */
  @Post('upload-base64')
  async uploadImageFromBase64(
    @GetUser() user: any,
    @Body() body: { image: string; filename: string },
  ) {
    this.logger.log('Base64 image upload request received');

    if (!body.image) {
      throw new BadRequestException('No image data provided');
    }

    if (!body.filename) {
      throw new BadRequestException('Filename is required');
    }

    try {
      const result = await this.imageUploadService.uploadImageFromBase64(
        body.image,
        body.filename,
        user?.id,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error('Base64 image upload failed', error);
      throw new BadRequestException(error.message || 'Failed to upload image');
    }
  }

  /**
   * Get image by ID
   * GET /api/pdf-studio/images/:id
   */
  @Get(':id')
  async getImage(@Param('id') id: string) {
    const image = await this.imageUploadService.getImage(id);

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    return {
      success: true,
      data: image,
    };
  }

  /**
   * List user images
   * GET /api/pdf-studio/images/user/:userId
   */
  @Get('user/me')
  async listUserImages(@GetUser() user: any) {
    const images = await this.imageUploadService.listUserImages(user?.id || '');

    return {
      success: true,
      data: images,
    };
  }

  /**
   * Delete image
   * DELETE /api/pdf-studio/images/:id
   */
  @Delete(':id')
  async deleteImage(@Param('id') id: string) {
    try {
      await this.imageUploadService.deleteImage(id);

      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      this.logger.error('Image deletion failed', error);
      throw new NotFoundException('Image not found or could not be deleted');
    }
  }
}
