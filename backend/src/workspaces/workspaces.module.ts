import { Global, Module } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspaceActivityService } from './workspace-activity.service';
import { WorkspaceAuditService } from './workspace-audit.service';
import { WorkspaceRoleGuard } from './role.guard';
import { EmailModule } from '../email/email.module';

// Phase 39 — WorkspacesModule
//
// Made @Global so other modules (comments, reviews, slide-export, etc.) can
// inject WorkspacesService / WorkspaceActivityService without importing the
// module explicitly. The Role guard depends on PrismaService + Reflector,
// both already global.
@Global()
@Module({
  imports:     [EmailModule], // Phase 39.1E — invite email delivery
  controllers: [WorkspacesController],
  providers:   [
    WorkspacesService,
    WorkspaceActivityService,
    WorkspaceAuditService,
    WorkspaceRoleGuard,
  ],
  exports: [
    WorkspacesService,
    WorkspaceActivityService,
    WorkspaceAuditService,
    WorkspaceRoleGuard,
  ],
})
export class WorkspacesModule {}
