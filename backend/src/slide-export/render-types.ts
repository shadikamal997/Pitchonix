import type { SlideElementDTO, SlideBackground, SlideThemeTokens } from '../slides/element-types';

export interface RenderSlideInput {
  index:        number;
  total:        number;
  title?:       string;
  background?:  SlideBackground | null;
  themeTokens?: SlideThemeTokens | null;
  elements:     SlideElementDTO[];
}

export interface RenderDeckInput {
  title:  string;
  slides: RenderSlideInput[];
}

export interface ExportTextFit {
  role: string;
  fontSize: number;
  minSize: number;
  maxSize: number;
  fontWeight: number | string;
  lineHeight: number;
  letterSpacing: number;
  maxLines?: number;
  fits: boolean;
  estimatedLines: number;
}

export type PlannedSlideElement = SlideElementDTO & {
  exportFit?: ExportTextFit;
  exportAdjusted?: boolean;
};

export interface RenderPlanResult {
  deck: RenderDeckInput;
  warnings: string[];
}
