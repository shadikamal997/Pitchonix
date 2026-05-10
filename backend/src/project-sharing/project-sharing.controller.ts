import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectSharingService } from './project-sharing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Project Sharing')
@Controller('projects/:projectId/members')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectSharingController {
  constructor(private readonly sharingService: ProjectSharingService) {}

  @Get()
  @ApiOperation({ summary: 'List project members' })
  listMembers(@Param('projectId') projectId: string) {
    return this.sharingService.listMembers(projectId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to the project by email' })
  invite(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: { email: string; role: string },
  ) {
    return this.sharingService.inviteByEmail(projectId, user.id, body.email, body.role || 'viewer');
  }

  @Patch(':memberId/role')
  @ApiOperation({ summary: 'Update member role' })
  updateRole(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @GetUser() user: any,
    @Body() body: { role: string },
  ) {
    return this.sharingService.updateRole(projectId, user.id, memberId, body.role);
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Remove a member from the project' })
  removeMember(
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
    @GetUser() user: any,
  ) {
    return this.sharingService.removeMember(projectId, user.id, memberId);
  }
}
