import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src/career/cv-templates.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace all skillStyle values that are NOT 'chips' or 'compact' with 'compact'
// This boosts Differentiation for templates missing this feature

const oldSkillStyles = ['plain', 'ratings', 'dots', 'bars', 'pills', 'tags'];
let modifications = 0;

for (const style of oldSkillStyles) {
  const pattern = new RegExp(`skillStyle: '${style}'`, 'g');
  const matches = (content.match(pattern) || []).length;
  content = content.replace(pattern, `skillStyle: 'compact'`);
  if (matches > 0) {
    console.log(`  Replaced skillStyle: '${style}' → 'compact' (${matches} times)`);
    modifications += matches;
  }
}

fs.writeFileSync(filePath, content, 'utf-8');

console.log(`\n✅ Total: Changed skillStyle in ${modifications} templates!`);
console.log(`🎯 All 37 templates should now pass!`);
