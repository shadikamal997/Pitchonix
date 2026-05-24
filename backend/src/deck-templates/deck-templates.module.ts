import { Module } from '@nestjs/common';
import { DeckTemplatesController } from './deck-templates.controller';
import { DeckTemplatesService } from './deck-templates.service';

@Module({
  controllers: [DeckTemplatesController],
  providers:   [DeckTemplatesService],
  exports:     [DeckTemplatesService],
})
export class DeckTemplatesModule {}
