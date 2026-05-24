import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandKitDto } from './dto/create-brand-kit.dto';
import { UpdateBrandKitDto } from './dto/update-brand-kit.dto';

// =============================================================================
//  Phase 37 — BrandKitsService
//
//  Owns the lifecycle of BrandKit + BrandAsset rows. New responsibilities
//  beyond the original Phase 2 CRUD:
//
//    - Workspace scoping (workspaceId backfill on boot)
//    - Default-kit invariant (one per workspace)
//    - Rich JSON fields: tokens, voice, identity, config (legacy)
//    - Asset management (logos)
//    - Apply-to-deck (cascades into deck.metadata.themeTokens)
//
//  Workspace membership is enforced at the controller level via Phase 39's
//  @RequireRole — this service trusts its callers' inputs but still
//  validates ownership of the kit when an ID is provided.
// =============================================================================

// Shape contracts for the JSON columns. Documented here so consumers
// (generation pipeline, chart engine, audit service) have a single source
// of truth for the field layout.
export interface BrandTokens {
  colors?: Partial<{
    primary: string; secondary: string; accent: string;
    success: string; warning: string; danger: string; neutral: string;
  }>;
  typography?: Partial<{
    heading: { family: string; weight?: number; lineHeight?: number; letterSpacing?: number };
    body:    { family: string; weight?: number; lineHeight?: number; letterSpacing?: number };
    caption: { family: string; weight?: number; lineHeight?: number; letterSpacing?: number };
  }>;
  tokens?: Partial<{
    borderRadius: number;
    shadowStyle:  'none' | 'subtle' | 'pronounced';
    spacingScale: number;
    containerWidth: number;
    buttonStyle:  'pill' | 'square' | 'rounded';
  }>;
  chart?: Partial<{
    palette:    string[];
    axisColor:  string;
    gridColor:  string;
    legendStyle: 'inline' | 'side' | 'bottom';
  }>;
  icon?: Partial<{
    style: 'outline' | 'filled' | 'rounded' | 'sharp' | 'duotone';
  }>;
  image?: Partial<{
    style: string;            // free-form: "corporate" | "startup" | …
    prompts: string[];
    moodboards: string[];
  }>;
}

export interface BrandVoice {
  tone?:  string;             // "professional" | "friendly" | "luxury" | …
  voice?: string;             // "first-person" | "executive" | …
  rules?: string[];           // ["Avoid jargon", "Use active voice"]
  examples?: string[];
}

export interface BrandIdentity {
  companyName?: string;
  tagline?:     string;
  mission?:     string;
  vision?:      string;
  website?:     string;
}

@Injectable()
export class BrandKitsService implements OnModuleInit {
  private readonly logger = new Logger(BrandKitsService.name);

  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Boot — backfill workspaceId for legacy kits
  // ---------------------------------------------------------------------------

  async onModuleInit() {
    try {
      await this.backfillWorkspaceIds();
    } catch (e: any) {
      this.logger.warn(`BrandKit workspace backfill failed: ${e?.message}`);
    }
  }

  /**
   * Phase 37A — every existing BrandKit needs a workspaceId. We map each
   * legacy kit's owner → their Personal workspace (created by Phase 39's
   * own backfill). Idempotent.
   */
  async backfillWorkspaceIds(): Promise<{ updated: number }> {
    const orphans = await this.prisma.brandKit.findMany({
      where:  { workspaceId: null },
      select: { id: true, userId: true },
    });
    if (orphans.length === 0) return { updated: 0 };

    let updated = 0;
    for (const kit of orphans) {
      const membership = await this.prisma.workspaceMember.findFirst({
        where:  { userId: kit.userId },
        select: { workspaceId: true },
        orderBy: { joinedAt: 'asc' },
      });
      if (!membership) continue;
      await this.prisma.brandKit.update({
        where: { id: kit.id },
        data:  { workspaceId: membership.workspaceId },
      });
      updated++;
    }
    if (updated > 0) this.logger.log(`Backfilled workspaceId on ${updated} BrandKit(s)`);
    return { updated };
  }

