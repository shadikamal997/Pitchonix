import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto, QueryProjectsDto } from './dto/project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  create(@GetUser() user: any, @Body() createProjectDto: CreateProjectDto) {
    return this.projectsService.create(user.id, createProjectDto);
  }

  @Get('archived')
  @ApiOperation({ summary: 'Get archived projects' })
  findArchived(@GetUser() user: any) {
    return this.projectsService.findArchived(user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user projects with filters' })
  findAll(@GetUser() user: any, @Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  findOne(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.findOne(id, user.id);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get project analytics' })
  getAnalytics(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.getAnalytics(id, user.id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate project' })
  duplicate(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.duplicate(id, user.id);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive project' })
  archive(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.archive(id, user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore archived project' })
  restore(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.restore(id, user.id);
  }

  @Post(':id/public-link')
  @ApiOperation({ summary: 'Generate public share link' })
  generatePublicLink(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.generatePublicLink(id, user.id);
  }

  @Delete(':id/public-link')
  @ApiOperation({ summary: 'Revoke public share link' })
  revokePublicLink(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.revokePublicLink(id, user.id);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete projects' })
  bulkDelete(@GetUser() user: any, @Body() body: { ids: string[] }) {
    return this.projectsService.bulkDelete(user.id, body.ids);
  }

  @Post('bulk/archive')
  @ApiOperation({ summary: 'Bulk archive projects' })
  bulkArchive(@GetUser() user: any, @Body() body: { ids: string[] }) {
    return this.projectsService.bulkArchive(user.id, body.ids);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  update(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.remove(id, user.id);
  }
}

// Separate public controller — no auth
@ApiTags('Public')
@Controller('share')
export class PublicProjectController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':token')
  @Public()
  @ApiOperation({ summary: 'View shared project (no auth required)' })
  getSharedProject(@Param('token') token: string) {
    return this.projectsService.getPublicProject(token);
  }
}
