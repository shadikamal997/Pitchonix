import { Injectable } from '@nestjs/common';
import { getProTemplate } from '../registry/pro-template.registry';
import { ProPageArchetype, ProTemplateDefinition } from '../types';

@Injectable()
export class ProTemplateRendererService {
  canRender(proTemplateId?: string | null): boolean {
    return !!getProTemplate(proTemplateId);
  }

  renderDocument(document: any, proTemplateId: string, mode: 'preview' | 'export'): string {
    const template = getProTemplate(proTemplateId);
    if (!template) return '';

    const pages = (document.pages || []).filter((p: any) => p.pageType !== 'toc');
    const total = pages.length || 1;

    return pages
      .map((page: any, index: number) => {
        const archetype = this.resolveArchetype(page, index, total);
        const content = this.mapPageContent(page, document);
        const html = this.renderArchetype(archetype, content, template, index + 1, total);
        return mode === 'preview'
          ? `<div class="a4-page pro-page">${html}</div>`
          : `${index === 0 ? '' : '<div class="page-break"></div>'}${html}`;
      })
      .join('');
  }

  // ─── Archetype resolution ─────────────────────────────────────────────────

  private resolveArchetype(page: any, index: number, total: number): ProPageArchetype {
    const type  = String(page.pageType || '').toLowerCase();
    const title = String(page.title    || '').toLowerCase();
    const text  = String(page.content?.text || '');
    // isContinuation is stored inside the content JSON, not as a top-level column
    const isContinuation = !!(page.isContinuation ?? (page.content as any)?.isContinuation);

    // Fixed positional archetypes
    if (index === 0 || type === 'cover') return 'cover';
    // Only assign closing when the document has enough pages to warrant a dedicated ending
    if (index === total - 1 && total >= 4) return 'closing';

    // Continuation pages always get a plain content layout — never a specialized one
    if (isContinuation) return 'content';

    // Explicit section / divider pages
    if (type === 'section' || type === 'divider') return 'section-divider';

    // First content page → introduction
    if (index === 1) return 'introduction';

    // ── Title-keyword signals ────────────────────────────────────────
    if (this.titleMatch(title, ['swot', 'strengths', 'weaknesses', 'opportunities', 'threats']))
      return 'swot-grid';

    if (this.titleMatch(title, ['timeline', 'roadmap', 'phases', 'milestones', 'schedule', 'process', 'plan']))
      return 'timeline';

    if (this.titleMatch(title, ['team', 'features', 'services', 'benefits', 'advantages', 'offerings', 'capabilities']))
      return 'feature-list';

    if (this.titleMatch(title, ['metrics', 'kpis', 'performance', 'results', 'statistics', 'analytics', 'numbers']))
      return 'stats';

    if (this.titleMatch(title, ['overview', 'highlights', 'about', 'who we are']))
      return 'image-text';

    // ── Content-signal detection ─────────────────────────────────────
    const metrics = this.extractMetrics(text);
    if (metrics.length >= 3) return 'stats';

    // List-heavy content → feature-list
    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 8);
    const bulletLines = lines.filter((l: string) => /^[-*•·]/.test(l) || /^\d+[.)]\s/.test(l));
    if (lines.length >= 4 && bulletLines.length / lines.length > 0.45) return 'feature-list';

    return 'content';
  }

  private titleMatch(title: string, keywords: string[]): boolean {
    return keywords.some(k => title.includes(k));
  }

  // ─── Content extraction ───────────────────────────────────────────────────

  private mapPageContent(page: any, document: any) {
    const rawText = this.readText(page);

    // Split into raw lines, clean markdown/HTML artifacts
    const allLines = rawText
      .split(/\n+/)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    // Paragraphs: longer lines that are not list items
    const paragraphs = allLines
      .filter((l: string) => l.length >= 30 && !/^[-*•·]/.test(l) && !/^\d+[.)]\s/.test(l))
      .map((l: string) => l.replace(/^#{1,6}\s+/, '').trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 10);

    // Bullets: list items, cleaned (also strip stray markdown heading markers)
    const bullets = allLines
      .filter((l: string) => /^[-*•·]/.test(l) || /^\d+[.)]\s/.test(l))
      .map((l: string) => l.replace(/^[-*•·\d.)]+\s*/, '').replace(/^#{1,6}\s+/, '').trim())
      .filter((l: string) => l.length >= 5)
      .slice(0, 12);

    // If no distinct bullets, derive from short-ish paragraph lines
    const derivedBullets = bullets.length >= 2 ? bullets
      : allLines
          .map((l: string) => l.replace(/^[-*•·#\d.)]+\s*/, '').trim())
          .filter((l: string) => l.length >= 10 && l.length < 180)
          .slice(0, 8);

    const metrics = this.extractMetrics(rawText);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const isContinuation = !!(page.isContinuation ?? (page.content as any)?.isContinuation);

    // For continuation pages, derive a per-page title instead of repeating the parent section label.
    let title = page.title || document.title || 'Untitled';
    if (isContinuation) {
      // Priority 1: explicit heading line in the content
      const headingLine = allLines.find(
        l => /^#{1,6}\s/.test(l) || (!l.startsWith('-') && !l.startsWith('*') && l.length >= 10 && l.length <= 80),
      );
      if (headingLine) {
        const derived = headingLine.replace(/^#{1,6}\s+/, '').trim();
        if (derived && derived !== title) { title = derived; }
      } else if (bullets.length > 0) {
        // Priority 2: derive from first bullet — extract first 3-4 meaningful words
        const SKIP_STARTS = /^(ultimately|however|therefore|furthermore|moreover|additionally|in addition|in only|by using|through|with the|this means|as a result|for example|for instance)/i;
        const raw = bullets[0].replace(SKIP_STARTS, '').trim();
        const words = raw.split(/[\s,;:]+/).filter((w: string) => w.length > 1);
        if (words.length >= 2) {
          // Take 3 meaningful words, skip trailing prepositions/articles
          const TRAILING_WEAK = /\b(in|the|a|an|to|of|for|and|or|but|can|will|may|this|that|with|by|is|are|was|were|have|has|be|it|its|their|our|your)\s*$/i;
          const phrase = words.slice(0, 3).join(' ').replace(TRAILING_WEAK, '').trim();
          if (phrase.length > 3) title = phrase.charAt(0).toUpperCase() + phrase.slice(1);
        }
      }
    }

    return {
      title:         this.escape(title),
      documentTitle: this.escape(document.title || page.title  || 'Untitled'),
      label:         this.escape(page.pageType || 'Section'),
      paragraphs:    paragraphs.map((p: string) => this.escape(p)),
      bullets:       derivedBullets.map((b: string) => this.escape(b)),
      metrics,
      wordCount,
      isContinuation,
    };
  }

  private readText(page: any): string {
    const raw = page.content?.text;
    if (raw === null || raw === undefined) return page.title ? String(page.title) : '';

    // Prisma Json fields may store nested objects directly (not as JSON strings).
    // Handle both: already-parsed object OR JSON string.
    const parsed: any =
      typeof raw === 'object'
        ? raw
        : (() => { try { return JSON.parse(String(raw)); } catch { return null; } })();

    if (parsed && typeof parsed === 'object') {
      // Mark list-like items as explicit markdown bullets so mapPageContent
      // detects them correctly (overview, bullets, points arrays on cover pages).
      const listLines = [
        ...(parsed.overview || []).map((s: string) => `- ${s}`),
        ...(parsed.bullets  || []).map((s: string) => `- ${s}`),
        ...(parsed.points   || []).map((s: string) => `- ${s}`),
      ];
      const textLines = [parsed.subtitle, parsed.description, parsed.body].filter(Boolean);
      return [...listLines, ...textLines].join('\n');
    }

    // Plain string content: strip HTML tags but preserve newlines for line-by-line parsing
    return String(raw).replace(/<[^>]+>/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  }

  // ─── Archetype renderers ──────────────────────────────────────────────────

  private renderArchetype(
    archetype: ProPageArchetype,
    content: any,
    template: ProTemplateDefinition,
    page: number,
    total: number,
  ): string {
    const c      = template.tokens.colors;
    const footer = this.footer(c, page, total);

    switch (archetype) {
      case 'cover':         return this.renderCover(content, c, footer);
      case 'introduction':  return this.renderIntro(content, c, footer);
      case 'section-divider': return this.renderDivider(content, c, footer);
      case 'feature-list':  return this.renderFeatureList(content, c, footer);
      case 'stats':         return this.renderStats(content, c, footer);
      case 'timeline':      return this.renderTimeline(content, c, footer);
      case 'swot-grid':     return this.renderSwot(content, c, footer);
      case 'image-text':    return this.renderImageText(content, c, footer);
      case 'closing':       return this.renderClosing(content, c, footer);
      default:              return this.renderContent(content, c, footer);
    }
  }

  // COVER — 2-col, title + decorative right panel
  private renderCover(content: any, c: any, footer: string): string {
    const chips = content.bullets.slice(0, 4)
      .map((b: string) => `<span>${b.split(/\s+/).slice(0, 3).join(' ')}</span>`)
      .join('');
    return `<section class="pro-sheet pro-cover">
      <div class="pro-cover-left">
        <div class="pro-eyebrow">${content.label}</div>
        <h1>${content.documentTitle}</h1>
        ${content.paragraphs[0] ? `<p class="pro-cover-lead">${content.paragraphs[0]}</p>` : ''}
        ${chips ? `<div class="pro-chip-row">${chips}</div>` : ''}
      </div>
      <div class="pro-hero-art">
        <div class="pro-hero-card">
          <strong>01</strong>
          <span>${content.label || 'Document'}</span>
        </div>
        <i></i><em></em>
      </div>
      ${footer}
    </section>`;
  }

  // INTRODUCTION — dark left sidebar + rich content right
  // Falls back to full-width content mode when the page has sparse content.
  private renderIntro(content: any, c: any, footer: string): string {
    const richEnough = content.paragraphs.length >= 2 || content.bullets.length >= 4;
    if (!richEnough) return this.renderContent(content, c, footer);

    const paras = content.paragraphs.slice(0, 5).map((p: string) => `<p>${p}</p>`).join('');
    const hasBullets = content.bullets.length >= 2;
    const bulletHtml = hasBullets
      ? `<div class="pro-callout-list">${content.bullets.slice(0, 6).map((b: string) =>
          `<div class="pro-callout-item"><span class="pro-dot"></span>${b}</div>`).join('')}</div>`
      : (content.paragraphs[2] ? `<div class="pro-callout">${content.paragraphs[2]}</div>` : '');

    return `<section class="pro-sheet pro-intro">
      <div class="pro-label"><span></span>${content.label}</div>
      <div class="pro-two-col">
        <aside>
          <strong>01</strong>
          <small>Introduction</small>
          <div class="pro-side-rule"></div>
        </aside>
        <main>
          <h2>${content.title}</h2>
          ${paras}
          ${bulletHtml}
        </main>
      </div>
      ${footer}
    </section>`;
  }

  // SECTION DIVIDER — full-page dark break (only for actual dividers)
  private renderDivider(content: any, c: any, footer: string): string {
    return `<section class="pro-sheet pro-divider">
      <div>
        <small>${content.label}</small>
        <h2>${content.title}</h2>
        ${content.paragraphs[0] ? `<p>${content.paragraphs[0]}</p>` : ''}
      </div>
      <div class="pro-arc"></div>
      ${footer}
    </section>`;
  }

  // FEATURE LIST — numbered cards grid, all bullets shown
  private renderFeatureList(content: any, c: any, footer: string): string {
    // Use bullets if available, otherwise derive from paragraphs
    const items = content.bullets.length >= 2
      ? content.bullets.slice(0, 10)
      : content.paragraphs.slice(0, 8);

    const grid = items
      .map((item: string, i: number) =>
        `<div class="pro-list-item">
          <b>${i + 1}</b>
          <span>${item}</span>
        </div>`)
      .join('');

    // If we have extra paragraphs beyond what became bullets, show them
    const extraParas = content.bullets.length >= 2
      ? content.paragraphs.slice(0, 2).map((p: string) => `<p class="pro-feature-lead">${p}</p>`).join('')
      : '';

    return `<section class="pro-sheet pro-features">
      <div class="pro-section-head">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${extraParas}
      </div>
      <div class="pro-feature-grid">${grid}</div>
      ${footer}
    </section>`;
  }

  // STATS — real metrics + supporting text
  private renderStats(content: any, c: any, footer: string): string {
    // Only show real metrics; if fewer than 3, pad from bullets contextually
    const realMetrics = content.metrics.slice(0, 6);
    if (realMetrics.length === 0) {
      // Degrade to content layout if no real metrics
      return this.renderContent(content, c, footer);
    }

    const labels = content.bullets.slice(0, realMetrics.length);
    const cards = realMetrics.slice(0, 3)
      .map((m: string, i: number) =>
        `<div class="pro-metric ${i === 1 ? 'dark' : ''}">
          <strong>${this.escape(m)}</strong>
          <span>${labels[i] || 'Key metric'}</span>
        </div>`)
      .join('');

    const paras = content.paragraphs.slice(0, 3).map((p: string) => `<p>${p}</p>`).join('');

    return `<section class="pro-sheet pro-stats">
      <div class="pro-label"><span></span>${content.label}</div>
      <h2>${content.title}</h2>
      <div class="pro-metrics">${cards}</div>
      ${paras ? `<div class="pro-stats-body">${paras}</div>` : ''}
      <div class="pro-progress"></div>
      ${footer}
    </section>`;
  }

  // TIMELINE — sequential steps, uses bullets as steps
  private renderTimeline(content: any, c: any, footer: string): string {
    const steps = content.bullets.length >= 2
      ? content.bullets.slice(0, 8)
      : content.paragraphs.slice(0, 6);

    if (steps.length === 0) return this.renderContent(content, c, footer);

    const stepHtml = steps
      .map((step: string, i: number) =>
        `<div class="pro-step">
          <b>${i + 1}</b>
          <span>${step}</span>
        </div>`)
      .join('');

    const leadPara = content.paragraphs[0] && content.bullets.length >= 2
      ? `<p class="pro-timeline-lead">${content.paragraphs[0]}</p>` : '';

    return `<section class="pro-sheet pro-timeline">
      <div class="pro-label"><span></span>${content.label}</div>
      <h2>${content.title}</h2>
      ${leadPara}
      <div class="pro-steps">${stepHtml}</div>
      ${footer}
    </section>`;
  }

  // SWOT GRID — 4-quadrant analysis
  private renderSwot(content: any, c: any, footer: string): string {
    const quadrants = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
    const cells = quadrants
      .map((label, i) => {
        const body = content.bullets[i] || content.paragraphs[i] || '';
        return `<div class="pro-swot-cell">
          <b>${label}</b>
          <p>${body || 'Add details here'}</p>
        </div>`;
      })
      .join('');

    const leadPara = content.paragraphs[4] || content.paragraphs[0];

    return `<section class="pro-sheet pro-grid">
      <div class="pro-label"><span></span>${content.label}</div>
      <h2>${content.title}</h2>
      ${leadPara ? `<p class="pro-swot-lead">${leadPara}</p>` : ''}
      <div class="pro-swot">${cells}</div>
      ${footer}
    </section>`;
  }

  // IMAGE-TEXT — gradient art panel + text content
  private renderImageText(content: any, c: any, footer: string): string {
    const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
    const callout = content.bullets[0] || content.paragraphs[4] || '';

    return `<section class="pro-sheet pro-image-text">
      <div class="pro-label"><span></span>${content.label}</div>
      <div class="pro-it-grid">
        <div class="pro-image">
          <span></span>
          <b>${content.label}</b>
        </div>
        <div class="pro-it-copy">
          <h2>${content.title}</h2>
          ${paras}
          ${callout ? `<div class="pro-callout">${callout}</div>` : ''}
        </div>
      </div>
      ${footer}
    </section>`;
  }

  // CLOSING — full dark page with summary
  private renderClosing(content: any, c: any, footer: string): string {
    const paras = content.paragraphs.slice(0, 2).map((p: string) => `<p>${p}</p>`).join('');
    return `<section class="pro-sheet pro-closing">
      <h2>${content.title || 'Thank You'}</h2>
      ${paras}
      <div class="pro-closing-bullets">
        ${content.bullets.slice(0, 3).map((b: string) =>
          `<div class="pro-closing-item"><span class="pro-dot accent"></span>${b}</div>`).join('')}
      </div>
      ${footer}
    </section>`;
  }

  // CONTENT — adaptive layout: chooses mode based on actual content composition
  private renderContent(content: any, c: any, footer: string): string {
    const paraCount   = content.paragraphs.length;
    const bulletCount = content.bullets.length;

    // Nothing at all — minimal fallback
    if (paraCount === 0 && bulletCount === 0) {
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single">
          <h2>${content.title}</h2>
        </div>
        ${footer}
      </section>`;
    }

    // ── MODE A: Bullet-dominant (≥4 bullets, ≤2 paragraphs) ─────────────────
    // Full-width: lead paragraph + 2-column bullet grid.
    // This fills the page instead of pushing bullets into a narrow sidebar.
    if (bulletCount >= 4 && paraCount <= 2) {
      const lead = content.paragraphs[0] ? `<p class="pro-lead">${content.paragraphs[0]}</p>` : '';
      const extraPara = content.paragraphs[1] ? `<p class="pro-lead">${content.paragraphs[1]}</p>` : '';
      const grid = content.bullets
        .map((b: string, i: number) =>
          `<div class="pro-list-item">
            <b>${i + 1}</b>
            <span>${b}</span>
          </div>`)
        .join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single">
          <h2>${content.title}</h2>
          ${lead}${extraPara}
        </div>
        <div class="pro-bullet-grid">${grid}</div>
        ${footer}
      </section>`;
    }

    // ── MODE B: Paragraph-dominant (≥3 paragraphs) ───────────────────────────
    // Full-width readable text, bullets appended inline below.
    if (paraCount >= 3) {
      const paras = content.paragraphs
        .slice(0, 8)
        .map((p: string) => `<p>${p}</p>`)
        .join('');
      const inlineBullets = bulletCount >= 2
        ? `<div class="pro-callout-list">${
            content.bullets.slice(0, 6).map((b: string) =>
              `<div class="pro-callout-item"><span class="pro-dot"></span>${b}</div>`
            ).join('')
          }</div>`
        : '';
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single">
          <h2>${content.title}</h2>
          ${paras}
          ${inlineBullets}
        </div>
        ${footer}
      </section>`;
    }

    // ── MODE C: Mixed content (1–2 paragraphs + 1–3 bullets) ────────────────
    // Wide editorial: paragraphs left, compact bullets right.
    const paras = content.paragraphs.map((p: string) => `<p>${p}</p>`).join('');
    const sideItems = content.bullets
      .map((b: string, i: number) =>
        `<div class="pro-list-item compact">
          <b>${i + 1}</b>
          <span>${b}</span>
        </div>`)
      .join('');

    return `<section class="pro-sheet pro-content">
      <div class="pro-label"><span></span>${content.label}</div>
      <div class="pro-content-wide">
        <div class="pro-content-main">
          <h2>${content.title}</h2>
          ${paras}
        </div>
        ${sideItems ? `<aside class="pro-content-side">${sideItems}</aside>` : ''}
      </div>
      ${footer}
    </section>`;
  }

  // ─── Footer ───────────────────────────────────────────────────────────────

  private footer(c: any, page: number, total: number): string {
    return `<footer class="pro-footer">
      <span>Pitchonix Studio</span>
      <span>${String(page).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
    </footer>`;
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  private getFontImport(display: string, body: string): string {
    const GOOGLE_FONTS: Record<string, string> = {
      'Inter':               'Inter:wght@400;500;600;700;900',
      'Libre Baskerville':   'Libre+Baskerville:wght@400;700',
      'Manrope':             'Manrope:wght@400;600;700;800',
      'Space Grotesk':       'Space+Grotesk:wght@400;500;600;700',
      'DM Sans':             'DM+Sans:wght@400;500;600;700;900',
      'Playfair Display':    'Playfair+Display:wght@400;700;900',
      'Lora':                'Lora:wght@400;600;700',
      'Cormorant Garamond':  'Cormorant+Garamond:wght@400;600;700',
      'Syne':                'Syne:wght@400;600;700;800',
      'Outfit':              'Outfit:wght@400;500;600;700;900',
      'Nunito':              'Nunito:wght@400;600;700;800;900',
      'IBM Plex Sans':       'IBM+Plex+Sans:wght@400;500;600;700',
    };
    const families = [...new Set([display, body])]
      .filter(f => GOOGLE_FONTS[f])
      .map(f => `family=${GOOGLE_FONTS[f]}`)
      .join('&');
    return families
      ? `@import url('https://fonts.googleapis.com/css2?${families}&display=swap');`
      : '';
  }

  getStyles(templateId: string): string {
    const template = getProTemplate(templateId);
    const c = template?.tokens.colors;
    const display = template?.tokens.typography?.display || 'Inter';
    const body    = template?.tokens.typography?.body    || 'Inter';
    if (!c) return '';

    return `
      ${this.getFontImport(display, body)}
      /* ── Base ── */
      .pro-page { padding: 0 !important; background: ${c.paper} !important; }
      .pro-sheet {
        width: 210mm; min-height: 297mm; position: relative; overflow: hidden;
        background: ${c.paper}; color: ${c.ink};
        font-family: '${body}', Inter, -apple-system, sans-serif;
        padding: 22mm 21mm 24mm;
        box-sizing: border-box;
      }
      .pro-sheet > * { position: relative; z-index: 1; }
      .pro-sheet::before {
        content: ''; position: absolute; right: -38mm; top: -44mm;
        width: 108mm; height: 108mm; border-radius: 999px;
        background: ${c.accentSoft}; z-index: 0; opacity: .7;
      }

      /* ── Typography ── */
      .pro-sheet h1 {
        font-family: '${display}', Inter, sans-serif;
        font-size: 52px; line-height: .93; margin: 14px 0 16px;
        font-weight: 950; color: ${c.ink}; max-width: 130mm;
      }
      .pro-sheet h2 {
        font-family: '${display}', Inter, sans-serif;
        font-size: 32px; line-height: 1.05; margin: 8px 0 14px;
        font-weight: 900; color: ${c.ink};
      }
      .pro-sheet p {
        font-size: 13px; line-height: 1.68; color: ${c.muted}; margin: 0 0 10px;
      }

      /* ── Utility ── */
      .pro-eyebrow {
        display: inline-flex; border: 1px solid ${c.line}; border-radius: 999px;
        padding: 6px 12px; font-size: 9.5px; font-weight: 900;
        text-transform: uppercase; letter-spacing: 1.6px;
        color: ${c.ink}; background: white; margin-bottom: 18px;
      }
      .pro-label {
        display: flex; align-items: center; gap: 7px;
        font-size: 9px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 2px; color: ${c.accent}; margin-bottom: 6px;
      }
      .pro-label span {
        width: 7px; height: 7px; border-radius: 99px;
        background: ${c.accent}; display: inline-block;
      }
      .pro-dot {
        display: inline-block; width: 6px; height: 6px; border-radius: 99px;
        background: ${c.accent}; flex-shrink: 0; margin-top: 5px;
      }
      .pro-dot.accent { background: rgba(255,255,255,.65); }
      .pro-callout {
        margin-top: 10mm; background: ${c.accentSoft};
        border-left: 4px solid ${c.accent}; border-radius: 14px;
        padding: 7mm 8mm; font-size: 13px; font-weight: 700; color: ${c.ink};
        line-height: 1.5;
      }
      .pro-footer {
        position: absolute; left: 21mm; right: 21mm; bottom: 10mm;
        display: flex; justify-content: space-between;
        border-top: 1px solid ${c.line}; padding-top: 8px;
        font-size: 8.5px; font-weight: 900; text-transform: uppercase;
        letter-spacing: 1.4px; color: ${c.muted};
      }

      /* ── Cover ── */
      .pro-cover { display: grid; grid-template-columns: 1.1fr .9fr; gap: 16mm; align-items: center; }
      .pro-cover-left { display: flex; flex-direction: column; justify-content: center; }
      .pro-cover-lead { font-size: 14px; line-height: 1.6; max-width: 100mm; margin-bottom: 0; }
      .pro-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12mm; }
      .pro-chip-row span {
        border-radius: 999px; background: ${c.charcoal}; color: white;
        padding: 7px 11px; font-size: 9.5px; font-weight: 900;
        text-transform: uppercase; letter-spacing: .9px;
      }
      .pro-hero-art {
        height: 188mm; border-radius: 26px 26px 26px 84px;
        background: radial-gradient(circle at 70% 22%, rgba(255,255,255,.22), transparent 25%),
                    linear-gradient(145deg, ${c.charcoal}, ${c.accent});
        position: relative; overflow: hidden;
        box-shadow: 0 22px 52px rgba(31,41,51,.18);
      }
      .pro-hero-art i {
        position: absolute; right: -22mm; top: 16mm;
        width: 88mm; height: 88mm; border: 1px solid rgba(255,255,255,.28); border-radius: 99px;
      }
      .pro-hero-art em {
        position: absolute; left: 16mm; bottom: 16mm;
        width: 56mm; height: 7px; background: rgba(255,255,255,.62); border-radius: 99px;
      }
      .pro-hero-card {
        position: absolute; left: 14mm; top: 16mm; width: 46mm;
        border-radius: 20px; background: rgba(255,255,255,.13);
        border: 1px solid rgba(255,255,255,.2); padding: 11mm 7mm;
        color: white; backdrop-filter: blur(8px);
      }
      .pro-hero-card strong { display: block; font-size: 38px; line-height: 1; font-weight: 950; }
      .pro-hero-card span { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; color: rgba(255,255,255,.72); }

      /* ── Introduction ── */
      .pro-two-col { display: grid; grid-template-columns: .75fr 1.25fr; gap: 14mm; align-items: start; margin-top: 10px; }
      .pro-two-col aside {
        background: ${c.charcoal}; color: white; border-radius: 24px;
        padding: 16mm 11mm; min-height: 120mm; box-shadow: 0 16px 42px rgba(31,41,51,.14);
      }
      .pro-two-col aside strong { font-size: 52px; display: block; line-height: 1; font-weight: 950; }
      .pro-two-col aside small { display: block; margin-top: 7px; font-size: 9.5px; font-weight: 950; text-transform: uppercase; letter-spacing: 1.6px; color: rgba(255,255,255,.64); }
      .pro-side-rule { width: 100%; height: 7px; border-radius: 99px; background: ${c.accent}; margin-top: 36mm; }
      .pro-callout-list { margin-top: 10mm; display: flex; flex-direction: column; gap: 6px; }
      .pro-callout-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.4; color: ${c.ink}; font-weight: 600; }

      /* ── Section divider ── */
      .pro-divider {
        background: ${c.charcoal}; color: white;
        display: flex; align-items: center;
      }
      .pro-divider::before { background: rgba(255,255,255,.06); }
      .pro-divider h2 { color: white; font-size: 58px; max-width: 136mm; margin-bottom: 12px; }
      .pro-divider p { color: rgba(255,255,255,.7); max-width: 110mm; }
      .pro-divider small { display: block; color: ${c.accent}; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; font-size: 9px; margin-bottom: 16px; }
      .pro-arc {
        position: absolute; right: -22mm; top: 40mm;
        width: 116mm; height: 116mm;
        border: 2px solid rgba(255,255,255,.18); border-radius: 99px;
      }

      /* ── Feature list ── */
      .pro-section-head { max-width: 138mm; margin-bottom: 6mm; }
      .pro-feature-lead { font-size: 13px; color: ${c.muted}; margin-bottom: 8px; }
      .pro-feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 8mm; }
      .pro-list-item {
        display: flex; gap: 9px; align-items: flex-start;
        background: ${c.accentSoft}; border: 1px solid ${c.line};
        border-radius: 16px; padding: 11px 12px;
      }
      .pro-list-item.compact { border-radius: 12px; padding: 9px 10px; }
      .pro-list-item b {
        min-width: 24px; height: 24px; border-radius: 99px;
        background: ${c.accent}; display: inline-flex;
        align-items: center; justify-content: center;
        color: white; font-size: 10px; font-weight: 900; flex-shrink: 0;
      }
      .pro-list-item span { font-size: 11.5px; line-height: 1.4; font-weight: 600; color: ${c.ink}; }

      /* ── Stats ── */
      .pro-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 7mm; margin: 16mm 0 12mm; }
      .pro-metric {
        background: ${c.accentSoft}; border: 1px solid ${c.line};
        border-radius: 22px; padding: 14mm 7mm; text-align: center;
      }
      .pro-metric.dark { background: ${c.charcoal}; color: white; }
      .pro-metric strong { display: block; font-size: 32px; line-height: 1; font-weight: 950; }
      .pro-metric span { display: block; margin-top: 7px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; color: ${c.muted}; }
      .pro-metric.dark span { color: rgba(255,255,255,.58); }
      .pro-stats-body p { font-size: 13px; color: ${c.muted}; line-height: 1.65; margin-bottom: 8px; }
      .pro-progress { height: 8px; border-radius: 99px; background: linear-gradient(90deg, ${c.accent} 68%, ${c.line} 68%); margin-top: 14mm; }

      /* ── Timeline ── */
      .pro-timeline-lead { font-size: 13px; color: ${c.muted}; margin-bottom: 4mm; }
      .pro-steps { display: grid; gap: 6mm; margin-top: 12mm; position: relative; }
      .pro-steps::before {
        content: ''; position: absolute; left: 16px; top: 20px; bottom: 20px;
        width: 1px; background: ${c.line};
      }
      .pro-step {
        display: grid; grid-template-columns: 32px 1fr; gap: 11px; align-items: center;
        background: white; border: 1px solid ${c.line}; border-radius: 20px;
        padding: 11px 13px; box-shadow: 0 8px 24px rgba(31,41,51,.05);
      }
      .pro-step b {
        min-width: 28px; height: 28px; border-radius: 99px;
        background: ${c.accent}; display: inline-flex;
        align-items: center; justify-content: center;
        color: white; font-size: 10px; font-weight: 900;
      }
      .pro-step span { font-size: 12px; line-height: 1.4; font-weight: 600; color: ${c.ink}; }

      /* ── SWOT ── */
      .pro-swot-lead { font-size: 13px; color: ${c.muted}; margin-bottom: 4mm; }
      .pro-swot { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 10mm; }
      .pro-swot-cell {
        background: white; border: 1px solid ${c.line}; border-radius: 20px;
        padding: 9mm; min-height: 56mm; box-shadow: 0 8px 24px rgba(31,41,51,.04);
      }
      .pro-swot-cell b { font-size: 11px; text-transform: uppercase; letter-spacing: 1.1px; color: ${c.accent}; display: block; margin-bottom: 8px; }
      .pro-swot-cell p { font-size: 12px; line-height: 1.5; color: ${c.muted}; margin: 0; }

      /* ── Image-text ── */
      .pro-it-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: 13mm; align-items: start; margin-top: 10px; }
      .pro-image {
        height: 176mm; border-radius: 24px 24px 72px 24px;
        background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.26), transparent 20%),
                    linear-gradient(145deg, ${c.charcoal}, ${c.accent});
        position: relative; overflow: hidden; box-shadow: 0 18px 44px rgba(31,41,51,.16);
      }
      .pro-image span {
        position: absolute; left: 13mm; top: 13mm;
        width: 44mm; height: 44mm; border-radius: 999px; border: 1px solid rgba(255,255,255,.32);
      }
      .pro-image b {
        position: absolute; left: 13mm; bottom: 13mm;
        color: white; font-size: 10.5px; font-weight: 950;
        text-transform: uppercase; letter-spacing: 1.6px;
      }
      .pro-it-copy h2 { margin-top: 4mm; }

      /* ── Closing ── */
      .pro-closing {
        background: ${c.charcoal}; color: white;
        display: flex; flex-direction: column; justify-content: center;
      }
      .pro-closing::before { background: rgba(255,255,255,.05); }
      .pro-closing h2 { color: white; font-size: 54px; max-width: 138mm; }
      .pro-closing p { color: rgba(255,255,255,.7); max-width: 126mm; }
      .pro-closing-bullets { margin-top: 14mm; display: flex; flex-direction: column; gap: 8px; }
      .pro-closing-item { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.82); }

      /* ── Content (adaptive) ── */
      .pro-content-single h2 { margin-top: 4mm; }
      .pro-lead { font-size: 14px; line-height: 1.65; color: ${c.muted}; margin-bottom: 6mm; font-weight: 500; }

      /* Bullet grid (MODE A): 2-column grid fills page when content is list-heavy */
      .pro-bullet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; margin-top: 8mm; }
      .pro-bullet-grid .pro-list-item { border-radius: 14px; padding: 10px 12px; }

      /* Wide editorial (MODE C): wider left column, compact right */
      .pro-content-wide { display: grid; grid-template-columns: 1.4fr .6fr; gap: 12mm; align-items: start; }
      .pro-content-main h2 { margin-top: 0; }
      .pro-content-side { display: flex; flex-direction: column; gap: 4mm; margin-top: 44px; }
      .pro-content-side .pro-list-item.compact { padding: 8px 10px; }

      /* Inline callout bullets (MODE B) */
      .pro-callout-list { margin-top: 8mm; display: flex; flex-direction: column; gap: 5px; }
      .pro-callout-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.4; color: ${c.ink}; font-weight: 600; }
    `;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractMetrics(text: string): string[] {
    const matches = Array.from(
      text.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s?(?:%|x|k|m|b|million|billion)\b/gi),
    ).map(m => m[0].trim());
    // Deduplicate
    return [...new Set(matches)].slice(0, 6);
  }

  private escape(value: any): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
