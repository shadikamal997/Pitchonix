import { Injectable } from '@nestjs/common';
import { PageComposition } from './document-composition.service';
import { EditorialGridPlan } from './publishing-intelligence.types';

@Injectable()
export class EditorialGridEngineService {
  planGrid(page: PageComposition, occupancy: number): EditorialGridPlan {
    const hasImage = page.sections.some(section => section.type === 'image');
    const hasChart = page.sections.some(section => section.type === 'chart' || section.type === 'metric');
    const hasQuote = page.sections.some(section => section.type === 'quote');
    const hasManyBlocks = page.sections.length >= 7;
    const hasLongText = page.sections.some(section => section.type === 'paragraph' && section.content.length > 650);

    let gridType: EditorialGridPlan['gridType'] = 'single-column';
    let columns = 1;

    if (page.layout === 'cover') {
      gridType = 'feature';
      columns = 2;
    } else if (hasImage && !hasLongText) {
      gridType = 'image-heavy';
      columns = 2;
    } else if (hasChart) {
      gridType = 'asymmetric';
      columns = 3;
    } else if (hasQuote) {
      gridType = 'sidebar';
      columns = 2;
    } else if (hasManyBlocks && occupancy > 0.78) {
      gridType = 'three-column';
      columns = 3;
    } else if (hasManyBlocks && occupancy > 0.58) {
      gridType = 'two-column';
      columns = 2;
    }

    const baseline = 8;
    const rhythmScore = this.scoreRhythm(page, baseline);

    return {
      gridType,
      columns,
      baseline,
      margins: gridType === 'feature'
        ? { top: 56, right: 56, bottom: 52, left: 56 }
        : { top: 64, right: 58, bottom: 58, left: 58 },
      zones: this.buildZones(gridType, columns),
      rhythmScore,
    };
  }

  applyGrid(page: PageComposition, grid: EditorialGridPlan): PageComposition {
    const density = grid.columns >= 2 ? 'balanced' : page.density;
    return {
      ...page,
      layout: page.layout === 'cover'
        ? 'cover'
        : grid.gridType === 'single-column'
        ? 'single-column'
        : grid.gridType === 'feature'
          ? 'hero'
          : 'two-column',
      density,
      sections: page.sections.map((section, index) => ({
        ...section,
        spaceBefore: this.snap(section.spaceBefore || 16, grid.baseline),
        spaceAfter: this.snap(section.spaceAfter || 16, grid.baseline),
        maxWidth: grid.columns === 1 ? 680 : grid.gridType === 'sidebar' && index === 0 ? 420 : 520,
      })),
    };
  }

  private buildZones(gridType: EditorialGridPlan['gridType'], columns: number): EditorialGridPlan['zones'] {
    if (gridType === 'sidebar') {
      return [
        { id: 'main', role: 'primary-content', columnSpan: 1, priority: 1 },
        { id: 'sidebar', role: 'supporting-callouts', columnSpan: 1, priority: 2 },
      ];
    }
    if (gridType === 'asymmetric') {
      return [
        { id: 'lede', role: 'editorial-lede', columnSpan: 2, priority: 1 },
        { id: 'rail', role: 'metrics-or-proof', columnSpan: 1, priority: 2 },
      ];
    }
    return Array.from({ length: columns }).map((_, index) => ({
      id: `column-${index + 1}`,
      role: index === 0 ? 'primary-content' : 'secondary-content',
      columnSpan: 1,
      priority: index + 1,
    }));
  }

  private scoreRhythm(page: PageComposition, baseline: number): number {
    if (!page.sections.length) return 100;
    const offGrid = page.sections.reduce((sum, section) => {
      const before = Math.abs((section.spaceBefore || 0) % baseline);
      const after = Math.abs((section.spaceAfter || 0) % baseline);
      return sum + before + after;
    }, 0);
    return Math.max(0, Math.round(100 - offGrid / page.sections.length));
  }

  private snap(value: number, baseline: number): number {
    return Math.max(baseline, Math.round(value / baseline) * baseline);
  }
}
