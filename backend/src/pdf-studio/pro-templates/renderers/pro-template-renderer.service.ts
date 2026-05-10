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

    const pages = (document.pages || []).filter((page: any) => page.pageType !== 'toc');
    const total = pages.length || 1;
    return pages.map((page: any, index: number) => {
      const archetype = this.resolveArchetype(page, index, total);
      const content = this.mapPageContent(page, document);
      const html = this.renderArchetype(archetype, content, template, index + 1, total);
      return mode === 'preview'
        ? `<div class="a4-page pro-page">${html}</div>`
        : `${index === 0 ? '' : '<div class="page-break"></div>'}${html}`;
    }).join('');
  }

  private resolveArchetype(page: any, index: number, total: number): ProPageArchetype {
    const type = String(page.pageType || '').toLowerCase();
    const title = String(page.title || '').toLowerCase();
    if (index === 0 || type === 'cover') return 'cover';
    if (index === total - 1) return 'closing';
    if (index === 1) return 'introduction';
    if (type === 'section' || type === 'divider') return 'section-divider';
    if (title.includes('swot')) return 'swot-grid';
    if (title.includes('timeline') || title.includes('process') || title.includes('roadmap')) return 'timeline';
    if (this.extractMetrics(String(page.content?.text || '')).length >= 3) return 'stats';
    const cycle: ProPageArchetype[] = ['content', 'feature-list', 'image-text', 'timeline', 'swot-grid', 'stats'];
    return cycle[(index - 2) % cycle.length];
  }

  private mapPageContent(page: any, document: any) {
    const rawText = this.readText(page);
    const lines = rawText.split(/\n+/).map(line => line.replace(/^[-*#\d.\s]+/, '').trim()).filter(Boolean);
    const bullets = lines.filter(line => line.length < 140).slice(0, 6);
    const paragraphs = lines.filter(line => line.length >= 40).slice(0, 4);
    return {
      title: this.escape(page.title || document.title || 'Untitled'),
      documentTitle: this.escape(document.title || page.title || 'Untitled'),
      label: this.escape(page.pageType || 'Section'),
      paragraphs: paragraphs.length ? paragraphs.map(p => this.escape(p)) : [this.escape(rawText.slice(0, 260))],
      bullets: bullets.length ? bullets.map(b => this.escape(b)) : ['Market context', 'Business value', 'Next action'],
      metrics: this.extractMetrics(rawText),
    };
  }

  private readText(page: any): string {
    const text = String(page.content?.text || '');
    if (!text.trim()) return '';
    try {
      const parsed = JSON.parse(text);
      return [parsed.title, parsed.subtitle, parsed.description, ...(parsed.overview || [])].filter(Boolean).join('\n');
    } catch {
      return text.replace(/<[^>]+>/g, ' ');
    }
  }

  private renderArchetype(archetype: ProPageArchetype, content: any, template: ProTemplateDefinition, page: number, total: number): string {
    const c = template.tokens.colors;
    const footer = this.footer(c, page, total);
    const label = `<div class="pro-label"><span></span>${content.label}</div>`;
    const body = content.paragraphs.map((p: string) => `<p>${p}</p>`).join('');
    const bullets = content.bullets.slice(0, 5).map((b: string, i: number) => `<div class="pro-list-item"><b>${i + 1}</b><span>${b}</span></div>`).join('');
    const metrics = (content.metrics.length ? content.metrics : ['78%', '3.4x', '12k']).slice(0, 3)
      .map((m: string, i: number) => `<div class="pro-metric ${i === 1 ? 'dark' : ''}"><strong>${this.escape(m)}</strong><span>Key Insight</span></div>`).join('');
    const chips = content.bullets.slice(0, 4).map((b: string) => `<span>${b.split(/\s+/).slice(0, 3).join(' ')}</span>`).join('');
    const eyebrow = `<div class="pro-eyebrow">Modern Business Flyer</div>`;

    if (archetype === 'cover') {
      return `<section class="pro-sheet pro-cover">
        <div class="pro-cover-copy">${eyebrow}<h1>${content.documentTitle}</h1><p>${content.paragraphs[0] || 'Premium business document'}</p><div class="pro-chip-row">${chips}</div></div>
        <div class="pro-hero-art"><div class="pro-hero-card"><strong>01</strong><span>Business PDF</span></div><i></i><em></em></div>${footer}
      </section>`;
    }

    if (archetype === 'introduction') {
      return `<section class="pro-sheet pro-intro">${label}<div class="pro-two-col"><aside><strong>01</strong><small>Introduction</small><div class="pro-side-rule"></div></aside><main><h2>${content.title}</h2>${body}<div class="pro-callout">${content.bullets[0]}</div></main></div>${footer}</section>`;
    }

    if (archetype === 'section-divider') {
      return `<section class="pro-sheet pro-divider"><div><small>${content.label}</small><h2>${content.title}</h2></div><div class="pro-arc"></div>${footer}</section>`;
    }

    if (archetype === 'feature-list') {
      return `<section class="pro-sheet pro-features"><div class="pro-section-head">${label}<h2>${content.title}</h2></div><div class="pro-feature-grid">${bullets}</div>${footer}</section>`;
    }

    if (archetype === 'stats') {
      return `<section class="pro-sheet pro-stats">${label}<h2>${content.title}</h2><div class="pro-metrics">${metrics}</div><div class="pro-progress"></div>${footer}</section>`;
    }

    if (archetype === 'timeline') {
      return `<section class="pro-sheet pro-timeline">${label}<h2>${content.title}</h2><div class="pro-steps">${content.bullets.slice(0, 4).map((b: string, i: number) => `<div><b>${i + 1}</b><span>${b}</span></div>`).join('')}</div>${footer}</section>`;
    }

    if (archetype === 'swot-grid') {
      return `<section class="pro-sheet pro-grid">${label}<h2>${content.title}</h2><div class="pro-swot">${['Strengths','Weaknesses','Opportunities','Threats'].map((h, i) => `<div><b>${h}</b><p>${content.bullets[i] || content.paragraphs[0]}</p></div>`).join('')}</div>${footer}</section>`;
    }

    if (archetype === 'image-text') {
      return `<section class="pro-sheet pro-image-text">${label}<div class="pro-image"><span></span><b>Visual story</b></div><div><h2>${content.title}</h2>${body}<div class="pro-callout">${content.bullets[0]}</div></div>${footer}</section>`;
    }

    if (archetype === 'closing') {
      return `<section class="pro-sheet pro-closing"><h2>${content.title || 'Next Steps'}</h2><p>${content.paragraphs[0]}</p><div class="pro-contact">hello@pitchonix.com · pitchonix.ai</div>${footer}</section>`;
    }

    return `<section class="pro-sheet pro-content">${label}<div class="pro-content-grid"><div><h2>${content.title}</h2>${body}</div><aside>${bullets}</aside></div>${footer}</section>`;
  }

  private footer(c: any, page: number, total: number): string {
    return `<footer class="pro-footer"><span>Pitchonix Studio</span><span>${String(page).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></footer>`;
  }

  getStyles(templateId: string): string {
    const template = getProTemplate(templateId);
    const c = template?.tokens.colors;
    if (!c) return '';
    return `
      .pro-page{padding:0!important;background:${c.paper}!important;}
      .pro-sheet{width:210mm;min-height:297mm;position:relative;overflow:hidden;background:${c.paper};color:${c.ink};font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:23mm 21mm 20mm;}
      .pro-sheet:before{content:"";position:absolute;right:-42mm;top:-48mm;width:112mm;height:112mm;border-radius:999px;background:${c.accentSoft};z-index:0;}
      .pro-sheet>*{position:relative;z-index:1;}
      .pro-sheet h1{font-size:56px;line-height:.92;margin:15px 0 18px;font-weight:950;letter-spacing:0;color:${c.ink};max-width:136mm;}
      .pro-sheet h2{font-size:35px;line-height:1.02;margin:10px 0 17px;font-weight:950;letter-spacing:0;color:${c.ink};}
      .pro-sheet p{font-size:13.5px;line-height:1.62;color:${c.muted};margin:0 0 11px;}
      .pro-eyebrow{display:inline-flex;border:1px solid ${c.line};border-radius:999px;padding:8px 12px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:1.8px;color:${c.ink};background:white;}
      .pro-label{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:2px;color:${c.accent};}
      .pro-label span{width:8px;height:8px;border-radius:99px;background:${c.accent};display:inline-block;}
      .pro-footer{position:absolute;left:21mm;right:21mm;bottom:11mm;display:flex;justify-content:space-between;border-top:1px solid ${c.line};padding-top:9px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:${c.muted};}
      .pro-cover{display:grid;grid-template-columns:1.05fr .95fr;gap:18mm;align-items:center;}
      .pro-cover-copy{align-self:stretch;display:flex;flex-direction:column;justify-content:center;}
      .pro-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:14mm;}
      .pro-chip-row span{border-radius:999px;background:${c.charcoal};color:white;padding:9px 12px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;}
      .pro-hero-art{height:190mm;border-radius:28px 28px 28px 88px;background:radial-gradient(circle at 70% 22%,rgba(255,255,255,.24),transparent 25%),linear-gradient(145deg,${c.charcoal},${c.accent});position:relative;overflow:hidden;box-shadow:0 24px 55px rgba(31,41,51,.18);}
      .pro-hero-art i{position:absolute;right:-24mm;top:18mm;width:92mm;height:92mm;border:1px solid rgba(255,255,255,.32);border-radius:99px;}
      .pro-hero-art em{position:absolute;left:18mm;bottom:18mm;width:60mm;height:8px;background:rgba(255,255,255,.66);border-radius:99px;}
      .pro-hero-card{position:absolute;left:16mm;top:18mm;width:48mm;border-radius:22px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);padding:12mm 8mm;color:white;backdrop-filter:blur(8px);}
      .pro-hero-card strong{display:block;font-size:40px;line-height:1;font-weight:950;}
      .pro-hero-card span{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.76);}
      .pro-two-col,.pro-content-grid,.pro-image-text{display:grid;grid-template-columns:.78fr 1.22fr;gap:16mm;align-items:start;}
      .pro-two-col aside,.pro-content-grid aside{background:${c.charcoal};color:white;border-radius:26px;padding:18mm 12mm;min-height:122mm;box-shadow:0 18px 45px rgba(31,41,51,.13);}
      .pro-two-col aside strong{font-size:56px;display:block;line-height:1;font-weight:950;}
      .pro-two-col aside small{display:block;margin-top:8px;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:1.8px;color:rgba(255,255,255,.68);}
      .pro-side-rule{width:100%;height:8px;border-radius:99px;background:${c.accent};margin-top:42mm;}
      .pro-list-item{display:flex;gap:10px;align-items:flex-start;margin:0;background:${c.accentSoft};border:1px solid rgba(44,182,163,.14);border-radius:18px;padding:12px 13px;}
      .pro-list-item b,.pro-steps b{min-width:26px;height:26px;border-radius:99px;background:${c.accent};display:inline-flex;align-items:center;justify-content:center;color:white;}
      .pro-list-item span,.pro-steps span{font-size:12px;line-height:1.35;font-weight:700;color:${c.ink};}
      .pro-divider{background:${c.charcoal};color:white;display:flex;align-items:center;}
      .pro-divider:before{background:rgba(44,182,163,.16);}
      .pro-divider h2{color:white;font-size:62px;max-width:140mm;}
      .pro-divider small{color:${c.accent};font-weight:900;text-transform:uppercase;letter-spacing:2px;}
      .pro-arc{position:absolute;right:-24mm;top:42mm;width:120mm;height:120mm;border:2px solid rgba(23,184,166,.45);border-radius:99px;}
      .pro-section-head{max-width:142mm;}
      .pro-feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:14mm;}
      .pro-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8mm;margin:22mm 0 16mm;}
      .pro-metric{background:${c.accentSoft};border:1px solid rgba(44,182,163,.12);border-radius:24px;padding:16mm 8mm;text-align:center;}
      .pro-metric.dark{background:${c.charcoal};color:white;}
      .pro-metric strong{display:block;font-size:34px;line-height:1;font-weight:950;}
      .pro-metric span{display:block;margin-top:8px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:${c.muted};}
      .pro-metric.dark span{color:rgba(255,255,255,.62);}
      .pro-progress{height:9px;border-radius:99px;background:linear-gradient(90deg,${c.accent} 72%,${c.line} 72%);}
      .pro-steps{display:grid;gap:8mm;margin-top:17mm;position:relative;}
      .pro-steps:before{content:"";position:absolute;left:16px;top:20px;bottom:20px;width:1px;background:${c.line};}
      .pro-steps div{display:grid;grid-template-columns:32px 1fr;gap:12px;align-items:center;background:white;border:1px solid ${c.line};border-radius:22px;padding:12px 14px;box-shadow:0 10px 28px rgba(31,41,51,.05);}
      .pro-swot{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:14mm;}
      .pro-swot div{background:white;border:1px solid ${c.line};border-radius:22px;padding:11mm;min-height:64mm;box-shadow:0 10px 28px rgba(31,41,51,.04);}
      .pro-swot b{font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:${c.accent};}
      .pro-image{height:190mm;border-radius:26px 26px 78px 26px;background:radial-gradient(circle at 32% 26%,rgba(255,255,255,.28),transparent 20%),linear-gradient(145deg,${c.charcoal},${c.accent});position:relative;overflow:hidden;box-shadow:0 20px 46px rgba(31,41,51,.16);}
      .pro-image span{position:absolute;left:14mm;top:14mm;width:46mm;height:46mm;border-radius:999px;border:1px solid rgba(255,255,255,.34);}
      .pro-image b{position:absolute;left:14mm;bottom:14mm;color:white;font-size:11px;font-weight:950;text-transform:uppercase;letter-spacing:1.7px;}
      .pro-callout{margin-top:11mm;background:${c.accentSoft};border-left:5px solid ${c.accent};border-radius:18px;padding:8mm 9mm;font-size:13px;font-weight:850;color:${c.ink};}
      .pro-closing{background:${c.charcoal};color:white;display:flex;flex-direction:column;justify-content:center;}
      .pro-closing:before{background:rgba(44,182,163,.13);}
      .pro-closing h2{color:white;font-size:58px;}
      .pro-closing p{color:rgba(255,255,255,.72);max-width:130mm;}
      .pro-contact{margin-top:18mm;display:inline-block;border-radius:99px;background:${c.accent};padding:12px 18px;color:white;font-weight:900;}
    `;
  }

  private extractMetrics(text: string): string[] {
    return Array.from(text.matchAll(/\b\d+(?:\.\d+)?\s?(?:%|x|k|m|b|million|billion)?\b/gi)).map(match => match[0]).slice(0, 6);
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
