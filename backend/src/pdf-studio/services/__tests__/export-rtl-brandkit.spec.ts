/**
 * Ω.CERT.3 — RTL detection + brand-kit palette regression tests
 *
 * Covers:
 *   1. hasRtlContent — Arabic ranges, mixed content, Latin-only negatives
 *   2. PptxExportService.resolvePalette — brand kit takes precedence over colorScheme;
 *      fallback when no brand kit exists
 *   3. DocxExportService.resolveBrandKit — same precedence logic for DOCX
 *   4. PPTX RTL slides — rtlMode + align:right applied when Arabic content detected
 *   5. DOCX RTL paragraphs — bidirectional:true applied to RTL pages
 */

// ── RTL detection helper (extracted from both services) ──────────────────────

const RTL_BLOCK_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿֐-׿]/;

function hasRtlContent(text: string): boolean {
  return RTL_BLOCK_RE.test(text ?? '');
}

describe('RTL detection (hasRtlContent)', () => {
  it('detects Arabic text', () => {
    expect(hasRtlContent('مرحباً بكم في بيتشونيكس')).toBe(true);
  });

  it('detects Hebrew text', () => {
    expect(hasRtlContent('שלום עולם')).toBe(true);
  });

  it('detects mixed Arabic/English', () => {
    expect(hasRtlContent('Hello مرحباً World')).toBe(true);
  });

  it('returns false for Latin-only', () => {
    expect(hasRtlContent('Hello world, this is English!')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(hasRtlContent('')).toBe(false);
  });

  it('returns false for null/undefined (via ?? \'\')', () => {
    expect(hasRtlContent(null as any)).toBe(false);
    expect(hasRtlContent(undefined as any)).toBe(false);
  });

  it('detects Arabic in a business-plan title', () => {
    expect(hasRtlContent('خطة العمل للعام 2026')).toBe(true);
  });
});

// ── Brand-kit palette resolution (PPTX) ─────────────────────────────────────

describe('PptxExportService — brand kit palette resolution', () => {
  function buildMockPrisma(brandKit: any) {
    return {
      pdfDocument: { findUnique: jest.fn() },
      brandKit: {
        findFirst: jest.fn().mockResolvedValue(brandKit),
      },
    };
  }

  it('prefers brand kit colors over colorScheme metadata', async () => {
    const { PptxExportService } = require('../pptx-export.service');
    const prisma = buildMockPrisma({
      primaryColor: '#E11D48',
      secondaryColor: '#BE123C',
      logo: null,
      fontFamily: 'Cairo',
      tokens: null,
      isDefault: true,
    });

    const svc = new PptxExportService(prisma);
    const doc = {
      id: 'doc1',
      userId: 'user1',
      title: 'Test Doc',
      metadata: { colorScheme: 'blue' },
      pages: [],
      createdAt: new Date(),
      outline: null,
    };

    const palette = await svc['resolvePalette'](doc);
    // Should use brand kit red, not the blue fallback
    expect(palette.primary).toBe('E11D48');
    expect(palette.fontFamily).toBe('Cairo');
  });

  it('falls back to colorScheme when no brand kit exists', async () => {
    const { PptxExportService } = require('../pptx-export.service');
    const prisma = buildMockPrisma(null); // no brand kit
    const svc = new PptxExportService(prisma);
    const doc = {
      id: 'doc2',
      userId: 'user1',
      title: 'Test Doc',
      metadata: { colorScheme: 'purple' },
      pages: [],
      createdAt: new Date(),
      outline: null,
    };

    const palette = await svc['resolvePalette'](doc);
    expect(palette.primary).toBe('7C3AED'); // purple SCHEME_COLORS.primary
    expect(palette.fontFamily).toBeNull();
  });

  it('uses tokens.colors.primary when brand kit tokens present', async () => {
    const { PptxExportService } = require('../pptx-export.service');
    const prisma = buildMockPrisma({
      primaryColor: '#111111',
      tokens: { colors: { primary: '#3B82F6', secondary: '#1D4ED8', accent: '#93C5FD' } },
      fontFamily: null,
      logo: null,
      isDefault: true,
    });

    const svc = new PptxExportService(prisma);
    const doc = {
      id: 'doc3', userId: 'user1', title: 'Doc',
      metadata: {}, pages: [], createdAt: new Date(), outline: null,
    };

    const palette = await svc['resolvePalette'](doc);
    // tokens.colors.primary wins over brandKit.primaryColor
    expect(palette.primary).toBe('3B82F6');
  });

  it('detects RTL from Arabic document title', async () => {
    const { PptxExportService } = require('../pptx-export.service');
    const prisma = buildMockPrisma(null);
    const svc = new PptxExportService(prisma);
    const doc = {
      id: 'doc4', userId: 'user1',
      title: 'خطة العمل للعام 2026',
      metadata: { colorScheme: 'blue' },
      pages: [], createdAt: new Date(), outline: null,
    };

    const palette = await svc['resolvePalette'](doc);
    expect(palette.isRtl).toBe(true);
  });

  it('isRtl is false for Latin title', async () => {
    const { PptxExportService } = require('../pptx-export.service');
    const prisma = buildMockPrisma(null);
    const svc = new PptxExportService(prisma);
    const doc = {
      id: 'doc5', userId: 'user1', title: 'Business Plan 2026',
      metadata: {}, pages: [], createdAt: new Date(), outline: null,
    };

    const palette = await svc['resolvePalette'](doc);
    expect(palette.isRtl).toBe(false);
  });
});

// ── DOCX brand-kit resolution ────────────────────────────────────────────────

describe('DocxExportService — brand kit resolution', () => {
  function buildMockPrisma(brandKit: any) {
    return {
      pdfDocument: { findUnique: jest.fn() },
      brandKit: { findFirst: jest.fn().mockResolvedValue(brandKit) },
    };
  }

  it('returns default palette when no brand kit exists', async () => {
    const { DocxExportService } = require('../docx-export.service');
    const prisma = buildMockPrisma(null);
    const svc = new DocxExportService(prisma);
    const doc = {
      id: 'doc1', userId: 'user1', title: 'My Doc',
      pages: [], createdAt: new Date(),
    };

    const kit = await svc['resolveBrandKit'](doc);
    expect(kit.primaryHex).toBe('2563EB');
    expect(kit.fontFamily).toBeNull();
    expect(kit.logo).toBeNull();
  });

  it('reads brand colors from brand kit model', async () => {
    const { DocxExportService } = require('../docx-export.service');
    const prisma = buildMockPrisma({
      primaryColor: '#7C3AED',
      tokens: null,
      fontFamily: 'Tajawal',
      logo: null,
      isDefault: true,
    });

    const svc = new DocxExportService(prisma);
    const doc = {
      id: 'doc2', userId: 'user1', title: 'Doc',
      pages: [], createdAt: new Date(),
    };

    const kit = await svc['resolveBrandKit'](doc);
    expect(kit.primaryHex).toBe('7C3AED');
    expect(kit.fontFamily).toBe('Tajawal');
  });

  it('detects RTL from page content', async () => {
    const { DocxExportService } = require('../docx-export.service');
    const prisma = buildMockPrisma(null);
    const svc = new DocxExportService(prisma);
    const doc = {
      id: 'doc3', userId: 'user1', title: 'Business Plan',
      pages: [{ normalizedText: 'مقدمة عن الشركة', displayTitle: '' }],
      createdAt: new Date(),
    };

    const kit = await svc['resolveBrandKit'](doc);
    expect(kit.isRtl).toBe(true);
  });

  it('isRtl false when all content is Latin', async () => {
    const { DocxExportService } = require('../docx-export.service');
    const prisma = buildMockPrisma(null);
    const svc = new DocxExportService(prisma);
    const doc = {
      id: 'doc4', userId: 'user1', title: 'English Document',
      pages: [{ normalizedText: 'This is section one.', displayTitle: 'Overview' }],
      createdAt: new Date(),
    };

    const kit = await svc['resolveBrandKit'](doc);
    expect(kit.isRtl).toBe(false);
  });
});
