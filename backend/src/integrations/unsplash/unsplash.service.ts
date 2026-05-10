import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UnsplashImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  description: string;
  photographer: string;
  photographerUrl: string;
  downloadUrl: string;
}

@Injectable()
export class UnsplashService {
  private readonly logger = new Logger(UnsplashService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.unsplash.com';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn('Unsplash API key not configured. Stock images disabled.');
    }
  }

  async searchImages(query: string, page = 1, perPage = 30): Promise<UnsplashImage[]> {
    if (!this.apiKey) {
      this.logger.warn('Cannot search images: Unsplash API key not configured');
      return [];
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
        {
          headers: {
            'Authorization': `Client-ID ${this.apiKey}`,
            'Accept-Version': 'v1',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      return data.results.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        width: photo.width,
        height: photo.height,
        description: photo.description || photo.alt_description || '',
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        downloadUrl: photo.links.download_location,
      }));
    } catch (error) {
      this.logger.error(`Failed to search Unsplash images: ${error.message}`);
      return [];
    }
  }

  async getRandomImages(query?: string, count = 10): Promise<UnsplashImage[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const queryParam = query ? `&query=${encodeURIComponent(query)}` : '';
      const response = await fetch(
        `${this.baseUrl}/photos/random?count=${count}${queryParam}`,
        {
          headers: {
            'Authorization': `Client-ID ${this.apiKey}`,
            'Accept-Version': 'v1',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const photos = await response.json();
      const photoArray = Array.isArray(photos) ? photos : [photos];
      
      return photoArray.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.thumb,
        width: photo.width,
        height: photo.height,
        description: photo.description || photo.alt_description || '',
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        downloadUrl: photo.links.download_location,
      }));
    } catch (error) {
      this.logger.error(`Failed to get random Unsplash images: ${error.message}`);
      return [];
    }
  }

  async triggerDownload(downloadUrl: string): Promise<void> {
    if (!this.apiKey || !downloadUrl) {
      return;
    }

    try {
      // Trigger download tracking as per Unsplash guidelines
      await fetch(downloadUrl, {
        headers: {
          'Authorization': `Client-ID ${this.apiKey}`,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to trigger Unsplash download: ${error.message}`);
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
