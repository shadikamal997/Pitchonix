/**
 * Phase 27C — Content to Block mapper
 *
 * Takes a detected block-kind list and runs the block generators to produce
 * concrete SlideBlock objects with canonical content payloads.
 */

import { Injectable } from '@nestjs/common';
import { generateBlock } from './block-generators';
import { BlockKind, ContentStructureProfile, SlideBlock } from './types';

@Injectable()
export class ContentBlockMapper {
  /**
   * Resolve detected block kinds to concrete blocks. Drops kinds that
   * produce null payloads (insufficient data).
   */
  resolve(profile: ContentStructureProfile, detected: BlockKind[]): SlideBlock[] {
    const out: SlideBlock[] = [];
    const seen = new Set<BlockKind>();
    for (const k of detected) {
      if (seen.has(k)) continue;
      seen.add(k);
      const block = generateBlock(k, profile);
      if (block) out.push(block);
    }
    return out;
  }
}
