// =============================================================================
//  Phase 32F — Slide sections
//
//  Sections are a *logical* grouping of slides. They are stored without a
//  Prisma migration:
//
//    deck.metadata.sections  : Section[]          (the catalog — ids + names)
//    slide.metadata.sectionId: string | null      (assignment)
//
//  The sidebar renders the catalog in catalog order, with each section's
//  member slides nested underneath. Slides with no assignment land in the
//  pseudo-section "Unsectioned" at the top of the list.
//
//  All mutations are batched through the existing /api/decks/:id and
//  /api/slides/:id endpoints — no new backend code.
// =============================================================================

export interface Section {
  id:        string;
  name:      string;
  collapsed?: boolean;
}

export interface SlideMetadata {
  sectionId?: string | null;
  // other free-form keys remain untouched
  [k: string]: any;
}

export interface DeckMetadata {
  sections?: Section[];
  // other free-form keys remain untouched
  [k: string]: any;
}

// =============================================================================
//  Catalog helpers — operate on a DeckMetadata blob.
// =============================================================================

export function getSections(meta: DeckMetadata | null | undefined): Section[] {
  const arr = meta?.sections;
  return Array.isArray(arr) ? arr : [];
}

export function withSection(meta: DeckMetadata | null | undefined, section: Section): DeckMetadata {
  const sections = getSections(meta).slice();
  const idx = sections.findIndex((s) => s.id === section.id);
  if (idx >= 0) sections[idx] = { ...sections[idx], ...section };
  else          sections.push(section);
  return { ...(meta || {}), sections };
}

export function withoutSection(meta: DeckMetadata | null | undefined, sectionId: string): DeckMetadata {
  const sections = getSections(meta).filter((s) => s.id !== sectionId);
  return { ...(meta || {}), sections };
}

export function withSectionsReordered(meta: DeckMetadata | null | undefined, orderedIds: string[]): DeckMetadata {
  const map = new Map(getSections(meta).map((s) => [s.id, s]));
  const next: Section[] = [];
  for (const id of orderedIds) {
    const s = map.get(id);
    if (s) next.push(s);
  }
  // Append any sections not present in orderedIds (defensive)
  for (const s of getSections(meta)) {
    if (!orderedIds.includes(s.id)) next.push(s);
  }
  return { ...(meta || {}), sections: next };
}

export function toggleSectionCollapsed(meta: DeckMetadata | null | undefined, sectionId: string): DeckMetadata {
  const sections = getSections(meta).map((s) =>
    s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s,
  );
  return { ...(meta || {}), sections };
}

// =============================================================================
//  Slide-level helpers
// =============================================================================

export function sectionIdOf(slideMeta: SlideMetadata | null | undefined): string | null {
  const v = slideMeta?.sectionId;
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function assignSection(slideMeta: SlideMetadata | null | undefined, sectionId: string | null): SlideMetadata {
  const next = { ...(slideMeta || {}) };
  if (sectionId) next.sectionId = sectionId;
  else           delete next.sectionId;
  return next;
}

// =============================================================================
//  Grouping for the sidebar
// =============================================================================

export interface SidebarBucket<S extends { id: string }> {
  section: Section | null;        // null = "Unsectioned"
  slides:  S[];
}

/**
 * Group slides into buckets keyed by section catalog order. Slides without a
 * sectionId land in the leading "Unsectioned" bucket. Empty sections are still
 * included so the user can drop slides into them.
 */
export function bucketSlides<S extends { id: string; metadata?: any | null }>(
  slides:   S[],
  sections: Section[],
): SidebarBucket<S>[] {
  const buckets = new Map<string | null, S[]>();
  buckets.set(null, []);
  for (const s of sections) buckets.set(s.id, []);

  for (const slide of slides) {
    const sid = sectionIdOf(slide.metadata as SlideMetadata | null);
    const target = sid && buckets.has(sid) ? sid : null;
    buckets.get(target)!.push(slide);
  }

  const out: SidebarBucket<S>[] = [];
  // Always lead with the unsectioned bucket so newly created slides show up first.
  out.push({ section: null, slides: buckets.get(null)! });
  for (const sec of sections) {
    out.push({ section: sec, slides: buckets.get(sec.id) || [] });
  }
  return out;
}

export function newSectionId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}
