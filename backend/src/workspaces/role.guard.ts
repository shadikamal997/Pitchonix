import {
  Injectable, CanActivate, ExecutionContext, ForbiddenException,
  SetMetadata, applyDecorators, UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { canRole, WorkspaceAction, WorkspaceRole } from './workspace-permissions';

// =============================================================================
//  Phase 39F — RequireRole / WorkspaceRoleGuard
//
//  Usage:
//
//      @Get(':deckId')
//      @RequireRole('deck.view', { workspaceFromDeck: 'deckId' })
//      async getDeck(@Param('deckId') deckId: string) { … }
//
//  The decorator stamps the required action + a "resolver" describing where
//  to find the workspaceId in the request. The guard:
//
//    1. Reads the JWT-authenticated userId off req.user
//    2. Resolves the workspaceId via the configured strategy
//    3. Looks up the caller's WorkspaceMember row
//    4. Asks the permission matrix whether their role allows the action
//
//  If any step fails, throws ForbiddenException — the controller never sees
//  the request body.
//
//  The guard sits AFTER JwtAuthGuard, so `req.user.id` is guaranteed present.
// =============================================================================

export interface RoleRequirement {
  action: WorkspaceAction;
  resolver: WorkspaceResolver;
}

/** Tells the guard how to find the workspaceId for this request. */
export type WorkspaceResolver =
  | { kind: 'param';             key: string }          // workspaceId is a route param
  | { kind: 'body';              key: string }          // …or a body field
  | { kind: 'query';             key: string }          // …or a query string param
  | { kind: 'workspaceFromDeck'; param: string }        // deckId param → deck.project.workspaceId
  | { kind: 'workspaceFromProject'; param: string }     // projectId param → project.workspaceId
  | { kind: 'workspaceFromComment'; param: string }     // commentId param → comment.project.workspaceId
  | { kind: 'workspaceFromReview';  param: string }     // reviewId param → review.deck.project.workspaceId
  // Phase 39.1C — for slide/element/version routes that only know a slide id
  | { kind: 'workspaceFromSlide';   param: string }     // slideId param → slide.deck.project.workspaceId
  | { kind: 'workspaceFromElement'; param: string }     // elementId param → element.slide.deck.project.workspaceId
  | { kind: 'workspaceFromVersion'; param: string };    // versionId param → version.deck.project.workspaceId

const ROLE_REQUIREMENT_KEY = 'workspace:role-requirement';

/**
 * Decorator factory. Wraps SetMetadata + UseGuards so a single annotation
 * declares both the permission and applies the guard.
 */
export function RequireRole(action: WorkspaceAction, resolver: WorkspaceResolver) {
  return applyDecorators(
    SetMetadata(ROLE_REQUIREMENT_KEY, { action, resolver } as RoleRequirement),
    UseGuards(WorkspaceRoleGuard),
  );
}

@Injectable()
export class WorkspaceRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma:    PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.get<RoleRequirement>(ROLE_REQUIREMENT_KEY, ctx.getHandler());
    if (!requirement) return true;   // route didn't opt-in

    const req = ctx.switchToHttp().getRequest();
    const userId = req?.user?.id;
    if (!userId) throw new ForbiddenException('Not authenticated');

    const workspaceId = await this.resolveWorkspaceId(req, requirement.resolver);
    if (!workspaceId) {
      throw new ForbiddenException(`Could not resolve workspace for ${requirement.action}`);
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId, userId } },
      select: { role: true },
    });
    if (!member) throw new ForbiddenException('You are not a member of this workspace');

    if (!canRole(member.role as WorkspaceRole, requirement.action)) {
      throw new ForbiddenException(`Role "${member.role}" cannot ${requirement.action}`);
    }

    // Stamp resolved context onto the request so controllers can read it
    // without a second lookup.
    req.workspaceContext = { workspaceId, role: member.role };
    return true;
  }

  private async resolveWorkspaceId(req: any, resolver: WorkspaceResolver): Promise<string | null> {
    switch (resolver.kind) {
      case 'param':  return req.params?.[resolver.key] || null;
      case 'body':   return req.body?.[resolver.key]   || null;
      case 'query':  return req.query?.[resolver.key]  || null;

      case 'workspaceFromDeck': {
        const deckId = req.params?.[resolver.param];
        if (!deckId) return null;
        const deck = await this.prisma.deck.findUnique({
          where: { id: deckId },
          select: { project: { select: { workspaceId: true } } },
        });
        return deck?.project?.workspaceId || null;
      }
      case 'workspaceFromProject': {
        const projectId = req.params?.[resolver.param];
        if (!projectId) return null;
        const project = await this.prisma.project.findUnique({
          where: { id: projectId },
          select: { workspaceId: true },
        });
        return project?.workspaceId || null;
      }
      case 'workspaceFromComment': {
        const commentId = req.params?.[resolver.param];
        if (!commentId) return null;
        const comment = await this.prisma.comment.findUnique({
          where: { id: commentId },
          select: { project: { select: { workspaceId: true } } },
        });
        return comment?.project?.workspaceId || null;
      }
      case 'workspaceFromReview': {
        const reviewId = req.params?.[resolver.param];
        if (!reviewId) return null;
        const review = await this.prisma.reviewRequest.findUnique({
          where: { id: reviewId },
          select: { deck: { select: { project: { select: { workspaceId: true } } } } },
        });
        return review?.deck?.project?.workspaceId || null;
      }
      case 'workspaceFromSlide': {
        const slideId = req.params?.[resolver.param];
        if (!slideId) return null;
        const slide = await this.prisma.slide.findUnique({
          where: { id: slideId },
          select: { deck: { select: { project: { select: { workspaceId: true } } } } },
        });
        return slide?.deck?.project?.workspaceId || null;
      }
      case 'workspaceFromElement': {
        const elementId = req.params?.[resolver.param];
        if (!elementId) return null;
        const el = await this.prisma.slideElement.findUnique({
          where: { id: elementId },
          select: { slide: { select: { deck: { select: { project: { select: { workspaceId: true } } } } } } },
        });
        return el?.slide?.deck?.project?.workspaceId || null;
      }
      case 'workspaceFromVersion': {
        const versionId = req.params?.[resolver.param];
        if (!versionId) return null;
        const v = await this.prisma.deckVersion.findUnique({
          where: { id: versionId },
          select: { deck: { select: { project: { select: { workspaceId: true } } } } },
        });
        return v?.deck?.project?.workspaceId || null;
      }
    }
  }
}
