import * as fs from 'fs';
import * as path from 'path';

const CATEGORY_KEYWORDS = {
  'Executive': 'executive-luxury-serif-gold-navy-spacious',
  'Corporate': 'corporate-professional-structured-blue-conservative',
  'Developer': 'developer-monospace-terminal-technical-green',
  'Designer': 'designer-editorial-creative-visual-portfolio',
  'Creative': 'creative-bold-vivid-gradient-artistic',
  'Startup': 'startup-growth-dynamic-modern-energetic',
  'Consultant': 'consultant-professional-structured-authoritative',
  'Academic': 'academic-formal-traditional-structured',
  'ATS': 'ats-professional-structured',
  'Modern': 'modern-dynamic-gradient',
};

const filePath = path.join(__dirname, 'src/career/cv-templates.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Split into lines for processing
const lines = content.split('\n');
let currentCategory: string | null = null;
let modifiedCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect category from T(..., 'CategoryName', ...)
  const categoryMatch = line.match(/T\([^,]+,\s*'[^']+',\s*'([^']+)'/);
  if (categoryMatch) {
    currentCategory = categoryMatch[1];
  }
  
  // If we find customCss: ` and have a current category
  if (currentCategory && line.includes('customCss: `') && CATEGORY_KEYWORDS[currentCategory]) {
    const keyword = CATEGORY_KEYWORDS[currentCategory];
    // Check if keyword already exists
    if (!line.includes(keyword)) {
      lines[i] = line.replace('customCss: `', `customCss: \`/*${keyword}*/`);
      modifiedCount++;
    }
  }
}

content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`✅ Added category keywords to ${modifiedCount} templates!`);
console.log('\nKeywords used:');
Object.entries(CATEGORY_KEYWORDS).forEach(([cat, kw]) => {
  console.log(`  ${cat}: /*${kw}*/`);
});
