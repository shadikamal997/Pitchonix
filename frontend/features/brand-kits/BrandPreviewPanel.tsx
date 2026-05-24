'use client';

import React from 'react';
import type { BrandKitDTO } from '@/types/brand-kit';

// =============================================================================
//  Phase 37J + 37.2F — BrandPreviewPanel
//
//  Renders at-a-glance mock surfaces using the kit's colors + fonts + identity.
//  Phase 37.2F expands the original cover/content/chart trio with three more
//  surfaces — table slide, PDF page, proposal page — so users can sanity-check
//  the brand in every output format without leaving the dashboard.
//
//  Everything is CSS/SVG only: previews update in <50ms as the user edits
//  tokens, no canvas or remote rendering required.
// =============================================================================

interface Props { kit: BrandKitDTO | null }

export const BrandPreviewPanel: React.FC<Props> = ({ kit }) => {
  if (!kit) return <div className="text-xs text-slate-500 italic">No brand kit selected.</div>;

  const tokens = kit.tokens || {};
  const colors = tokens.colors || {};
  const typo   = tokens.typography || {};
  const headingFont = typo.heading?.family ?? kit.fontFamily ?? 'Inter, sans-serif';
  const bodyFont    = typo.body?.family    ?? kit.fontFamily ?? 'Inter, sans-serif';
  const primary    = colors.primary    ?? kit.primaryColor   ?? '#2563EB';
  const secondary  = colors.secondary  ?? kit.secondaryColor ?? '#64748B';
  const accent     = colors.accent     ?? '#16A34A';
  const neutral    = colors.neutral    ?? '#94A3B8';
  const company    = kit.identity?.companyName || kit.name;
  const tagline    = kit.identity?.tagline || 'Your brand, your slides.';
  const website    = kit.identity?.website  || '';

  return (
    <div className="space-y-4">
      {/* Slides row: cover / content / chart */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Presentation slides</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Cover slide */}
          <MockSurface label="Cover" aspectRatio="16/9" background={primary}>
            <div className="flex flex-col h-full justify-center px-4">
              {kit.logo && (
                <img src={kit.logo} alt="" className="w-10 h-10 mb-2 object-contain bg-white/20 rounded p-1" />
              )}
              <div className="text-white font-bold text-[14px] truncate" style={{ fontFamily: headingFont }}>
                {company}
              </div>
              <div className="text-white/80 text-[10px] truncate" style={{ fontFamily: bodyFont }}>
                {tagline}
              </div>
            </div>
          </MockSurface>

          {/* Content slide */}
          <MockSurface label="Content" aspectRatio="16/9" background="#FFFFFF">
            <div className="p-3 h-full">
              <div className="font-bold text-[12px] mb-1" style={{ color: primary, fontFamily: headingFont }}>
                Quarterly review
              </div>
              <div className="text-[9px] text-slate-600 leading-tight" style={{ fontFamily: bodyFont }}>
                Body copy uses the brand body font and neutral text color for readability.
              </div>
              <div className="mt-2 flex gap-1">
                <span className="w-3 h-3 rounded-sm" style={{ background: primary }} />
                <span className="w-3 h-3 rounded-sm" style={{ background: secondary }} />
                <span className="w-3 h-3 rounded-sm" style={{ background: accent }} />
              </div>
            </div>
          </MockSurface>

          {/* Chart slide */}
          <MockSurface label="Chart" aspectRatio="16/9" background="#FFFFFF">
            <div className="p-3 h-full flex flex-col">
              <div className="text-[10px] font-bold mb-1" style={{ color: primary, fontFamily: headingFont }}>
                Revenue by region
              </div>
              <svg viewBox="0 0 100 50" className="flex-1 w-full">
                <rect x="5"  y="20" width="12" height="25" fill={primary} />
                <rect x="22" y="10" width="12" height="35" fill={secondary} />
                <rect x="39" y="25" width="12" height="20" fill={accent} />
                <rect x="56" y="15" width="12" height="30" fill={primary} opacity="0.7" />
                <rect x="73" y="22" width="12" height="23" fill={secondary} opacity="0.7" />
                <line x1="0" y1="45" x2="100" y2="45" stroke="#CBD5E1" strokeWidth="0.5" />
              </svg>
            </div>
          </MockSurface>
        </div>
      </div>

      {/* Slides row: table / PDF / proposal */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Tables &amp; documents <span className="text-slate-400 font-normal normal-case">(Phase 37.2F)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Table slide */}
          <MockSurface label="Table slide" aspectRatio="16/9" background="#FFFFFF">
            <div className="p-3 h-full flex flex-col">
              <div className="text-[10px] font-bold mb-1" style={{ color: primary, fontFamily: headingFont }}>
                Pricing tiers
              </div>
              <div className="border border-slate-200 rounded overflow-hidden text-[8px] flex-1" style={{ fontFamily: bodyFont }}>
                <div className="grid grid-cols-3" style={{ background: primary, color: '#fff' }}>
                  <div className="px-1.5 py-1 font-semibold">Plan</div>
                  <div className="px-1.5 py-1 font-semibold">Seats</div>
                  <div className="px-1.5 py-1 font-semibold">Price</div>
                </div>
                {[
                  ['Starter', '1–5',  '$29'],
                  ['Team',    '6–25', '$99'],
                  ['Scale',   '25+',  '$299'],
                ].map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-3 border-t border-slate-100"
                    style={{ background: i % 2 ? '#F8FAFC' : '#FFFFFF', color: '#1F2937' }}
                  >
                    <div className="px-1.5 py-1" style={{ color: secondary, fontWeight: 600 }}>{row[0]}</div>
                    <div className="px-1.5 py-1">{row[1]}</div>
                    <div className="px-1.5 py-1" style={{ color: accent, fontWeight: 600 }}>{row[2]}</div>
                  </div>
                ))}
              </div>
            </div>
          </MockSurface>

          {/* PDF page */}
          <MockSurface label="PDF page" aspectRatio="3/4" background="#FFFFFF">
            <div className="h-full flex flex-col">
              <div className="px-3 py-2 flex items-center gap-1.5 border-b" style={{ borderColor: neutral }}>
                {kit.logo
                  ? <img src={kit.logo} alt="" className="w-3 h-3 object-contain" />
                  : <span className="w-3 h-3 rounded" style={{ background: primary }} />
                }
                <span className="text-[8px] font-bold truncate" style={{ color: primary, fontFamily: headingFont }}>
                  {company}
                </span>
              </div>
              <div className="px-3 py-2 flex-1 overflow-hidden" style={{ fontFamily: bodyFont }}>
                <div className="text-[9px] font-bold mb-1" style={{ color: primary, fontFamily: headingFont }}>
                  Executive summary
                </div>
                <div className="space-y-0.5">
                  <div className="h-0.5 w-full rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-0.5 w-[92%] rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-0.5 w-[78%] rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-0.5 w-[88%] rounded" style={{ background: '#E2E8F0' }} />
                </div>
                <div className="text-[8px] font-bold mt-1.5 mb-0.5" style={{ color: secondary, fontFamily: headingFont }}>
                  Key metrics
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[primary, secondary, accent].map((c, i) => (
                    <div key={i} className="rounded text-center px-0.5 py-0.5" style={{ background: c, color: '#fff' }}>
                      <div className="text-[7px] font-bold leading-none">{[123, 45, '7%'][i]}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-3 py-1 text-[7px] flex items-center justify-between border-t" style={{ borderColor: neutral, color: neutral }}>
                <span>{website || company}</span>
                <span>Page 1</span>
              </div>
            </div>
          </MockSurface>

          {/* Proposal page */}
          <MockSurface label="Proposal page" aspectRatio="3/4" background="#FFFFFF">
            <div className="h-full flex flex-col">
              <div
                className="px-3 py-3"
                style={{ background: primary, color: '#fff', fontFamily: headingFont }}
              >
                <div className="text-[7px] uppercase tracking-wider opacity-80">Proposal for</div>
                <div className="text-[11px] font-bold leading-tight">Acme Corporation</div>
                <div className="text-[7px] mt-0.5 opacity-80">Prepared by {company}</div>
              </div>
              <div className="p-3 flex-1 overflow-hidden" style={{ fontFamily: bodyFont }}>
                <div className="text-[8px] font-bold mb-0.5" style={{ color: secondary, fontFamily: headingFont }}>
                  Scope
                </div>
                <div className="space-y-0.5">
                  <div className="h-0.5 w-full rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-0.5 w-[85%] rounded" style={{ background: '#E2E8F0' }} />
                  <div className="h-0.5 w-[70%] rounded" style={{ background: '#E2E8F0' }} />
                </div>
                <div className="text-[8px] font-bold mt-1.5 mb-0.5" style={{ color: secondary, fontFamily: headingFont }}>
                  Investment
                </div>
                <div
                  className="text-[10px] font-bold"
                  style={{ color: accent, fontFamily: headingFont }}
                >
                  $48,500
                </div>
              </div>
              <div
                className="px-3 py-1.5 text-[7px] text-center"
                style={{ background: '#F8FAFC', color: neutral, borderTop: `1px solid ${neutral}` }}
              >
                Confidential — {company}
              </div>
            </div>
          </MockSurface>
        </div>
      </div>
    </div>
  );
};

const MockSurface: React.FC<{
  background: string; aspectRatio: string; label?: string; children: React.ReactNode;
}> = ({ background, aspectRatio, label, children }) => (
  <div className="flex flex-col gap-1">
    <div
      className="relative w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden"
      style={{ aspectRatio, background }}
    >
      {children}
    </div>
    {label && <div className="text-[9px] text-slate-500 text-center">{label}</div>}
  </div>
);
