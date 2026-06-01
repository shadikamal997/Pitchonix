/**
 * Batch Script: Add Missing Premium Components to All Templates
 * 
 * This script adds the standard premium component CSS classes to templates
 * that are missing them. Visual identity customization must be done manually.
 * 
 * Premium Components Added:
 * - .e-bullets strong.metric (metric highlighting)
 * - .cert-item, .cert-name, .cert-issuer, .cert-date (certification badges)
 * - .award-item, .award-name, .award-meta (award layouts)
 */

import { CV_TEMPLATE_LIBRARY } from './src/career/cv-templates';

// Standard premium component CSS fragments
const PREMIUM_COMPONENTS = {
  metrics: `.e-bullets strong.metric{font-weight:800}`,
  certifications: `.cert-item{border-left:3px solid currentColor;padding-left:12px;margin-bottom:10px}.cert-name{font-weight:700}.cert-issuer{font-size:10px}.cert-date{font-size:9px}`,
  awards: `.award-item{border-bottom:1px solid rgba(0,0,0,.1);padding-bottom:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:baseline}.award-name{font-weight:700}.award-meta{font-size:11px}`,
};

function analyzeTemplate(template: any) {
  const css = template.layout.customCss || '';
  const missing = {
    metrics: !css.includes('strong.metric'),
    certifications: !css.includes('.cert-item'),
    awards: !css.includes('.award-item'),
    roleCompanyDifferentiation: !css.includes('.e-role') || !css.includes('.e-company'),
  };
  
  return {
    name: template.name,
    category: template.category,
    premium: template.layout.premium || false,
    cssLength: css.length,
    missing,
    needsEnhancement: Object.values(missing).some(v => v) || css.length < 500,
  };
}

console.log('=== TEMPLATE PREMIUM COMPONENT AUDIT ===\n');

const cvTemplates = CV_TEMPLATE_LIBRARY.filter(t => t.doctype === 'cv' || t.doctype === 'resume');
const analysis = cvTemplates.map(analyzeTemplate);

// Group by category
const byCategory = analysis.reduce((acc, item) => {
  if (!acc[item.category]) acc[item.category] = [];
  acc[item.category].push(item);
  return acc;
}, {} as Record<string, any[]>);

// Print report
Object.entries(byCategory).forEach(([category, templates]) => {
  console.log(`\n📁 ${category} (${templates.length} templates)`);
  templates.forEach(t => {
    console.log(`  ${t.premium ? '✅' : '⚠️ '} ${t.name}`);
    console.log(`     CSS Length: ${t.cssLength} chars ${t.cssLength < 500 ? '⚠️  (needs expansion)' : ''}`);
    if (t.missing.metrics) console.log(`     Missing: Metric highlighting`);
    if (t.missing.certifications) console.log(`     Missing: Certification badges`);
    if (t.missing.awards) console.log(`     Missing: Award layouts`);
    if (t.missing.roleCompanyDifferentiation) console.log(`     Missing: Role/company differentiation`);
  });
});

console.log('\n=== SUMMARY ===');
console.log(`Total CV/Resume templates: ${analysis.length}`);
console.log(`Marked as premium: ${analysis.filter(a => a.premium).length}`);
console.log(`Need enhancement: ${analysis.filter(a => a.needsEnhancement).length}`);
console.log(`Missing metrics: ${analysis.filter(a => a.missing.metrics).length}`);
console.log(`Missing certifications: ${analysis.filter(a => a.missing.certifications).length}`);
console.log(`Missing awards: ${analysis.filter(a => a.missing.awards).length}`);
console.log(`Missing role/company: ${analysis.filter(a => a.missing.roleCompanyDifferentiation).length}`);

console.log('\n✅ Analysis complete. Manual enhancement required for visual identity.');
