/**
 * PHASE 42.23 — TEMPLATE QUALITY AUDIT & SCORING MATRIX
 * 
 * Scores all CV/Resume templates on 7 premium quality criteria:
 *  1. Typography (hierarchy, scale, differentiation)
 *  2. Hierarchy (name dominance, visual priority)
 *  3. Layout (architectural uniqueness, not just color variations)
 *  4. Spacing (density, balance, utilization)
 *  5. Visual Identity (category-specific character)
 *  6. Premium Feel (marketplace quality)
 *  7. Differentiation (distinct from other templates)
 * 
 * Target: All templates ≥ 9/10 on every criterion
 */

import { CV_TEMPLATE_LIBRARY } from './src/career/cv-templates';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TemplateScore {
  name: string;
  category: string;
  doctype: string;
  typography: number;
  hierarchy: number;
  layout: number;
  spacing: number;
  visualIdentity: number;
  premiumFeel: number;
  differentiation: number;
  average: number;
  passing: boolean;
  issues: string[];
  recommendations: string[];
}

function scoreTemplate(template: typeof CV_TEMPLATE_LIBRARY[0]): TemplateScore {
  const layout = template.layout;
  const issues: string[] = [];
  const recommendations: string[] = [];
  let scores = {
    typography: 0,
    hierarchy: 0,
    layout: 0,
    spacing: 0,
    visualIdentity: 0,
    premiumFeel: 0,
    differentiation: 0,
  };
  
  // ============================================================================
  // 1. TYPOGRAPHY SCORE
  // ============================================================================
  let typographyScore = 10;
  
  // Check for premium typography
  const premiumFonts = ['Playfair Display', 'Cormorant Garamond', 'DM Sans', 'Plus Jakarta Sans', 'Poppins', 'Manrope'];
  if (!premiumFonts.some(f => layout.typography.heading.includes(f))) {
    typographyScore -= 1;
    issues.push('Typography: Generic heading font (not premium)');
  }
  
  // Check for customCss indicating genuine typography work
  if (!layout.customCss || layout.customCss.length < 200) {
    typographyScore -= 2;
    issues.push('Typography: Minimal customCss (<200 chars) - lacks detailed styling');
    recommendations.push('Add comprehensive customCss with name sizing, section header styles, role/company differentiation');
  }
  
  // Check for role/company styling
  if (!layout.customCss?.includes('.e-company')) {
    typographyScore -= 1;
    issues.push('Typography: No .e-company styling (company names not visually distinct)');
  }
  
  if (!layout.customCss?.includes('.e-role')) {
    typographyScore -= 1;
    issues.push('Typography: No .e-role styling (role titles not emphasized)');
  }
  
  scores.typography = Math.max(0, typographyScore);
  
  // ============================================================================
  // 2. HIERARCHY SCORE
  // ============================================================================
  let hierarchyScore = 10;
  
  // Check if name will be dominant (sidebar vs non-sidebar)
  if (layout.style === 'sidebar' && (!layout.customCss?.match(/\.sidebar-head h1.*font-size:\s*(\d+)/))) {
    hierarchyScore -= 2;
    issues.push('Hierarchy: Sidebar name size not explicitly defined');
    recommendations.push('Add explicit .sidebar-head h1 {font-size: 22-26px}');
  }
  
  if (layout.headerStyle === 'banner' && (!layout.customCss?.match(/h1.*font-size:\s*(\d+)/))) {
    hierarchyScore -= 2;
    issues.push('Hierarchy: Banner name size not explicitly defined');
    recommendations.push('Add explicit h1 {font-size: 40-56px} for banner header');
  }
  
  // Check for section header emphasis
  if (!layout.customCss?.includes('h2')) {
    hierarchyScore -= 1;
    issues.push('Hierarchy: No h2 styling (section headers not differentiated)');
  }
  
  scores.hierarchy = Math.max(0, hierarchyScore);
  
  // ============================================================================
  // 3. LAYOUT SCORE
  // ============================================================================
  let layoutScore = 10;
  
  // Check for unique layout features
  const layoutFeatures = [
    layout.timeline,
    layout.headerStyle !== 'block',
    layout.style === 'sidebar' || layout.style === 'twoColumn',
    layout.photoShape && layout.photoShape !== 'none',
    layout.customCss && layout.customCss.length > 500
  ].filter(Boolean).length;
  
  if (layoutFeatures < 2) {
    layoutScore -= 3;
    issues.push('Layout: Generic layout (lacks distinctive features)');
    recommendations.push('Add unique layout features: timeline, custom header, photo, distinctive sidebar');
  }
  
  // Check for premium markers
  if (!layout.premium) {
    layoutScore -= 2;
    issues.push('Layout: Not marked as premium');
  }
  
  scores.layout = Math.max(0, layoutScore);
  
  // ============================================================================
  // 4. SPACING SCORE
  // ============================================================================
  let spacingScore = 10;
  
  // Check density setting
  if (layout.density === 'compact') {
    spacingScore -= 1; // Compact can work for certain categories
  }
  
  if (layout.density !== 'comfortable' && layout.density !== 'spacious') {
    issues.push('Spacing: Consider comfortable or spacious density for premium feel');
  }
  
  // Sidebar width check
  if (layout.style === 'sidebar' && layout.sidebarWidth) {
    if (layout.sidebarWidth < 240 || layout.sidebarWidth > 300) {
      spacingScore -= 1;
      issues.push(`Spacing: Sidebar width ${layout.sidebarWidth}px may be suboptimal (recommended: 250-280px)`);
    }
  }
  
  scores.spacing = Math.max(0, spacingScore);
  
  // ============================================================================
  // 5. VISUAL IDENTITY SCORE
  // ============================================================================
  let visualIdentityScore = 10;
  
  // Category-specific expectations
  const categoryExpectations: Record<string, string[]> = {
    'Executive': ['luxury', 'serif', 'gold', 'navy', 'spacious'],
    'Corporate': ['professional', 'structured', 'blue', 'conservative'],
    'Developer': ['monospace', 'terminal', 'github', 'technical', 'green'],
    'Designer': ['editorial', 'creative', 'portfolio', 'visual'],
    'Creative': ['bold', 'vivid', 'gradient', 'artistic'],
    'Startup': ['growth', 'dynamic', 'modern', 'energetic'],
    'Consultant': ['structured', 'professional', 'authoritative'],
    'Academic': ['formal', 'traditional', 'structured'],
    'Modern': ['modern', 'dynamic', 'gradient'],
    'ATS': ['professional', 'structured'], // ATS should still feel premium
  };
  
  const expectations = categoryExpectations[template.category] || [];
  const cssLower = (layout.customCss || '').toLowerCase();
  const nameMatcheslower = template.name.toLowerCase();
  
  let matchedExpectations = 0;
  for (const keyword of expectations) {
    if (cssLower.includes(keyword) || nameMatcheslower.includes(keyword)) {
      matchedExpectations++;
    }
  }
  
  if (matchedExpectations < 2) {
    visualIdentityScore -= 3;
    issues.push(`Visual Identity: Does not reflect ${template.category} category character`);
    recommendations.push(`Add ${template.category}-specific visual elements: ${expectations.join(', ')}`);
  }
  
  scores.visualIdentity = Math.max(0, visualIdentityScore);
  
  // ============================================================================
  // 6. PREMIUM FEEL SCORE
  // ============================================================================
  let premiumFeelScore = 10;
  
  // Check for premium components
  const premiumComponents = [
    layout.customCss?.includes('.sk-chip'),       // Chips skill style
    layout.customCss?.includes('.sk-compact'),    // Compact skill style
    layout.customCss?.includes('.cert-item'),     // Certification badges
    layout.customCss?.includes('.award-item'),    // Awards layout
    layout.customCss?.includes('strong.metric'),  // Metric highlighting
    layout.customCss && layout.customCss.length > 800,  // Comprehensive styling
  ].filter(Boolean).length;
  
  if (premiumComponents < 2) {
    premiumFeelScore -= 3;
    issues.push('Premium Feel: Missing premium component styling');
    recommendations.push('Add premium components: chips, compact grids, cert badges, award layouts, metric highlighting');
  }
  
  // Check for gradient usage (premium indicator)
  if (!cssLower.includes('gradient') && template.category !== 'Corporate' && template.category !== 'ATS') {
    premiumFeelScore -= 1;
    issues.push('Premium Feel: No gradient usage (consider for headers/sidebar)');
  }
  
  scores.premiumFeel = Math.max(0, premiumFeelScore);
  
  // ============================================================================
  // 7. DIFFERENTIATION SCORE
  // ============================================================================
  let differentiationScore = 10;
  
  // This will be evaluated relative to other templates later
  // For now, check for unique characteristics
  const uniqueFeatures = [
    layout.timeline,
    layout.accentDividers,
    layout.headerBg,
    layout.bannerBorderBottom,
    layout.customCss && layout.customCss.includes('linear-gradient'),
    layout.skillStyle === 'chips' || layout.skillStyle === 'compact',
    layout.photoShape === 'circle',
  ].filter(Boolean).length;
  
  if (uniqueFeatures < 3) {
    differentiationScore -= 2;
    issues.push('Differentiation: Limited unique features');
    recommendations.push('Add more distinctive elements: timeline, custom borders, gradients, unique skill styles');
  }
  
  scores.differentiation = Math.max(0, differentiationScore);
  
  // ============================================================================
  // CALCULATE AVERAGE & PASSING
  // ============================================================================
  const average = Object.values(scores).reduce((a, b) => a + b, 0) / 7;
  const passing = Object.values(scores).every(s => s >= 9);
  
  return {
    name: template.name,
    category: template.category,
    doctype: template.doctype,
    ...scores,
    average: Math.round(average * 10) / 10,
    passing,
    issues,
    recommendations,
  };
}

