import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MasterElementDTO, MasterElementType, MasterElementContent,
  DeckMasterSettings, DEFAULT_MASTER_SETTINGS,
} from './master-element-types';
import type { ElementStyle } from '../slides/element-types';

/**
 * MasterElementsService — Phase 32.75
 *
 * CRUD for deck-wide master elements + deck-level master settings. The render
 * pipeline (slide-export) calls `listForDeck` and merges the result into each
 * slide before rasterising; that's the only consumer that needs to know about
 * masters at all.
 */
@Injectable()
export class MasterElementsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Auth
  // ---------------------------------------------------------------------------
  async assertDeckOwnership(deckId: string, userId: string): Promise<void> {
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, project: { userId } },
      select: { id: true },
    });
    if (!deck) throw new ForbiddenException('No access to this deck');
  }

  // ---------------------------------------------------------------------------
  //  Read
  // ---------------------------------------------------------------------------
  async listForDeck(deckId: string): Promise<MasterElementDTO[]> {
    const rows = await this.prisma.masterElement.findMany({
      where: { deckId },
      orderBy: [{ zIndex: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDTO);
  }

  async getSettings(deckId: string): Promise<Required<DeckMasterSettings>> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: { masterSettings: true },
    });
    return mergeSettings(deck?.masterSettings as DeckMasterSettings | null);
  }

  // ---------------------------------------------------------------------------
  //  Mutate — masters
  // ---------------------------------------------------------------------------
  async create(deckId: string, body: Partial<MasterElementDTO>): Promise<MasterElementDTO> {
    if (!body.type) throw new NotFoundException('type is required');
    const row = await this.prisma.masterElement.create({
      data: {
        deckId,
        type:        body.type,
        name:        body.name ?? null,
        x:           body.x ?? 0,
        y:           body.y ?? 0,
        width:       body.width ?? 20,
        height:      body.height ?? 5,
        rotation:    body.rotation ?? 0,
        zIndex:      body.zIndex ?? 0,
        sendToFront: body.sendToFront ?? false,
        visible:     body.visible ?? true,
        excludedSlides: body.excludedSlides ?? [],
        elementData: (body.elementData ?? null) as any,
        style:       (body.style ?? null) as any,
      },
    });
    return toDTO(row);
  }

  async update(deckId: string, masterId: string, patch: Partial<MasterElementDTO>): Promise<MasterElementDTO> {
    const existing = await this.prisma.masterElement.findUnique({ where: { id: masterId } });
    if (!existing || existing.deckId !== deckId) throw new NotFoundException('Master element not found');
    const row = await this.prisma.masterElement.update({
      where: { id: masterId },
      data: {
        type:        patch.type ?? undefined,
        name:        patch.name ?? undefined,
        x:           patch.x ?? undefined,
        y:           patch.y ?? undefined,
        width:       patch.width ?? undefined,
        height:      patch.height ?? undefined,
        rotation:    patch.rotation ?? undefined,
        zIndex:      patch.zIndex ?? undefined,
        sendToFront: patch.sendToFront ?? undefined,
        visible:     patch.visible ?? undefined,
        excludedSlides: patch.excludedSlides ?? undefined,
        elementData: (patch.elementData as any) ?? undefined,
        style:       (patch.style as any) ?? undefined,
      },
    });
    return toDTO(row);
  }

  async remove(deckId: string, masterId: string): Promise<void> {
    const existing = await this.prisma.masterElement.findUnique({ where: { id: masterId } });
    if (!existing || existing.deckId !== deckId) throw new NotFoundException('Master element not found');
    await this.prisma.masterElement.delete({ where: { id: masterId } });
  }

  // ---------------------------------------------------------------------------
  //  Mutate — deck settings (Json column merge)
  // ---------------------------------------------------------------------------
  async updateSettings(deckId: string, patch: DeckMasterSettings): Promise<Required<DeckMasterSettings>> {
    const current = await this.getSettings(deckId);
    const next = { ...current, ...patch };
    await this.prisma.deck.update({
      where: { id: deckId },
      data: { masterSettings: next as any },
    });
    return next;
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function toDTO(row: any): MasterElementDTO {
  return {
    id:        row.id,
    deckId:    row.deckId,
    type:      row.type as MasterElementType,
    name:      row.name,
    x:         row.x,
    y:         row.y,
    width:     row.width,
    height:    row.height,
    rotation:  row.rotation,
    zIndex:    row.zIndex,
    sendToFront: row.sendToFront,
    visible:   row.visible,
    excludedSlides: row.excludedSlides || [],
    elementData: (row.elementData ?? null) as MasterElementContent | null,
    style:     (row.style ?? null) as ElementStyle | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mergeSettings(stored: DeckMasterSettings | null | undefined): Required<DeckMasterSettings> {
  return { ...DEFAULT_MASTER_SETTINGS, ...(stored || {}) };
}
