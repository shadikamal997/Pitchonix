import { Module } from '@nestjs/common';
import { OleWorkspaceController } from './ole-workspace.controller';
import { OleWorkspaceService } from './ole-workspace.service';

@Module({
  controllers: [OleWorkspaceController],
  providers:   [OleWorkspaceService],
  exports:     [OleWorkspaceService],
})
export class OleWorkspaceModule {}
