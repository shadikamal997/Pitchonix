/**
 * Job Description Generator
 * Generates 100 realistic job descriptions for ATS certification
 */

import * as fs from 'fs';
import * as path from 'path';

const jobTemplates = [
  // Frontend (15 jobs)
  {
    category: 'frontend',
    title: 'Senior Frontend Engineer',
    description: 'We are seeking an experienced Senior Frontend Engineer to join our growing team. You will build scalable web applications using modern JavaScript frameworks and work closely with designers and backend engineers.',
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Redux', 'REST APIs'],
    requiredExperience: '5+ years in frontend development',
    responsibilities: ['Build responsive web applications', 'Collaborate with design team', 'Code review and mentoring', 'Optimize performance'],
    qualifications: ['BS in Computer Science or equivalent', 'Strong JavaScript fundamentals', 'Experience with React ecosystem']
  },
  {
    category: 'frontend',
    title: 'React Developer',
    description: 'Looking for a passionate React Developer to build cutting-edge user interfaces. You will work on a fast-paced agile team delivering features to millions of users.',
    requiredSkills: ['React', 'JavaScript', 'CSS', 'Webpack', 'Git'],
    requiredExperience: '3+ years with React',
    responsibilities: ['Develop React components', 'Implement designs', 'Write tests', 'Participate in code reviews'],
    qualifications: ['Experience with modern React patterns', 'Strong CSS skills', 'Knowledge of testing frameworks']
  },
  {
    category: 'frontend',
    title: 'Frontend Engineer',
    description: 'Join our team as a Frontend Engineer to create beautiful, performant web experiences. You will work with React, TypeScript, and modern tooling.',
    requiredSkills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
    requiredExperience: '4+ years frontend development',
    responsibilities: ['Build features', 'Optimize performance', 'Collaborate cross-functionally'],
    qualifications: ['Strong TypeScript skills', 'Experience with Next.js', 'Good design sense']
  },
  {
    category: 'frontend',
    title: 'UI Engineer',
    description: 'We need a UI Engineer who is passionate about creating pixel-perfect interfaces and smooth user experiences.',
    requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React', 'SCSS', 'Figma'],
    requiredExperience: '3+ years UI development',
    responsibilities: ['Implement designs', 'Build reusable components', 'Ensure cross-browser compatibility'],
    qualifications: ['Strong CSS/SCSS skills', 'Experience with design tools', 'Attention to detail']
  },
  {
    category: 'frontend',
    title: 'JavaScript Developer',
    description: 'Looking for a skilled JavaScript Developer to build interactive web applications.',
    requiredSkills: ['JavaScript', 'TypeScript', 'Node.js', 'React', 'Vue.js'],
    requiredExperience: '4+ years JavaScript development',
    responsibilities: ['Write clean JavaScript code', 'Build interactive features', 'Debug issues'],
    qualifications: ['Deep JavaScript knowledge', 'Experience with frameworks', 'Problem-solving skills']
  },
  
  // Backend (15 jobs)
  {
    category: 'backend',
    title: 'Senior Backend Engineer',
    description: 'Seeking a Senior Backend Engineer to design and build scalable APIs and microservices. You will work with Node.js, Python, and cloud infrastructure.',
    requiredSkills: ['Node.js', 'Python', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes'],
    requiredExperience: '6+ years backend development',
    responsibilities: ['Design APIs', 'Build microservices', 'Optimize database queries', 'Mentor junior engineers'],
    qualifications: ['Strong CS fundamentals', 'Experience with distributed systems', 'Cloud platform expertise']
  },
  {
    category: 'backend',
    title: 'Python Developer',
    description: 'Join our team as a Python Developer to build robust backend services and data pipelines.',
    requiredSkills: ['Python', 'Django', 'Flask', 'PostgreSQL', 'Redis', 'Celery'],
    requiredExperience: '4+ years Python development',
    responsibilities: ['Develop backend services', 'Write APIs', 'Optimize performance', 'Write tests'],
    qualifications: ['Strong Python skills', 'Experience with Django/Flask', 'Database expertise']
  },
  {
    category: 'backend',
    title: 'Node.js Engineer',
    description: 'We need a Node.js Engineer to build high-performance backend services.',
    requiredSkills: ['Node.js', 'Express', 'TypeScript', 'MongoDB', 'Redis'],
    requiredExperience: '5+ years Node.js',
    responsibilities: ['Build APIs', 'Design databases', 'Implement caching', 'Monitor performance'],
    qualifications: ['Expert in Node.js', 'TypeScript proficiency', 'Scalability mindset']
  },
  {
    category: 'backend',
    title: 'API Developer',
    description: 'Looking for an API Developer to design and implement RESTful and GraphQL APIs.',
    requiredSkills: ['REST APIs', 'GraphQL', 'Node.js', 'PostgreSQL', 'API Design'],
    requiredExperience: '4+ years API development',
    responsibilities: ['Design API architecture', 'Implement endpoints', 'Write documentation', 'Ensure security'],
    qualifications: ['API design experience', 'Strong documentation skills', 'Security awareness']
  },
  {
    category: 'backend',
    title: 'Backend Developer',
    description: 'Join us as a Backend Developer to build scalable server-side applications.',
    requiredSkills: ['Java', 'Spring Boot', 'MySQL', 'Kafka', 'Microservices'],
    requiredExperience: '5+ years backend',
    responsibilities: ['Develop services', 'Design architecture', 'Optimize queries', 'Implement caching'],
    qualifications: ['Java expertise', 'Microservices experience', 'Distributed systems knowledge']
  },
  
  // Full Stack (10 jobs)
  {
    category: 'fullstack',
    title: 'Full Stack Engineer',
    description: 'We are hiring a Full Stack Engineer to work across the entire stack, from React frontends to Node.js backends.',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    requiredExperience: '5+ years full stack',
    responsibilities: ['Build features end-to-end', 'Design systems', 'Collaborate with teams', 'Deploy to production'],
    qualifications: ['Strong frontend and backend skills', 'Cloud experience', 'Agile mindset']
  },
  {
    category: 'fullstack',
    title: 'Senior Full Stack Developer',
    description: 'Looking for a Senior Full Stack Developer to lead technical initiatives and mentor team members.',
    requiredSkills: ['React', 'Python', 'Django', 'PostgreSQL', 'Docker', 'CI/CD'],
    requiredExperience: '7+ years full stack',
    responsibilities: ['Lead projects', 'Mentor engineers', 'Make architectural decisions', 'Code reviews'],
    qualifications: ['Leadership experience', 'Strong technical skills', 'Communication skills']
  },
  {
    category: 'fullstack',
    title: 'Full Stack JavaScript Developer',
    description: 'Join our team as a Full Stack JavaScript Developer working with Node.js and React.',
    requiredSkills: ['JavaScript', 'Node.js', 'React', 'MongoDB', 'Express'],
    requiredExperience: '4+ years JavaScript',
    responsibilities: ['Build MERN stack applications', 'Develop APIs', 'Create UIs', 'Write tests'],
    qualifications: ['JavaScript mastery', 'MERN stack experience', 'Problem-solving skills']
  },
  
  // DevOps (10 jobs)
  {
    category: 'devops',
    title: 'DevOps Engineer',
    description: 'Seeking a DevOps Engineer to build and maintain our cloud infrastructure and CI/CD pipelines.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'Python'],
    requiredExperience: '5+ years DevOps',
    responsibilities: ['Manage cloud infrastructure', 'Build CI/CD pipelines', 'Monitor systems', 'Automate processes'],
    qualifications: ['AWS expertise', 'Container orchestration', 'Infrastructure as code']
  },
  {
    category: 'devops',
    title: 'Site Reliability Engineer',
    description: 'We need an SRE to ensure the reliability and performance of our production systems.',
    requiredSkills: ['Linux', 'Python', 'Kubernetes', 'Prometheus', 'Grafana', 'Incident Response'],
    requiredExperience: '6+ years SRE',
    responsibilities: ['Monitor production', 'Respond to incidents', 'Improve reliability', 'Automate operations'],
    qualifications: ['Strong Linux skills', 'Monitoring expertise', 'On-call experience']
  },
  {
    category: 'devops',
    title: 'Cloud Engineer',
    description: 'Looking for a Cloud Engineer to design and implement cloud solutions on AWS.',
    requiredSkills: ['AWS', 'CloudFormation', 'Lambda', 'EC2', 'S3', 'Networking'],
    requiredExperience: '4+ years cloud',
    responsibilities: ['Design cloud architecture', 'Implement solutions', 'Optimize costs', 'Ensure security'],
    qualifications: ['AWS certifications', 'Architecture experience', 'Cost optimization skills']
  },
  
  // Design (10 jobs)
  {
    category: 'design',
    title: 'Senior Product Designer',
    description: 'We are seeking a Senior Product Designer to lead design initiatives and create beautiful user experiences.',
    requiredSkills: ['Figma', 'Sketch', 'User Research', 'Prototyping', 'Design Systems', 'UI/UX'],
    requiredExperience: '6+ years product design',
    responsibilities: ['Lead design projects', 'Conduct user research', 'Create prototypes', 'Collaborate with engineers'],
    qualifications: ['Strong portfolio', 'User-centered design', 'Leadership skills']
  },
  {
    category: 'design',
    title: 'UX Designer',
    description: 'Join our team as a UX Designer to improve user experiences through research and design.',
    requiredSkills: ['User Research', 'Wireframing', 'Prototyping', 'Figma', 'Usability Testing'],
    requiredExperience: '4+ years UX design',
    responsibilities: ['Conduct research', 'Create wireframes', 'Run usability tests', 'Present designs'],
    qualifications: ['Research experience', 'Strong communication', 'Analytical mindset']
  },
  {
    category: 'design',
    title: 'UI Designer',
    description: 'Looking for a UI Designer to create beautiful, pixel-perfect interfaces.',
    requiredSkills: ['Figma', 'Adobe XD', 'Visual Design', 'Typography', 'Color Theory', 'Design Systems'],
    requiredExperience: '3+ years UI design',
    responsibilities: ['Design interfaces', 'Create design systems', 'Collaborate with developers', 'Maintain brand consistency'],
    qualifications: ['Strong visual design skills', 'Attention to detail', 'Portfolio required']
  },
  
  // Marketing (10 jobs)
  {
    category: 'marketing',
    title: 'Digital Marketing Manager',
    description: 'We need a Digital Marketing Manager to lead our online marketing efforts and drive growth.',
    requiredSkills: ['SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Analytics', 'Content Marketing'],
    requiredExperience: '5+ years digital marketing',
    responsibilities: ['Develop marketing strategy', 'Manage campaigns', 'Analyze metrics', 'Lead team'],
    qualifications: ['Proven track record', 'Data-driven mindset', 'Leadership experience']
  },
  {
    category: 'marketing',
    title: 'Content Marketing Manager',
    description: 'Join us as a Content Marketing Manager to create compelling content that drives engagement.',
    requiredSkills: ['Content Strategy', 'Copywriting', 'SEO', 'Social Media', 'Analytics'],
    requiredExperience: '4+ years content marketing',
    responsibilities: ['Create content strategy', 'Write content', 'Manage calendar', 'Measure results'],
    qualifications: ['Excellent writing skills', 'SEO knowledge', 'Creative thinking']
  },
  {
    category: 'marketing',
    title: 'Growth Marketing Manager',
    description: 'Looking for a Growth Marketing Manager to drive user acquisition and retention.',
    requiredSkills: ['Growth Hacking', 'A/B Testing', 'Analytics', 'Email Marketing', 'Conversion Optimization'],
    requiredExperience: '5+ years growth marketing',
    responsibilities: ['Run experiments', 'Optimize funnels', 'Analyze data', 'Drive growth'],
    qualifications: ['Analytical skills', 'Experimentation mindset', 'Results-oriented']
  },
  
  // Sales (5 jobs)
  {
    category: 'sales',
    title: 'Account Executive',
    description: 'We are hiring an Account Executive to drive new business and manage customer relationships.',
    requiredSkills: ['B2B Sales', 'CRM', 'Salesforce', 'Negotiation', 'Account Management'],
    requiredExperience: '3+ years B2B sales',
    responsibilities: ['Generate leads', 'Close deals', 'Manage accounts', 'Meet quotas'],
    qualifications: ['Proven sales record', 'Strong communication', 'Self-motivated']
  },
  
  // Operations (5 jobs)
  {
    category: 'operations',
    title: 'Operations Manager',
    description: 'Seeking an Operations Manager to streamline processes and improve efficiency.',
    requiredSkills: ['Process Improvement', 'Project Management', 'Data Analysis', 'Team Leadership'],
    requiredExperience: '5+ years operations',
    responsibilities: ['Manage operations', 'Improve processes', 'Lead projects', 'Analyze metrics'],
    qualifications: ['Strong organizational skills', 'Leadership experience', 'Analytical mindset']
  },
  
  // Management (10 jobs)
  {
    category: 'management',
    title: 'Engineering Manager',
    description: 'We need an Engineering Manager to lead our engineering team and drive technical excellence.',
    requiredSkills: ['Team Leadership', 'Technical Leadership', 'Agile', 'Project Management', 'Mentoring'],
    requiredExperience: '8+ years engineering, 3+ years management',
    responsibilities: ['Lead engineering team', 'Set technical direction', 'Manage performance', 'Recruit engineers'],
    qualifications: ['Strong technical background', 'Leadership skills', 'People management experience']
  },
  {
    category: 'management',
    title: 'Product Manager',
    description: 'Join us as a Product Manager to define product strategy and drive roadmap execution.',
    requiredSkills: ['Product Strategy', 'Roadmap Planning', 'User Research', 'Analytics', 'Stakeholder Management'],
    requiredExperience: '5+ years product management',
    responsibilities: ['Define product vision', 'Prioritize features', 'Work with engineering', 'Analyze metrics'],
    qualifications: ['Strong product sense', 'Data-driven', 'Excellent communication']
  },
  {
    category: 'management',
    title: 'Technical Program Manager',
    description: 'Looking for a Technical Program Manager to coordinate complex technical projects.',
    requiredSkills: ['Program Management', 'Technical Knowledge', 'Agile', 'Risk Management', 'Stakeholder Communication'],
    requiredExperience: '6+ years program management',
    responsibilities: ['Manage programs', 'Coordinate teams', 'Mitigate risks', 'Report progress'],
    qualifications: ['Strong technical background', 'PMP certification preferred', 'Organizational skills']
  }
];

class JobDatasetGenerator {
  private outputDir: string;
  
  constructor() {
    this.outputDir = path.join(__dirname, 'validation-data', 'jobs');
  }
  
  async generateDataset(): Promise<void> {
    console.log('💼 Generating Job Description Dataset...\n');
    
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    let jobCount = 0;
    
    // Generate jobs from templates
    for (const template of jobTemplates) {
      const variations = this.generateVariations(template);
      
      for (const job of variations) {
        jobCount++;
        const fileName = `job-${String(jobCount).padStart(3, '0')}.json`;
        fs.writeFileSync(
          path.join(this.outputDir, fileName),
          JSON.stringify(job, null, 2)
        );
        
        if (jobCount >= 100) break;
      }
      
      if (jobCount >= 100) break;
    }
    
    console.log(`✅ Generated ${jobCount} job descriptions`);
    console.log(`📂 Jobs saved to: validation-data/jobs/`);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Review generated job descriptions');
    console.log('2. Add real job descriptions to supplement');
    console.log('3. Run certification: npx ts-node --transpile-only ats-accuracy-certification.ts');
  }
  
  private generateVariations(template: any): any[] {
    const variations = [];
    
    // Generate 3-4 variations of each template
    const seniorityLevels = ['Junior', 'Mid-Level', 'Senior', 'Lead'];
    const companySizes = ['startup', 'mid-size company', 'enterprise'];
    
    for (let i = 0; i < Math.min(4, Math.ceil(100 / jobTemplates.length)); i++) {
      const seniority = i === 0 ? '' : seniorityLevels[i % seniorityLevels.length] + ' ';
      const companySize = companySizes[i % companySizes.length];
      
      variations.push({
        title: `${seniority}${template.title}`,
        category: template.category,
        description: `${template.description} We are a ${companySize} looking for someone passionate about technology and innovation.`,
        requiredSkills: template.requiredSkills,
        requiredExperience: this.adjustExperience(template.requiredExperience, i),
        responsibilities: template.responsibilities,
        qualifications: template.qualifications,
        benefits: ['Competitive salary', 'Health insurance', 'Remote work', '401k matching', 'Professional development'],
        location: this.getLocation(i),
        employmentType: 'Full-time',
        remote: i % 2 === 0 ? 'Remote' : 'Hybrid'
      });
    }
    
    return variations;
  }
  
  private adjustExperience(exp: string, index: number): string {
    if (index === 0) return exp;
    if (index === 1) return exp.replace(/\d+/, (match) => String(Math.max(1, Number(match) - 2)));
    if (index === 2) return exp;
    if (index === 3) return exp.replace(/\d+/, (match) => String(Number(match) + 2));
    return exp;
  }
  
  private getLocation(index: number): string {
    const locations = ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Remote'];
    return locations[index % locations.length];
  }
}

// Run generator
const generator = new JobDatasetGenerator();
generator.generateDataset().catch(console.error);
