import { Module } from '@nestjs/common';
import { DeckSectionsController } from './deck-sections.controller';
import { DeckSectionsService } from './deck-sections.service';

@Module({
  controllers: [DeckSectionsController],
  providers:   [DeckSectionsService],
  exports:     [DeckSectionsService],
})
export class DeckSectionsModule {}
