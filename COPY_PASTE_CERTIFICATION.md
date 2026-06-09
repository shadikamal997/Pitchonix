# Copy / Paste Certification

> Phase Ω.PRODUCT.3 — code-derived editor audit. Capability presence/absence is read from real source; existing automated tests are cited where they exist. Items needing LIVE interaction or HUMAN judgement are marked, not fabricated.
>
> **Reading the matrix:** ✅ = a matching implementation pattern was found. A blank/❌ means *no matching named pattern was found* — it usually indicates a real gap, but can also mean a different mechanism (e.g. Excel Studio persists **per-operation** immediately rather than via debounced autosave; Convert and Brand Kits are not full document editors). Verify a flagged gap before treating it as definitive.

**Generated:** 2026-06-09T12:54:05.025Z

## Copy/Paste — implemented in 1/6 editors

| Editor | Implemented | Source files | Evidence |
|---|:--:|---:|---|
| Presentation | ✅ | 2 | `SlideEditor.tsx`, `KeyboardShortcutsDialog.tsx` |
| PDF Studio | ❌ | 0 | — |
| Excel Studio | ❌ | 0 | — |
| Career Docs | ❌ | 0 | — |
| Convert | ❌ | 0 | — |
| Brand Kits | ❌ | 0 | — |

## Required operations

- Internal
- Cross-document
- Cross-editor
- Excel
- Table

## Live verification required

⚠️ Formatting-preserved across internal/cross-document/cross-editor/Excel/table paste is a live clipboard test. Static scan shows where copy/paste handlers exist.
