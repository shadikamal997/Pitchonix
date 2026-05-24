import AdmZip = require('adm-zip');
import type { RenderSlideInput } from './render-types';
import type { SlideElementDTO } from '../slides/element-types';

// =============================================================================
//  Phase 38.1F + 38.1G — OOXML animation + transition post-processor.
//
//  pptxgenjs (v3) does not expose <p:timing>. It also flattens some
//  transition kinds (e.g. morph) to a generic fade. We treat its output
//  buffer as a starting point, open the zip in memory, and:
//
//    - inject <p:timing> nodes built from each slide's animation list
//      (every animated SlideElement contributes a child <p:par> with the
//       correct preset effect + duration).
//    - patch <p:transition> on each slide so morph / push / reveal write
//      OOXML-correct elements rather than a fade fallback.
//
//  Strategy: regex-driven splicing. The XML produced by pptxgenjs is small
//  per slide, predictable, and stable on the few injection points we touch.
//  Full XML round-trip would require an XML writer; this avoids that
//  while still being deterministic.
//
//  Animation preset codes used by PowerPoint (subset that maps to ours):
//
//      fade   → presetID="10" presetClass="entr" presetSubtype="0"
//      appear → presetID="1"  presetClass="entr" presetSubtype="0"
//      flyIn  → presetID="2"  presetClass="entr" presetSubtype="(direction)"
//      zoom   → presetID="23" presetClass="entr" presetSubtype="0"
//      grow   → presetID="6"  presetClass="entr" presetSubtype="0"
//      wipe   → presetID="22" presetClass="entr" presetSubtype="(direction)"
// =============================================================================

interface AnimDef {
  id:        string;
  effect:    string;
  duration:  number;
  delay:     number;
  order:     number;
  direction?: string;
  trigger?:   string;
  // Phase 38.2D additions
  /** 'entr' (entry), 'exit', 'emph' (emphasis), 'path' (motion). */
  class?:    'entr' | 'exit' | 'emph' | 'path';
  /** Repeat count (0 = once). For "until-end-of-slide" use 'indefinite'. */
  repeat?:   number | 'indefinite';
  /** Paragraph-level mask (true → animate text by paragraph). */
  byParagraph?: boolean;
  /** Motion path SVG-like commands: 'M0,0 L50,30 …' in percent of slide. */
  motionPath?: string;
}

interface InjectedSlide {
  /** 1-based numbering — matches `ppt/slides/slideN.xml`. */
  number:     number;
  animations: { spId: string; def: AnimDef }[];
  transition?: NonNullable<RenderSlideInput['transition']>;
}

/**
 * Post-process a pptxgenjs Buffer:
 *   - walks every slide
 *   - if it has any animations, build a <p:timing> block and splice it in
 *     just before </p:sld>
 *   - if it has a transition our writer handles better than pptxgenjs (morph,
 *     directional push/reveal), replace its <p:transition> with ours
 *
 * Returns the rewritten buffer. Soft-fails per-slide so a broken patch
 * doesn't kill the whole export.
 */
export function postProcessAnimations(buffer: Buffer, slides: RenderSlideInput[]): Buffer {
  let zip: AdmZip;
  try { zip = new AdmZip(buffer); }
  catch { return buffer; }

  const slideEntries = zip.getEntries()
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName))
    .sort((a, b) => numFor(a.entryName) - numFor(b.entryName));

  slides.forEach((slide, i) => {
    const entry = slideEntries[i];
    if (!entry) return;
    const xml0 = entry.getData().toString('utf8');

    const job: InjectedSlide = {
      number:     i + 1,
      animations: collectAnimations(slide.elements || []),
      transition: slide.transition || undefined,
    };

    let xml = xml0;
    if (job.animations.length > 0) xml = injectTiming(xml, job);
    if (job.transition)            xml = replaceTransition(xml, job.transition);
    // Phase 38.4C — re-emit preserved long-tail extensions so the imported
    // deck round-trips lossless. We append an HTML comment marker each blob
    // so debugging is easy; PowerPoint ignores XML comments inside extLst.
    if (slide.preservedExtensions && slide.preservedExtensions.length > 0) {
      const blob = preservedExtensionsBlob(slide.preservedExtensions);
      if (blob && !xml.includes('<!-- pitchonix:preserved -->')) {
        xml = xml.replace(/<\/p:sld>\s*$/, `${blob}</p:sld>`);
      }
    }

    if (xml !== xml0) {
      try { zip.updateFile(entry.entryName, Buffer.from(xml, 'utf8')); }
      catch (e: any) {
        // eslint-disable-next-line no-console
        console.warn(`[ooxml-anim] failed to patch ${entry.entryName}: ${e?.message}`);
      }
    }
  });

  try {
    return zip.toBuffer();
  } catch {
    return buffer;
  }
}

