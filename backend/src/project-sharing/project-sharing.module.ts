import { Module } from '@nestjs/common';
import { ProjectSharingService } from './project-sharing.service';
import { ProjectSharingController } from './project-sharing.controller';

@Module({
  controllers: [ProjectSharingController],
  providers: [ProjectSharingService],
  exports: [ProjectSharingService],
})
export class ProjectSharingModule {}
