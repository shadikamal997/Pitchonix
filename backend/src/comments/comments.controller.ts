import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommentsService, CreateCommentInput } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';

// =============================================================================
//  Phase 14 — Collaboration v1
//
//  Two route groups:
//    - /projects/:projectId/comments    (legacy + slide/element CREATE)
//    - /slides/:slideId/comments        (slide-scoped read)
//    - /slide-elements/:elementId/comments  (element-scoped read)
//    - /decks/:deckId/comment-counts    (badge counts for sidebar/canvas)
//
//  The project route still owns creates: posting requires we know the project
//  for authorization. The slide/element reads delegate authorization through
//  the parent project.
// =============================================================================

@ApiTags('Comments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // ---------- Project-scoped (legacy + creates) ----------

  @Get('projects/:projectId/comments')
  @ApiOperation({ summary: 'List all comments in a project' })
  async findAllForProject(@Param('projectId') projectId: string, @GetUser() user: any) {
    await this.commentsService.assertProjectAccess(projectId, user.id);
    return this.commentsService.findAll(projectId);
  }

  @Post('projects/:projectId/comments')
  @ApiOperation({ summary: 'Create a comment (project / slide / element anchor)' })
  async create(
    @Param('projectId') projectId: string,
    @GetUser() user: any,
    @Body() body: CreateCommentInput,
  ) {
    await this.commentsService.assertProjectAccess(projectId, user.id);
    return this.commentsService.create(projectId, user.id, body);
  }

  // ---------- Slide-scoped ----------

  @Get('slides/:slideId/comments')
  @ApiOperation({ summary: 'List top-level comments anchored to a slide' })
  async findForSlide(@Param('slideId') slideId: string, @GetUser() user: any) {
    const projectId = await this.commentsService.projectForSlide(slideId);
    await this.commentsService.assertProjectAccess(projectId, user.id);
    return this.commentsService.findForSlide(slideId);
  }

  // ---------- Element-scoped ----------

  @Get('slide-elements/:elementId/comments')
  @ApiOperation({ summary: 'List top-level comments anchored to a specific element' })
  async findForElement(@Param('elementId') elementId: string, @GetUser() user: any) {
    const { projectId } = await this.commentsService.projectForElement(elementId);
    await this.commentsService.assertProjectAccess(projectId, user.id);
    return this.commentsService.findForElement(elementId);
  }

  // ---------- Badge counts ----------

  @Get('decks/:deckId/comment-counts')
  @ApiOperation({ summary: 'Unresolved comment counts per slide (sidebar badges)' })
  async countsByDeck(@Param('deckId') deckId: string, @GetUser() user: any) {
    // Verify access via any slide.
    const slide = await (this.commentsService as any).prisma.slide.findFirst({
      where: { deckId },
      select: { id: true },
    });
    if (slide) {
      const projectId = await this.commentsService.projectForSlide(slide.id);
      await this.commentsService.assertProjectAccess(projectId, user.id);
    }
    return this.commentsService.countsByDeckSlides(deckId);
  }

  @Get('slides/:slideId/element-comment-counts')
  @ApiOperation({ summary: 'Unresolved comment counts per element on a slide' })
  async countsByElementsForSlide(@Param('slideId') slideId: string, @GetUser() user: any) {
    const projectId = await this.commentsService.projectForSlide(slideId);
    await this.commentsService.assertProjectAccess(projectId, user.id);
    return this.commentsService.countsByElementsForSlide(slideId);
  }

  // ---------- Item mutations (cross-cutting; id-only) ----------

  @Patch('comments/:id/resolve')
  @ApiOperation({ summary: 'Mark comment as resolved' })
  resolve(@Param('id') id: string, @GetUser() user: any) {
    return this.commentsService.resolve(id, user.id);
  }

  @Patch('comments/:id/reopen')
  @ApiOperation({ summary: 'Reopen a previously resolved comment' })
  reopen(@Param('id') id: string, @GetUser() user: any) {
    return this.commentsService.reopen(id, user.id);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete a comment (author only)' })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.commentsService.remove(id, user.id);
  }
}
