import { BasePageGenerator, PageContent } from './base-page.generator';
import { WizardInput } from '../../generation/slide-types/types';

export interface TimelineEntry {
  date: string;
  milestone: string;
  description?: string;
  status?: 'completed' | 'in-progress' | 'planned';
}

export class TimelinePageGenerator extends BasePageGenerator {
  readonly type = 'TIMELINE';
  readonly layout = 'timeline' as const;

  generate(input: WizardInput, pageNumber: number): PageContent {
    const page = this.createBasePage(pageNumber, this.type, this.layout);

    page.title = 'Roadmap & Timeline';
    page.subtitle = 'Key Milestones & Strategic Goals';
    page.content = {
      timeline: this.generateTimeline(input),
      milestones: this.generateMilestones(input),
    };

    return page;
  }

  private generateTimeline(input: WizardInput): TimelineEntry[] {
    const timeline: TimelineEntry[] = [];

    if (input.roadmap) {
      // Parse roadmap string into milestones
      const milestones = this.parseRoadmap(input.roadmap);
      timeline.push(...milestones);
    }

    // Add default milestones if none provided
    if (timeline.length === 0) {
      timeline.push(
        {
          date: 'Q1 2026',
          milestone: 'Product Development',
          description: 'Complete core product features',
          status: 'in-progress',
        },
        {
          date: 'Q2 2026',
          milestone: 'Beta Launch',
          description: 'Launch to select beta users',
          status: 'planned',
        },
        {
          date: 'Q3 2026',
          milestone: 'Public Launch',
          description: 'Full market launch',
          status: 'planned',
        },
        {
          date: 'Q4 2026',
          milestone: 'Scale Operations',
          description: 'Expand team and market reach',
          status: 'planned',
        },
      );
    }

    return timeline;
  }

  private generateMilestones(input: WizardInput): string[] {
    const milestones: string[] = [];

    // Parse traction string for milestones (traction is a string in WizardInput)
    if (input.traction) {
      const tractionLines = input.traction.split('\n').filter(line => line.trim());
      milestones.push(...tractionLines.slice(0, 5));
    }

    if (milestones.length === 0) {
      milestones.push(
        'Product Development Complete',
        'First Customer Acquisition',
        'Revenue Milestone Achievement',
        'Team Expansion',
        'Market Leadership Position'
      );
    }

    return milestones.slice(0, 5);
  }

  private parseRoadmap(roadmap: string): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    
    // Try to parse structured roadmap
    const lines = roadmap.split('\n').filter(line => line.trim());
    
    let currentQuarter = 1;
    const currentYear = new Date().getFullYear();

    for (const line of lines.slice(0, 8)) {
      const milestone = line.replace(/^[-•*]\s*/, '').trim();
      if (milestone) {
        entries.push({
          date: `Q${currentQuarter} ${currentYear + Math.floor((currentQuarter - 1) / 4)}`,
          milestone: milestone.substring(0, 50),
          description: '',
          status: currentQuarter <= 1 ? 'in-progress' : 'planned',
        });
        currentQuarter++;
      }
    }

    return entries;
  }
}
