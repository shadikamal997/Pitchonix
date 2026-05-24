// =============================================================================
//  Deck Version types — Phase 35 (frontend mirror)
//
//  Mirrors backend/src/version-history/version-types.ts.
// =============================================================================

export type DeckVersionType =
  | 'AUTO_SAVE'
  | 'MANUAL_SNAPSHOT'
  | 'GENERATED'
  | 'REGENERATED'
  | 'RESTORED'
  | 'FAMILY_CHANGED'
  | 'TEMPLATE_CHANGED'
  | 'EXPORTED'
  | 'SAFETY';

export const VERSION_TYPE_LABEL: Record<DeckVersionType, string> = {
  AUTO_SAVE:        'Auto-save',
  MANUAL_SNAPSHOT:  'Manual',
  GENERATED:        'Generated',
  REGENERATED:      'Regenerated',
  RESTORED:         'Restored',
  FAMILY_CHANGED:   'Family changed',
  TEMPLATE_CHANGED: 'Template changed',
  EXPORTED:         'Exported',
  SAFETY:           'Safety',
};

export interface DeckVersionDTO {
  id:            string;
  deckId:        string;
  userId:        string | null;
  name:          string;
  description:   string | null;
  type:          DeckVersionType;
  slideCount:    number;
  qualityScore:  number | null;
  familyId:      string | null;
  templateId:    string | null;
  createdAt:     string;
}

export interface VersionDiff {
  summary: {
    slidesAdded:     number;
    slidesRemoved:   number;
    slidesReordered: number;
    elementsAdded:   number;
    elementsRemoved: number;
    textEdits:       number;
    familyChanged:   boolean;
    templateChanged: boolean;
    masterCountDelta: number;
  };
  details: {
    addedSlides:     Array<{ order: number; title: string; type: string }>;
    removedSlides:   Array<{ order: number; title: string; type: string }>;
    reorderedSlides: Array<{ title: string; from: number; to: number }>;
    fromFamily?:     string;
    toFamily?:       string;
  };
}
