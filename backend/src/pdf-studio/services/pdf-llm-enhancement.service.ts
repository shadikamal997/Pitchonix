import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export type LlmEnhancementOp = 'expand' | 'shorten' | 'restructure' | 'professionalize';

export interface LlmEnhancementResult {
  enhancedContent: string;
  /** Did the content actually change? */
  changed: boolean;
  /** Did a real LLM transformation run? false = AI not configured / failed. */
  aiUsed: boolean;
  /** Human-readable status when aiUsed is false. */
  note?: string;
}

// =============================================================================
//  Phase Ω.2 — Real content transformations for PDF Studio.
//
//  Expand / Shorten / Restructure / Professionalize previously all ran the same
//  grammar regex (so the buttons lied). This service performs the ACTUAL
//  transformation via the LLM, with strict content-preservation instructions.
//  When no API key is configured it degrades HONESTLY — it returns the original
//  text with aiUsed=false so the caller can tell the user "no change" instead
//  of showing a fake success.
// =============================================================================
@Injectable()
export class PdfLlmEnhancementService {
  private readonly logger = new Logger(PdfLlmEnhancementService.name);
  private readonly openai: OpenAI | null;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    if (!apiKey || apiKey === 'your-openai-api-key-here') {
      this.logger.warn(
        'OPENAI_API_KEY not configured — LLM document enhancement disabled (honest no-op).',
      );
      this.openai = null;
    } else {
      this.openai = new OpenAI({ apiKey });
    }
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }

  private systemPrompt(op: LlmEnhancementOp, tone?: string): string {
    const preserve =
      'CRITICAL: preserve every fact, number, name, date, and claim exactly — never invent, drop, or alter information. ' +
      'If the input contains markdown or HTML structure (headings, lists, tables), keep that structure. ' +
      'Return ONLY the transformed document text, with no preamble, explanation, or code fences.';
    const toneClause = tone ? ` Target tone: ${tone}.` : '';
    switch (op) {
      case 'expand':
        return `You expand business/professional documents. Add depth, supporting detail, and clarifying explanation to each section while keeping the original meaning and structure.${toneClause} ${preserve}`;
      case 'shorten':
        return `You make business/professional documents more concise. Remove redundancy, filler, and repetition — never substance. Keep every key fact and all section headings.${toneClause} ${preserve}`;
      case 'restructure':
        return `You reorganize business/professional documents into a clear, logical structure with appropriate headings and ordering. Do not drop or invent content — only reorganize and re-headline what is present.${toneClause} ${preserve}`;
      case 'professionalize':
        return `You rewrite business/professional documents in a polished, executive-ready professional register, improving flow and word choice.${toneClause} ${preserve}`;
    }
  }

  async transform(
    content: string,
    op: LlmEnhancementOp,
    tone?: string,
  ): Promise<LlmEnhancementResult> {
    const input = (content || '').trim();
    if (!input) {
      return { enhancedContent: content, changed: false, aiUsed: false, note: 'Empty content' };
    }
    if (!this.openai) {
      return {
        enhancedContent: content,
        changed: false,
        aiUsed: false,
        note: 'AI enhancement is not configured on this server, so no changes were made.',
      };
    }
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt(op, tone) },
          { role: 'user', content: input },
        ],
        // Expansion needs headroom; others stay close to input size.
        temperature: op === 'professionalize' || op === 'restructure' ? 0.4 : 0.5,
        max_tokens: op === 'expand' ? 3000 : 2000,
      });
      const out = completion.choices?.[0]?.message?.content?.trim() || '';
      if (!out) {
        return {
          enhancedContent: content,
          changed: false,
          aiUsed: false,
          note: 'AI returned no content.',
        };
      }
      return { enhancedContent: out, changed: out !== input, aiUsed: true };
    } catch (err: any) {
      this.logger.error(`LLM ${op} failed: ${err?.message}`);
      // Honest failure — do NOT pretend success.
      return {
        enhancedContent: content,
        changed: false,
        aiUsed: false,
        note: `AI enhancement failed (${err?.message || 'unknown error'}); no changes were made.`,
      };
    }
  }
}
