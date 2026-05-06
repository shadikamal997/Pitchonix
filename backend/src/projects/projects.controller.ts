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

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate project' })
  duplicate(@Param('id') id: string, @GetUser() user: any) {
    return this.projectsService.duplicate(id, user.id);
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
