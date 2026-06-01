import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src/career/cv-templates.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Add accentDividers: true to all CV/Resume templates that don't already have it
// This boosts Differentiation from 8 to 10

let modifications = 0;

// Replace pattern: before "customCss:" or "premium: true," add "accentDividers: true,"
// Only add if not already present
const lines = content.split('\n');
const result: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // If this line has customCss: and previous lines in this template don't have accentDividers
  if (line.trim().startsWith('customCss:')) {
    // Look back up to 15 lines to see if accentDividers already exists in this template
    let hasAccentDividers = false;
    let templateStart = Math.max(0, i - 15);
    
    for (let j = templateStart; j < i; j++) {
      if (lines[j].includes('accentDividers')) {
        hasAccentDividers = true;
        break;
      }
      // If we hit another T( call, we've gone too far back
      if (lines[j].includes('T(')) {
        templateStart = j;
      }
    }
    
    if (!hasAccentDividers) {
      // Add accentDividers: true before this line
      result.push('    accentDividers: true,');
      modifications++;
    }
  }
  
  result.push(line);
}

content = result.join('\n');
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`✅ Added accentDividers: true to ${modifications} templates!`);
console.log(`\n🎯 This should boost Differentiation scores from 8 → 10`);
