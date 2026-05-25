import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CvProfileDto, emptyProfile } from './cv-types';

// =============================================================================
//  Phase 42A — CvProfilesService.
//
//  One profile per user (idempotent getOrCreate). Section-level mutations
//  are deliberately granular so the frontend can patch a single experience
//  / skill / etc. without re-uploading the whole tree.
// =============================================================================

@Injectable()
export class CvProfilesService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  //  Lifecycle
  // ---------------------------------------------------------------------------

  async getOrCreate(userId: string): Promise<CvProfileDto> {
    let row = await this.prisma.cvProfile.findFirst({ where: { userId } });
    if (!row) {
      row = await this.prisma.cvProfile.create({ data: emptyProfile(userId) as any });
    }
    return toDto(row);
  }

  async get(profileId: string): Promise<CvProfileDto> {
    const row = await this.prisma.cvProfile.findUnique({ where: { id: profileId } });
    if (!row) throw new NotFoundException('CvProfile not found');
    return toDto(row);
  }

  // ---------------------------------------------------------------------------
  //  Personal block
  // ---------------------------------------------------------------------------

  async patchPersonal(profileId: string, patch: Partial<CvProfileDto['personal']>): Promise<CvProfileDto> {
    const cur = await this.get(profileId);
    const next = { ...(cur.personal || {}), ...patch };
    return this.write(profileId, { personal: next as any });
  }

  // ---------------------------------------------------------------------------
  //  Section CRUD (experience / education / skills / languages / projects /
  //                certifications / awards / publications / references)
  // ---------------------------------------------------------------------------

  async addSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, item: any,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId);
    const list = ((cur as any)[section] as any[]) || [];
    const id = item.id || makeId(section);
    list.push({ ...item, id });
    return this.write(profileId, { [section]: list as any } as any);
  }

  async updateSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, itemId: string, patch: any,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId);
    const list = ((cur as any)[section] as any[]) || [];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) throw new NotFoundException(`Item ${itemId} not found in ${String(section)}`);
    list[idx] = { ...list[idx], ...patch, id: list[idx].id };
    return this.write(profileId, { [section]: list as any } as any);
  }

  async removeSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, itemId: string,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId);
    const list = (((cur as any)[section] as any[]) || []).filter((i) => i.id !== itemId);
    return this.write(profileId, { [section]: list as any } as any);
  }

  async reorderSection<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, orderedIds: string[],
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId);
    const list = ((cur as any)[section] as any[]) || [];
    const map = new Map(list.map((i) => [i.id, i]));
    const next = orderedIds.map((id) => map.get(id)).filter(Boolean);
    // Append any items not present in the ordered list to the tail.
    for (const item of list) if (!orderedIds.includes(item.id)) next.push(item);
    return this.write(profileId, { [section]: next as any } as any);
  }

  // ---------------------------------------------------------------------------
  //  Bulk replace (used by the LinkedIn / DOCX / PDF importer).
  // ---------------------------------------------------------------------------

  async replaceFromImport(profileId: string, source: 'linkedin'|'docx'|'pdf', payload: Partial<CvProfileDto>): Promise<CvProfileDto> {
    // Phase 43.1B — TRUE REPLACE.
    //
    // Previously this loop only wrote keys that were present in `payload`,
    // which left stale values in the DB whenever an import failed to
    // extract a particular section. That caused the visible contradiction
    // the user reported on 43.1B: counts (from DB) showed "Experience 2"
    // while the bands (from this run's payload) showed 0 — both were
    // "correct" given their data sources, but they disagreed.
    //
    // The import is the source of truth for the imported sections: any
    // section not present in `payload` is reset to its empty default so
    // counts, detected[], bands and the saved profile all agree.
    const data: any = {
      importSource: source,
      importedAt:   new Date(),
      // Section arrays — default to [] when the import didn't produce one.
      experience:     (payload.experience     as any) ?? [],
      education:      (payload.education      as any) ?? [],
      skills:         (payload.skills         as any) ?? [],
      languages:      ((payload as any).languages     as any) ?? [],
      projects:       ((payload as any).projects      as any) ?? [],
      certifications: ((payload as any).certifications as any) ?? [],
      awards:         ((payload as any).awards         as any) ?? [],
      publications:   ((payload as any).publications   as any) ?? [],
      references:     ((payload as any).references     as any) ?? [],
    };
    // Personal stays a merge: name/email/etc parsed across multiple lines
    // and we don't want to clobber a previously-saved photo or location
    // when the new file doesn't repeat that information.
    if ('personal' in payload) {
      data.personal = payload.personal ?? {};
    }
    const row = await this.prisma.cvProfile.update({ where: { id: profileId }, data });
    return toDto(row);
  }

  // ---------------------------------------------------------------------------
  //  Internals
  // ---------------------------------------------------------------------------

  private async write(profileId: string, data: any): Promise<CvProfileDto> {
    const row = await this.prisma.cvProfile.update({ where: { id: profileId }, data });
    return toDto(row);
  }
}

function makeId(prefix: string | symbol): string {
  return `${String(prefix).slice(0, 4)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function toDto(row: any): CvProfileDto {
  return {
    id:         row.id,
    userId:     row.userId,
    personal:   (row.personal as any) ?? null,
    experience: (row.experience    as any[]) ?? [],
    education:  (row.education     as any[]) ?? [],
    skills:     (row.skills        as any[]) ?? [],
    languages:  (row.languages     as any[]) ?? [],
    projects:   (row.projects      as any[]) ?? [],
    certifications: (row.certifications as any[]) ?? [],
    awards:        (row.awards         as any[]) ?? [],
    publications:  (row.publications   as any[]) ?? [],
    references:    (row.references     as any[]) ?? [],
    importSource:  row.importSource ?? null,
    importedAt:    row.importedAt?.toISOString() ?? null,
    createdAt:     row.createdAt.toISOString(),
    updatedAt:     row.updatedAt.toISOString(),
  };
}
