import { OoxmlPackage, asArray } from './ooxml-parser';

// =============================================================================
//  Phase 38.3B — Animation importer.
//
//  Parses each slide's <p:timing> graph back into the SlideAnimation shape
//  Pitchonix's editor + the OOXML writer both understand:
//
//    {
//      id, class, effect, duration, delay, order, trigger,
//      direction?, motionPath?, repeat?, byParagraph?
//    }
//
//  Implementation notes:
//    - We only walk the mainSeq → childTnLst → <p:par> children. PowerPoint
//      wraps every effect in a <p:par> with presetID/presetClass/presetSubtype.
//    - Effect inference is the inverse of the export-side pickPreset map.
//    - Targets resolve via <p:tgtEl><p:spTgt spid="…"/>. We surface the spid
//      raw — callers reconcile it to the matching SlideElement using their
//      own spid → element id mapping.
//    - <p:animMotion path="…"/> populates motionPath; we leave PowerPoint's
//      coordinate space as-is (the editor uses % of slide too).
//    - Paragraph-targeted animations carry <p:pRg> children → byParagraph = true.
//    - <p:cTn @repeatCount> populates repeat; "indefinite" preserved as string.
//
//  Edge cases:
//    - Effects that don't map cleanly fall back to 'fade'. We never throw.
//    - Slides without <p:timing> return [] silently.
// =============================================================================

export interface ImportedAnimation {
  /** Synthetic id — caller replaces or persists. */
  id:        string;
  /** Raw spid from <p:spTgt>; caller maps to Pitchonix element id. */
  spid:      string;
  class:     'entr' | 'exit' | 'emph' | 'path';
  effect:    string;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  duration:  number;
  delay:     number;
  order:     number;
  trigger:   'click' | 'auto' | 'with_previous' | 'after_previous';
  motionPath?: string;
  repeat?:     number | 'indefinite';
  byParagraph?: boolean;
}

export function importAnimationsForSlide(pkg: OoxmlPackage, slidePath: string): ImportedAnimation[] {
  const doc  = pkg.parse<any>(slidePath);
  const root = doc?.['p:sld'];
  const timing = root?.['p:timing'];
  if (!timing) return [];

  // The interesting subtree is the mainSeq's childTnLst.
  const tnLst = timing['p:tnLst'];
  if (!tnLst) return [];

  const out: ImportedAnimation[] = [];
  let counter = 0;

  // Recursive walker — <p:par> can nest within <p:par> when PowerPoint groups
  // child effects under sequence containers. We flatten with stable order.
  const walkPar = (par: any, parentOrder = 0) => {
    if (!par) return;
    const cTn = par['p:cTn'];
    const id  = cTn?.['@id'] || `imp-anim-${counter++}`;
    const presetID = Number(cTn?.['@presetID'] || 0);
    const presetClass = String(cTn?.['@presetClass'] || 'entr');
    const presetSubtype = Number(cTn?.['@presetSubtype'] || 0);
    const nodeType = String(cTn?.['@nodeType'] || 'clickEffect');
    const repeatCount = cTn?.['@repeatCount'];

    // <p:stCondLst><p:cond delay="…"/></p:stCondLst>
    const delayRaw = cTn?.['p:stCondLst']?.['p:cond']?.['@delay'];
    const delay    = parseDelay(delayRaw);

    // Recurse into nested <p:par> in childTnLst first.
    const child = cTn?.['p:childTnLst'];
    if (child) {
      for (const sub of asArray(child['p:par'])) walkPar(sub, parentOrder);
    }

    // Identify behaviour: anim / animClr / animMotion / set drive duration + target.
    let spid: string | undefined;
    let duration = 500;
    let byParagraph = false;
    let motionPath: string | undefined;

    const pickFromCBhvr = (cBhvr: any) => {
      const tgt = cBhvr?.['p:tgtEl']?.['p:spTgt'];
      if (tgt?.['@spid']) spid = String(tgt['@spid']);
      // paragraph range targeting
      if (tgt?.['p:txEl']?.['p:pRg']) byParagraph = true;
      const cd = cBhvr?.['p:cTn']?.['@dur'];
      if (cd) duration = Math.max(1, Number(cd) || duration);
    };

    if (child) {
      // <p:set> behaviour (visibility flip) — gives target.
      const setNode = child['p:set'];
      if (setNode) pickFromCBhvr(setNode['p:cBhvr']);

      // <p:anim> for opacity etc.
      const animNode = child['p:anim'];
      if (animNode) pickFromCBhvr(animNode['p:cBhvr']);

      // <p:animMotion path="…"/>
      const animMotion = child['p:animMotion'];
      if (animMotion) {
        pickFromCBhvr(animMotion['p:cBhvr']);
        motionPath = String(animMotion['@path'] || '') || undefined;
      }

      // <p:animClr> for color cycles.
      const animClr = child['p:animClr'];
      if (animClr) pickFromCBhvr(animClr['p:cBhvr']);
    }

    if (!spid) return;   // no target → not a leaf effect; skip

    const cls = (
      presetClass === 'exit' || presetClass === 'emph' || presetClass === 'path'
        ? presetClass
        : 'entr'
    ) as ImportedAnimation['class'];

    const { effect, direction } = mapPresetBack(cls, presetID, presetSubtype, motionPath);
    const trigger = nodeType === 'withEffect' ? 'with_previous'
                  : nodeType === 'afterEffect' ? 'after_previous'
                  : 'click';

    out.push({
      id,
      spid,
      class: cls,
      effect,
      direction,
      duration,
      delay,
      order: parentOrder + out.length,
      trigger,
      motionPath: cls === 'path' ? motionPath : undefined,
      repeat: parseRepeat(repeatCount),
      byParagraph: byParagraph || undefined,
    });
  };

  // Drill: tnLst > par > cTn > childTnLst > seq > cTn > childTnLst > par[]
  for (const topPar of asArray(tnLst['p:par'])) {
    const childTn = topPar?.['p:cTn']?.['p:childTnLst'];
    if (!childTn) continue;
    for (const seq of asArray(childTn['p:seq'])) {
      const inner = seq?.['p:cTn']?.['p:childTnLst'];
      if (!inner) continue;
      for (const par of asArray(inner['p:par'])) walkPar(par, 0);
    }
  }

  return out;
}

