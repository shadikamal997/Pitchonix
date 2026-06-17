/**
 * Phase Ω.CERT — Export XSS sanitization regression.
 *
 * Element rich text (`el.content.html`) is editor-authored markup injected raw
 * into export HTML and rendered by Puppeteer. Because decks can be shared with
 * workspace members and collaborators, a malicious `html` payload is a STORED
 * XSS vector the moment a second user previews or exports the deck.
 *
 * These tests assert that `renderDeckHtml` strips the dangerous surface from
 * the `html` rich-text and list-item paths while preserving benign formatting.
 */

import { renderDeckHtml } from '../element-html-renderer';
import type { RenderDeckInput } from '../render-types';

function deckWithElement(content: any, type = 'paragraph'): RenderDeckInput {
  return {
    title: 'XSS Cert Deck',
    slides: [
      {
        index: 0,
        total: 1,
        title: 'Slide 1',
        elements: [
          {
            id: 'el1',
            type,
            x: 5,
            y: 5,
            width: 90,
            height: 30,
            rotation: 0,
            content,
            style: {},
          } as any,
        ],
      },
    ],
  };
}

describe('Export XSS sanitization (renderDeckHtml)', () => {
  it('strips <script> tags from rich-text html', () => {
    const html = renderDeckHtml(
      deckWithElement({ html: 'Hello<script>alert(1)</script> world' }),
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('Hello');
    expect(html).toContain('world');
  });

  it('strips inline event handlers (onerror/onclick)', () => {
    const html = renderDeckHtml(
      deckWithElement({ html: '<img src=x onerror="alert(document.cookie)">' }),
    );
    expect(html).not.toMatch(/onerror/i);
    expect(html).not.toContain('alert(document.cookie)');
  });

  it('neutralises javascript: URIs in href/src', () => {
    const html = renderDeckHtml(
      deckWithElement({ html: '<a href="javascript:alert(1)">click</a>' }),
    );
    expect(html).not.toMatch(/href\s*=\s*['"]?javascript:/i);
    expect(html).toContain('click');
  });

  it('strips <iframe> and <object> payloads', () => {
    const html = renderDeckHtml(
      deckWithElement({
        html: '<iframe src="evil"></iframe><object data="evil"></object>ok',
      }),
    );
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<object/i);
    expect(html).toContain('ok');
  });

  it('preserves benign formatting (bold/italic/span)', () => {
    const html = renderDeckHtml(
      deckWithElement({ html: '<b>bold</b> <i>italic</i> <span>plain</span>' }),
    );
    expect(html).toContain('<b>bold</b>');
    expect(html).toContain('<i>italic</i>');
    expect(html).toContain('plain');
  });

  it('sanitizes malicious html inside bulleted list items', () => {
    const html = renderDeckHtml(
      deckWithElement(
        { items: [{ html: 'safe<script>alert(1)</script>' }, { text: 'plain item' }] },
        'bulletList',
      ),
    );
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('safe');
  });

  it('strips event handlers with single quotes and unquoted values', () => {
    const html = renderDeckHtml(
      deckWithElement({ html: "<div onmouseover='steal()' onload=hack>x</div>" }),
    );
    expect(html).not.toMatch(/onmouseover/i);
    expect(html).not.toMatch(/onload/i);
    expect(html).toContain('x');
  });
});
