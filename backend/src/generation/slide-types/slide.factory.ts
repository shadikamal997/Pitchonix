import { Injectable } from '@nestjs/common';
import { SlideType, WizardInput, SlideContent, ISlideGenerator, GenerationConfig } from './types';
import { CoverSlideGenerator } from './cover.generator';
import { ProblemSlideGenerator } from './problem.generator';
import { SolutionSlideGenerator } from './solution.generator';
import { MarketOpportunitySlideGenerator } from './market.generator';
import {
  BusinessModelSlideGenerator,
  TractionSlideGenerator,
  TeamSlideGenerator,
  AskSlideGenerator,
} from './core-slides.generator';
import {
  ExecutiveSummarySlideGenerator,
  CompetitionSlideGenerator,
  RoadmapSlideGenerator,
  PricingSlideGenerator,
  ProductFeaturesSlideGenerator,
  VisionSlideGenerator,
} from './additional-slides.generator';
import {
  GoToMarketSlideGenerator,
  FinancialsSlideGenerator,
  CaseStudySlideGenerator,
  CompanyOverviewSlideGenerator,
} from './specialized-slides.generator';

/**
 * SlideFactory
 * Orchestrates slide generation based on wizard input
 */
@Injectable()
export class SlideFactory {
  private generators: ISlideGenerator[] = [];

  constructor() {
    this.registerGenerators();
  }

  /**
   * Register all available slide generators
   */
  private registerGenerators(): void {
    // Core slides
    this.generators.push(new CoverSlideGenerator());
    this.generators.push(new ProblemSlideGenerator());
    this.generators.push(new SolutionSlideGenerator());
    this.generators.push(new MarketOpportunitySlideGenerator());
    this.generators.push(new BusinessModelSlideGenerator());
    this.generators.push(new TractionSlideGenerator());
    this.generators.push(new TeamSlideGenerator());
    this.generators.push(new AskSlideGenerator());

    // Additional slides
    this.generators.push(new ExecutiveSummarySlideGenerator());
    this.generators.push(new CompetitionSlideGenerator());
    this.generators.push(new RoadmapSlideGenerator());
    this.generators.push(new PricingSlideGenerator());
    this.generators.push(new ProductFeaturesSlideGenerator());
    this.generators.push(new VisionSlideGenerator());

    // Specialized slides
    this.generators.push(new GoToMarketSlideGenerator());
    this.generators.push(new FinancialsSlideGenerator());
    this.generators.push(new CaseStudySlideGenerator());
    this.generators.push(new CompanyOverviewSlideGenerator());
  }

  /**
   * Generate complete deck based on wizard input
   */
  generateDeck(input: WizardInput): SlideContent[] {
    const config: GenerationConfig = {
      documentType: input.documentType,
      slideCount: input.slideCount,
      contentDepth: input.contentDepth,
      includeCharts: input.includeCharts,
      includeFinancials: input.includeFinancials,
      includeExecutiveSummary: input.includeExecutiveSummary,
    };

    // Filter applicable generators
    const applicableGenerators = this.generators.filter(gen => gen.isApplicable(input));

    // Sort by priority
    const sortedGenerators = this.sortGenerators(applicableGenerators);

    // Adjust based on slide count target
    const selectedGenerators = this.selectGenerators(sortedGenerators, config);

    // Generate slides
    const slides = selectedGenerators.map((gen, index) => gen.generate(input, index + 1));

    return slides;
  }

  /**
   * Sort generators by priority
   */
  private sortGenerators(generators: ISlideGenerator[]): ISlideGenerator[] {
    return [...generators].sort((a, b) => a.getDefaultPriority() - b.getDefaultPriority());
  }

