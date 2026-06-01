import * as fs from 'fs';
import * as path from 'path';

/**
 * Quick script to fix field name mismatch in CV dataset
 * Changes personalInfo → contact to match ATS analyzer expectations
 */
function fixCVFiles() {
  const dataDir = path.join(__dirname, 'validation-data', 'cvs');
  const categories = ['developer', 'designer', 'marketing', 'executive', 'academic'];
  
  let totalFixed = 0;
  
  for (const category of categories) {
    const categoryDir = path.join(dataDir, category);
    if (!fs.existsSync(categoryDir)) continue;
    
    const files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.json'));
    
    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Rename personalInfo → contact
      if (data.profile && data.profile.personalInfo) {
        data.profile.contact = data.profile.personalInfo;
        delete data.profile.personalInfo;
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        totalFixed++;
      }
    }
    
    console.log(`✅ Fixed ${files.length} CVs in ${category}/`);
  }
  
  console.log(`\n✅ Total CVs fixed: ${totalFixed}`);
  console.log('🎯 Field mapping: personalInfo → contact');
}

fixCVFiles();
