// =============================================================================
//  Phase 37 — Brand Kit types (frontend mirror of backend models)
// =============================================================================

export interface BrandTokens {
  colors?: Partial<{
    primary: string; secondary: string; accent: string;
    success: string; warning: string; danger: string; neutral: string;
  }>;
  typography?: Partial<{
    heading: BrandFontSetting;
    body:    BrandFontSetting;
    caption: BrandFontSetting;
  }>;
  tokens?: Partial<{
    borderRadius:   number;
    shadowStyle:    'none' | 'subtle' | 'pronounced';
    spacingScale:   number;
    containerWidth: number;
    buttonStyle:    'pill' | 'square' | 'rounded';
  }>;
  chart?: Partial<{
    palette:     string[];
    axisColor:   string;
    gridColor:   string;
    legendStyle: 'inline' | 'side' | 'bottom';
  }>;
  icon?: Partial<{
    style: 'outline' | 'filled' | 'rounded' | 'sharp' | 'duotone';
  }>;
  image?: Partial<{
    style:      string;
    prompts:    string[];
    moodboards: string[];
  }>;
}

export interface BrandFontSetting {
  family:         string;
  weight?:        number;
  lineHeight?:    number;
  letterSpacing?: number;
}

export interface BrandVoice {
  tone?:     string;
  voice?:    string;
  rules?:    string[];
  examples?: string[];
}

export interface BrandIdentity {
  companyName?: string;
  tagline?:     string;
  mission?:     string;
  vision?:      string;
  website?:     string;
}

export type BrandAssetKind =
  | 'logo_primary' | 'logo_secondary' | 'logo_mono' | 'logo_dark' | 'logo_light'
  | 'icon_mark' | 'favicon' | 'image';

export interface BrandAssetDTO {
  id:         string;
  brandKitId: string;
  kind:       BrandAssetKind;
  url:        string;
  mimeType:   string | null;
  width:      number | null;
  height:     number | null;
  alt:        string | null;
  createdAt:  string;
  updatedAt:  string;
}

export interface BrandKitDTO {
  id:             string;
  userId:         string;
  workspaceId:    string | null;
  name:           string;
  description:    string | null;
  isDefault:      boolean;
  logo:           string | null;
  primaryColor:   string | null;
  secondaryColor: string | null;
  fontFamily:     string | null;
  config:         Record<string, any> | null;
  tokens:         BrandTokens   | null;
  voice:          BrandVoice    | null;
  identity:       BrandIdentity | null;
  createdAt:      string;
  updatedAt:      string;
  assets:         BrandAssetDTO[];
}

// =============================================================================
//  Brand audit
// =============================================================================

export type AuditCategory = 'colors' | 'typography' | 'logos' | 'charts' | 'components';
export type AuditSeverity = 'info' | 'warning' | 'error';

export interface AuditIssue {
  severity:  AuditSeverity;
  category:  AuditCategory;
  slideId?:  string;
  elementId?: string;
  message:   string;
  fixHint?:  string;
}

export interface BrandAuditReport {
  deckId:    string;
  brandKitId: string | null;
  score:     number;
  categories: Record<AuditCategory, number>;
  issues:    AuditIssue[];
  recommendations: string[];
  generatedAt: string;
}
