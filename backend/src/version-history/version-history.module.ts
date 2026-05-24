import { Module } from '@nestjs/common';
import { VersionHistoryController } from './version-history.controller';
import { VersionHistoryService } from './version-history.service';

@Module({
  controllers: [VersionHistoryController],
  providers:   [VersionHistoryService],
  exports:     [VersionHistoryService],
})
export class VersionHistoryModule {}
