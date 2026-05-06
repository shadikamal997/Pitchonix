/**
 * Visual Layer Types
 * Defines charts, layouts, and visual elements
 */

/**
 * Chart Types
 */
export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  COLUMN = 'column',
  PIE = 'pie',
  DONUT = 'donut',
  AREA = 'area',
  SCATTER = 'scatter',
  FUNNEL = 'funnel',
  GAUGE = 'gauge',
}

/**
 * Chart Configuration
 */
export interface ChartConfig {
  type: ChartType;
  title?: string;
  data: ChartDataSeries[];
  options?: ChartOptions;
  width?: number;
  height?: number;
}

/**
 * Chart Data Series
 */
export interface ChartDataSeries {
  name: string;
  values: number[];
  labels?: string[];
  color?: string;
}

/**
 * Chart Options
 */
export interface ChartOptions {
  showLegend?: boolean;
  showGrid?: boolean;
  showDataLabels?: boolean;
  animationEnabled?: boolean;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  colorScheme?: string[];
}

/**
 * Layout Types
 */
export enum LayoutType {
  TITLE_SLIDE = 'title_slide',
  TITLE_CONTENT = 'title_content',
  TWO_COLUMN = 'two_column',
  TITLE_BULLETS = 'title_bullets',
  TITLE_CHART = 'title_chart',
  FULL_IMAGE = 'full_image',
  COMPARISON = 'comparison',
  SECTION_HEADER = 'section_header',
  BLANK = 'blank',
}

/**
 * Layout Configuration
 */
export interface LayoutConfig {
  type: LayoutType;
  regions: LayoutRegion[];
  backgroundColor?: string;
  backgroundImage?: string;
}

/**
 * Layout Region
 */
export interface LayoutRegion {
  id: string;
  type: 'title' | 'subtitle' | 'content' | 'chart' | 'image' | 'footer';
  x: number; // Percentage
  y: number; // Percentage
  width: number; // Percentage
  height: number; // Percentage
  fontSize?: number;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  padding?: number;
}

/**
 * Theme Configuration
 */
export interface ThemeConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textSecondary: string;
  };
  fonts: {
    heading: string;
    body: string;
    code?: string;
  };
  fontSize: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    small: number;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
  borderRadius?: number;
  shadowEnabled?: boolean;
}

/**
 * Image Placeholder
 */
export interface ImagePlaceholder {
  id: string;
  type: 'photo' | 'illustration' | 'icon' | 'logo' | 'chart';
  width: number;
  height: number;
  url?: string;
  altText?: string;
  caption?: string;
}

/**
 * Visual Slide Content
 * Extended slide content with visual elements
 */
export interface VisualSlideContent {
  // Core content
  type: string;
  order: number;
  title: string;
  subtitle?: string;
  content: any;
  speakerNotes?: string;
  
  // Visual elements
  layout: LayoutConfig;
  theme: ThemeConfig;
  charts?: ChartConfig[];
  images?: ImagePlaceholder[];
  
  // Metadata
  qualityScore?: number;
  renderStatus?: 'pending' | 'rendering' | 'complete' | 'error';
  renderedAt?: Date;
}

/**
 * Visual Generation Options
 */
export interface VisualGenerationOptions {
  generateCharts: boolean;
  generateImages: boolean;
  applyTheme: boolean;
  optimizeForExport: boolean;
  targetFormat?: 'pptx' | 'pdf' | 'html';
}
