// =============================================================================
//  Version filter + search — Phase 35.1J/K
//
//  Pure functions. Kept out of the React component so they can be unit-tested
//  without a DOM and reused by future "version picker" surfaces (diff,
//  compare, etc.).
// =============================================================================

import type { DeckVersionDTO, DeckVersionType } from '@/types/deck-version';

export type VersionFilterMode = 'all' | DeckVersionType;

export const FILTER_MODES: VersionFilterMode[] = [
  'all',
  'AUTO_SAVE', 'MANUAL_SNAPSHOT', 'GENERATED', 'REGENERATED',
  'FAMILY_CHANGED', 'TEMPLATE_CHANGED', 'RESTORED',
];

export const FILTER_MODE_LABEL: Record<VersionFilterMode, string> = {
  all:              'All',
  AUTO_SAVE:        'Auto-save',
  MANUAL_SNAPSHOT:  'Manual',
  GENERATED:        'Generated',
  REGENERATED:      'Regenerated',
  RESTORED:         'Restored',
  FAMILY_CHANGED:   'Family',
  TEMPLATE_CHANGED: 'Template',
  EXPORTED:         'Exported',
  SAFETY:           'Safety',
};

/**
 * Apply a search term + filter mode to a versions list. Search matches
 * across name, description, and type (case-insensitive). Returns a new
 * array; never mutates input.
 */
export function filterVersions(
  versions: DeckVersionDTO[],
  query: string,
  mode: VersionFilterMode,
): DeckVersionDTO[] {
  let out = versions;
  if (mode !== 'all') {
    out = out.filter((v) => v.type === mode);
  }
  const q = query.trim().toLowerCase();
  if (q.length > 0) {
    out = out.filter((v) =>
      v.name.toLowerCase().includes(q) ||
      (v.description?.toLowerCase().includes(q) ?? false) ||
      v.type.toLowerCase().includes(q),
    );
  }
  return out;
}

/** Build a small histogram for badge counts on the filter chips. */
export function countByType(versions: DeckVersionDTO[]): Record<VersionFilterMode, number> {
  const out: Record<VersionFilterMode, number> = {
    all:              versions.length,
    AUTO_SAVE:        0, MANUAL_SNAPSHOT:  0,
    GENERATED:        0, REGENERATED:      0,
    RESTORED:         0,
    FAMILY_CHANGED:   0, TEMPLATE_CHANGED: 0,
    EXPORTED:         0, SAFETY:           0,
  };
  for (const v of versions) out[v.type] = (out[v.type] || 0) + 1;
  return out;
}
