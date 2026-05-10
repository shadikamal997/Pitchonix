import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

@ApiTags('Comments')
@Controller('projects/:projectId/comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all comments for a project' })
  findAll(@Param('projectId') projectId: string) {
    return this.commentsService.findAll(projectId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a comment' })
  create(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.commentsService.create(projectId, user.id, body.content, body.parentId);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark comment as resolved' })
  resolve(@Param('id') id: string, @GetUser() user: any) {
    return this.commentsService.resolve(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.commentsService.remove(id, user.id);
  }
}
