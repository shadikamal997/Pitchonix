// =============================================================================
//  Master Element Types — Phase 32.75
//
//  Mirrored at frontend/types/master-element.ts (kept in sync manually).
// =============================================================================

import type { ElementStyle } from '../slides/element-types';

/** Canonical master families. `custom` is an escape hatch for ad-hoc decoration. */
export type MasterElementType =
  | 'logo'
  | 'companyName'
  | 'header'
  | 'footer'
  | 'pageNumber'
  | 'date'
  | 'copyright'
  | 'watermark'
  | 'backgroundShape'
  | 'backgroundImage'
  | 'brandBanner'
  | 'contact'
  | 'confidential'
  | 'custom';

export const MASTER_ELEMENT_TYPES: MasterElementType[] = [
  'logo', 'companyName', 'header', 'footer', 'pageNumber',
  'date', 'copyright', 'watermark', 'backgroundShape', 'backgroundImage',
  'brandBanner', 'contact', 'confidential', 'custom',
];

/**
 * Free-form content payload. Each MasterElementType has a recommended shape:
 *
 *   logo            { src }
 *   companyName     { text }
 *   header / footer { text } — supports tokens {page}, {total}, {date}, {company}
 *   pageNumber      { format: 'page' | 'pageOfTotal' }
 *   date            { format?: 'short' | 'long' | 'iso' }
 *   copyright       { text }
 *   watermark       { text, opacity? }
 *   backgroundShape { kind, fill, ... }     (matches ShapeContent)
 *   backgroundImage { src, fit?: 'cover' | 'contain' }
 *   brandBanner     { text, color? }
 *   contact         { email?, phone?, web? }
 *   confidential    { text } — defaults to "CONFIDENTIAL"
 *   custom          unrestricted
 */
export type MasterElementContent = Record<string, any>;

export interface MasterElementDTO {
  id:        string;
  deckId:    string;
  type:      MasterElementType;
  name?:     string | null;
  x:         number;
  y:         number;
  width:     number;
  height:    number;
  rotation:  number;
  zIndex:    number;
  sendToFront: boolean;
  visible:   boolean;
  excludedSlides: string[];
  elementData: MasterElementContent | null;
  style:     ElementStyle | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Deck-wide on/off switches for the canonical master families. When a switch
 * is false, every master row of that family is suppressed during render even
 * if `visible` is true on the row. Lets users toggle "no page numbers in this
 * deck" without deleting the master.
 */
export interface DeckMasterSettings {
  showPageNumbers?: boolean;
  showLogo?:        boolean;
  showFooter?:      boolean;
  showHeader?:      boolean;
  showDate?:        boolean;
  showWatermark?:   boolean;
}

export const DEFAULT_MASTER_SETTINGS: Required<DeckMasterSettings> = {
  showPageNumbers: true,
  showLogo:        true,
  showFooter:      true,
  showHeader:      true,
  showDate:        true,
  showWatermark:   true,
};

/**
 * Map MasterElementType → DeckMasterSettings flag that gates it. Types not in
 * this map are always rendered (subject to per-row `visible`).
 */
export const MASTER_SETTING_FOR_TYPE: Partial<Record<MasterElementType, keyof DeckMasterSettings>> = {
  logo:        'showLogo',
  footer:      'showFooter',
  header:      'showHeader',
  pageNumber:  'showPageNumbers',
  date:        'showDate',
  watermark:   'showWatermark',
};