// =============================================================================
//  Inverse of the export-side pickPreset table.
// =============================================================================

function mapPresetBack(
  cls: ImportedAnimation['class'],
  id: number,
  subtype: number,
  motionPath?: string,
): { effect: string; direction?: 'left' | 'right' | 'top' | 'bottom' } {
  const dir = subtype === 1 ? 'top'
            : subtype === 4 ? 'left'
            : subtype === 8 ? 'right'
            : subtype === 2 ? 'bottom'
            : undefined;

  if (cls === 'path') return { effect: 'motionPath' };

  if (cls === 'exit') {
    switch (id) {
      case 10: return { effect: 'fade' };
      case 2:  return { effect: 'flyOut',  direction: dir };
      case 23: return { effect: 'zoomOut' };
      case 22: return { effect: 'wipeOut', direction: dir };
      default: return { effect: 'fade' };
    }
  }
  if (cls === 'emph') {
    switch (id) {
      case 9:  return { effect: 'pulse' };
      case 32: return { effect: 'colorChange' };
      case 8:  return { effect: 'spin' };
      default: return { effect: 'pulse' };
    }
  }
  // entry
  switch (id) {
    case 10: return { effect: 'fade' };
    case 1:  return { effect: 'appear' };
    case 2:  return { effect: 'flyIn',  direction: dir };
    case 23: return { effect: 'zoom' };
    case 6:  return { effect: 'grow' };
    case 22: return { effect: 'wipe',   direction: dir };
    default: return { effect: 'fade' };
  }
}

function parseDelay(raw: any): number {
  if (raw == null) return 0;
  if (raw === 'indefinite') return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function parseRepeat(raw: any): number | 'indefinite' | undefined {
  if (raw == null) return undefined;
  if (raw === 'indefinite') return 'indefinite';
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  // OOXML uses ms-style milli-percent units (1000 = once); normalise.
  return Math.max(1, Math.round(n / 1000));
}