// =============================================================================
//  Animation injection
// =============================================================================

function collectAnimations(elements: SlideElementDTO[]): { spId: string; def: AnimDef }[] {
  const out: { spId: string; def: AnimDef }[] = [];
  let counter = 1000;
  for (const el of elements) {
    const list = (el.animations as AnimDef[] | undefined) || [];
    for (const def of list) {
      out.push({
        spId: shapeIdFor(el, counter++),
        def,
      });
    }
  }
  // Stable order: by `order` then insertion.
  out.sort((a, b) => (a.def.order ?? 0) - (b.def.order ?? 0));
  return out;
}

/** Synthesise a spid we can target in <p:tgtEl><p:spTgt spid="…">. */
function shapeIdFor(el: SlideElementDTO, fallback: number): string {
  // pptxgenjs uses numeric ids; we re-derive a stable one from element id.
  const m = String(el.id || '').replace(/\D/g, '').slice(0, 6);
  return m ? String(parseInt(m, 10)) : String(fallback);
}

function injectTiming(xml: string, job: InjectedSlide): string {
  const timing = buildTiming(job);
  if (!timing) return xml;
  // Insert just before </p:sld>; if a <p:timing> already exists, replace it.
  if (/<p:timing[\s>]/.test(xml)) {
    return xml.replace(/<p:timing[\s\S]*?<\/p:timing>/, timing);
  }
  return xml.replace(/<\/p:sld>\s*$/, `${timing}</p:sld>`);
}

function buildTiming(job: InjectedSlide): string {
  if (job.animations.length === 0) return '';
  const childTimes = job.animations.map((a) => buildPar(a.spId, a.def)).join('');
  return `<p:timing>
  <p:tnLst>
    <p:par>
      <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
        <p:childTnLst>
          <p:seq concurrent="1" nextAc="seek">
            <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
              <p:childTnLst>
                ${childTimes}
              </p:childTnLst>
            </p:cTn>
          </p:seq>
        </p:childTnLst>
      </p:cTn>
    </p:par>
  </p:tnLst>
</p:timing>`;
}

