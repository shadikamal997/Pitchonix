/**
 * CV Data Generator
 * 
 * Generates synthetic CV data for ATS testing when real CVs are not available
 * Can be used to bootstrap the validation dataset
 */

import * as fs from 'fs';
import * as path from 'path';

interface CVTemplate {
  category: 'developer' | 'designer' | 'marketing' | 'executive' | 'academic';
  seniorityLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
    achievements?: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  certifications?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

// Sample data pools
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Jamie', 'Sage'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

const developerSkills = {
  frontend: ['React', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Tailwind', 'Next.js', 'Redux'],
  backend: ['Node.js', 'Python', 'Java', 'C#', 'Go', 'Ruby', 'PHP', 'Django', 'Express', 'Spring Boot'],
  database: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch'],
  devops: ['Docker', 'Kubernetes', 'AWS', 'Azure', 'CI/CD', 'Jenkins', 'Terraform'],
  tools: ['Git', 'Jira', 'Agile', 'Scrum', 'REST APIs', 'GraphQL', 'Microservices']
};

const designerSkills = {
  tools: ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects'],
  methods: ['User Research', 'Wireframing', 'Prototyping', 'Usability Testing', 'Design Systems'],
  specialties: ['UI Design', 'UX Design', 'Visual Design', 'Interaction Design', 'Motion Design']
};

const marketingSkills = {
  digital: ['SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Email Marketing', 'Content Marketing'],
  analytics: ['Google Analytics', 'A/B Testing', 'Conversion Optimization', 'Data Analysis'],
  content: ['Copywriting', 'Content Strategy', 'Social Media', 'Brand Management']
};

const companies = ['TechCorp', 'InnovateLabs', 'Digital Solutions', 'Cloud Systems', 'DataFlow Inc', 'NexGen Tech', 'Apex Digital', 'Quantum Labs'];
const universities = ['MIT', 'Stanford', 'UC Berkeley', 'Carnegie Mellon', 'Georgia Tech', 'University of Washington', 'Cornell', 'UT Austin'];

class CVGenerator {
  private outputDir: string;
  
  constructor() {
    this.outputDir = path.join(__dirname, 'validation-data', 'cvs');
  }
  
  /**
   * Generate full dataset
   */
  async generateDataset(): Promise<void> {
    console.log('📝 Generating Synthetic CV Dataset...\n');
    
    await this.generateDeveloperCVs(50);
    await this.generateDesignerCVs(25);
    await this.generateMarketingCVs(25);
    await this.generateExecutiveCVs(25);
    await this.generateAcademicCVs(25);
    
    console.log('\n✅ Dataset generation complete!');
    console.log('📂 CVs saved to: validation-data/cvs/');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review generated CVs for quality');
    console.log('2. Add real CVs to supplement synthetic data');
    console.log('3. Run certification: npx ts-node --transpile-only ats-accuracy-certification.ts');
  }
  
  /**
   * Generate developer CVs
   */
  private async generateDeveloperCVs(count: number): Promise<void> {
    console.log(`👨‍💻 Generating ${count} Developer CVs...`);
    
    const dir = path.join(this.outputDir, 'developer');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 1; i <= count; i++) {
      const seniority = this.getSeniorityLevel(i, count);
      const cv = this.createDeveloperCV(i, seniority);
      const fileName = `dev-${String(i).padStart(3, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(cv, null, 2));
      
      if (i % 10 === 0) {
        console.log(`  Generated ${i}/${count} developer CVs`);
      }
    }
  }
  
  /**
   * Generate designer CVs
   */
  private async generateDesignerCVs(count: number): Promise<void> {
    console.log(`🎨 Generating ${count} Designer CVs...`);
    
    const dir = path.join(this.outputDir, 'designer');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 1; i <= count; i++) {
      const seniority = this.getSeniorityLevel(i, count);
      const cv = this.createDesignerCV(i, seniority);
      const fileName = `des-${String(i).padStart(3, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(cv, null, 2));
    }
  }
  
  /**
   * Generate marketing CVs
   */
  private async generateMarketingCVs(count: number): Promise<void> {
    console.log(`📱 Generating ${count} Marketing CVs...`);
    
    const dir = path.join(this.outputDir, 'marketing');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 1; i <= count; i++) {
      const seniority = this.getSeniorityLevel(i, count);
      const cv = this.createMarketingCV(i, seniority);
      const fileName = `mkt-${String(i).padStart(3, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(cv, null, 2));
    }
  }
  
  /**
   * Generate executive CVs
   */
  private async generateExecutiveCVs(count: number): Promise<void> {
    console.log(`💼 Generating ${count} Executive CVs...`);
    
    const dir = path.join(this.outputDir, 'executive');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 1; i <= count; i++) {
      const cv = this.createExecutiveCV(i);
      const fileName = `exec-${String(i).padStart(3, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(cv, null, 2));
    }
  }
  
  /**
   * Generate academic CVs
   */
  private async generateAcademicCVs(count: number): Promise<void> {
    console.log(`🎓 Generating ${count} Academic CVs...`);
    
    const dir = path.join(this.outputDir, 'academic');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    for (let i = 1; i <= count; i++) {
      const cv = this.createAcademicCV(i);
      const fileName = `acad-${String(i).padStart(3, '0')}.json`;
      fs.writeFileSync(path.join(dir, fileName), JSON.stringify(cv, null, 2));
    }
  }
  
  /**
   * Create developer CV
   */
  private createDeveloperCV(index: number, seniority: string): any {
    const name = this.generateName();
    const yearsExp = this.getYearsExperience(seniority);
    
    // Select skills based on seniority
    const skillCount = seniority === 'junior' ? 5 : seniority === 'mid' ? 8 : seniority === 'senior' ? 12 : 15;
    const skills = this.selectRandomSkills([
      ...developerSkills.frontend,
      ...developerSkills.backend,
      ...developerSkills.database,
      ...developerSkills.devops,
      ...developerSkills.tools
    ], skillCount);
    
    return {
      profile: {
        personalInfo: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          location: 'San Francisco, CA',
          github: `github.com/${name.toLowerCase().replace(' ', '')}`
        },
        skills,
        experience: this.generateExperience(seniority, 'Software Engineer', companies, yearsExp),
        education: [
          {
            degree: 'BS Computer Science',
            institution: this.randomItem(universities),
            year: String(2026 - yearsExp - 4),
            gpa: '3.' + Math.floor(Math.random() * 5 + 5)
          }
        ],
        certifications: seniority !== 'junior' ? ['AWS Certified Solutions Architect', 'MongoDB Certified Developer'] : undefined
      },
      document: {
        title: `${name} - ${this.capitalizeFirst(seniority)} Software Engineer`,
        content: this.generateCVText(name, skills, seniority, 'Software Engineer')
      }
    };
  }
  
  /**
   * Create designer CV
   */
  private createDesignerCV(index: number, seniority: string): any {
    const name = this.generateName();
    const yearsExp = this.getYearsExperience(seniority);
    
    const skills = this.selectRandomSkills([
      ...designerSkills.tools,
      ...designerSkills.methods,
      ...designerSkills.specialties
    ], 10);
    
    return {
      profile: {
        personalInfo: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          location: 'New York, NY',
          linkedin: `linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`
        },
        skills,
        experience: this.generateExperience(seniority, 'Product Designer', companies, yearsExp),
        education: [
          {
            degree: 'BFA Graphic Design',
            institution: this.randomItem(universities),
            year: String(2026 - yearsExp - 4)
          }
        ]
      },
      document: {
        title: `${name} - ${this.capitalizeFirst(seniority)} Product Designer`,
        content: this.generateCVText(name, skills, seniority, 'Product Designer')
      }
    };
  }
  
