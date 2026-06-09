import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Public } from '../auth/public.decorator';
import { FeasibilityStudioService } from './feasibility-studio.service';

@ApiTags('Feasibility Studio')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('feasibility-studio')
export class FeasibilityStudioController {
  constructor(private readonly feasibilityStudio: FeasibilityStudioService) {}

  @Get('templates')
  @ApiOperation({ summary: 'List original Pitchonix feasibility templates' })
  templates() {
    return this.feasibilityStudio.listTemplates();
  }

  @Post('analyze')
  @Public()
  @ApiOperation({ summary: 'Analyze feasibility-related content without saving a project' })
  analyze(@Body() body: any) {
    return {
      success: true,
      data: this.feasibilityStudio.analyze(body || {}),
    };
  }

  @Get('projects')
  @ApiOperation({ summary: 'List Feasibility Studio projects' })
  projects(@GetUser() user: any) {
    return this.feasibilityStudio.listProjects(user.id);
  }

  @Post('projects')
  @ApiOperation({ summary: 'Create a Feasibility Studio project and report document' })
  create(@GetUser() user: any, @Body() body: any) {
    return this.feasibilityStudio.createProject(user.id, body || {});
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get a Feasibility Studio project' })
  get(@GetUser() user: any, @Param('id') id: string) {
    return this.feasibilityStudio.getProject(user.id, id);
  }

  @Patch('projects/:id')
  @ApiOperation({ summary: 'Update feasibility project metadata' })
  update(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.feasibilityStudio.updateProject(user.id, id, body || {});
  }

  @Post('projects/:id/enhance')
  @ApiOperation({ summary: 'Re-run feasibility analysis and recommendations' })
  enhance(@GetUser() user: any, @Param('id') id: string) {
    return this.feasibilityStudio.enhanceProject(user.id, id);
  }

  @Post('projects/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a feasibility project preserving source content' })
  duplicate(@GetUser() user: any, @Param('id') id: string) {
    return this.feasibilityStudio.duplicateProject(user.id, id);
  }

  @Post('projects/:id/archive')
  @ApiOperation({ summary: 'Archive a feasibility project' })
  archive(@GetUser() user: any, @Param('id') id: string) {
    return this.feasibilityStudio.archiveProject(user.id, id);
  }

  @Delete('projects/:id')
  @ApiOperation({ summary: 'Delete a feasibility project and its linked Pitchonix project' })
  remove(@GetUser() user: any, @Param('id') id: string) {
    return this.feasibilityStudio.deleteProject(user.id, id);
  }

  @Get('projects/:id/outputs')
  @ApiOperation({ summary: 'List cross-format feasibility outputs and readiness' })
  async outputs(@GetUser() user: any, @Param('id') id: string) {
    const project = await this.feasibilityStudio.getProject(user.id, id);
    return this.feasibilityStudio.outputsFor(project);
  }
}
