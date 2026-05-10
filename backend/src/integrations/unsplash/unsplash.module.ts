import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UnsplashService } from './unsplash.service';
import { UnsplashController } from './unsplash.controller';

@Module({
  imports: [ConfigModule],
  providers: [UnsplashService],
  controllers: [UnsplashController],
  exports: [UnsplashService],
})
export class UnsplashModule {}
