import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadService, UploadedFile as UploadedFileInfo } from './upload.service';

@ApiTags('Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload single image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<UploadedFileInfo> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.uploadService.saveImage(file);
  }

  @Post('images')
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]): Promise<UploadedFileInfo[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    return this.uploadService.saveImages(files);
  }

  @Post('thumbnail')
  @ApiOperation({ summary: 'Upload image and generate thumbnail' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadThumbnail(@UploadedFile() file: Express.Multer.File): Promise<{
    original: UploadedFileInfo;
    thumbnail: UploadedFileInfo;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const [original, thumbnail] = await Promise.all([
      this.uploadService.saveImage(file),
      this.uploadService.generateThumbnail(file),
    ]);

    return { original, thumbnail };
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete uploaded image' })
  async deleteImage(@Param('filename') filename: string): Promise<{ message: string }> {
    await this.uploadService.deleteImage(filename);
    return { message: 'Image deleted successfully' };
  }
}