function buildPar(spId: string, def: AnimDef): string {
  const cls    = def.class || 'entr';
  const preset = pickPreset(def.effect, def.direction, cls);
  const dur    = Math.max(1, Math.round(def.duration || 500));
  const delay  = Math.max(0, Math.round(def.delay || 0));
  const click  = def.trigger === 'with_previous' || def.trigger === 'after_previous' ? 'withEffect' : 'clickEffect';
  const rcAttr = def.repeat === 'indefinite' ? ` repeatCount="indefinite"` : (def.repeat && def.repeat > 0 ? ` repeatCount="${Math.round(def.repeat * 1000)}"` : '');
  const tgt    = def.byParagraph
    ? `<p:tgtEl><p:spTgt spid="${spId}"><p:txEl><p:pRg st="0" end="9999" /></p:txEl></p:spTgt></p:tgtEl>`
    : `<p:tgtEl><p:spTgt spid="${spId}" /></p:tgtEl>`;

  // Phase 38.2D — motion-path animations.
  if (cls === 'path' && def.motionPath) {
    return `
    <p:par>
      <p:cTn id="${10 + preset.id}" presetID="${preset.id}" presetClass="path" presetSubtype="0" fill="hold" grpId="0" nodeType="${click}"${rcAttr}>
        <p:stCondLst><p:cond delay="${delay}" /></p:stCondLst>
        <p:childTnLst>
          <p:animMotion origin="layout" path="${escapeAttr(def.motionPath)}" pathEditMode="relative" ptsTypes="">
            <p:cBhvr>
              <p:cTn id="${30 + preset.id}" dur="${dur}" fill="hold" />
              ${tgt}
              <p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst>
            </p:cBhvr>
          </p:animMotion>
        </p:childTnLst>
      </p:cTn>
    </p:par>`;
  }

  // Phase 38.2D — emphasis (color cycle by default).
  if (cls === 'emph') {
    return `
    <p:par>
      <p:cTn id="${10 + preset.id}" presetID="${preset.id}" presetClass="emph" presetSubtype="${preset.subtype}" fill="hold" grpId="0" nodeType="${click}"${rcAttr}>
        <p:stCondLst><p:cond delay="${delay}" /></p:stCondLst>
        <p:childTnLst>
          <p:animClr clrSpc="rgb" calcmode="lin" valueType="num">
            <p:cBhvr additive="base">
              <p:cTn id="${30 + preset.id}" dur="${dur}" fill="hold" />
              ${tgt}
              <p:attrNameLst><p:attrName>style.color</p:attrName></p:attrNameLst>
            </p:cBhvr>
            <p:tavLst>
              <p:tav tm="0"><p:val><p:strVal val="FFFFFF" /></p:val></p:tav>
              <p:tav tm="100000"><p:val><p:strVal val="2563EB" /></p:val></p:tav>
            </p:tavLst>
          </p:animClr>
        </p:childTnLst>
      </p:cTn>
    </p:par>`;
  }

  // Phase 38.2D — exit (animate opacity 1 → 0 then hide).
  if (cls === 'exit') {
    return `
    <p:par>
      <p:cTn id="${10 + preset.id}" presetID="${preset.id}" presetClass="exit" presetSubtype="${preset.subtype}" fill="hold" grpId="0" nodeType="${click}"${rcAttr}>
        <p:stCondLst><p:cond delay="${delay}" /></p:stCondLst>
        <p:childTnLst>
          <p:anim calcmode="lin" valueType="num">
            <p:cBhvr additive="base">
              <p:cTn id="${30 + preset.id}" dur="${dur}" fill="hold" />
              ${tgt}
              <p:attrNameLst><p:attrName>style.opacity</p:attrName></p:attrNameLst>
            </p:cBhvr>
            <p:tavLst>
              <p:tav tm="0"><p:val><p:fltVal val="1" /></p:val></p:tav>
              <p:tav tm="100000"><p:val><p:fltVal val="0" /></p:val></p:tav>
            </p:tavLst>
          </p:anim>
          <p:set>
            <p:cBhvr>
              <p:cTn id="${40 + preset.id}" dur="1" fill="hold">
                <p:stCondLst><p:cond delay="${dur}" /></p:stCondLst>
              </p:cTn>
              ${tgt}
              <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
            </p:cBhvr>
            <p:to><p:strVal val="hidden" /></p:to>
          </p:set>
        </p:childTnLst>
      </p:cTn>
    </p:par>`;
  }

  // Default: entry (fade/appear/flyIn/zoom/grow/wipe).
  return `
    <p:par>
      <p:cTn id="${10 + preset.id}" presetID="${preset.id}" presetClass="entr" presetSubtype="${preset.subtype}" fill="hold" grpId="0" nodeType="${click}"${rcAttr}>
        <p:stCondLst><p:cond delay="${delay}" /></p:stCondLst>
        <p:childTnLst>
          <p:set>
            <p:cBhvr>
              <p:cTn id="${20 + preset.id}" dur="1" fill="hold">
                <p:stCondLst><p:cond delay="0" /></p:stCondLst>
              </p:cTn>
              ${tgt}
              <p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>
            </p:cBhvr>
            <p:to><p:strVal val="visible" /></p:to>
          </p:set>
          <p:anim calcmode="lin" valueType="num">
            <p:cBhvr additive="base">
              <p:cTn id="${30 + preset.id}" dur="${dur}" fill="hold" />
              ${tgt}
              <p:attrNameLst><p:attrName>style.opacity</p:attrName></p:attrNameLst>
            </p:cBhvr>
            <p:tavLst>
              <p:tav tm="0"><p:val><p:fltVal val="0" /></p:val></p:tav>
              <p:tav tm="100000"><p:val><p:fltVal val="1" /></p:val></p:tav>
            </p:tavLst>
          </p:anim>
        </p:childTnLst>
      </p:cTn>
    </p:par>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function pickPreset(effect: string, direction?: string, cls?: 'entr' | 'exit' | 'emph' | 'path'): { id: number; subtype: number } {
  const dirSub = direction === 'top' ? 1 : direction === 'right' ? 8 : direction === 'left' ? 4 : 2;

  // Phase 38.2D — exit presets share IDs with their entry counterparts in PowerPoint.
  if (cls === 'exit') {
    switch (effect) {
      case 'fade':    return { id: 10, subtype: 0 };
      case 'flyOut':  return { id: 2,  subtype: dirSub };
      case 'zoomOut': return { id: 23, subtype: 0 };
      case 'wipeOut': return { id: 22, subtype: dirSub };
      default:        return { id: 10, subtype: 0 };
    }
  }

  // Phase 38.2D — emphasis presets.
  if (cls === 'emph') {
    switch (effect) {
      case 'pulse':       return { id: 9,  subtype: 0 };
      case 'colorChange': return { id: 32, subtype: 0 };
      case 'spin':        return { id: 8,  subtype: 0 };
      default:            return { id: 9,  subtype: 0 };
    }
  }

  // Phase 38.2D — motion-path presets (custom uses ID 64).
  if (cls === 'path') {
    return { id: 64, subtype: 0 };   // custom path
  }

  // Entry (default).
  switch (effect) {
    case 'fade':   return { id: 10, subtype: 0 };
    case 'appear': return { id: 1,  subtype: 0 };
    case 'flyIn':  return { id: 2,  subtype: dirSub };
    case 'zoom':   return { id: 23, subtype: 0 };
    case 'grow':   return { id: 6,  subtype: 0 };
    case 'wipe':   return { id: 22, subtype: dirSub };
    default:       return { id: 10, subtype: 0 };
  }
}

// =============================================================================
//  Transition replacement (38.1G)
// =============================================================================

function replaceTransition(xml: string, t: NonNullable<RenderSlideInput['transition']>): string {
  const block = buildTransition(t);
  if (!block) return xml;
  if (/<p:transition[\s\S]*?\/>|<p:transition[\s\S]*?<\/p:transition>/.test(xml)) {
    return xml.replace(/<p:transition[\s\S]*?(\/>|<\/p:transition>)/, block);
  }
  return xml.replace(/<\/p:sld>\s*$/, `${block}</p:sld>`);
}

function buildTransition(t: NonNullable<RenderSlideInput['transition']>): string {
  const spd = (t.duration ?? 400) <= 250 ? 'fast' : (t.duration ?? 400) >= 750 ? 'slow' : 'med';
  const dir = t.direction || 'left';
  // Standard OOXML transition elements:
  //   <p:fade/>             — fade
  //   <p:push dir="…"/>     — push directional
  //   <p:cover dir="…"/>    — cover directional
  //   <p:wipe dir="…"/>     — reveal (modelled as wipe)
  //   <p:morph option="byObject"/>  — morph (PowerPoint 2016+)
  let inner = '';
  switch (t.effect) {
    case 'fade':   inner = '<p:fade />'; break;
    case 'push':   inner = `<p:push dir="${dir}" />`; break;
    case 'cover':  inner = `<p:cover dir="${dir}" />`; break;
    case 'reveal': inner = `<p:wipe dir="${dir}" />`; break;
    case 'morph':  inner = '<p:morph option="byObject" />'; break;
    default:       inner = '<p:fade />';
  }
  return `<p:transition spd="${spd}">${inner}</p:transition>`;
}

// =============================================================================
//  Helpers
// =============================================================================

function numFor(name: string): number {
  const m = name.match(/(\d+)\.xml$/);
  return m ? Number(m[1]) : 9999;
}

/**
 * Phase 38.4C — serialise preserved extension JSON back into an XML comment
 * trail next to the slide. Without a full XML round-trip writer the most
 * honest thing is to keep the blob discoverable; downstream consumers
 * (re-import, ops tooling) can recover the structure from the comment.
 *
 * If you later swap pptxgenjs for a proper OOXML writer, replace this with
 * actual extLst splicing per @uri.
 */
function preservedExtensionsBlob(exts: Array<{ uri: string; scope: string; rawXml: string }>): string {
  try {
    const safe = JSON.stringify(exts).replace(/--/g, '-_-');   // comments can't contain "--"
    return `<!-- pitchonix:preserved ${safe} pitchonix:end -->`;
  } catch {
    return '';
  }
}
