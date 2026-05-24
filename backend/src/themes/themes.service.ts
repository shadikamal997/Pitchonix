import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// =============================================================================
//  Phase 38C — ThemesService
//
//  Deck- or workspace-scoped theme. Distinct from BrandKit (which carries
//  identity + voice + assets). A theme is pure design tokens:
//    { colors:{}, fonts:{}, spacing:{}, borders:{}, shadows:{} }
//  Applied to a slide via Slide.themeId (Phase 38) or themeKey (legacy).
// =============================================================================

export interface ThemeTokens {
  colors?:  Record<string, string>;
  fonts?:   Record<string, string>;
  spacing?: Record<string, number | string>;
  borders?: Record<string, string>;
  shadows?: Record<string, string>;
  [k: string]: any;
}

export interface ThemeInput {
  name?:        string;
  tokens?:      ThemeTokens;
  deckId?:      string | null;
  workspaceId?: string | null;
  isWorkspace?: boolean;
  thumbnail?:   string | null;
}

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  list(opts: { deckId?: string | null; workspaceId?: string | null }) {
    return this.prisma.deckTheme.findMany({
      where: {
        OR: [
          opts.deckId      ? { deckId: opts.deckId }           : { id: undefined },
          opts.workspaceId ? { workspaceId: opts.workspaceId } : { id: undefined },
          { isWorkspace: true },
        ].filter(Boolean) as any,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.deckTheme.findUnique({ where: { id } });
  }

  create(input: ThemeInput) {
    return this.prisma.deckTheme.create({
      data: {
        deckId:      input.deckId ?? null,
        workspaceId: input.workspaceId ?? null,
        name:        input.name?.trim() || 'Untitled theme',
        tokens:      (input.tokens ?? {}) as any,
        isWorkspace: input.isWorkspace ?? false,
        thumbnail:   input.thumbnail ?? null,
      },
    });
  }

  async update(id: string, patch: ThemeInput) {
    if (!(await this.findOne(id))) throw new NotFoundException('Theme not found');
    return this.prisma.deckTheme.update({ where: { id }, data: patch as any });
  }

  async remove(id: string) {
    if (!(await this.findOne(id))) throw new NotFoundException('Theme not found');
    return this.prisma.deckTheme.delete({ where: { id } });
  }

  // --- Apply --------------------------------------------------------------

  async applyToDeck(themeId: string, deckId: string) {
    const theme = await this.findOne(themeId);
    if (!theme) throw new NotFoundException('Theme not found');
    const res = await this.prisma.slide.updateMany({
      where: { deckId },
      data:  { themeId },
    });
    return { applied: res.count };
  }

  async applyToSlide(themeId: string, slideId: string) {
    return this.prisma.slide.update({
      where: { id: slideId },
      data:  { themeId },
    });
  }
}
