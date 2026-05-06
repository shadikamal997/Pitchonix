// Enums
export enum ChartType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  DONUT = 'donut',
  AREA = 'area',
  SCATTER = 'scatter',
  FUNNEL = 'funnel',
  TIMELINE = 'timeline',
  COMPARISON = 'comparison',
  HIERARCHY = 'hierarchy',
}

export enum LayoutType {
  TITLE_CONTENT = 'title_content',
  TWO_COLUMN = 'two_column',
  THREE_COLUMN = 'three_column',
  IMAGE_LEFT = 'image_left',
  IMAGE_RIGHT = 'image_right',
  FULL_IMAGE = 'full_image',
  QUOTE = 'quote',
  TIMELINE = 'timeline',
  COMPARISON = 'comparison',
}

export enum ImageStyle {
  PHOTO = 'photo',
  ILLUSTRATION = 'illustration',
  ICON = 'icon',
  DIAGRAM = 'diagram',
  SCREENSHOT = 'screenshot',
  INFOGRAPHIC = 'infographic',
}

// UI-friendly labels
export const CHART_TYPE_LABELS: Record<ChartType, string> = {
  [ChartType.BAR]: 'Bar Chart',
  [ChartType.LINE]: 'Line Chart',
  [ChartType.PIE]: 'Pie Chart',
  [ChartType.DONUT]: 'Donut Chart',
  [ChartType.AREA]: 'Area Chart',
  [ChartType.SCATTER]: 'Scatter Plot',
  [ChartType.FUNNEL]: 'Funnel Chart',
  [ChartType.TIMELINE]: 'Timeline',
  [ChartType.COMPARISON]: 'Comparison Table',
  [ChartType.HIERARCHY]: 'Hierarchy/Tree',
};

export const CHART_TYPE_USE_CASES: Record<ChartType, string> = {
  [ChartType.BAR]: 'Comparing quantities across categories',
  [ChartType.LINE]: 'Showing trends over time',
  [ChartType.PIE]: 'Showing parts of a whole (percentages)',
  [ChartType.DONUT]: 'Parts of a whole with center emphasis',
  [ChartType.AREA]: 'Cumulative trends over time',
  [ChartType.SCATTER]: 'Showing relationships between variables',
  [ChartType.FUNNEL]: 'Conversion or process flow',
  [ChartType.TIMELINE]: 'Events or milestones over time',
  [ChartType.COMPARISON]: 'Feature or competitor comparison',
  [ChartType.HIERARCHY]: 'Organizational or categorical structure',
};

export const LAYOUT_TYPE_LABELS: Record<LayoutType, string> = {
  [LayoutType.TITLE_CONTENT]: 'Title + Content',
  [LayoutType.TWO_COLUMN]: 'Two Column',
  [LayoutType.THREE_COLUMN]: 'Three Column',
  [LayoutType.IMAGE_LEFT]: 'Image Left, Text Right',
  [LayoutType.IMAGE_RIGHT]: 'Text Left, Image Right',
  [LayoutType.FULL_IMAGE]: 'Full-Screen Image',
  [LayoutType.QUOTE]: 'Quote/Testimonial',
  [LayoutType.TIMELINE]: 'Timeline Layout',
  [LayoutType.COMPARISON]: 'Comparison Layout',
};

export const IMAGE_STYLE_LABELS: Record<ImageStyle, string> = {
  [ImageStyle.PHOTO]: 'Photograph',
  [ImageStyle.ILLUSTRATION]: 'Illustration',
  [ImageStyle.ICON]: 'Icon/Symbol',
  [ImageStyle.DIAGRAM]: 'Diagram',
  [ImageStyle.SCREENSHOT]: 'Screenshot',
  [ImageStyle.INFOGRAPHIC]: 'Infographic',
};

// Interfaces
export interface ChartRecommendation {
  type: ChartType;
  confidence: number;
  reason: string;
  example: string;
  pros: string[];
  cons: string[];
}

export interface LayoutRecommendation {
  type: LayoutType;
  confidence: number;
  reason: string;
  structure: {
    sections: string[];
    emphasis: string;
  };
  preview?: string;
}

export interface ImageRecommendation {
  style: ImageStyle;
  confidence: number;
  searchKeywords: string[];
  placement: 'left' | 'right' | 'center' | 'background' | 'full';
  size: 'small' | 'medium' | 'large';
  reason: string;
}

export interface ColorSuggestion {
  primary: string;
  accent: string;
  background: string;
  text: string;
  reason: string;
}

export interface VisualAnalysisResponse {
  slideType: string;
  charts: ChartRecommendation[];
  layouts: LayoutRecommendation[];
  images: ImageRecommendation[];
  colorSuggestions: ColorSuggestion;
  overallGuidance: string[];
  dosDonts: {
    dos: string[];
    donts: string[];
  };
}

export interface AnalyzeSlideContentRequest {
  content: string;
  slideType?: string;
  dataPoints?: {
    label: string;
    value: number;
  }[];
  context?: {
    companyName?: string;
    industry?: string;
    designStyle?: string;
  };
}

export interface ChartDataResponse {
  type: ChartType;
  data: {
    labels: string[];
    values: number[];
    categories?: string[];
  };
  title: string;
  subtitle?: string;
  formatting: {
    showLegend: boolean;
    showValues: boolean;
    showGrid: boolean;
    colorScheme: string[];
  };
}

export interface GenerateChartDataRequest {
  description: string;
  chartType: ChartType;
  dataPoints?: number;
}
