// =============================================================================
//  Master Element types — Phase 32.75
//
//  Frontend mirror of backend/src/master-elements/master-element-types.ts.
//  Keep in sync manually.
// =============================================================================

import type { ElementStyle } from './slide-element';

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

export const MASTER_SETTING_FOR_TYPE: Partial<Record<MasterElementType, keyof DeckMasterSettings>> = {
  logo:        'showLogo',
  footer:      'showFooter',
  header:      'showHeader',
  pageNumber:  'showPageNumbers',
  date:        'showDate',
  watermark:   'showWatermark',
};
