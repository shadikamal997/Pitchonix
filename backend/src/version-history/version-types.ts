// =============================================================================
//  Version History types — Phase 35
//
//  Mirrored at frontend/types/deck-version.ts. Keep in sync.
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
  | 'SAFETY'                       // before destructive operations
  // Phase 36.1C — review lifecycle markers (DB column is `String`, so no
  // migration needed; these are just well-known names the UI can recognise).
  | 'REVIEW_REQUESTED'
  | 'REVIEW_STARTED'
  | 'REVIEW_APPROVED'
  | 'REVIEW_CHANGES_REQUESTED'
  | 'COMMENTS_RESOLVED_ALL';

export const VERSION_TYPES: DeckVersionType[] = [
  'AUTO_SAVE', 'MANUAL_SNAPSHOT', 'GENERATED', 'REGENERATED',
  'RESTORED', 'FAMILY_CHANGED', 'TEMPLATE_CHANGED', 'EXPORTED', 'SAFETY',
  'REVIEW_REQUESTED', 'REVIEW_STARTED', 'REVIEW_APPROVED',
  'REVIEW_CHANGES_REQUESTED', 'COMMENTS_RESOLVED_ALL',
];

/**
 * Full deck state captured at snapshot time. Stored on
 * `DeckVersion.snapshot` as JSON. Restore replays this into the DB.
 */
export interface DeckSnapshot {
  schemaVersion:   number;        // bump if shape changes incompatibly
  capturedAt:      string;        // ISO timestamp
  deck: {
    title:           string;
    description:     string | null;
    status:          string;
    masterSettings:  any | null;
    qualityScore:    any | null;
    validationResult: any | null;
    generationMetrics: any | null;
    exportReady:     boolean;
  };
  slides: Array<{
    type:            string;
    order:           number;
    title:           string;
    subtitle:        string | null;
    content:         any;
    layoutKey:       string | null;
    themeKey:        string | null;
    speakerNotes:    string | null;
    background:      any | null;
    themeTokens:     any | null;
    metadata:        any | null;
    elements: Array<{
      type:    string;
      name:    string | null;
      order:   number;
      x:       number; y: number; width: number; height: number;
      rotation: number; zIndex: number;
      locked:  boolean; visible: boolean;
      content: any; data: any; style: any;
      animations: any; accessibility: any;
    }>;
  }>;
  masters: Array<{
    type:        string;
    name:        string | null;
    x: number; y: number; width: number; height: number;
    rotation: number; zIndex: number; sendToFront: boolean;
    visible: boolean; excludedSlides: string[];
    elementData: any; style: any;
  }>;
  /** Component instances reference user-scoped components by id; restore is
   *  best-effort (will skip rows whose component has since been deleted). */
  componentInstances: Array<{
    componentId: string;
    slideOrder:  number;          // slide.order — restore re-resolves to slideId
    anchorX:     number; anchorY: number; scale: number; version: number;
  }>;
}

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

export interface CreateSnapshotInput {
  type?:        DeckVersionType;   // defaults to MANUAL_SNAPSHOT
  name?:        string;
  description?: string;
  userId?:      string;
}

/** Returned by compareVersions(a, b). */
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
