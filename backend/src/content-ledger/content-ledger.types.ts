// Phase Ω.CONTENT.2 — Universal Content Ledger types.

export type LedgerModule =
  | 'feasibility'
  | 'pdf'
  | 'presentation'
  | 'excel'
  | 'career'
  | 'convert'
  | 'pptx'
  | string;

/** A single piece of user content emitted into the ledger at import time. */
export interface ContentNodeInput {
  module: LedgerModule;
  sourceDocumentId: string;
  sourceType?: string;
  sectionId?: string;
  parentId?: string;
  type: string;
  content?: string;
  metadata?: any;
  /** Set true when the importer/sanitizer dropped this node (still traceable). */
  rejected?: boolean;
  lossReason?: string;
}

export interface MarkRenderedOptions {
  renderer?: string;
  template?: string;
  /** Apply one destination to every targeted node. */
  destination?: string;
  /** Restrict to specific node ids; omit to target all imported nodes. */
  nodeIds?: string[];
  /** Per-node destination overrides (nodeId -> destination). */
  destinationByNodeId?: Record<string, string>;
}

export interface MarkExportedOptions {
  destination?: string;
  nodeIds?: string[];
  renderer?: string;
}

/** What the reopened document actually still contains. */
export interface ReopenPresence {
  id?: string;
  hash?: string;
}

export interface MarkReopenedOptions {
  present: ReopenPresence[];
  renderer?: string;
}

/** Per-node reopen reconciliation result (used by operation-aware modules). */
export interface ReopenResultUpdate {
  id: string;
  reopened: boolean;
  mutated?: boolean;
  lossReason?: string | null;
}

/** lossReasons that represent an intentional, operation-driven change. */
export const EXPECTED_LOSS_REASONS = new Set(['expected_mutation', 'expected_removal']);

export interface BrokenNode {
  id: string;
  module: string;
  type: string;
  source: string;
  destination: string | null;
  failurePoint: 'import' | 'render' | 'export' | 'reopen' | 'mutation';
  reason: string;
  contentPreview: string | null;
}

export interface PreservationReport {
  sourceDocumentId: string;
  modules: string[];
  imported: number;
  rendered: number;
  exported: number;
  reopened: number;
  /** imported but never rendered */
  missing: number;
  /** headline preservation: exported / imported */
  retention: number;
  renderRetention: number;
  exportRetention: number;
  reopenRetention: number;
  brokenNodes: BrokenNode[];
  overflowNodes: number;
  rejectedNodes: number;
  mutatedNodes: number;
  /** mutations/removals that an operation intentionally caused — not loss */
  expectedMutations: number;
  /** mutations the ledger could not attribute to an operation — real loss */
  unexpectedMutations: number;
  reopenObserved: boolean;
  byType: Record<
    string,
    { imported: number; rendered: number; exported: number; reopened: number }
  >;
}
