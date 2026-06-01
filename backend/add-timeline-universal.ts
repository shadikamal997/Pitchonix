import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, 'src/career/cv-templates.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Add timeline: true to all templates that don't have it
let modifications = 0;

const lines = content.split('\n');
const result: string[] = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // If this line starts a T( definition
  if (line.trim().startsWith('T(')) {
    // Look ahead to find customCss and check if timeline exists in this template
    let templateEnd = i;
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      if (lines[j].includes('customCss:') || lines[j].includes('  }),')) {
        templateEnd = j;
        break;
      }
    }
    
    const templateBlock = lines.slice(i, templateEnd + 1).join('\n');
    const hasTimeline = templateBlock.includes('timeline:');
    
    // If no timeline, add it before customCss or premium
    if (!hasTimeline && line.includes("T(")) {
      for (let j = i; j <= templateEnd; j++) {
        if (lines[j].trim().startsWith('premium:') || lines[j].trim().startsWith('customCss:') || lines[j].trim().startsWith('accentDividers:')) {
          lines[j] = `    timeline: true, ${lines[j].trimStart()}`;
          modifications++;
          break;
        }
      }
    }
  }
  
  result.push(lines[i]);
}

content = lines.join('\n');
fs.writeFileSync(filePath, content, 'utf-8');

console.log(`✅ Added timeline: true to ${modifications} templates!`);
console.log(`\n🎯 All 37 templates should now pass!`);
