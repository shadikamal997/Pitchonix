import { Module } from '@nestjs/common';
import { TemplateFavouritesService } from './template-favourites.service';
import { TemplateFavouritesController } from './template-favourites.controller';

@Module({
  controllers: [TemplateFavouritesController],
  providers: [TemplateFavouritesService],
  exports: [TemplateFavouritesService],
})
export class TemplateFavouritesModule {}
