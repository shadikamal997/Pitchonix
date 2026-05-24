// =============================================================================
//  Snapshot diff — Phase 35
//
//  Pure function: compare two DeckSnapshot payloads and produce a
//  VersionDiff. The summary is suitable for an editor toast / panel
//  ("+ 2 slides added · - 1 slide removed · ~ 6 text edits"); the details
//  surface the actual added/removed/reordered items.
// =============================================================================

import type { DeckSnapshot, VersionDiff } from './version-types';

export function diffSnapshots(a: DeckSnapshot, b: DeckSnapshot): VersionDiff {
  const summary: VersionDiff['summary'] = {
    slidesAdded:      0,
    slidesRemoved:    0,
    slidesReordered:  0,
    elementsAdded:    0,
    elementsRemoved:  0,
    textEdits:        0,
    familyChanged:    false,
    templateChanged:  false,
    masterCountDelta: 0,
  };
  const details: VersionDiff['details'] = {
    addedSlides:     [],
    removedSlides:   [],
    reorderedSlides: [],
  };

  // Slide identity — use (type, title) since IDs aren't stable across restore.
  const key = (s: { type: string; title: string }) => `${s.type}::${s.title}`;
  const aMap = new Map<string, { idx: number; slide: DeckSnapshot['slides'][number] }>();
  const bMap = new Map<string, { idx: number; slide: DeckSnapshot['slides'][number] }>();
  a.slides.forEach((s, i) => aMap.set(key(s), { idx: i, slide: s }));
  b.slides.forEach((s, i) => bMap.set(key(s), { idx: i, slide: s }));

  // Added: in b but not in a
  for (const [k, v] of bMap.entries()) {
    if (!aMap.has(k)) {
      summary.slidesAdded++;
      details.addedSlides.push({ order: v.idx, title: v.slide.title, type: v.slide.type });
    }
  }
  // Removed: in a but not in b
  for (const [k, v] of aMap.entries()) {
    if (!bMap.has(k)) {
      summary.slidesRemoved++;
      details.removedSlides.push({ order: v.idx, title: v.slide.title, type: v.slide.type });
    }
  }
  // Reordered: present in both but at a different index
  for (const [k, av] of aMap.entries()) {
    const bv = bMap.get(k);
    if (bv && av.idx !== bv.idx) {
      summary.slidesReordered++;
      details.reorderedSlides.push({ title: av.slide.title, from: av.idx, to: bv.idx });
    }
  }

  // Element-level changes (within slides present in both)
  for (const [k, av] of aMap.entries()) {
    const bv = bMap.get(k);
    if (!bv) continue;
    const aCount = av.slide.elements.length;
    const bCount = bv.slide.elements.length;
    if (bCount > aCount) summary.elementsAdded   += bCount - aCount;
    if (bCount < aCount) summary.elementsRemoved += aCount - bCount;

    // Cheap text-edit detection: hash(content.text) for paragraph/heading/caption.
    const aHash = av.slide.elements.filter((e) => textyType(e.type)).map((e) => textOf(e.content)).join('|');
    const bHash = bv.slide.elements.filter((e) => textyType(e.type)).map((e) => textOf(e.content)).join('|');
    if (aHash !== bHash) {
      // Count differing positions as edits (rough but bounded)
      const aArr = aHash.split('|');
      const bArr = bHash.split('|');
      const n = Math.max(aArr.length, bArr.length);
      let edits = 0;
      for (let i = 0; i < n; i++) if ((aArr[i] || '') !== (bArr[i] || '')) edits++;
      summary.textEdits += edits;
    }
  }

  // Family / template / master count
  const aFamily = (a.deck as any).familyId ?? (a.slides[0]?.themeKey) ?? null;
  const bFamily = (b.deck as any).familyId ?? (b.slides[0]?.themeKey) ?? null;
  if (aFamily !== bFamily) {
    summary.familyChanged = true;
    details.fromFamily = aFamily;
    details.toFamily   = bFamily;
  }
  summary.masterCountDelta = (b.masters?.length || 0) - (a.masters?.length || 0);

  return { summary, details };
}

function textyType(t: string): boolean {
  return t === 'heading' || t === 'subheading' || t === 'paragraph' || t === 'caption' || t === 'label' || t === 'quote';
}

function textOf(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content.text === 'string') return content.text;
  if (typeof content.html === 'string') return content.html;
  return '';
}
