/**
 * Phase 30 — Professional Document Systems
 *
 * Barrel export for the document-quality module.
 */

export * from './types';
export * from './frameworks';
export { DocumentFrameworkEngine }     from './framework-engine.service';
export { BusinessLogicValidator }      from './business-logic-validator.service';
export { ExecutiveQualityEngine }      from './executive-quality.service';
export { InvestorReadinessEngine }     from './readiness/investor.service';
export { SalesReadinessEngine }        from './readiness/sales.service';
export { BoardReadinessEngine }        from './readiness/board.service';
export { StrategyReadinessEngine }     from './readiness/strategy.service';
export { DocumentScorecardService }    from './scorecard.service';
export { AutoExpansionService }        from './auto-expansion.service';