  /**
   * Select generators based on slide count and config
   */
  private selectGenerators(
    generators: ISlideGenerator[],
    config: GenerationConfig,
  ): ISlideGenerator[] {
    const { slideCount, contentDepth, documentType } = config;

    // Define core slides that should always be included
    const coreTypes = this.getCoreSlideTypes(documentType);

    // Separate core and optional
    const coreGenerators = generators.filter(gen => coreTypes.includes(gen.type));
    const optionalGenerators = generators.filter(gen => !coreTypes.includes(gen.type));

    // Start with core slides
    const selected: ISlideGenerator[] = [...coreGenerators];

    // Calculate remaining slots
    const remainingSlots = slideCount - selected.length;

    // Add optional slides based on depth and remaining slots
    if (remainingSlots > 0) {
      const additionalCount = this.getAdditionalSlideCount(contentDepth, remainingSlots);
      selected.push(...optionalGenerators.slice(0, additionalCount));
    }

    // If we have more slides than target, prioritize by keeping highest priority
    if (selected.length > slideCount) {
      return selected.slice(0, slideCount);
    }

    return selected;
  }

  /**
   * Get core slide types based on document type
   */
  private getCoreSlideTypes(documentType: string): SlideType[] {
    const coreMap: Record<string, SlideType[]> = {
      pitch_deck: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.BUSINESS_MODEL,
        SlideType.TRACTION,
        SlideType.TEAM,
        SlideType.ASK,
      ],
      business_plan: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.COMPETITION,
        SlideType.BUSINESS_MODEL,
        SlideType.GO_TO_MARKET,
        SlideType.TEAM,
        SlideType.FINANCIALS,
      ],
      proposal: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.PRICING,
      ],
      sales_deck: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.PRODUCT_FEATURES,
        SlideType.CASE_STUDY,
        SlideType.PRICING,
      ],
      company_profile: [
        SlideType.COVER,
        SlideType.VISION,
        SlideType.COMPANY_OVERVIEW,
        SlideType.PRODUCT_FEATURES,
        SlideType.TEAM,
      ],
      board_meeting_deck: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.BUSINESS_MODEL,
        SlideType.TRACTION,
        SlideType.FINANCIALS,
        SlideType.ROADMAP,
        SlideType.ASK,
      ],
      training_presentation: [
        SlideType.COVER,
        SlideType.VISION,
        SlideType.PRODUCT_FEATURES,
        SlideType.CASE_STUDY,
      ],
      product_launch: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.PRODUCT_FEATURES,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.GO_TO_MARKET,
        SlideType.ROADMAP,
      ],
      strategy_presentation: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.COMPETITION,
        SlideType.GO_TO_MARKET,
        SlideType.ROADMAP,
        SlideType.TEAM,
      ],
      case_study: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.CASE_STUDY,
        SlideType.TRACTION,
      ],
      marketing_plan: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.COMPETITION,
        SlideType.GO_TO_MARKET,
        SlideType.PRICING,
        SlideType.ROADMAP,
      ],
      executive_summary: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.BUSINESS_MODEL,
        SlideType.TRACTION,
      ],
      financial_projection: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.FINANCIALS,
        SlideType.BUSINESS_MODEL,
        SlideType.MARKET_OPPORTUNITY,
      ],
      partnership_proposal: [
        SlideType.COVER,
        SlideType.VISION,
        SlideType.COMPANY_OVERVIEW,
        SlideType.MARKET_OPPORTUNITY,
        SlideType.BUSINESS_MODEL,
        SlideType.ASK,
      ],
      internal_report: [
        SlideType.COVER,
        SlideType.EXECUTIVE_SUMMARY,
        SlideType.TRACTION,
        SlideType.FINANCIALS,
        SlideType.ROADMAP,
      ],
      one_pager: [
        SlideType.COVER,
        SlideType.PROBLEM,
        SlideType.SOLUTION,
        SlideType.MARKET_OPPORTUNITY,
      ],
    };

    return coreMap[documentType] || coreMap['pitch_deck'];
  }

  /**
   * Calculate how many additional slides to add based on content depth
   */
  private getAdditionalSlideCount(contentDepth: string, maxAdditional: number): number {
    const depthMap: Record<string, number> = {
      short: Math.min(2, maxAdditional),
      balanced: Math.min(4, maxAdditional),
      detailed: maxAdditional,
    };

    return depthMap[contentDepth] || depthMap['balanced'];
  }

  /**
   * Get available slide types
   */
  getAvailableSlideTypes(): SlideType[] {
    return this.generators.map(gen => gen.type);
  }

  /**
   * Get generator for specific slide type
   */
  getGenerator(type: SlideType): ISlideGenerator | undefined {
    return this.generators.find(gen => gen.type === type);
  }
}
