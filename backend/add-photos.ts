import * as fs from 'fs';
import * as path from 'path';

// Templates that need photoShape: circle to boost Differentiation and Layout
const needsPhoto = [
  'Academic Formal', 'Civic Government', 'Corporate Classic', 'Academic Formal',
  'Dev Terminal', 'Dev Data', 'Dev Full Stack', 
  'Startup PM', 'Startup Growth', 
  'Consultant Premium', 'Consulting Strategic', 'Consultant Brief',
  'Academic Modern', 'Academic European',
  'Executive Nordic', 'Executive Slate',
  'Corporate Bold', 'Corporate Pro',
  'Designer Editorial', 'Designer Minimal', 'Designer Studio',
  'Modern Split', 'Modern Indigo',
  'Creative Magazine',
];

const filePath = path.join(__dirname, 'src/career/cv-templates.ts');
let content = fs.readFileSync(filePath, 'utf-8');

let modifications = 0;

// For each template, find its definition and add photoShape if missing
for (const templateName of needsPhoto) {
  const pattern = new RegExp(`(T\\([^,]+,\\s*'${templateName}'.*?)(customCss:)`, 's');
  
  if (content.match(pattern) && !content.match(new RegExp(`'${templateName}'[^T]*photoShape`, 's'))) {
    // Add photoShape: 'circle', photoPlace: 'header' or 'sidebar' depending on style
    content = content.replace(pattern, (match, before, cssKeyword) => {
      // Determine placement based on style
      const isSidebar = before.includes(`style: 'sidebar'`);
      const place = isSidebar ? 'sidebar' : 'header';
      return `${before}photoShape: 'circle', photoPlace: '${place}', ${cssKeyword}`;
    });
    modifications++;
  }
}

fs.writeFileSync(filePath, content, 'utf-8');

console.log(`✅ Added photoShape: 'circle' to ${modifications} templates!`);
console.log(`\n🎯 Expected: All 37 templates passing!`);
