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

    const raw = (document.pages || []).filter((p: any) => p.pageType !== 'toc');
    const pages = this.mergeSparsePagesForPro(raw);
    const total = pages.length || 1;

    return pages
      .map((page: any, index: number) => {
        const archetype = this.resolveArchetype(page, index, total);
        const content = this.mapPageContent(page, document);
        let html = this.renderArchetype(archetype, content, template, index + 1, total);

        // Inject placed images as absolute overlays (pro-sheet already has position:relative)
        const placedImagesHtml = this.renderPlacedImages(page);
        if (placedImagesHtml) {
          html = html.replace('</section>', `${placedImagesHtml}</section>`);
        }

        return mode === 'preview'
          ? `<div class="a4-page pro-page">${html}</div>`
          : `${index === 0 ? '' : '<div class="page-break"></div>'}${html}`;
      })
      .join('');
  }

  private renderPlacedImages(page: any): string {
    const imgs: any[] = page?.content?.placedImages;
    if (!Array.isArray(imgs) || imgs.length === 0) return '';
    return imgs
      .filter((img: any) => img?.url)
      .map((img: any) => {
        const x  = Math.max(0, Math.min(100, Number(img.x)       || 0));
        const y  = Math.max(0, Math.min(100, Number(img.y)       || 0));
        const w  = Math.max(5, Math.min(100, Number(img.width)   || 50));
        const h  = Math.max(5, Math.min(100, Number(img.height)  || 30));
        const z  = Math.max(1, Math.min(50,  Number(img.zIndex)  || 2));
        const op = Math.max(0.05, Math.min(1, Number(img.opacity) || 1));
        const fit = ['cover', 'contain', 'fill'].includes(img.fit) ? img.fit : 'cover';
        const safeUrl = this.escape(img.url);
        return `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${z};pointer-events:none;overflow:hidden;border-radius:3px;">
          <img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:${fit};opacity:${op};display:block;" />
        </div>`;
      })
      .join('');
  }

  private mergeSparsePagesForPro(pages: any[]): any[] {
    const SPARSE_THRESHOLD = 60;
    const result: any[] = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const type = String(page.pageType || '').toLowerCase();
      const isCover = type === 'cover' || i === 0;
      if (isCover) { result.push(page); continue; }
      const rawText = String(page.content?.text || '');
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      if (wordCount < SPARSE_THRESHOLD && i + 1 < pages.length) {
        const next = pages[i + 1];
        const nextType = String(next.pageType || '').toLowerCase();
        if (nextType !== 'cover') {
          const mergedText = rawText + '\n\n' + String(next.content?.text || '');
          pages[i + 1] = { ...next, title: page.title || next.title, content: { ...next.content, text: mergedText } };
          continue;
        }
      }
      result.push(page);
    }
    return result;
  }

  // ─── Design family lookup ─────────────────────────────────────────────────

  private getDesignFamily(templateId: string): string {
    const map: Record<string, string> = {
      'modern-minimal-report':        'minimal',
      'ultra-minimal-onepager':       'minimal',
      'educational-course-guide':     'minimal',
      'executive-board-brief':        'executive',
      'consulting-strategy-playbook': 'executive',
      'case-study-storyline':         'executive',
      'startup-investor-memo':        'startup',
      'product-showcase-deckdoc':     'startup',
      'fintech-operating-plan':       'fintech',
      'sustainability-impact-report': 'fintech',
      'dark-luxury-proposal':         'luxury',
      'editorial-whitepaper':         'editorial',
      'premium-whitepaper-system':    'editorial',
      'future-tech-brief':            'futuristic',
      'ai-future-tech-report':        'futuristic',
      'agency-campaign-book':         'agency',
      'roadmap-execution-plan':       'agency',
      'analytics-performance-report': 'analytics',
      'investor-diligence-pack':      'analytics',
      'healthcare-program-brief':     'healthcare',
    };
    return map[templateId] || 'minimal';
  }

  // ─── Archetype resolution ─────────────────────────────────────────────────

  private resolveArchetype(page: any, index: number, total: number): ProPageArchetype {
    const type  = String(page.pageType || '').toLowerCase();
    const title = String(page.title    || '').toLowerCase();
    const text  = String(page.content?.text || '');
    const isContinuation = !!(page.isContinuation ?? (page.content as any)?.isContinuation);

    if (index === 0 || type === 'cover') return 'cover';
    if (index === total - 1 && total >= 4) return 'closing';
    if (isContinuation) return 'content';
    if (type === 'section' || type === 'divider') return 'section-divider';
    if (index === 1) return 'introduction';

    if (this.titleMatch(title, ['swot', 'strengths', 'weaknesses', 'opportunities', 'threats'])) return 'swot-grid';
    if (this.titleMatch(title, ['timeline', 'roadmap', 'phases', 'milestones', 'schedule', 'process', 'plan'])) return 'timeline';
    if (this.titleMatch(title, ['team', 'features', 'services', 'benefits', 'advantages', 'offerings', 'capabilities'])) return 'feature-list';
    if (this.titleMatch(title, ['metrics', 'kpis', 'performance', 'results', 'statistics', 'analytics', 'numbers'])) return 'stats';
    if (this.titleMatch(title, ['overview', 'highlights', 'about', 'who we are'])) return 'image-text';

    const metrics = this.extractMetrics(text);
    if (metrics.length >= 3) return 'stats';

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
    const allLines = rawText.split(/\n+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    const paragraphs = allLines
      .filter((l: string) => l.length >= 30 && !/^[-*•·]/.test(l) && !/^\d+[.)]\s/.test(l))
      .map((l: string) => l.replace(/^#{1,6}\s+/, '').trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 10);

    const bullets = allLines
      .filter((l: string) => /^[-*•·]/.test(l) || /^\d+[.)]\s/.test(l))
      .map((l: string) => l.replace(/^[-*•·\d.)]+\s*/, '').replace(/^#{1,6}\s+/, '').trim())
      .filter((l: string) => l.length >= 5)
      .slice(0, 12);

    const derivedBullets = bullets.length >= 2 ? bullets
      : allLines
          .map((l: string) => l.replace(/^[-*•·#\d.)]+\s*/, '').trim())
          .filter((l: string) => l.length >= 10 && l.length < 180)
          .slice(0, 8);

    const metrics = this.extractMetrics(rawText);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    const isContinuation = !!(page.isContinuation ?? (page.content as any)?.isContinuation);

    let title = page.title || document.title || 'Untitled';
    if (isContinuation) {
      const headingLine = allLines.find(
        l => /^#{1,6}\s/.test(l) || (!l.startsWith('-') && !l.startsWith('*') && l.length >= 10 && l.length <= 80),
      );
      if (headingLine) {
        const derived = headingLine.replace(/^#{1,6}\s+/, '').trim();
        if (derived && derived !== title) title = derived;
      } else if (bullets.length > 0) {
        const SKIP_STARTS = /^(ultimately|however|therefore|furthermore|moreover|additionally|in addition|in only|by using|through|with the|this means|as a result|for example|for instance)/i;
        const raw = bullets[0].replace(SKIP_STARTS, '').trim();
        const words = raw.split(/[\s,;:]+/).filter((w: string) => w.length > 1);
        if (words.length >= 2) {
          const TRAILING_WEAK = /\b(in|the|a|an|to|of|for|and|or|but|can|will|may|this|that|with|by|is|are|was|were|have|has|be|it|its|their|our|your)\s*$/i;
          const phrase = words.slice(0, 3).join(' ').replace(TRAILING_WEAK, '').trim();
          if (phrase.length > 3) title = phrase.charAt(0).toUpperCase() + phrase.slice(1);
        }
      }
    }

    return {
      title:         this.escape(title),
      documentTitle: this.escape(document.title || page.title || 'Untitled'),
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
    const parsed: any =
      typeof raw === 'object'
        ? raw
        : (() => { try { return JSON.parse(String(raw)); } catch { return null; } })();
    if (parsed && typeof parsed === 'object') {
      const listLines = [
        ...(parsed.overview || []).map((s: string) => `- ${s}`),
        ...(parsed.bullets  || []).map((s: string) => `- ${s}`),
        ...(parsed.points   || []).map((s: string) => `- ${s}`),
      ];
      const textLines = [parsed.subtitle, parsed.description, parsed.body].filter(Boolean);
      return [...listLines, ...textLines].join('\n');
    }
    return String(raw).replace(/<[^>]+>/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  }

  // ─── Archetype dispatcher ─────────────────────────────────────────────────

  private renderArchetype(
    archetype: ProPageArchetype,
    content: any,
    template: ProTemplateDefinition,
    page: number,
    total: number,
  ): string {
    const c      = template.tokens.colors;
    const family = this.getDesignFamily(template.id);
    const footer = this.footer(c, page, total);

    switch (archetype) {
      case 'cover':           return this.renderCover(content, c, footer, family);
      case 'introduction':    return this.renderIntro(content, c, footer, family);
      case 'section-divider': return this.renderDivider(content, c, footer, family);
      case 'feature-list':    return this.renderFeatureList(content, c, footer, family, page);
      case 'stats':           return this.renderStats(content, c, footer, family);
      case 'timeline':        return this.renderTimeline(content, c, footer, family);
      case 'swot-grid':       return this.renderSwot(content, c, footer, family);
      case 'image-text':      return this.renderImageText(content, c, footer, family);
      case 'closing':         return this.renderClosing(content, c, footer, family);
      default:                return this.renderContent(content, c, footer, family, page);
    }
  }

  // ─── Cover ────────────────────────────────────────────────────────────────

  private renderCover(content: any, c: any, footer: string, family: string): string {
    // luxury: centered dark editorial cover
    if (family === 'luxury') {
      return `<section class="pro-sheet pro-cover fam-lux-page">
        <div class="fam-lux-cover-inner">
          <div class="fam-lux-rule" style="margin-bottom:18mm"></div>
          <div class="pro-eyebrow">${content.label}</div>
          <h1>${content.documentTitle}</h1>
          ${content.paragraphs[0] ? `<p class="pro-cover-lead">${content.paragraphs[0]}</p>` : ''}
          <div class="fam-lux-rule" style="margin-top:18mm"></div>
        </div>
        ${footer}
      </section>`;
    }

    // editorial: magazine-style cover with oversized title
    if (family === 'editorial') {
      const chips = content.bullets.slice(0, 4)
        .map((b: string) => `<span class="fam-ed-chip">${b.split(/\s+/).slice(0, 4).join(' ')}</span>`)
        .join('');
      return `<section class="pro-sheet pro-cover fam-ed-cover">
        <div class="fam-ed-cover-top">
          <div class="pro-eyebrow">${content.label}</div>
        </div>
        <h1 class="fam-ed-cover-title">${content.documentTitle}</h1>
        <div class="fam-ed-rule"></div>
        ${content.paragraphs[0] ? `<p class="pro-cover-lead fam-ed-lead">${content.paragraphs[0]}</p>` : ''}
        ${chips ? `<div class="fam-ed-chips">${chips}</div>` : ''}
        ${footer}
      </section>`;
    }

    // futuristic: dark header band cover
    if (family === 'futuristic') {
      return `<section class="pro-sheet pro-cover fam-fut-cover">
        <div class="fam-fut-cover-band">
          <span class="fam-fut-band-label">// ${content.label}</span>
        </div>
        <div class="fam-fut-cover-body">
          <h1>${content.documentTitle}</h1>
          ${content.paragraphs[0] ? `<p class="pro-cover-lead">${content.paragraphs[0]}</p>` : ''}
          <div class="fam-fut-cover-grid">
            ${content.bullets.slice(0, 4).map((b: string, i: number) =>
              `<div class="fam-fut-cover-block">
                <span class="fam-fut-num">${String(i + 1).padStart(2, '0')}</span>
                <span>${b.split(/\s+/).slice(0, 5).join(' ')}</span>
              </div>`).join('')}
          </div>
        </div>
        ${footer}
      </section>`;
    }

    // agency: bold color-band cover
    if (family === 'agency') {
      return `<section class="pro-sheet pro-cover fam-ag-cover">
        <div class="fam-ag-cover-band"></div>
        <div class="fam-ag-cover-body">
          <div class="pro-eyebrow">${content.label}</div>
          <h1>${content.documentTitle}</h1>
          ${content.paragraphs[0] ? `<p class="pro-cover-lead">${content.paragraphs[0]}</p>` : ''}
        </div>
        ${footer}
      </section>`;
    }

    // default: 2-col cover
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

  // ─── Introduction ─────────────────────────────────────────────────────────

  private renderIntro(content: any, c: any, footer: string, family: string): string {
    const richEnough = content.paragraphs.length >= 2 || content.bullets.length >= 4;
    if (!richEnough) return this.renderContent(content, c, footer, family, 2);

    // luxury: centered editorial intro
    if (family === 'luxury') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      return `<section class="pro-sheet pro-intro fam-lux-page">
        <div class="fam-lux-rule" style="margin-bottom:10mm"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${paras}
        ${footer}
      </section>`;
    }

    // futuristic: band + content
    if (family === 'futuristic') {
      const paras = content.paragraphs.slice(0, 5).map((p: string) => `<p>${p}</p>`).join('');
      const bulletHtml = content.bullets.slice(0, 6).map((b: string, i: number) =>
        `<div class="fam-fut-block">
          <div class="fam-fut-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="fam-fut-text">${b}</div>
        </div>`).join('');
      return `<section class="pro-sheet pro-intro">
        <div class="fam-fut-band">
          <span class="fam-fut-band-label">// ${content.label}</span>
        </div>
        <h2>${content.title}</h2>
        ${paras}
        ${bulletHtml ? `<div class="fam-fut-grid">${bulletHtml}</div>` : ''}
        ${footer}
      </section>`;
    }

    // editorial: pull-quote intro
    if (family === 'editorial') {
      const pullQuote = content.paragraphs[0] || '';
      const rest = content.paragraphs.slice(1, 5).map((p: string) => `<p>${p}</p>`).join('');
      return `<section class="pro-sheet pro-intro">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${pullQuote ? `<blockquote class="fam-ed-pullquote">${pullQuote}</blockquote>` : ''}
        <div class="fam-ed-cols">${rest}</div>
        ${footer}
      </section>`;
    }

    // minimal: clean text no sidebar
    if (family === 'minimal') {
      const paras = content.paragraphs.slice(0, 6).map((p: string) => `<p>${p}</p>`).join('');
      const bullets = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-min-item">&#8212; ${b}</div>`).join('');
      return `<section class="pro-sheet pro-intro">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-min-rule"></div>
        ${paras}
        ${bullets ? `<div class="fam-min-list">${bullets}</div>` : ''}
        ${footer}
      </section>`;
    }

    // default: dark sidebar intro
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

  // ─── Section divider ──────────────────────────────────────────────────────

  private renderDivider(content: any, c: any, footer: string, family: string): string {
    if (family === 'luxury') {
      return `<section class="pro-sheet pro-divider fam-lux-page">
        <div class="fam-lux-divider-inner">
          <div class="fam-lux-rule" style="margin-bottom:12mm"></div>
          <h2 style="color:inherit">${content.title}</h2>
          ${content.paragraphs[0] ? `<p style="color:rgba(248,241,229,.65)">${content.paragraphs[0]}</p>` : ''}
          <div class="fam-lux-rule" style="margin-top:12mm"></div>
        </div>
        ${footer}
      </section>`;
    }
    if (family === 'futuristic') {
      return `<section class="pro-sheet pro-divider fam-fut-divider">
        <div class="fam-fut-div-band">// SECTION</div>
        <h2>${content.title}</h2>
        ${content.paragraphs[0] ? `<p style="color:rgba(255,255,255,.7)">${content.paragraphs[0]}</p>` : ''}
        <div class="pro-arc"></div>
        ${footer}
      </section>`;
    }
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

  // ─── Feature list ─────────────────────────────────────────────────────────

  private renderFeatureList(content: any, c: any, footer: string, family: string, page: number): string {
    const items = content.bullets.length >= 2 ? content.bullets.slice(0, 10) : content.paragraphs.slice(0, 8);
    if (items.length === 0) return this.renderContent(content, c, footer, family, page);

    const leadPara = content.bullets.length >= 2
      ? content.paragraphs.slice(0, 2).map((p: string) => `<p class="pro-feature-lead">${p}</p>`).join('')
      : '';

    // ── MINIMAL: plain numbered list ────────────────────────────────────────
    if (family === 'minimal') {
      const list = items.map((item: string, i: number) =>
        `<div class="fam-min-numbered-item">
          <span class="fam-min-li-num">${i + 1}.</span>
          <span class="fam-min-li-text">${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-min-rule"></div>
        ${leadPara}
        <div class="fam-min-numbered-list">${list}</div>
        ${footer}
      </section>`;
    }

    // ── EXECUTIVE: two-col with separator lines ──────────────────────────────
    if (family === 'executive') {
      const list = items.map((item: string, i: number) =>
        `<div class="fam-exec-feat-item">
          <span class="fam-exec-feat-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-exec-feat-text">${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features fam-exec-page">
        <div class="fam-exec-bar"></div>
        <div class="fam-exec-inner">
          <div class="pro-label"><span></span>${content.label}</div>
          <h2>${content.title}</h2>
          ${leadPara}
          <div class="fam-exec-feat-grid">${list}</div>
        </div>
        ${footer}
      </section>`;
    }

    // ── STARTUP: bold full-width items with accent left border ──────────────
    if (family === 'startup') {
      const list = items.map((item: string, i: number) =>
        `<div class="fam-st-feat-item">
          <span class="fam-st-feat-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-st-feat-text">${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="fam-st-top-strip"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${leadPara}
        <div class="fam-st-feat-list">${list}</div>
        ${footer}
      </section>`;
    }

    // ── FINTECH: striped table rows ──────────────────────────────────────────
    if (family === 'fintech') {
      const list = items.map((item: string, i: number) =>
        `<div class="fam-fin-row ${i % 2 === 0 ? 'alt' : ''}">
          <span class="fam-fin-idx">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-fin-cell">${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-fin-divider"></div>
        ${leadPara}
        <div class="fam-fin-table">${list}</div>
        ${footer}
      </section>`;
    }

    // ── LUXURY: centered em-dash list ────────────────────────────────────────
    if (family === 'luxury') {
      const list = items.map((item: string) =>
        `<div class="fam-lux-item">
          <span class="fam-lux-dash">&#8212;</span>
          <span>${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features fam-lux-page">
        <div class="fam-lux-rule" style="margin-bottom:10mm"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${leadPara}
        <div class="fam-lux-list">${list}</div>
        <div class="fam-lux-rule" style="margin-top:auto"></div>
        ${footer}
      </section>`;
    }

    // ── EDITORIAL: text-only with diamond bullets ────────────────────────────
    if (family === 'editorial') {
      const list = items.map((item: string) =>
        `<div class="fam-ed-feat-item">
          <span class="fam-ed-diamond">&#9670;</span>
          <span>${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-ed-rule"></div>
        ${leadPara}
        <div class="fam-ed-feat-list">${list}</div>
        ${footer}
      </section>`;
    }

    // ── FUTURISTIC: modular tech blocks ─────────────────────────────────────
    if (family === 'futuristic') {
      const blocks = items.map((item: string, i: number) =>
        `<div class="fam-fut-block">
          <div class="fam-fut-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="fam-fut-text">${item}</div>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="fam-fut-band">
          <span class="fam-fut-band-label">// ${content.label}</span>
        </div>
        <h2>${content.title}</h2>
        ${leadPara}
        <div class="fam-fut-grid">${blocks}</div>
        ${footer}
      </section>`;
    }

    // ── AGENCY: bold arrow list ──────────────────────────────────────────────
    if (family === 'agency') {
      const list = items.map((item: string) =>
        `<div class="fam-ag-item">
          <b>&#8594;</b>
          <span>${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features fam-ag-page">
        <div class="fam-ag-stripe"></div>
        <div class="fam-ag-inner">
          <div class="fam-ag-pagenum">${String(page).padStart(2, '0')}</div>
          <div class="pro-label"><span></span>${content.label}</div>
          <h2>${content.title}</h2>
          ${leadPara}
          <div class="fam-ag-list">${list}</div>
        </div>
        ${footer}
      </section>`;
    }

    // ── ANALYTICS: data rows ─────────────────────────────────────────────────
    if (family === 'analytics') {
      const BARS = [92, 78, 85, 71, 88, 65, 75, 82, 68, 79];
      const list = items.map((item: string, i: number) =>
        `<div class="fam-ana-row">
          <span class="fam-ana-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-ana-text">${item}</span>
          <span class="fam-ana-bar" style="width:${BARS[i % BARS.length]}%"></span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-ana-topbar"></div>
        ${leadPara}
        <div class="fam-ana-rows">${list}</div>
        ${footer}
      </section>`;
    }

    // ── HEALTHCARE: card per item with left stripe ────────────────────────────
    if (family === 'healthcare') {
      const cards = items.map((item: string) =>
        `<div class="fam-hc-card">
          <div class="fam-hc-stripe"></div>
          <span>${item}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-features">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${leadPara}
        <div class="fam-hc-cards">${cards}</div>
        ${footer}
      </section>`;
    }

    // fallback: original numbered-card grid
    const grid = items.map((item: string, i: number) =>
      `<div class="pro-list-item"><b>${i + 1}</b><span>${item}</span></div>`).join('');
    return `<section class="pro-sheet pro-features">
      <div class="pro-section-head">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${leadPara}
      </div>
      <div class="pro-feature-grid">${grid}</div>
      ${footer}
    </section>`;
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  private renderStats(content: any, c: any, footer: string, family: string): string {
    const realMetrics = content.metrics.slice(0, 6);
    if (realMetrics.length === 0) return this.renderContent(content, c, footer, family, 0);

    // analytics: data-table metrics display
    if (family === 'analytics') {
      const cards = realMetrics.slice(0, 4).map((m: string, i: number) =>
        `<div class="fam-ana-metric">
          <strong>${this.escape(m)}</strong>
          <span>${content.bullets[i] || 'Key metric'}</span>
        </div>`).join('');
      const paras = content.paragraphs.slice(0, 3).map((p: string) => `<p>${p}</p>`).join('');
      return `<section class="pro-sheet pro-stats">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-ana-topbar"></div>
        <div class="fam-ana-metrics">${cards}</div>
        ${paras ? `<div class="pro-stats-body">${paras}</div>` : ''}
        ${footer}
      </section>`;
    }

    // startup: big energy metric cards
    if (family === 'startup') {
      const cards = realMetrics.slice(0, 3).map((m: string, i: number) =>
        `<div class="fam-st-metric">
          <strong>${this.escape(m)}</strong>
          <span>${content.bullets[i] || 'Key metric'}</span>
        </div>`).join('');
      const paras = content.paragraphs.slice(0, 3).map((p: string) => `<p>${p}</p>`).join('');
      return `<section class="pro-sheet pro-stats">
        <div class="fam-st-top-strip"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-st-metrics">${cards}</div>
        ${paras ? `<div class="pro-stats-body">${paras}</div>` : ''}
        ${footer}
      </section>`;
    }

    // luxury: centered dark metrics
    if (family === 'luxury') {
      const cards = realMetrics.slice(0, 3).map((m: string, i: number) =>
        `<div class="fam-lux-metric">
          <strong>${this.escape(m)}</strong>
          <span>${content.bullets[i] || 'Key metric'}</span>
        </div>`).join('');
      const paras = content.paragraphs.slice(0, 2).map((p: string) => `<p>${p}</p>`).join('');
      return `<section class="pro-sheet pro-stats fam-lux-page">
        <div class="fam-lux-rule" style="margin-bottom:8mm"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-lux-metrics">${cards}</div>
        ${paras ? `<div class="pro-stats-body">${paras}</div>` : ''}
        ${footer}
      </section>`;
    }

    // default stats
    const labels = content.bullets.slice(0, realMetrics.length);
    const cards = realMetrics.slice(0, 3).map((m: string, i: number) =>
      `<div class="pro-metric ${i === 1 ? 'dark' : ''}">
        <strong>${this.escape(m)}</strong>
        <span>${labels[i] || 'Key metric'}</span>
      </div>`).join('');
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

  // ─── Timeline ─────────────────────────────────────────────────────────────

  private renderTimeline(content: any, c: any, footer: string, family: string): string {
    const steps = content.bullets.length >= 2 ? content.bullets.slice(0, 8) : content.paragraphs.slice(0, 6);
    if (steps.length === 0) return this.renderContent(content, c, footer, family, 0);

    // agency: big numbered bold steps
    if (family === 'agency') {
      const stepHtml = steps.map((step: string, i: number) =>
        `<div class="fam-ag-step">
          <b>${String(i + 1).padStart(2, '0')}</b>
          <span>${step}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-timeline fam-ag-page">
        <div class="fam-ag-stripe"></div>
        <div class="fam-ag-inner">
          <div class="pro-label"><span></span>${content.label}</div>
          <h2>${content.title}</h2>
          <div class="fam-ag-steps">${stepHtml}</div>
        </div>
        ${footer}
      </section>`;
    }

    // futuristic: glowing step blocks
    if (family === 'futuristic') {
      const stepHtml = steps.map((step: string, i: number) =>
        `<div class="fam-fut-block">
          <div class="fam-fut-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="fam-fut-text">${step}</div>
        </div>`).join('');
      return `<section class="pro-sheet pro-timeline">
        <div class="fam-fut-band">
          <span class="fam-fut-band-label">// ${content.label}</span>
        </div>
        <h2>${content.title}</h2>
        <div class="fam-fut-grid">${stepHtml}</div>
        ${footer}
      </section>`;
    }

    // minimal: simple numbered steps
    if (family === 'minimal') {
      const stepHtml = steps.map((step: string, i: number) =>
        `<div class="fam-min-step">
          <span class="fam-min-step-num">${i + 1}</span>
          <span>${step}</span>
        </div>`).join('');
      const leadPara = content.paragraphs[0] && content.bullets.length >= 2
        ? `<p class="pro-timeline-lead">${content.paragraphs[0]}</p>` : '';
      return `<section class="pro-sheet pro-timeline">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-min-rule"></div>
        ${leadPara}
        <div class="fam-min-steps">${stepHtml}</div>
        ${footer}
      </section>`;
    }

    // default: card-step list
    const stepHtml = steps.map((step: string, i: number) =>
      `<div class="pro-step"><b>${i + 1}</b><span>${step}</span></div>`).join('');
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

  // ─── SWOT ─────────────────────────────────────────────────────────────────

  private renderSwot(content: any, c: any, footer: string, family: string): string {
    const quadrants = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
    const cells = quadrants.map((label, i) => {
      const body = content.bullets[i] || content.paragraphs[i] || '';
      return `<div class="pro-swot-cell"><b>${label}</b><p>${body || 'Add details here'}</p></div>`;
    }).join('');
    const leadPara = content.paragraphs[4] || content.paragraphs[0];
    if (family === 'luxury') {
      return `<section class="pro-sheet pro-grid fam-lux-page">
        <div class="fam-lux-rule" style="margin-bottom:8mm"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="pro-swot">${cells}</div>
        ${footer}
      </section>`;
    }
    return `<section class="pro-sheet pro-grid">
      <div class="pro-label"><span></span>${content.label}</div>
      <h2>${content.title}</h2>
      ${leadPara ? `<p class="pro-swot-lead">${leadPara}</p>` : ''}
      <div class="pro-swot">${cells}</div>
      ${footer}
    </section>`;
  }

  // ─── Image-text ───────────────────────────────────────────────────────────

  private renderImageText(content: any, c: any, footer: string, family: string): string {
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

  // ─── Closing ─────────────────────────────────────────────────────────────

  private renderClosing(content: any, c: any, footer: string, family: string): string {
    const paras = content.paragraphs.slice(0, 2).map((p: string) => `<p>${p}</p>`).join('');

    if (family === 'luxury') {
      return `<section class="pro-sheet pro-closing fam-lux-page">
        <div class="fam-lux-closing-inner">
          <div class="fam-lux-rule" style="margin-bottom:12mm"></div>
          <h2 style="color:inherit">${content.title || 'Thank You'}</h2>
          ${paras}
          <div class="fam-lux-rule" style="margin-top:12mm"></div>
        </div>
        ${footer}
      </section>`;
    }

    if (family === 'minimal') {
      return `<section class="pro-sheet pro-closing" style="background:inherit;color:inherit">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2 style="color:inherit;font-size:42px">${content.title || 'Thank You'}</h2>
        <div class="fam-min-rule"></div>
        ${paras}
        ${footer}
      </section>`;
    }

    if (family === 'futuristic') {
      return `<section class="pro-sheet pro-closing fam-fut-closing">
        <div class="fam-fut-band" style="margin-bottom:12mm">
          <span class="fam-fut-band-label">// CLOSING</span>
        </div>
        <h2>${content.title || 'Thank You'}</h2>
        ${paras}
        ${footer}
      </section>`;
    }

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

  // ─── Content (family-aware adaptive layout) ───────────────────────────────

  private renderContent(content: any, c: any, footer: string, family: string, page: number): string {
    const paraCount   = content.paragraphs.length;
    const bulletCount = content.bullets.length;

    if (paraCount === 0 && bulletCount === 0) {
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single"><h2>${content.title}</h2></div>
        ${footer}
      </section>`;
    }

    // ── MINIMAL: clean text flow, em-dash bullets ────────────────────────────
    if (family === 'minimal') {
      const paras = content.paragraphs.slice(0, 8).map((p: string) => `<p>${p}</p>`).join('');
      const bullets = content.bullets.slice(0, 10).map((b: string) =>
        `<div class="fam-min-item">&#8212; ${b}</div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-min-rule"></div>
        <div class="fam-min-body">
          ${paras}
          ${bullets ? `<div class="fam-min-list">${bullets}</div>` : ''}
        </div>
        ${footer}
      </section>`;
    }

    // ── EXECUTIVE: left accent bar + check bullets ───────────────────────────
    if (family === 'executive') {
      const paras = content.paragraphs.slice(0, 6).map((p: string) => `<p>${p}</p>`).join('');
      const checks = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-exec-item">
          <span class="fam-exec-check">&#10003;</span>
          <span>${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content fam-exec-page">
        <div class="fam-exec-bar"></div>
        <div class="fam-exec-inner">
          <div class="pro-label"><span></span>${content.label}</div>
          <h2>${content.title}</h2>
          ${paras}
          ${checks ? `<div class="fam-exec-checks">${checks}</div>` : ''}
        </div>
        ${footer}
      </section>`;
    }

    // ── STARTUP: accent strip + bold numbered items ──────────────────────────
    if (family === 'startup') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      const items = content.bullets.slice(0, 8).map((b: string, i: number) =>
        `<div class="fam-st-item">
          <div class="fam-st-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="fam-st-text">${b}</div>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="fam-st-top-strip"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${paras}
        ${items ? `<div class="fam-st-items">${items}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── FINTECH: table rows ──────────────────────────────────────────────────
    if (family === 'fintech') {
      const paras = content.paragraphs.slice(0, 3).map((p: string) => `<p>${p}</p>`).join('');
      const rows = content.bullets.slice(0, 10).map((b: string, i: number) =>
        `<div class="fam-fin-row ${i % 2 === 0 ? 'alt' : ''}">
          <span class="fam-fin-idx">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-fin-cell">${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-fin-divider"></div>
        ${paras}
        ${rows ? `<div class="fam-fin-table">${rows}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── LUXURY: dark paper, gold rules, em-dash list ─────────────────────────
    if (family === 'luxury') {
      const paras = content.paragraphs.slice(0, 5).map((p: string) => `<p>${p}</p>`).join('');
      const items = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-lux-item">
          <span class="fam-lux-dash">&#8212;</span>
          <span>${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content fam-lux-page">
        <div class="fam-lux-rule" style="margin-bottom:8mm"></div>
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${paras}
        ${items ? `<div class="fam-lux-list">${items}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── EDITORIAL: pull quote + 2-col text + diamond bullets ────────────────
    if (family === 'editorial') {
      const pullQuote = content.paragraphs[0] || '';
      const rest = content.paragraphs.slice(1, 6).map((p: string) => `<p>${p}</p>`).join('');
      const items = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-ed-bullet-item">
          <span class="fam-ed-diamond">&#9670;</span>
          <span>${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${pullQuote ? `<blockquote class="fam-ed-pullquote">${pullQuote}</blockquote>` : ''}
        ${rest ? `<div class="fam-ed-cols">${rest}</div>` : ''}
        ${items ? `<div class="fam-ed-bullet-list">${items}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── FUTURISTIC: dark band header + glowing blocks ───────────────────────
    if (family === 'futuristic') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      const blocks = content.bullets.slice(0, 8).map((b: string, i: number) =>
        `<div class="fam-fut-block">
          <div class="fam-fut-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="fam-fut-text">${b}</div>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="fam-fut-band">
          <span class="fam-fut-band-label">// ${content.label}</span>
          <span class="fam-fut-band-pg">P${String(page).padStart(2, '0')}</span>
        </div>
        <h2>${content.title}</h2>
        ${paras}
        ${blocks ? `<div class="fam-fut-grid">${blocks}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── AGENCY: left stripe + oversized page number + arrow list ────────────
    if (family === 'agency') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      const items = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-ag-item">
          <b>&#8594;</b>
          <span>${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content fam-ag-page">
        <div class="fam-ag-stripe"></div>
        <div class="fam-ag-inner">
          <div class="fam-ag-pagenum">${String(page).padStart(2, '0')}</div>
          <div class="pro-label"><span></span>${content.label}</div>
          <h2>${content.title}</h2>
          ${paras}
          ${items ? `<div class="fam-ag-list">${items}</div>` : ''}
        </div>
        ${footer}
      </section>`;
    }

    // ── ANALYTICS: blue header bar + data rows ───────────────────────────────
    if (family === 'analytics') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      const BARS = [92, 78, 85, 71, 88, 65, 75, 82, 68, 79];
      const rows = content.bullets.slice(0, 10).map((b: string, i: number) =>
        `<div class="fam-ana-row">
          <span class="fam-ana-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="fam-ana-text">${b}</span>
          <span class="fam-ana-bar" style="width:${BARS[i % BARS.length]}%"></span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        <div class="fam-ana-topbar"></div>
        ${paras}
        ${rows ? `<div class="fam-ana-rows">${rows}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── HEALTHCARE: soft cards with left teal stripe ─────────────────────────
    if (family === 'healthcare') {
      const paras = content.paragraphs.slice(0, 4).map((p: string) => `<p>${p}</p>`).join('');
      const cards = content.bullets.slice(0, 8).map((b: string) =>
        `<div class="fam-hc-card">
          <div class="fam-hc-stripe"></div>
          <span>${b}</span>
        </div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <h2>${content.title}</h2>
        ${paras}
        ${cards ? `<div class="fam-hc-cards">${cards}</div>` : ''}
        ${footer}
      </section>`;
    }

    // ── FALLBACK: original adaptive 3-mode layout ────────────────────────────
    if (bulletCount >= 4 && paraCount <= 2) {
      const lead = content.paragraphs[0] ? `<p class="pro-lead">${content.paragraphs[0]}</p>` : '';
      const extraPara = content.paragraphs[1] ? `<p class="pro-lead">${content.paragraphs[1]}</p>` : '';
      const grid = content.bullets.map((b: string, i: number) =>
        `<div class="pro-list-item"><b>${i + 1}</b><span>${b}</span></div>`).join('');
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single"><h2>${content.title}</h2>${lead}${extraPara}</div>
        <div class="pro-bullet-grid">${grid}</div>
        ${footer}
      </section>`;
    }
    if (paraCount >= 3) {
      const paras = content.paragraphs.slice(0, 8).map((p: string) => `<p>${p}</p>`).join('');
      const inlineBullets = bulletCount >= 2
        ? `<div class="pro-callout-list">${content.bullets.slice(0, 6).map((b: string) =>
            `<div class="pro-callout-item"><span class="pro-dot"></span>${b}</div>`).join('')}</div>` : '';
      return `<section class="pro-sheet pro-content">
        <div class="pro-label"><span></span>${content.label}</div>
        <div class="pro-content-single"><h2>${content.title}</h2>${paras}${inlineBullets}</div>
        ${footer}
      </section>`;
    }
    const paras = content.paragraphs.map((p: string) => `<p>${p}</p>`).join('');
    const sideItems = content.bullets.map((b: string, i: number) =>
      `<div class="pro-list-item compact"><b>${i + 1}</b><span>${b}</span></div>`).join('');
    return `<section class="pro-sheet pro-content">
      <div class="pro-label"><span></span>${content.label}</div>
      <div class="pro-content-wide">
        <div class="pro-content-main"><h2>${content.title}</h2>${paras}</div>
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
        color: ${c.ink}; background: ${c.paper}; margin-bottom: 18px;
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
        background: ${c.paper}; border: 1px solid ${c.line}; border-radius: 20px;
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
        background: ${c.paper}; border: 1px solid ${c.line}; border-radius: 20px;
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

      /* ── Content (adaptive fallback) ── */
      .pro-content-single h2 { margin-top: 4mm; }
      .pro-lead { font-size: 14px; line-height: 1.65; color: ${c.muted}; margin-bottom: 6mm; font-weight: 500; }
      .pro-bullet-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; margin-top: 8mm; }
      .pro-bullet-grid .pro-list-item { border-radius: 14px; padding: 10px 12px; }
      .pro-content-wide { display: grid; grid-template-columns: 1.4fr .6fr; gap: 12mm; align-items: start; }
      .pro-content-main h2 { margin-top: 0; }
      .pro-content-side { display: flex; flex-direction: column; gap: 4mm; margin-top: 44px; }
      .pro-content-side .pro-list-item.compact { padding: 8px 10px; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: MINIMAL
         Clean text-only flow — no cards, no numbering boxes
      ════════════════════════════════════════════════════════════════════════ */
      .fam-min-body { display: flex; flex-direction: column; }
      .fam-min-rule {
        width: 100%; height: 1px; background: ${c.line}; margin: 6mm 0;
      }
      .fam-min-list { margin-top: 6mm; display: flex; flex-direction: column; gap: 7px; }
      .fam-min-item {
        font-size: 13px; line-height: 1.6; color: ${c.ink};
        padding-left: 14px; border-left: 2px solid ${c.line};
      }
      .fam-min-numbered-list { margin-top: 6mm; display: flex; flex-direction: column; gap: 10px; }
      .fam-min-numbered-item { display: flex; gap: 12px; align-items: baseline; }
      .fam-min-li-num {
        font-size: 12px; font-weight: 700; color: ${c.accent};
        min-width: 20px; flex-shrink: 0;
      }
      .fam-min-li-text { font-size: 13px; line-height: 1.55; color: ${c.ink}; }
      .fam-min-steps { margin-top: 8mm; display: flex; flex-direction: column; gap: 8px; }
      .fam-min-step {
        display: flex; gap: 14px; align-items: baseline;
        padding: 8px 0; border-bottom: 1px solid ${c.line};
      }
      .fam-min-step-num {
        font-size: 18px; font-weight: 900; color: ${c.accent}; min-width: 28px;
        flex-shrink: 0; line-height: 1;
      }
      .fam-min-step span:last-child { font-size: 13px; line-height: 1.5; color: ${c.ink}; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: EXECUTIVE
         Left vertical accent bar, checkmark bullets, serif headings
      ════════════════════════════════════════════════════════════════════════ */
      .fam-exec-page { padding-left: 28mm !important; }
      .fam-exec-bar {
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 7mm; background: ${c.accent}; z-index: 2;
      }
      .fam-exec-inner { position: relative; z-index: 1; }
      .fam-exec-checks { margin-top: 8mm; display: flex; flex-direction: column; gap: 7px; }
      .fam-exec-item {
        display: flex; gap: 10px; align-items: flex-start;
        padding: 8px 12px; border: 1px solid ${c.line}; border-radius: 10px;
        background: ${c.accentSoft};
      }
      .fam-exec-check {
        color: ${c.accent}; font-weight: 900; font-size: 14px;
        min-width: 18px; flex-shrink: 0; line-height: 1.4;
      }
      .fam-exec-item span:last-child { font-size: 12.5px; line-height: 1.5; color: ${c.ink}; font-weight: 500; }
      .fam-exec-feat-grid {
        margin-top: 8mm; display: flex; flex-direction: column; gap: 0;
      }
      .fam-exec-feat-item {
        display: flex; gap: 16px; align-items: baseline;
        padding: 9px 0; border-bottom: 1px solid ${c.line};
      }
      .fam-exec-feat-num {
        font-size: 10px; font-weight: 900; color: ${c.accent};
        min-width: 26px; flex-shrink: 0; letter-spacing: 1px;
      }
      .fam-exec-feat-text { font-size: 13px; line-height: 1.5; color: ${c.ink}; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: STARTUP
         Top accent strip, bold numbered items with left border
      ════════════════════════════════════════════════════════════════════════ */
      .fam-st-top-strip {
        position: absolute; left: 0; right: 0; top: 0;
        height: 6mm; background: ${c.accent}; z-index: 2;
      }
      .fam-st-items { margin-top: 8mm; display: flex; flex-direction: column; gap: 6px; }
      .fam-st-item {
        display: flex; gap: 14px; align-items: flex-start;
        padding: 10px 14px; border-left: 4px solid ${c.accent};
        background: ${c.accentSoft}; border-radius: 0 12px 12px 0;
      }
      .fam-st-num {
        font-size: 11px; font-weight: 900; color: ${c.accent};
        min-width: 26px; flex-shrink: 0; letter-spacing: .5px;
      }
      .fam-st-text { font-size: 12.5px; line-height: 1.5; color: ${c.ink}; font-weight: 600; }
      .fam-st-feat-list { margin-top: 8mm; display: flex; flex-direction: column; gap: 7px; }
      .fam-st-feat-item {
        display: flex; gap: 14px; align-items: baseline;
        padding: 10px 14px; border-left: 4px solid ${c.accent};
        background: ${c.accentSoft}; border-radius: 0 12px 12px 0;
      }
      .fam-st-feat-num {
        font-size: 22px; font-weight: 950; color: ${c.accent};
        min-width: 36px; flex-shrink: 0; line-height: 1;
      }
      .fam-st-feat-text { font-size: 13px; line-height: 1.5; color: ${c.ink}; font-weight: 600; }
      .fam-st-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 6mm; margin: 10mm 0 8mm; }
      .fam-st-metric {
        background: ${c.charcoal}; border-radius: 18px; padding: 10mm 6mm; text-align: center;
        border-left: 4px solid ${c.accent};
      }
      .fam-st-metric strong { display: block; font-size: 30px; line-height: 1; font-weight: 950; color: white; }
      .fam-st-metric span { display: block; margin-top: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: rgba(255,255,255,.6); }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: FINTECH
         Table row layout — striped data rows
      ════════════════════════════════════════════════════════════════════════ */
      .fam-fin-divider {
        width: 100%; height: 2px;
        background: linear-gradient(90deg, ${c.accent} 30%, ${c.line} 100%);
        margin: 6mm 0;
      }
      .fam-fin-table { margin-top: 4mm; border: 1px solid ${c.line}; border-radius: 14px; overflow: hidden; }
      .fam-fin-row {
        display: flex; gap: 0; align-items: stretch;
        border-bottom: 1px solid ${c.line}; background: ${c.paper};
      }
      .fam-fin-row:last-child { border-bottom: none; }
      .fam-fin-row.alt { background: ${c.accentSoft}; }
      .fam-fin-idx {
        min-width: 36px; padding: 10px 8px; text-align: center;
        font-size: 10px; font-weight: 900; color: white;
        background: ${c.accent}; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .fam-fin-cell { padding: 10px 14px; font-size: 12.5px; line-height: 1.45; color: ${c.ink}; font-weight: 500; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: LUXURY
         Dark paper already set via palette — gold rules, centered em-dash list
      ════════════════════════════════════════════════════════════════════════ */
      .fam-lux-page::before { opacity: .15 !important; }
      .fam-lux-rule {
        width: 32mm; height: 1px; background: ${c.accent}; display: block;
      }
      .fam-lux-list { margin-top: 8mm; display: flex; flex-direction: column; gap: 9px; }
      .fam-lux-item {
        display: flex; gap: 12px; align-items: baseline;
        font-size: 13px; line-height: 1.6; color: ${c.ink};
        padding-bottom: 9px; border-bottom: 1px solid ${c.line};
      }
      .fam-lux-item:last-child { border-bottom: none; }
      .fam-lux-dash { color: ${c.accent}; font-weight: 700; flex-shrink: 0; }
      .fam-lux-cover-inner {
        display: flex; flex-direction: column; justify-content: center;
        align-items: flex-start; height: 100%;
      }
      .fam-lux-divider-inner {
        display: flex; flex-direction: column; justify-content: center; height: 100%;
      }
      .fam-lux-closing-inner {
        display: flex; flex-direction: column; justify-content: center; height: 100%;
      }
      .fam-lux-metrics { display: grid; grid-template-columns: repeat(3,1fr); gap: 6mm; margin: 10mm 0 8mm; }
      .fam-lux-metric {
        border: 1px solid ${c.accent}; border-radius: 16px; padding: 10mm 6mm; text-align: center;
      }
      .fam-lux-metric strong { display: block; font-size: 28px; line-height: 1; font-weight: 900; color: ${c.accent}; }
      .fam-lux-metric span { display: block; margin-top: 6px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: ${c.muted}; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: EDITORIAL
         Magazine-style — pull quote, 2-col text, diamond bullets
      ════════════════════════════════════════════════════════════════════════ */
      .fam-ed-rule { width: 100%; height: 1px; background: ${c.ink}; margin: 6mm 0; opacity: .15; }
      .fam-ed-pullquote {
        font-family: '${display}', serif;
        font-size: 18px; line-height: 1.5; font-style: italic; font-weight: 600;
        color: ${c.ink}; border: none; margin: 6mm 0 8mm;
        padding-left: 14px; border-left: 3px solid ${c.accent};
      }
      .fam-ed-cols {
        column-count: 2; column-gap: 8mm;
        font-size: 12.5px; line-height: 1.7; color: ${c.muted};
      }
      .fam-ed-cols p { margin: 0 0 8px; break-inside: avoid; }
      .fam-ed-bullet-list { margin-top: 8mm; display: flex; flex-direction: column; gap: 6px; }
      .fam-ed-bullet-item { display: flex; gap: 10px; align-items: baseline; font-size: 12.5px; line-height: 1.5; color: ${c.ink}; }
      .fam-ed-diamond { color: ${c.accent}; font-size: 8px; flex-shrink: 0; margin-top: 4px; }
      .fam-ed-feat-list { margin-top: 6mm; display: flex; flex-direction: column; gap: 7px; }
      .fam-ed-feat-item { display: flex; gap: 10px; align-items: baseline; font-size: 13px; line-height: 1.55; color: ${c.ink}; }
      .fam-ed-cover { display: flex; flex-direction: column; justify-content: flex-end; }
      .fam-ed-cover-top { border-bottom: 1px solid ${c.line}; padding-bottom: 6mm; margin-bottom: 6mm; }
      .fam-ed-cover-title { font-size: 64px; line-height: .9; max-width: 150mm; }
      .fam-ed-lead { font-size: 15px; line-height: 1.6; }
      .fam-ed-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8mm; }
      .fam-ed-chip {
        border: 1px solid ${c.line}; border-radius: 999px;
        padding: 5px 10px; font-size: 10px; font-weight: 700;
        color: ${c.muted}; text-transform: uppercase; letter-spacing: .8px;
      }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: FUTURISTIC
         Dark band header, glowing-border modular blocks, mono page numbers
      ════════════════════════════════════════════════════════════════════════ */
      .fam-fut-band {
        display: flex; align-items: center; justify-content: space-between;
        background: ${c.charcoal}; margin: -22mm -21mm 14mm;
        padding: 10px 21mm; font-family: monospace;
      }
      .fam-fut-band-label {
        font-size: 9px; font-weight: 700; text-transform: uppercase;
        letter-spacing: 2px; color: ${c.accent};
      }
      .fam-fut-band-pg { font-size: 9px; color: rgba(255,255,255,.4); font-family: monospace; }
      .fam-fut-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 8mm;
      }
      .fam-fut-block {
        display: flex; gap: 10px; align-items: flex-start;
        border: 1px solid ${c.accent}; border-radius: 12px;
        padding: 10px 12px; background: ${c.accentSoft};
        box-shadow: 0 0 0 1px ${c.accentSoft};
      }
      .fam-fut-num {
        font-family: monospace; font-size: 11px; font-weight: 700;
        color: ${c.accent}; min-width: 28px; flex-shrink: 0;
      }
      .fam-fut-text { font-size: 11.5px; line-height: 1.4; color: ${c.ink}; font-weight: 500; }
      .fam-fut-cover { display: flex; flex-direction: column; }
      .fam-fut-cover-band {
        background: ${c.charcoal}; margin: -22mm -21mm 0;
        padding: 12mm 21mm; margin-bottom: 10mm;
      }
      .fam-fut-cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
      .fam-fut-cover-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 10mm; }
      .fam-fut-cover-block {
        display: flex; gap: 8px; align-items: flex-start;
        border: 1px solid ${c.line}; border-radius: 10px; padding: 8px 10px;
        background: ${c.accentSoft};
      }
      .fam-fut-divider { background: ${c.charcoal} !important; }
      .fam-fut-div-band {
        font-family: monospace; font-size: 10px; color: ${c.accent};
        letter-spacing: 2px; text-transform: uppercase; margin-bottom: 12mm;
      }
      .fam-fut-closing { background: ${c.charcoal} !important; }
      .fam-fut-closing h2 { color: ${c.ink}; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: AGENCY
         Left accent stripe, oversized faded page number, arrow list
      ════════════════════════════════════════════════════════════════════════ */
      .fam-ag-page { padding-left: 26mm !important; }
      .fam-ag-stripe {
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 5mm; background: ${c.accent}; z-index: 2;
      }
      .fam-ag-inner { position: relative; z-index: 1; }
      .fam-ag-pagenum {
        font-size: 88px; font-weight: 950; line-height: 1;
        color: ${c.accent}; opacity: .1;
        position: absolute; right: 0; top: -8mm;
        font-family: '${display}', sans-serif;
        pointer-events: none;
      }
      .fam-ag-list { margin-top: 8mm; display: flex; flex-direction: column; gap: 7px; }
      .fam-ag-item {
        display: flex; gap: 12px; align-items: flex-start;
        padding: 9px 12px; background: ${c.accentSoft}; border-radius: 10px;
      }
      .fam-ag-item b {
        color: ${c.accent}; font-size: 16px; font-weight: 900;
        flex-shrink: 0; line-height: 1.3;
      }
      .fam-ag-item span { font-size: 12.5px; line-height: 1.45; color: ${c.ink}; font-weight: 500; }
      .fam-ag-steps { margin-top: 8mm; display: grid; gap: 6mm; }
      .fam-ag-step {
        display: flex; gap: 16px; align-items: center;
        padding: 11px 14px; background: ${c.accentSoft};
        border-radius: 0 14px 14px 0; border-left: 5px solid ${c.accent};
      }
      .fam-ag-step b {
        font-size: 22px; font-weight: 950; color: ${c.accent};
        min-width: 36px; flex-shrink: 0; line-height: 1;
      }
      .fam-ag-step span { font-size: 13px; line-height: 1.4; color: ${c.ink}; font-weight: 600; }
      .fam-ag-cover { display: grid; grid-template-columns: 1fr; }
      .fam-ag-cover-band {
        position: absolute; left: 0; top: 0; bottom: 0;
        width: 14mm; background: ${c.accent};
      }
      .fam-ag-cover-body {
        margin-left: 20mm; display: flex; flex-direction: column; justify-content: center;
        min-height: 260mm;
      }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: ANALYTICS
         Blue header bar, data-row bullets with index numbers
      ════════════════════════════════════════════════════════════════════════ */
      .fam-ana-topbar {
        width: 100%; height: 3px;
        background: linear-gradient(90deg, ${c.accent}, ${c.accentSoft});
        border-radius: 99px; margin-bottom: 8mm;
      }
      .fam-ana-rows { margin-top: 6mm; display: flex; flex-direction: column; gap: 0; border: 1px solid ${c.line}; border-radius: 14px; overflow: hidden; }
      .fam-ana-row {
        display: flex; gap: 0; align-items: center;
        border-bottom: 1px solid ${c.line}; min-height: 36px;
        padding: 0; background: ${c.paper};
        position: relative;
      }
      .fam-ana-row:last-child { border-bottom: none; }
      .fam-ana-row:nth-child(even) { background: ${c.accentSoft}; }
      .fam-ana-num {
        min-width: 40px; height: 100%; padding: 9px 8px; text-align: center;
        font-size: 10px; font-weight: 900; color: white;
        background: ${c.accent}; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        font-family: monospace;
      }
      .fam-ana-text { padding: 9px 12px; font-size: 12px; line-height: 1.4; color: ${c.ink}; font-weight: 500; flex: 1; }
      .fam-ana-bar {
        height: 4px; background: ${c.accent}; opacity: .35;
        position: absolute; bottom: 0; left: 40px;
        border-radius: 0 2px 2px 0;
      }
      .fam-ana-metrics { display: grid; grid-template-columns: repeat(4,1fr); gap: 5mm; margin: 8mm 0; }
      .fam-ana-metric {
        background: ${c.accentSoft}; border: 1px solid ${c.line}; border-radius: 14px;
        padding: 8mm 5mm; text-align: center; border-top: 3px solid ${c.accent};
      }
      .fam-ana-metric strong { display: block; font-size: 26px; line-height: 1; font-weight: 950; color: ${c.ink}; }
      .fam-ana-metric span { display: block; margin-top: 5px; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.2px; color: ${c.muted}; }

      /* ═══════════════════════════════════════════════════════════════════════
         FAMILY: HEALTHCARE
         Soft card per bullet with left teal accent stripe
      ════════════════════════════════════════════════════════════════════════ */
      .fam-hc-cards { margin-top: 8mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
      .fam-hc-card {
        display: flex; gap: 0; align-items: stretch;
        background: ${c.paper}; border: 1px solid ${c.line}; border-radius: 14px;
        overflow: hidden; box-shadow: 0 4px 14px rgba(31,41,51,.05);
      }
      .fam-hc-stripe {
        width: 5px; flex-shrink: 0; background: ${c.accent};
      }
      .fam-hc-card span {
        padding: 11px 13px; font-size: 12px; line-height: 1.5;
        color: ${c.ink}; font-weight: 500; display: block;
      }
    `;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private extractMetrics(text: string): string[] {
    const matches = Array.from(
      text.matchAll(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s?(?:%|x|k|m|b|million|billion)\b/gi),
    ).map(m => m[0].trim());
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
