// =============================================================================
//  Slide Element Types — single source of truth
//
//  Mirrored at frontend/types/slide-element.ts (kept in sync manually for now;
//  consider a codegen step in a later phase).
// =============================================================================

export type ElementType =
  // Text
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'quote'
  | 'caption'
  | 'label'
  | 'cta'
  | 'footer'
  | 'pageNumber'
  // Lists (each item editable individually via items[])
  | 'bulletList'
  | 'numberedList'
  // Data
  | 'metric'
  | 'kpi'
  | 'chart'
  | 'table'
  // Media
  | 'image'
  | 'icon'
  | 'logo'
  | 'videoPlaceholder'
  | 'embeddedMediaPlaceholder'
  // Composite blocks
  | 'testimonial'
  | 'teamCard'
  | 'pricingCard'
  | 'comparison'
  | 'swot'
  | 'featureGrid'
  | 'processSteps'
  | 'timeline'
  | 'roadmap'
  // Shapes / decor
  | 'shape'
  | 'line'
  | 'divider';

export const ELEMENT_TYPES: ElementType[] = [
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label', 'cta', 'footer', 'pageNumber',
  'bulletList', 'numberedList',
  'metric', 'kpi', 'chart', 'table',
  'image', 'icon', 'logo', 'videoPlaceholder', 'embeddedMediaPlaceholder',
  'testimonial', 'teamCard', 'pricingCard', 'comparison', 'swot', 'featureGrid', 'processSteps',
  'timeline', 'roadmap',
  'shape', 'line', 'divider',
];

// =============================================================================
//  Polymorphic content shapes (one per element type).
//  Persisted in SlideElement.content / data — both are JSONB so any extension
//  is non-breaking.
// =============================================================================

// Text-ish content shapes
export interface TextContent       { text: string; html?: string }
export interface ListItem          { id: string; text: string; html?: string }
export interface BulletListContent { items: ListItem[]; marker?: 'dot' | 'dash' | 'square' | 'custom'; customMarker?: string }
export interface NumberedListContent { items: ListItem[]; start?: number; style?: 'decimal' | 'lower-alpha' | 'upper-roman' }

export interface QuoteContent       { text: string; attribution?: string; role?: string }
export interface TestimonialContent { quote: string; author: string; role?: string; company?: string; avatarUrl?: string; logoUrl?: string }
export interface CTAContent         { text: string; href?: string; variant?: 'primary' | 'secondary' | 'outline' }

// Numeric / KPI
export interface MetricContent { value: string; label: string; unit?: string; delta?: string; deltaDirection?: 'up' | 'down' | 'flat'; icon?: string }
export interface KpiContent    { value: string; label: string; sublabel?: string; series?: number[]; trendDirection?: 'up' | 'down' | 'flat' }

// Chart
export type ChartKind = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'kpi' | 'comparison';
export interface ChartSeries  { name: string; values: number[]; color?: string }
export interface ChartContent {
  type: ChartKind;
  title?: string;
  categories: string[];     // x-axis labels
  series: ChartSeries[];    // 1..n series; pie/donut uses series[0]
  axes?: { x?: string; y?: string };
  legend?: { visible: boolean; position?: 'top' | 'bottom' | 'left' | 'right' };
  showValues?: boolean;
  showGrid?: boolean;
}

// Table
export interface TableCell  { text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; fill?: string; color?: string; colspan?: number; rowspan?: number }
export interface TableContent {
  headers: TableCell[];
  rows:    TableCell[][];   // row-major
  borders?: { color?: string; width?: number; style?: 'solid' | 'dashed' | 'none' };
  zebra?:   boolean;
}

// Media
export interface ImageContent {
  src: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  focalX?: number;          // 0..1
  focalY?: number;          // 0..1
  crop?: { x: number; y: number; width: number; height: number }; // 0..1
  filters?: { blur?: number; brightness?: number; saturate?: number; grayscale?: number };
  borderRadius?: number;    // px
  shadow?: string;
}
export interface IconContent { name: string; library?: 'lucide' | 'custom'; color?: string; strokeWidth?: number }
export interface LogoContent { src?: string; name?: string; height?: number }
export interface VideoPlaceholderContent { posterUrl?: string; caption?: string; durationLabel?: string }
export interface EmbedPlaceholderContent  { providerLabel?: string; caption?: string; aspect?: '16:9' | '4:3' | '1:1' }

// Composite blocks
export interface TimelineItem    { id: string; date?: string; title: string; description?: string; status?: 'done' | 'active' | 'planned' }
export interface TimelineContent { items: TimelineItem[]; orientation?: 'horizontal' | 'vertical' }
export interface RoadmapPhase   { id: string; phase: string; period?: string; bullets?: string[] }
export interface RoadmapContent { phases: RoadmapPhase[] }

