import { Controller, Get, Query, Post, Body, UseGuards } from '@nestjs/common';
import { UnsplashService } from './unsplash.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('unsplash')
@UseGuards(JwtAuthGuard)
export class UnsplashController {
  constructor(private readonly unsplashService: UnsplashService) {}

  @Get('search')
  async searchImages(
    @Query('query') query: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const perPageNum = perPage ? parseInt(perPage, 10) : 30;
    
    const images = await this.unsplashService.searchImages(query, pageNum, perPageNum);
    
    return {
      images,
      query,
      page: pageNum,
      perPage: perPageNum,
      total: images.length,
    };
  }

  @Get('random')
  async getRandomImages(
    @Query('query') query?: string,
    @Query('count') count?: string,
  ) {
    const countNum = count ? parseInt(count, 10) : 10;
    const images = await this.unsplashService.getRandomImages(query, countNum);
    
    return {
      images,
      count: images.length,
    };
  }

  @Post('download')
  async triggerDownload(@Body('downloadUrl') downloadUrl: string) {
    await this.unsplashService.triggerDownload(downloadUrl);
    return { success: true };
  }

  @Get('status')
  async getStatus() {
    return {
      configured: this.unsplashService.isConfigured(),
      enabled: this.unsplashService.isConfigured(),
    };
  }
}
