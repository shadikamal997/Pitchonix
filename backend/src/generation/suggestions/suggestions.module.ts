import { Module } from '@nestjs/common';
import { SuggestionsService } from './suggestions.service';
import { SuggestionsController } from './suggestions.controller';
import { TemplateModule } from '../templates/template.module';

@Module({
  imports: [TemplateModule],
  providers: [SuggestionsService],
  controllers: [SuggestionsController],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