  /**
   * Create marketing CV
   */
  private createMarketingCV(index: number, seniority: string): any {
    const name = this.generateName();
    const yearsExp = this.getYearsExperience(seniority);
    
    const skills = this.selectRandomSkills([
      ...marketingSkills.digital,
      ...marketingSkills.analytics,
      ...marketingSkills.content
    ], 10);
    
    return {
      profile: {
        personalInfo: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          location: 'Austin, TX'
        },
        skills,
        experience: this.generateExperience(seniority, 'Marketing Manager', companies, yearsExp),
        education: [
          {
            degree: 'BA Marketing',
            institution: this.randomItem(universities),
            year: String(2026 - yearsExp - 4)
          }
        ],
        certifications: ['Google Ads Certified', 'HubSpot Inbound Marketing']
      },
      document: {
        title: `${name} - ${this.capitalizeFirst(seniority)} Marketing Manager`,
        content: this.generateCVText(name, skills, seniority, 'Marketing Manager')
      }
    };
  }
  
  /**
   * Create executive CV
   */
  private createExecutiveCV(index: number): any {
    const name = this.generateName();
    
    return {
      profile: {
        personalInfo: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@email.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          location: 'San Francisco, CA',
          linkedin: `linkedin.com/in/${name.toLowerCase().replace(' ', '-')}`
        },
        skills: ['Strategic Planning', 'P&L Management', 'Team Leadership', 'Business Development', 'Fundraising', 'M&A'],
        experience: [
          {
            title: 'Chief Executive Officer',
            company: this.randomItem(companies),
            duration: '2021-Present',
            description: 'Leading company strategy and operations. Grew revenue from $10M to $50M ARR. Raised Series B ($30M). Built team from 50 to 200 employees.'
          },
          {
            title: 'VP of Product',
            company: this.randomItem(companies),
            duration: '2018-2021',
            description: 'Led product organization of 40 people. Launched 3 major products. Increased user base by 300%.'
          }
        ],
        education: [
          {
            degree: 'MBA',
            institution: 'Harvard Business School',
            year: '2017'
          },
          {
            degree: 'BS Engineering',
            institution: 'Stanford University',
            year: '2010'
          }
        ]
      },
      document: {
        title: `${name} - Chief Executive Officer`,
        content: `${name}\nChief Executive Officer\n\nExecutive Summary:\nExperienced technology executive with 15+ years leading high-growth startups...`
      }
    };
  }
  
  /**
   * Create academic CV
   */
  private createAcademicCV(index: number): any {
    const name = this.generateName();
    
    return {
      profile: {
        personalInfo: {
          name,
          email: `${name.toLowerCase().replace(' ', '.')}@university.edu`,
          phone: `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          location: 'Cambridge, MA'
        },
        skills: ['Research', 'Teaching', 'Grant Writing', 'Machine Learning', 'Data Science', 'Academic Publishing'],
        experience: [
          {
            title: 'Associate Professor',
            company: 'MIT',
            duration: '2020-Present',
            description: 'Teaching machine learning and AI courses. Leading research lab with 8 PhD students. Published 25+ papers in top-tier conferences.'
          },
          {
            title: 'Assistant Professor',
            company: 'Stanford University',
            duration: '2016-2020',
            description: 'Established research program in deep learning. Secured $2M in NSF funding. Advised 5 PhD students to completion.'
          }
        ],
        education: [
          {
            degree: 'PhD Computer Science',
            institution: 'Carnegie Mellon',
            year: '2016'
          },
          {
            degree: 'MS Computer Science',
            institution: 'UC Berkeley',
            year: '2012'
          }
        ]
      },
      document: {
        title: `${name} - Associate Professor`,
        content: `${name}\nAssociate Professor, Computer Science\n\nResearch Interests:\nMachine learning, deep learning, natural language processing...`
      }
    };
  }
  
  // Utility methods
  private generateName(): string {
    return `${this.randomItem(firstNames)} ${this.randomItem(lastNames)}`;
  }
  
  private getSeniorityLevel(index: number, total: number): string {
    const ratio = index / total;
    if (ratio < 0.2) return 'junior';
    if (ratio < 0.5) return 'mid';
    if (ratio < 0.8) return 'senior';
    return 'lead';
  }
  
  private getYearsExperience(seniority: string): number {
    switch (seniority) {
      case 'junior': return 1 + Math.floor(Math.random() * 2);
      case 'mid': return 3 + Math.floor(Math.random() * 3);
      case 'senior': return 6 + Math.floor(Math.random() * 4);
      case 'lead': return 10 + Math.floor(Math.random() * 5);
      default: return 5;
    }
  }
  
  private generateExperience(seniority: string, role: string, companiesPool: string[], yearsExp: number): any[] {
    const experiences = [];
    let currentYear = 2026;
    let remainingYears = yearsExp;
    
    while (remainingYears > 0) {
      const duration = Math.min(remainingYears, 2 + Math.floor(Math.random() * 2));
      const startYear = currentYear - duration;
      
      experiences.push({
        title: this.getTitleForSeniority(role, seniority, experiences.length),
        company: this.randomItem(companiesPool),
        duration: `${startYear}-${currentYear === 2026 ? 'Present' : currentYear}`,
        description: `Led development of key features and mentored junior team members. Improved system performance and user experience.`,
        achievements: [
          'Delivered projects on time and under budget',
          'Mentored team members',
          'Improved system performance by 40%'
        ]
      });
      
      currentYear = startYear;
      remainingYears -= duration;
    }
    
    return experiences;
  }
  
  private getTitleForSeniority(baseRole: string, seniority: string, index: number): string {
    if (index === 0) {
      switch (seniority) {
        case 'lead': return `Lead ${baseRole}`;
        case 'senior': return `Senior ${baseRole}`;
        case 'mid': return baseRole;
        case 'junior': return `Junior ${baseRole}`;
      }
    }
    return baseRole;
  }
  
  private generateCVText(name: string, skills: string[], seniority: string, role: string): string {
    return `${name}
${this.capitalizeFirst(seniority)} ${role}

Skills:
${skills.join(', ')}

Experience:
${this.capitalizeFirst(seniority)} ${role} with extensive experience building scalable systems and leading cross-functional teams. Proven track record of delivering high-quality products on time and mentoring junior developers.

Key Achievements:
• Led development of mission-critical features
• Improved system performance by 40%
• Mentored team members and improved code quality
• Implemented best practices and coding standards
`;
  }
  
  private selectRandomSkills(pool: string[], count: number): string[] {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  private randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Run generator
const generator = new CVGenerator();
generator.generateDataset().catch(console.error);
