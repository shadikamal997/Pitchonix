import { Module } from '@nestjs/common';
import { DeckSharesService } from './deck-shares.service';
import { DeckSharesController } from './deck-shares.controller';

@Module({
  controllers: [DeckSharesController],
  providers:   [DeckSharesService],
  exports:     [DeckSharesService],
})
export class SharingModule {}