function generateAuditReport() {
  console.log('🔍 PHASE 42.23 — TEMPLATE QUALITY AUDIT');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const cvTemplates = CV_TEMPLATE_LIBRARY.filter(t => t.doctype === 'cv' || t.doctype === 'resume');
  const scores: TemplateScore[] = cvTemplates.map(scoreTemplate);
  
  // Sort by average score (lowest first - needs most work)
  scores.sort((a, b) => a.average - b.average);
  
  console.log(`📊 SCORING SUMMARY\n`);
  console.log(`Total CV/Resume templates audited: ${scores.length}`);
  console.log(`Passing templates (all criteria ≥ 9): ${scores.filter(s => s.passing).length}`);
  console.log(`Failing templates (any criterion < 9): ${scores.filter(s => !s.passing).length}\n`);
  
  // Category breakdown
  console.log(`📁 BY CATEGORY:\n`);
  const byCategory = scores.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, TemplateScore[]>);
  
  Object.entries(byCategory).forEach(([category, templates]) => {
    const avgScore = templates.reduce((sum, t) => sum + t.average, 0) / templates.length;
    const passing = templates.filter(t => t.passing).length;
    console.log(`   ${category}: ${templates.length} templates | Avg: ${avgScore.toFixed(1)} | Passing: ${passing}/${templates.length}`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 DETAILED SCORING MATRIX\n');
  
  // Header
  console.log('Template'.padEnd(30) + 
    'Typo'.padEnd(6) + 
    'Hier'.padEnd(6) + 
    'Layou'.padEnd(6) + 
    'Space'.padEnd(6) + 
    'Ident'.padEnd(6) + 
    'Prem'.padEnd(6) + 
    'Diff'.padEnd(6) + 
    'Avg'.padEnd(6) + 
    'Status');
  console.log('─'.repeat(90));
  
  scores.forEach(score => {
    const status = score.passing ? '✅ PASS' : '❌ FAIL';
    const row = 
      score.name.padEnd(30) +
      score.typography.toString().padEnd(6) +
      score.hierarchy.toString().padEnd(6) +
      score.layout.toString().padEnd(6) +
      score.spacing.toString().padEnd(6) +
      score.visualIdentity.toString().padEnd(6) +
      score.premiumFeel.toString().padEnd(6) +
      score.differentiation.toString().padEnd(6) +
      score.average.toString().padEnd(6) +
      status;
    console.log(row);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('⚠️  TEMPLATES REQUIRING IMMEDIATE ATTENTION\n');
  
  const failing = scores.filter(s => !s.passing);
  failing.forEach((score, idx) => {
    console.log(`${idx + 1}. ${score.name} (${score.category}) — Avg: ${score.average}/10\n`);
    console.log(`   Scores: Typo=${score.typography} | Hier=${score.hierarchy} | Layout=${score.layout} | Space=${score.spacing}`);
    console.log(`           Ident=${score.visualIdentity} | Prem=${score.premiumFeel} | Diff=${score.differentiation}\n`);
    
    if (score.issues.length > 0) {
      console.log(`   Issues:`);
      score.issues.forEach(issue => console.log(`      • ${issue}`));
      console.log('');
    }
    
    if (score.recommendations.length > 0) {
      console.log(`   Recommendations:`);
      score.recommendations.forEach(rec => console.log(`      → ${rec}`));
      console.log('');
    }
  });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ PASSING TEMPLATES (All criteria ≥ 9)\n');
  
  const passing = scores.filter(s => s.passing);
  passing.forEach(score => {
    console.log(`   ✅ ${score.name} (${score.category}) — ${score.average}/10`);
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📈 NEXT ACTIONS\n');
  console.log(`1. Redesign ${failing.length} failing templates to achieve 9+ scores`);
  console.log(`2. Focus on templates with average < 8.0 first (critical issues)`);
  console.log(`3. Apply recommendations systematically`);
  console.log(`4. Re-run audit after improvements`);
  console.log(`5. Generate final comparison screenshots\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  return scores;
}

// Run audit
const results = generateAuditReport();
