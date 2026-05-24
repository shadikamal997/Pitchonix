import {
  Controller, Get, Post, Patch, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService, CreateReviewRequestInput } from './reviews.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../auth/get-user.decorator';
import { RequireRole } from '../workspaces/role.guard';

// =============================================================================
//  Phase 36 — Reviews controller
//
//    POST   /decks/:deckId/review-requests           — request a review
//    GET    /decks/:deckId/review-requests           — list requests for deck
//    GET    /decks/:deckId/review-status             — { deckReviewStatus, activeRequest }
//    GET    /me/review-requests                      — requests assigned TO me
//    PATCH  /review-requests/:id/open                — reviewer opens (→ in_review)
//    PATCH  /review-requests/:id/approve             — reviewer approves
//    PATCH  /review-requests/:id/request-changes     — reviewer requests changes
//    PATCH  /review-requests/:id/withdraw            — requester withdraws
// =============================================================================

@ApiTags('Reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ---------- Deck-scoped reads ----------

  @Get('decks/:deckId/review-requests')
  @ApiOperation({ summary: 'List review requests for a deck' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'deckId' })
  list(@Param('deckId') deckId: string, @GetUser() user: any) {
    return this.reviewsService.listForDeck(deckId, user.id);
  }

  @Get('decks/:deckId/review-status')
  @ApiOperation({ summary: 'Compact review status + active request for a deck (toolbar badge)' })
  @RequireRole('deck.view', { kind: 'workspaceFromDeck', param: 'deckId' })
  status(@Param('deckId') deckId: string, @GetUser() user: any) {
    return this.reviewsService.getDeckStatus(deckId, user.id);
  }

  // ---------- Reviewer-side ----------

  @Get('me/review-requests')
  @ApiOperation({ summary: 'Active review requests assigned to the current user' })
  mine(@GetUser() user: any) {
    return this.reviewsService.listAssignedToMe(user.id);
  }

  // ---------- Mutations ----------

  @Post('decks/:deckId/review-requests')
  @ApiOperation({ summary: 'Request a review on a deck' })
  @RequireRole('review.request', { kind: 'workspaceFromDeck', param: 'deckId' })
  create(
    @Param('deckId') deckId: string,
    @GetUser() user: any,
    @Body() body: CreateReviewRequestInput,
  ) {
    return this.reviewsService.create(deckId, user.id, body);
  }

  @Patch('review-requests/:id/open')
  @ApiOperation({ summary: 'Reviewer opens the request (requested → in_review)' })
  @RequireRole('review.act', { kind: 'workspaceFromReview', param: 'id' })
  open(@Param('id') id: string, @GetUser() user: any) {
    return this.reviewsService.open(id, user.id);
  }

  @Patch('review-requests/:id/approve')
  @ApiOperation({ summary: 'Reviewer approves the deck' })
  @RequireRole('review.act', { kind: 'workspaceFromReview', param: 'id' })
  approve(@Param('id') id: string, @GetUser() user: any) {
    return this.reviewsService.approve(id, user.id);
  }

  @Patch('review-requests/:id/request-changes')
  @ApiOperation({ summary: 'Reviewer requests changes' })
  @RequireRole('review.act', { kind: 'workspaceFromReview', param: 'id' })
  requestChanges(@Param('id') id: string, @GetUser() user: any) {
    return this.reviewsService.requestChanges(id, user.id);
  }

  @Patch('review-requests/:id/withdraw')
  @ApiOperation({ summary: 'Requester withdraws the request' })
  @RequireRole('review.request', { kind: 'workspaceFromReview', param: 'id' })
  withdraw(@Param('id') id: string, @GetUser() user: any) {
    return this.reviewsService.withdraw(id, user.id);
  }

  @Patch('review-requests/:id/reopen')
  @ApiOperation({ summary: 'Reviewer re-opens a changes-requested review (back to in_review)' })
  @RequireRole('review.act', { kind: 'workspaceFromReview', param: 'id' })
  reopen(@Param('id') id: string, @GetUser() user: any) {
    return this.reviewsService.reopen(id, user.id);
  }
}
