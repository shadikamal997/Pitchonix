import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController, PublicProjectController } from './projects.controller';

@Module({
  controllers: [ProjectsController, PublicProjectController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
