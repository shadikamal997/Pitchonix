import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CvProfileDto, emptyProfile } from './cv-types';
import { sanitizeCvProfile, SanitizeReport } from './cv-profile-sanitizer';

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

  async get(profileId: string, userId?: string): Promise<CvProfileDto> {
    const row = userId
      ? await this.prisma.cvProfile.findFirst({ where: { id: profileId, userId } })
      : await this.prisma.cvProfile.findUnique({ where: { id: profileId } });
    if (!row) throw new NotFoundException('CvProfile not found');
    return toDto(row);
  }

  // ---------------------------------------------------------------------------
  //  Personal block
  // ---------------------------------------------------------------------------

  async patchPersonal(profileId: string, patch: Partial<CvProfileDto['personal']>, userId?: string): Promise<CvProfileDto> {
    const cur = await this.get(profileId, userId);
    const next = { ...(cur.personal || {}), ...patch };
    return this.write(profileId, { personal: next as any });
  }

  // ---------------------------------------------------------------------------
  //  Section CRUD (experience / education / skills / languages / projects /
  //                certifications / awards / publications / references)
  // ---------------------------------------------------------------------------

  async addSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, item: any, userId?: string,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId, userId);
    const list = ((cur as any)[section] as any[]) || [];
    const id = item.id || makeId(section);
    list.push({ ...item, id });
    return this.write(profileId, { [section]: list as any } as any);
  }

  async updateSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, itemId: string, patch: any, userId?: string,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId, userId);
    const list = ((cur as any)[section] as any[]) || [];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) throw new NotFoundException(`Item ${itemId} not found in ${String(section)}`);
    list[idx] = { ...list[idx], ...patch, id: list[idx].id };
    return this.write(profileId, { [section]: list as any } as any);
  }

  async removeSectionItem<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, itemId: string, userId?: string,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId, userId);
    const list = (((cur as any)[section] as any[]) || []).filter((i) => i.id !== itemId);
    return this.write(profileId, { [section]: list as any } as any);
  }

  async reorderSection<K extends Exclude<keyof CvProfileDto, 'id'|'userId'|'personal'|'importSource'|'importedAt'|'createdAt'|'updatedAt'>>(
    profileId: string, section: K, orderedIds: string[], userId?: string,
  ): Promise<CvProfileDto> {
    const cur = await this.get(profileId, userId);
    const list = ((cur as any)[section] as any[]) || [];
    const map = new Map(list.map((i) => [i.id, i]));
    const next = orderedIds.map((id) => map.get(id)).filter(Boolean);
    // Append any items not present in the ordered list to the tail.
    for (const item of list) if (!orderedIds.includes(item.id)) next.push(item);
    return this.write(profileId, { [section]: next as any } as any);
  }

  // ---------------------------------------------------------------------------
  //  Repair corrupted profile (Phase Ω.4A)
  // ---------------------------------------------------------------------------

  async repair(profileId: string, userId?: string): Promise<{ profile: CvProfileDto; report: SanitizeReport }> {
    const cur = await this.get(profileId, userId);
    const { profile: sanitized, report } = sanitizeCvProfile(cur);
    if (!report.anyChange) return { profile: cur, report };
    const saved = await this.write(profileId, {
      personal:   sanitized.personal    as any,
      experience: sanitized.experience  as any,
      education:  sanitized.education   as any,
      skills:     sanitized.skills      as any,
    });
    return { profile: saved, report };
  }

  // ---------------------------------------------------------------------------
  //  Bulk replace (used by the LinkedIn / DOCX / PDF importer).
  // ---------------------------------------------------------------------------

  async replaceFromImport(profileId: string, source: 'linkedin'|'docx'|'pdf', payload: Partial<CvProfileDto>): Promise<CvProfileDto> {
    // Phase 43.1C — IMPROVED REPLACE WITH MERGE FALLBACK.
    //
    // If the import payload has populated sections, we use those.
    // If a section is explicitly empty ([]) in the payload, we preserve the existing data
    // from the database as a fallback - this prevents data loss when the parser fails.
    //
    // Only if a section has actual content in the payload do we replace it.
    const currentProfile = await this.get(profileId);
    
    const sanitized = sanitizeCvProfile({
      ...(payload as any),
      id: profileId,
      userId: currentProfile.userId,
      personal: (payload as any).personal ?? currentProfile.personal,
      experience: (payload as any).experience ?? [],
      education: (payload as any).education ?? [],
      skills: (payload as any).skills ?? [],
      languages: (payload as any).languages ?? [],
      projects: (payload as any).projects ?? [],
      certifications: (payload as any).certifications ?? [],
      awards: (payload as any).awards ?? [],
      publications: (payload as any).publications ?? [],
      references: (payload as any).references ?? [],
      importSource: source,
      importedAt: null,
      createdAt: currentProfile.createdAt,
      updatedAt: currentProfile.updatedAt,
    }).profile;

    const data: any = {
      importSource: source,
      importedAt:   new Date(),
      // Section arrays — use payload if it has content, otherwise preserve existing
      experience:     sanitized.experience?.length ? sanitized.experience : currentProfile.experience,
      education:      sanitized.education?.length ? sanitized.education : currentProfile.education,
      skills:         sanitized.skills?.length ? sanitized.skills : currentProfile.skills,
      languages:      ((payload as any).languages?.length ? sanitized.languages : currentProfile.languages) ?? [],
      projects:       ((payload as any).projects?.length ? (payload as any).projects : currentProfile.projects) ?? [],
      certifications: ((payload as any).certifications?.length ? (payload as any).certifications : currentProfile.certifications) ?? [],
      awards:         ((payload as any).awards?.length ? (payload as any).awards : currentProfile.awards) ?? [],
      publications:   ((payload as any).publications?.length ? (payload as any).publications : currentProfile.publications) ?? [],
      references:     ((payload as any).references?.length ? (payload as any).references : currentProfile.references) ?? [],
    };
    // Personal - merge with existing data to preserve photo/location
    if ('personal' in payload) {
      data.personal = { ...currentProfile.personal, ...sanitized.personal };
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
