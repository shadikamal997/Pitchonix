// Phase Ω.CONTENT.3 — Platform-wide content safety certification types.

export type SafetyGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';

/** Per-module certification, aggregated across every document in that module. */
export interface ModuleCertification {
  module: string;
  label: string;
  documents: number;
  imported: number;
  rendered: number;
  exported: number;
  reopened: number;
  missing: number; // imported but never rendered
  broken: number; // nodes that failed somewhere in the lifecycle
  rejected: number;
  mutated: number;
  expectedMutations: number;
  unexpectedMutations: number;
  /** headline preservation: exported / imported */
  retention: number;
  renderRetention: number; // rendered / imported
  exportRetention: number; // exported / rendered
  reopenRetention: number; // reopened / exported
  /** true once at least one document in the module has been reopened/verified */
  reopenObserved: boolean;
  /** the retention the grade is computed from (reopen-aware) */
  effectiveRetention: number;
  grade: SafetyGrade;
  certified: boolean;
  topLossReasons: LossReasonCount[];
}

export interface LossReasonCount {
  reason: string;
  count: number;
  /** false when the reason is not in the canonical registry — a regression signal */
  known: boolean;
  expected: boolean; // intentional, operation-driven (not a failure)
}

export interface RiskModule {
  module: string;
  label: string;
  broken: number;
  imported: number;
  riskRate: number; // broken / imported %
}

export interface RiskPipeline {
  pipeline: string; // renderer (or module when no renderer)
  broken: number;
  total: number;
  riskRate: number;
}

/** The platform-wide certification — single source of truth. */
export interface PlatformCertification {
  generatedAt: string;
  overallRetention: number;
  overallEffectiveRetention: number;
  overallGrade: SafetyGrade;
  totals: {
    imported: number;
    rendered: number;
    exported: number;
    reopened: number;
    missing: number;
    broken: number;
    rejected: number;
    mutated: number;
    expectedMutations: number;
    unexpectedMutations: number;
    documents: number;
  };
  moduleScores: ModuleCertification[];
  certifiedModules: string[];
  uncertifiedModules: string[];
  topLossReasons: LossReasonCount[];
  highestRiskModules: RiskModule[];
  highestRiskPipelines: RiskPipeline[];
  /** loss reasons present in the data that the registry doesn't know about */
  uncategorizedLossReasons: string[];
}

/** Friendly module labels. Modules not listed still certify under their raw id. */
export const MODULE_LABELS: Record<string, string> = {
  feasibility: 'Feasibility Studio',
  excel: 'Excel Studio',
  career: 'Career Docs',
  presentation: 'Presentations',
  convert: 'Convert',
  pptx_import: 'PPTX Import',
  pdf: 'PDF Studio',
};

/** Modules expected to participate in certification. */
export const EXPECTED_MODULES = Object.keys(MODULE_LABELS);

/**
 * Grade thresholds (effective retention, reopen-aware). A module with silent
 * (unexpected) mutations can never grade above B — fidelity isn't just presence.
 */
export const GRADE_THRESHOLDS: Array<{ grade: SafetyGrade; min: number }> = [
  { grade: 'A+', min: 99.9 },
  { grade: 'A', min: 99 },
  { grade: 'B', min: 97 },
  { grade: 'C', min: 95 },
  { grade: 'D', min: 90 },
  { grade: 'F', min: 0 },
];

/** A module is certified once it has lifecycle data and clears this bar. */
export const CERTIFICATION_MIN_RETENTION = 97;

/**
 * Canonical registry of every lossReason the platform's ledgers emit. The
 * regression gate fails when a node carries a reason that is NOT in this set —
 * an uncategorized failure mode that must be triaged and registered.
 */
export const KNOWN_LOSS_REASONS = new Set<string>([
  // lifecycle / generic
  'rejected_at_import',
  'imported_but_not_rendered',
  'rendered_but_not_exported',
  'exported_but_not_reopened',
  'absent_on_reopen',
  'mutated_on_reopen',
  'expected_mutation',
  'expected_removal',
  'unexpected_mutation',
  'node_lost',
  'node_missing',
  // presentations / pptx import
  'slide_lost',
  'title_lost',
  'subtitle_lost',
  'textbox_lost',
  'bullet_lost',
  'table_lost',
  'table_row_lost',
  'table_cell_lost',
  'chart_lost',
  'chart_series_lost',
  'chart_label_lost',
  'image_lost',
  'speaker_note_lost',
  'layout_lost',
  'section_lost',
  'heading_lost',
  'paragraph_lost',
  'metric_lost',
  'formula_lost',
  'appendix_lost',
  'slide_title_missing',
  'slide_subtitle_missing',
  'speaker_note_missing',
  'chart_missing',
  'chart_label_missing',
  'chart_series_missing',
  'metric_missing',
  'kpi_missing',
  'risk_missing',
  'market_driver_missing',
  'problem_point_missing',
  'solution_feature_missing',
  'strategy_point_missing',
  'competition_row_missing',
  'pricing_tier_missing',
  'funding_allocation_missing',
  'roadmap_milestone_missing',
  'team_member_missing',
  'team_bio_missing',
  // career
  'experience_missing',
  'experience_bullet_missing',
  'education_missing',
  'education_bullet_missing',
  'skill_missing',
  'project_missing',
  'project_bullet_missing',
  'certification_missing',
  'language_missing',
  'award_missing',
  'reference_missing',
  'personal_field_missing',
  'photo_missing',
  // excel
  'sheet_missing',
  'named_range_missing',
  'merged_range_missing',
  'column_metadata_missing',
  'row_metadata_missing',
  // pdf studio
  'appendix_node_missing',
  'continuation_node_missing',
  'overflow_node_missing',
]);