export interface TeamMember     { id: string; name: string; role?: string; bio?: string; photoUrl?: string; linkedin?: string }
export interface TeamCardContent  { members: TeamMember[]; layout?: 'grid' | 'list' }

export interface PricingTier     { id: string; name: string; price: string; period?: string; features: string[]; highlight?: boolean; ctaText?: string; ctaHref?: string }
export interface PricingCardContent { tiers: PricingTier[] }

export interface ComparisonRow   { feature: string; values: string[] }   // values aligned to columns
export interface ComparisonContent { columns: string[]; rows: ComparisonRow[]; highlightColumn?: number }

export interface SwotContent     { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }

export interface FeatureGridItem    { id: string; title: string; description?: string; icon?: string }
export interface FeatureGridContent { items: FeatureGridItem[]; columns?: 2 | 3 | 4 }

export interface ProcessStep       { id: string; title: string; description?: string; icon?: string }
export interface ProcessStepsContent { steps: ProcessStep[]; orientation?: 'horizontal' | 'vertical' }

// Shape / decoration
export type ShapeKind = 'rect' | 'roundedRect' | 'circle' | 'ellipse' | 'triangle' | 'arrow' | 'star';
export interface ShapeContent { kind: ShapeKind; fill?: string; stroke?: string; strokeWidth?: number; gradient?: GradientStyle }
export interface LineContent  { stroke: string; strokeWidth: number; dashed?: boolean }
export interface DividerContent { stroke?: string; strokeWidth?: number; label?: string }

// Footer / page number
export interface FooterContent     { text: string }
export interface PageNumberContent { format?: 'numeric' | 'pageOfTotal' }

// =============================================================================
//  Style — visual properties shared across element types.
// =============================================================================

export interface GradientStop  { color: string; offset: number /* 0..1 */ }
export interface GradientStyle { kind: 'linear' | 'radial'; stops: GradientStop[]; angle?: number /* deg, linear only */ }

export interface ElementStyle {
  // Background / fill
  fill?:        string;        // solid color or 'transparent'
  gradient?:    GradientStyle;
  opacity?:     number;        // 0..1

  // Stroke
  stroke?:      string;
  strokeWidth?: number;

  // Box
  borderRadius?: number;
  shadow?:      string;        // CSS box-shadow

  // Padding (within the element's box, e.g. text padding)
  paddingTop?:    number;
  paddingRight?:  number;
  paddingBottom?: number;
  paddingLeft?:   number;

  // Typography (applied to text-type elements)
  fontFamily?:     string;
  fontSize?:       number;     // px
  fontWeight?:     number | 'normal' | 'bold';
  fontStyle?:      'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?:  'none' | 'uppercase' | 'lowercase' | 'capitalize';
  color?:          string;
  highlightColor?: string;
  lineHeight?:     number;
  letterSpacing?:  number;
  textAlign?:      'left' | 'center' | 'right' | 'justify';
  textShadow?:     string;

  // Lists
  listIndent?:     number;
  listGap?:        number;
}

// =============================================================================
//  Animation + accessibility — both optional, expandable per element
// =============================================================================

export interface ElementAnimation {
  enter?: { type: 'fade' | 'slide' | 'scale' | 'none'; durationMs?: number; delayMs?: number; direction?: 'up' | 'down' | 'left' | 'right' };
  exit?:  { type: 'fade' | 'slide' | 'scale' | 'none'; durationMs?: number };
}

export interface ElementAccessibility {
  altText?:   string;          // for images / charts
  role?:      string;
  ariaLabel?: string;
}

// =============================================================================
//  The wire-level element shape (what the API returns and the editor edits)
// =============================================================================

export interface SlideElementDTO {
  id:        string;
  slideId:   string;
  type:      ElementType;
  name:      string | null;
  order:     number;

  x:         number;           // 0..100 (% of slide width)
  y:         number;           // 0..100 (% of slide height)
  width:     number;
  height:    number;
  rotation:  number;
  zIndex:    number;

  locked:    boolean;
  visible:   boolean;

  content:        Record<string, any> | null;
  data:           Record<string, any> | null;
  style:          ElementStyle | null;
  animations:     ElementAnimation | null;
  accessibility:  ElementAccessibility | null;

  createdAt: string;
  updatedAt: string;
}

// =============================================================================
//  Slide-level extras (also editable in Phase 1)
// =============================================================================

export interface SlideBackground {
  type:    'solid' | 'gradient' | 'image';
  color?:  string;
  gradient?: GradientStyle;
  image?:  { src: string; fit?: 'cover' | 'contain' };
  opacity?: number;
}

export interface SlideThemeTokens {
  primary?:    string;
  secondary?:  string;
  accent?:     string;
  text?:       string;
  muted?:      string;
  surface?:    string;
  background?: string;
  fontHeading?: string;
  fontBody?:    string;
}