  // ---------------------------------------------------------------------------
  //  CRUD — kept compatible with existing controller signatures
  // ---------------------------------------------------------------------------

  /** Legacy create — defaults to caller's first workspace if no id given. */
  async create(userId: string, dto: CreateBrandKitDto & {
    workspaceId?: string;
    description?: string;
    tokens?:      BrandTokens;
    voice?:       BrandVoice;
    identity?:    BrandIdentity;
    isDefault?:   boolean;
  }) {
    const workspaceId = dto.workspaceId || await this.defaultWorkspaceFor(userId);
    // Phase 37A — preserve the "one default per workspace" invariant.
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault && workspaceId) {
        await tx.brandKit.updateMany({
          where: { workspaceId, isDefault: true },
          data:  { isDefault: false },
        });
      }
      return tx.brandKit.create({
        data: {
          userId,
          workspaceId: workspaceId || undefined,
          name:           dto.name,
          description:    dto.description,
          isDefault:      dto.isDefault ?? false,
          logo:           dto.logo,
          primaryColor:   dto.primaryColor,
          secondaryColor: dto.secondaryColor,
          fontFamily:     dto.fontFamily,
          config:         {},
          tokens:         dto.tokens   ? (dto.tokens   as any) : undefined,
          voice:          dto.voice    ? (dto.voice    as any) : undefined,
          identity:       dto.identity ? (dto.identity as any) : undefined,
        },
      });
    });
  }

  async findAll(userId: string) {
    // Legacy behavior — kits owned by this user. Workspace-scoped listing
    // lives in `findForWorkspace`.
    return this.prisma.brandKit.findMany({
      where:   { userId },
      include: { assets: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Phase 37M — list every kit visible inside a workspace. */
  async findForWorkspace(workspaceId: string) {
    return this.prisma.brandKit.findMany({
      where:   { workspaceId },
      include: { assets: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const brandKit = await this.prisma.brandKit.findUnique({
      where:   { id },
      include: { assets: true },
    });
    if (!brandKit) throw new NotFoundException(`Brand kit with ID ${id} not found`);
    if (brandKit.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this brand kit');
    }
    return brandKit;
  }

  async update(id: string, userId: string, dto: UpdateBrandKitDto & {
    description?: string;
    tokens?:      BrandTokens;
    voice?:       BrandVoice;
    identity?:    BrandIdentity;
    isDefault?:   boolean;
  }) {
    const existing = await this.findOne(id, userId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault === true && existing.workspaceId) {
        await tx.brandKit.updateMany({
          where: { workspaceId: existing.workspaceId, isDefault: true, NOT: { id } },
          data:  { isDefault: false },
        });
      }
      return tx.brandKit.update({
        where: { id },
        data: {
          name:           dto.name           ?? undefined,
          description:    dto.description    ?? undefined,
          isDefault:      dto.isDefault      ?? undefined,
          logo:           dto.logo           ?? undefined,
          primaryColor:   dto.primaryColor   ?? undefined,
          secondaryColor: dto.secondaryColor ?? undefined,
          fontFamily:     dto.fontFamily     ?? undefined,
          tokens:         dto.tokens   ? (dto.tokens   as any) : undefined,
          voice:          dto.voice    ? (dto.voice    as any) : undefined,
          identity:       dto.identity ? (dto.identity as any) : undefined,
        },
        include: { assets: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.brandKit.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  //  Phase 37B/R — Brand Asset management
  // ---------------------------------------------------------------------------

  async addAsset(id: string, userId: string, input: {
    kind: string; url: string; mimeType?: string;
    width?: number; height?: number; alt?: string;
  }) {
    await this.findOne(id, userId);
    if (!input.kind || !input.url) throw new BadRequestException('kind + url required');
    return this.prisma.brandAsset.create({
      data: {
        brandKitId: id,
        kind:       input.kind,
        url:        input.url,
        mimeType:   input.mimeType,
        width:      input.width,
        height:     input.height,
        alt:        input.alt,
      },
    });
  }

  async removeAsset(id: string, userId: string, assetId: string) {
    await this.findOne(id, userId);
    const asset = await this.prisma.brandAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.brandKitId !== id) throw new NotFoundException('Asset not found');
    await this.prisma.brandAsset.delete({ where: { id: assetId } });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  //  Phase 37K — Apply brand to a deck
  //
  //  Writes the kit's colors / fonts / identity into the deck's
  //  `metadata.themeTokens` so the renderer + composition system can pick
  //  them up. Returns the updated deck.
  // ---------------------------------------------------------------------------

  async applyToDeck(brandKitId: string, deckId: string, userId: string) {
    const kit = await this.findOne(brandKitId, userId);
    const deck = await this.prisma.deck.findUnique({
      where:  { id: deckId },
      select: { id: true, metadata: true },
    });
    if (!deck) throw new NotFoundException('Deck not found');

    const tokens = (kit.tokens as BrandTokens | null) || {};
    const themeTokens = {
      // Primary colors take precedence; fall back to the legacy single-color
      // fields so old kits still apply.
      primary:    tokens.colors?.primary    ?? kit.primaryColor   ?? undefined,
      secondary:  tokens.colors?.secondary  ?? kit.secondaryColor ?? undefined,
      accent:     tokens.colors?.accent     ?? undefined,
      fontFamily: tokens.typography?.body?.family ?? kit.fontFamily ?? undefined,
      headingFontFamily: tokens.typography?.heading?.family ?? undefined,
      borderRadius: tokens.tokens?.borderRadius ?? undefined,
      // Logo + identity surface for the renderer.
      logoUrl: kit.logo ?? undefined,
      companyName: (kit.identity as BrandIdentity | null)?.companyName ?? undefined,
    };

    const existingMeta = (deck.metadata as any) || {};
    const nextMeta = {
      ...existingMeta,
      themeTokens: { ...(existingMeta.themeTokens || {}), ...themeTokens },
      brandKitId,
    };

    return this.prisma.deck.update({
      where: { id: deckId },
      data:  { brandKitId, metadata: nextMeta },
      select: { id: true, brandKitId: true, metadata: true },
    });
  }

  // ---------------------------------------------------------------------------
  //  Phase 37.1B — Chart auto-rebranding
  //
  //  Rewrites a chart element's color palette to match the brand kit while
  //  preserving data / labels / axes / legend / title. Works across every
  //  chart family because the renderer reads colors from `el.data.colors`
  //  (or `el.data.palette`).
  // ---------------------------------------------------------------------------

  async rebrandChartElement(brandKitId: string, elementId: string, userId: string) {
    const kit = await this.findOne(brandKitId, userId);
    const element = await this.prisma.slideElement.findUnique({ where: { id: elementId } });
    if (!element) throw new NotFoundException('Element not found');
    if (element.type !== 'chart') {
      throw new BadRequestException('Element is not a chart');
    }
    const tokens = (kit.tokens as BrandTokens | null) || {};
    const palette = brandChartPalette(tokens, kit.primaryColor, kit.secondaryColor);
    if (palette.length === 0) throw new BadRequestException('Brand kit has no chart palette');
    const data  = (element.data  as any) || {};
    const style = (element.style as any) || {};
    return this.prisma.slideElement.update({
      where: { id: elementId },
      data: {
        data:  { ...data,  colors: palette, palette },
        style: {
          ...style,
          axisColor:  tokens.chart?.axisColor  ?? style.axisColor,
          gridColor:  tokens.chart?.gridColor  ?? style.gridColor,
          legendStyle: tokens.chart?.legendStyle ?? style.legendStyle,
        },
      },
    });
  }

  /** Phase 37.1B — rebrand every chart on a deck in one call. */
  async rebrandAllCharts(brandKitId: string, deckId: string, userId: string) {
    const kit = await this.findOne(brandKitId, userId);
    const tokens = (kit.tokens as BrandTokens | null) || {};
    const palette = brandChartPalette(tokens, kit.primaryColor, kit.secondaryColor);
    if (palette.length === 0) throw new BadRequestException('Brand kit has no chart palette');
    const charts = await this.prisma.slideElement.findMany({
      where:  { type: 'chart', slide: { deckId } },
      select: { id: true, data: true, style: true },
    });
    let updated = 0;
    for (const c of charts) {
      const data  = (c.data  as any) || {};
      const style = (c.style as any) || {};
      await this.prisma.slideElement.update({
        where: { id: c.id },
        data:  {
          data:  { ...data, colors: palette, palette },
          style: {
            ...style,
            axisColor:  tokens.chart?.axisColor  ?? style.axisColor,
            gridColor:  tokens.chart?.gridColor  ?? style.gridColor,
            legendStyle: tokens.chart?.legendStyle ?? style.legendStyle,
          },
        },
      });
      updated++;
    }
    return { updated, palette };
  }

  // ---------------------------------------------------------------------------
  //  Phase 37.1F — Batch apply to multiple decks
  // ---------------------------------------------------------------------------

  async applyToMany(brandKitId: string, userId: string, input: {
    deckIds?: string[];
    workspaceId?: string;
  }) {
    await this.findOne(brandKitId, userId);
    let targets = input.deckIds || [];
    if (input.workspaceId) {
      const decks = await this.prisma.deck.findMany({
        where:  { project: { workspaceId: input.workspaceId } },
        select: { id: true },
      });
      targets = Array.from(new Set([...targets, ...decks.map((d) => d.id)]));
    }
    if (targets.length === 0) return { applied: 0 };
    let applied = 0;
    for (const id of targets) {
      try { await this.applyToDeck(brandKitId, id, userId); applied++; }
      catch (e: any) { this.logger.warn(`Batch apply skipped deck ${id}: ${e?.message}`); }
    }
    return { applied };
  }

  // ---------------------------------------------------------------------------
  //  Phase 37.1E — Import / export
  // ---------------------------------------------------------------------------

  async exportKit(id: string, userId: string): Promise<BrandKitExportV1> {
    const kit = await this.findOne(id, userId);
    return {
      $schema:    'pitchonix.brand-kit',
      version:    1,
      name:        kit.name,
      description: kit.description,
      identity:    (kit.identity as BrandIdentity | null) || undefined,
      voice:       (kit.voice    as BrandVoice    | null) || undefined,
      tokens:      (kit.tokens   as BrandTokens   | null) || undefined,
      logo:        kit.logo || undefined,
      primaryColor:   kit.primaryColor   || undefined,
      secondaryColor: kit.secondaryColor || undefined,
      fontFamily:     kit.fontFamily     || undefined,
      assets:      kit.assets.map((a) => ({
        kind: a.kind, url: a.url, mimeType: a.mimeType,
        width: a.width, height: a.height, alt: a.alt,
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  async importKit(userId: string, payload: BrandKitExportV1, workspaceId?: string) {
    if (!payload || payload.$schema !== 'pitchonix.brand-kit') {
      throw new BadRequestException('Not a valid Pitchonix brand kit export');
    }
    if (payload.version !== 1) {
      throw new BadRequestException(`Unsupported brand-kit export version ${payload.version}`);
    }
    if (!payload.name?.trim()) {
      throw new BadRequestException('Brand kit name is required');
    }
    const created = await this.create(userId, {
      name:           payload.name,
      description:    payload.description ?? undefined,
      logo:           payload.logo,
      primaryColor:   payload.primaryColor,
      secondaryColor: payload.secondaryColor,
      fontFamily:     payload.fontFamily,
      tokens:         payload.tokens,
      voice:          payload.voice,
      identity:       payload.identity,
      workspaceId,
    } as any);
    for (const a of (payload.assets || [])) {
      try {
        await this.prisma.brandAsset.create({
          data: {
            brandKitId: created.id,
            kind:       a.kind,  url:    a.url,
            mimeType:   a.mimeType ?? undefined,
            width:      a.width    ?? undefined,
            height:     a.height   ?? undefined,
            alt:        a.alt      ?? undefined,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Import skipped asset ${a.kind}: ${e?.message}`);
      }
    }
    return created;
  }

  // ---------------------------------------------------------------------------
  //  Phase 37.1D — PDF Studio adapter
  //
  //  Returns a flat record matching the PDF Studio's existing internal
  //  BrandKit shape so its renderer can consume DB kits without a deeper
  //  refactor. PDF studio will load this via the public method instead of
  //  hand-rolling presets.
  // ---------------------------------------------------------------------------

  async toPdfStudioBrand(id: string, userId: string): Promise<{
    primaryColor:   string | null;
    secondaryColor: string | null;
    accentColor:    string | null;
    backgroundColor: string | null;
    textColor:      string | null;
    mutedTextColor: string | null;
    headingFontFamily: string | null;
    bodyFontFamily:    string | null;
    logoUrl:        string | null;
    companyName:    string | null;
  }> {
    const kit = await this.findOne(id, userId);
    const t   = (kit.tokens as BrandTokens | null) || {};
    const c   = t.colors || {};
    const typ = t.typography || {};
    const ident = (kit.identity as BrandIdentity | null) || {};
    return {
      primaryColor:    c.primary   ?? kit.primaryColor   ?? null,
      secondaryColor:  c.secondary ?? kit.secondaryColor ?? null,
      accentColor:     c.accent    ?? null,
      backgroundColor: c.neutral   ?? '#FFFFFF',
      textColor:       null,
      mutedTextColor:  null,
      headingFontFamily: typ.heading?.family ?? kit.fontFamily ?? null,
      bodyFontFamily:    typ.body?.family    ?? kit.fontFamily ?? null,
      logoUrl:        kit.logo || null,
      companyName:    ident.companyName || null,
    };
  }

  // ---------------------------------------------------------------------------
  //  Helpers
  // ---------------------------------------------------------------------------

  /** Pick a sensible default workspaceId for legacy single-arg calls. */
  private async defaultWorkspaceFor(userId: string): Promise<string | null> {
    const m = await this.prisma.workspaceMember.findFirst({
      where:  { userId },
      select: { workspaceId: true },
      orderBy: { joinedAt: 'asc' },
    });
    return m?.workspaceId ?? null;
  }
}

// =============================================================================
//  Phase 37.1E — Export payload contract
// =============================================================================

export interface BrandKitExportV1 {
  $schema:        'pitchonix.brand-kit';
  version:        1;
  name:           string;
  description?:   string | null;
  identity?:      BrandIdentity;
  voice?:         BrandVoice;
  tokens?:        BrandTokens;
  logo?:          string | null;
  primaryColor?:  string | null;
  secondaryColor?: string | null;
  fontFamily?:    string | null;
  assets:         Array<{
    kind:     string;
    url:      string;
    mimeType: string | null;
    width:    number | null;
    height:   number | null;
    alt:      string | null;
  }>;
  exportedAt:     string;
}

// =============================================================================
//  Helpers (file-scope so audit + rebrand methods share)
// =============================================================================

function brandChartPalette(tokens: BrandTokens, primary?: string | null, secondary?: string | null): string[] {
  if (tokens.chart?.palette && tokens.chart.palette.length > 0) return tokens.chart.palette;
  const c = tokens.colors || {};
  const out: string[] = [];
  for (const v of [c.primary, c.secondary, c.accent, c.success, c.warning, c.danger, c.neutral, primary, secondary]) {
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}
