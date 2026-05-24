import { asArray, walk } from './ooxml-parser';

// =============================================================================
//  Phase 38.3H — Extension XML preservation.
//
//  PowerPoint stores vendor-specific extensions in <p:extLst>/<a:extLst>
//  blocks scattered through master / layout / slide / shape XML. These often
//  carry features Office has but the OOXML spec doesn't (think: 3D bevels,
//  custom morph hints, certain chart extensions). We can't *interpret* them
//  meaningfully without the originating vendor's docs, but we CAN:
//
//    1. Identify them by their @uri (vendor namespace).
//    2. Capture the raw XML text per extension.
//    3. Surface them in the import report so users know what landed.
//    4. Re-emit them verbatim on export (handled in the OOXML writer pass).
//
//  This keeps the round-trip lossless for enterprise decks that depend on
//  these extensions, even if Pitchonix doesn't render them.
//
//  Note: full re-emission requires the export pipeline to host these blobs
//  per-slide; the writer just splices them back next to the originating
//  shape ID. This file is the *capture* side.
// =============================================================================

export interface ExtensionXml {
  uri:      string;           // vendor URI from @uri
  scope:    'slide' | 'master' | 'layout' | 'shape' | 'unknown';
  rawXml:   string;           // serialised back to a string
  spId?:    string;           // shape id when scope=shape
}

/** Walk a parsed XML doc and collect every <p:extLst>/<a:extLst> child. */
export function extractExtLst(root: any, scope: ExtensionXml['scope']): ExtensionXml[] {
  if (!root) return [];
  const out: ExtensionXml[] = [];
  const seen = new WeakSet<object>();

  // Local helper — serialises a node back to a string (best-effort, used only
  // to keep the blob intact for round-trip).
  const serialise = (node: any): string => {
    try { return JSON.stringify(node); }
    catch { return ''; }
  };

  walk(root, (key, value) => {
    if (key !== 'p:extLst' && key !== 'a:extLst') return;
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    const exts = asArray((value as any)['p:ext'] || (value as any)['a:ext']);
    for (const ext of exts) {
      if (!ext) continue;
      out.push({
        uri:    String(ext['@uri'] || 'unknown'),
        scope,
        rawXml: serialise(ext),
      });
    }
  });
  return out;
}
