# Drag & Drop Certification

> Phase Ω.PRODUCT.3 — code-derived editor audit. Capability presence/absence is read from real source; existing automated tests are cited where they exist. Items needing LIVE interaction or HUMAN judgement are marked, not fabricated.
>
> **Reading the matrix:** ✅ = a matching implementation pattern was found. A blank/❌ means *no matching named pattern was found* — it usually indicates a real gap, but can also mean a different mechanism (e.g. Excel Studio persists **per-operation** immediately rather than via debounced autosave; Convert and Brand Kits are not full document editors). Verify a flagged gap before treating it as definitive.

**Generated:** 2026-06-09T12:54:05.025Z

## Drag&Drop — implemented in 4/6 editors

| Editor | Implemented | Source files | Evidence |
|---|:--:|---:|---|
| Presentation | ✅ | 5 | `SlideCanvas.tsx`, `FocalPointPicker.tsx`, `ImageUploader.tsx` |
| PDF Studio | ✅ | 2 | `ImagePlacementTab.tsx`, `PageImageOverlay.tsx` |
| Excel Studio | ✅ | 1 | `page.tsx` |
| Career Docs | ✅ | 1 | `page.tsx` |
| Convert | ❌ | 0 | — |
| Brand Kits | ❌ | 0 | — |

## Required operations

- Slides
- Sections
- Blocks
- Images
- Files
- Templates

## Live verification required

⚠️ Smooth behaviour and no-data-loss on reorder/move are live properties — needs a live drag harness per editor.
