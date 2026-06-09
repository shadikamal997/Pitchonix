# Editor Audit Report

> Phase Ω.PRODUCT.3 — code-derived editor audit. Capability presence/absence is read from real source; existing automated tests are cited where they exist. Items needing LIVE interaction or HUMAN judgement are marked, not fabricated.
>
> **Reading the matrix:** ✅ = a matching implementation pattern was found. A blank/❌ means *no matching named pattern was found* — it usually indicates a real gap, but can also mean a different mechanism (e.g. Excel Studio persists **per-operation** immediately rather than via debounced autosave; Convert and Brand Kits are not full document editors). Verify a flagged gap before treating it as definitive.

**Generated:** 2026-06-09T12:54:05.025Z

## Capability matrix (implemented in source)

| Editor | Files | Undo/Redo | Autosave | Shortcuts | Drag&Drop | Copy/Paste | Inline edit |
|---|---:|:--:|:--:|:--:|:--:|:--:|:--:|
| Presentation | 130 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PDF Studio | 31 | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Excel Studio | 9 | ✅ | — | ✅ | ✅ | — | ✅ |
| Career Docs | 11 | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Convert | 1 | — | — | — | — | — | — |
| Brand Kits | 7 | — | — | — | — | — | — |

## Per-editor detail

### Presentation  `/projects/[id]/edit/[slideId]`

- **Undo/Redo:** implemented (5 file(s)) — e.g. `frontend/features/slide-editor/SlideCanvas.tsx`
- **Autosave:** implemented (6 file(s)) — e.g. `frontend/features/slide-editor/SlideCanvas.tsx`
- **Shortcuts:** implemented (14 file(s)) — e.g. `frontend/features/slide-editor/SlideCanvas.tsx`
- **Drag&Drop:** implemented (5 file(s)) — e.g. `frontend/features/slide-editor/SlideCanvas.tsx`
- **Copy/Paste:** implemented (2 file(s)) — e.g. `frontend/features/slide-editor/SlideEditor.tsx`
- **Inline edit:** implemented (6 file(s)) — e.g. `frontend/features/slide-editor/SlideCanvas.tsx`

### PDF Studio  `/pdf-studio/editor/[id]`

- **Undo/Redo:** implemented (1 file(s)) — e.g. `frontend/app/pdf-studio/editor/[id]/page.tsx`
- **Autosave:** implemented (1 file(s)) — e.g. `frontend/app/pdf-studio/editor/[id]/page.tsx`
- **Shortcuts:** implemented (1 file(s)) — e.g. `frontend/app/pdf-studio/editor/[id]/page.tsx`
- **Drag&Drop:** implemented (2 file(s)) — e.g. `frontend/features/pdf-studio/image-placement/ImagePlacementTab.tsx`
- **Copy/Paste:** ⚠️ no source signal found
- **Inline edit:** implemented (2 file(s)) — e.g. `frontend/app/pdf-studio/editor/[id]/page.tsx`

### Excel Studio  `/excel-studio/editor/[id]`

- **Undo/Redo:** implemented (2 file(s)) — e.g. `frontend/features/excel-studio/api.ts`
- **Autosave:** ⚠️ no source signal found
- **Shortcuts:** implemented (1 file(s)) — e.g. `frontend/app/excel-studio/editor/[id]/page.tsx`
- **Drag&Drop:** implemented (1 file(s)) — e.g. `frontend/app/excel-studio/page.tsx`
- **Copy/Paste:** ⚠️ no source signal found
- **Inline edit:** implemented (1 file(s)) — e.g. `frontend/app/excel-studio/editor/[id]/page.tsx`

### Career Docs  `/career/builder/[id]`

- **Undo/Redo:** implemented (1 file(s)) — e.g. `frontend/app/career/builder/[id]/page.tsx`
- **Autosave:** implemented (1 file(s)) — e.g. `frontend/app/career/builder/[id]/page.tsx`
- **Shortcuts:** implemented (1 file(s)) — e.g. `frontend/app/career/builder/[id]/page.tsx`
- **Drag&Drop:** implemented (1 file(s)) — e.g. `frontend/app/career/builder/[id]/page.tsx`
- **Copy/Paste:** ⚠️ no source signal found
- **Inline edit:** implemented (1 file(s)) — e.g. `frontend/app/career/builder/[id]/page.tsx`

### Convert  `/convert`

- **Undo/Redo:** ⚠️ no source signal found
- **Autosave:** ⚠️ no source signal found
- **Shortcuts:** ⚠️ no source signal found
- **Drag&Drop:** ⚠️ no source signal found
- **Copy/Paste:** ⚠️ no source signal found
- **Inline edit:** ⚠️ no source signal found

### Brand Kits  `/brand-kits`

- **Undo/Redo:** ⚠️ no source signal found
- **Autosave:** ⚠️ no source signal found
- **Shortcuts:** ⚠️ no source signal found
- **Drag&Drop:** ⚠️ no source signal found
- **Copy/Paste:** ⚠️ no source signal found
- **Inline edit:** ⚠️ no source signal found

## Workflow friction / loading & editing times

⚠️ **Requires live instrumentation.** Loading/editing times and friction are measured by driving the running editors, not by static scan. Asset-size proxies are in EDITOR_PERFORMANCE_REPORT.md; full timing + friction is the live follow-up.

_Builds on the prior manual editor audit (memory: Editor Comprehensive Audit, 2026-05-17) — refresh against current code before acting on specific UI claims._
