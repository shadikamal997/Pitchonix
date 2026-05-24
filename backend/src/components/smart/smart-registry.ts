// =============================================================================
//  Smart Component Registry — Phase 32.75 Tier 3
//
//  Enumerates every (family × type) combination and returns a SmartComponentDTO
//  for each. Trees are generated lazily — the registry doesn't cache by default
//  because the tokens may change at runtime (theme inspector edits, etc); the
//  per-call cost is microseconds.
//
//  An optional in-process cache is exposed via `withCache()` for hot paths
//  that fetch the same (family, type) repeatedly (e.g. the library list call).
// =============================================================================

import {
  SmartComponentDTO, SmartComponentType, SmartFamilyId,
  SMART_COMPONENT_TYPES, SMART_FAMILIES,
  SMART_TYPE_LABEL, SMART_FAMILY_LABEL, SMART_TYPE_CATEGORY, SMART_TYPE_USE_CASE,
} from './smart-types';
import { getFamilyTokens, FamilyTokens } from './family-tokens';
import { buildSmartComponentTree } from './smart-builder';

function describe(family: SmartFamilyId, type: SmartComponentType): string {
  const familyLabel = SMART_FAMILY_LABEL[family];
  const typeLabel   = SMART_TYPE_LABEL[type];
  return `${typeLabel} themed for the ${familyLabel} family.`;
}

function buildOne(family: SmartFamilyId, type: SmartComponentType): SmartComponentDTO {
  const tokens: FamilyTokens = getFamilyTokens(family);
  const tree = buildSmartComponentTree({ tokens }, type);
  return {
    id:          `smart:${family}:${type}`,
    family,
    type,
    name:        `${SMART_TYPE_LABEL[type]} · ${SMART_FAMILY_LABEL[family]}`,
    description: describe(family, type),
    category:    SMART_TYPE_CATEGORY[type],
    useCase:     SMART_TYPE_USE_CASE[type],
    tags:        ['smart', tokens.mood, family, type],
    thumbnail:   null, // generated client-side or via a future thumbnail service
    elementTree: tree,
  };
}

export class SmartComponentRegistry {
  /** Cache keyed by `${family}:${type}`. Empty until populated. */
  private cache = new Map<string, SmartComponentDTO>();

  /** Returns every smart component across every family. 8 × 20 = 160. */
  listAll(): SmartComponentDTO[] {
    const out: SmartComponentDTO[] = [];
    for (const family of SMART_FAMILIES) {
      for (const type of SMART_COMPONENT_TYPES) {
        out.push(this.getOne(family, type));
      }
    }
    return out;
  }

  /** All components for a single family. */
  listForFamily(family: SmartFamilyId): SmartComponentDTO[] {
    return SMART_COMPONENT_TYPES.map((t) => this.getOne(family, t));
  }

  /** All variants of one type across every family (Part H — comparison). */
  listForType(type: SmartComponentType): SmartComponentDTO[] {
    return SMART_FAMILIES.map((f) => this.getOne(f, type));
  }

  /** Get one. Returns the cached copy when warm; otherwise builds + caches. */
  getOne(family: SmartFamilyId, type: SmartComponentType): SmartComponentDTO {
    const key = `${family}:${type}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const dto = buildOne(family, type);
    this.cache.set(key, dto);
    return dto;
  }

  /** Bust the cache (e.g. after a family-tokens edit at runtime). */
  invalidate(family?: SmartFamilyId) {
    if (!family) { this.cache.clear(); return; }
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(`${family}:`)) this.cache.delete(key);
    }
  }
}

/** Singleton — controllers + scripts can share one cache. */
export const smartRegistry = new SmartComponentRegistry();
