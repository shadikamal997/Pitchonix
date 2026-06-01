/**
 * PHASE Ω.2E — ATS PLATFORM VALIDATION SUITE
 * 
 * Comprehensive real-world testing before production deployment
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:4000';
const FRONTEND_BASE = 'http://localhost:3000';

// ============================================================
// TEST DATA STRUCTURES
// ============================================================

interface TestCV {
  role: string;
  profile: any;
  expectedScore: { min: number; max: number };
  expectedIssues: string[];
}

interface TestJobDescription {
  title: string;
  description: string;
  expectedSkills: string[];
  expectedKeywords: string[];
}

interface ValidationResult {
  testName: string;
  passed: boolean;
  score?: number;
  errors: string[];
  warnings: string[];
  metrics?: any;
}

// ============================================================
// TEST CVS — REALISTIC PROFILES
// ============================================================

const TEST_CVS: TestCV[] = [
  // DEVELOPER CVS
  {
    role: 'Senior Full Stack Developer (Strong)',
    profile: {
      personalInfo: {
        fullName: 'Sarah Chen',
        email: 'sarah.chen@email.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        linkedIn: 'linkedin.com/in/sarachen'
      },
      summary: 'Senior Full Stack Developer with 8+ years of experience building scalable web applications. Expert in React, Node.js, TypeScript, and AWS. Led development of systems serving 10M+ users. Strong background in microservices architecture and agile methodologies.',
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Full Stack Developer',
          startDate: '2020-01',
          endDate: null,
          current: true,
          description: [
            'Led development of React-based dashboard serving 5M+ monthly users',
            'Architected microservices infrastructure using Node.js and AWS Lambda, reducing costs by 40%',
            'Mentored team of 5 junior developers in TypeScript and clean code practices',
            'Implemented CI/CD pipeline with GitHub Actions, reducing deployment time from 2 hours to 15 minutes'
          ]
        },
        {
          company: 'StartupXYZ',
          position: 'Full Stack Developer',
          startDate: '2017-03',
          endDate: '2020-01',
          description: [
            'Built RESTful APIs using Node.js and Express, handling 1M+ requests per day',
            'Developed responsive frontend with React and Redux, improving load time by 60%',
            'Integrated Stripe payment system, processing $2M+ in transactions',
            'Collaborated with product team using Agile/Scrum methodology'
          ]
        },
        {
          company: 'Web Agency',
          position: 'Junior Developer',
          startDate: '2016-06',
          endDate: '2017-03',
          description: [
            'Developed client websites using React and Node.js',
            'Fixed bugs and implemented new features based on client feedback',
            'Participated in code reviews and team meetings'
          ]
        }
      ],
      education: [
        {
          degree: 'Bachelor of Science in Computer Science',
          institution: 'Stanford University',
          graduationYear: 2016,
          gpa: 3.8
        }
      ],
      skills: [
        'React', 'Node.js', 'TypeScript', 'JavaScript', 'AWS', 'Docker', 'Kubernetes',
        'MongoDB', 'PostgreSQL', 'Redis', 'GraphQL', 'REST APIs', 'Git', 'CI/CD',
        'Microservices', 'Agile', 'Scrum', 'Jest', 'React Testing Library'
      ],
      certifications: [
        {
          name: 'AWS Certified Solutions Architect',
          issuer: 'Amazon Web Services',
          date: '2022-06'
        }
      ]
    },
    expectedScore: { min: 85, max: 100 },
    expectedIssues: []
  },
  {
    role: 'Junior Developer (Weak)',
    profile: {
      personalInfo: {
        fullName: 'John Smith',
        email: 'john@email.com'
      },
      summary: 'Developer looking for job.',
      experience: [
        {
          company: 'Company',
          position: 'Developer',
          startDate: '2023-01',
          endDate: null,
          current: true,
          description: ['Did coding']
        }
      ],
      education: [
        {
          degree: 'Some College',
          institution: 'University',
          graduationYear: 2023
        }
      ],
      skills: ['HTML', 'CSS', 'JavaScript']
    },
    expectedScore: { min: 0, max: 50 },
    expectedIssues: ['weak-summary', 'missing-contact', 'vague-experience', 'few-skills']
  },
  // DESIGNER CVS
  {
    role: 'Senior UX Designer (Strong)',
    profile: {
      personalInfo: {
        fullName: 'Maria Garcia',
        email: 'maria.garcia@design.com',
        phone: '+1-555-9876',
        location: 'New York, NY',
        portfolio: 'mariagarcia.design'
      },
      summary: 'Award-winning Senior UX Designer with 10+ years of experience creating user-centered digital products. Expert in user research, wireframing, prototyping, and usability testing. Led design for products with 50M+ users. Skilled in Figma, Adobe Creative Suite, and design systems.',
      experience: [
        {
          company: 'Design Co',
          position: 'Senior UX Designer',
          startDate: '2019-01',
          endDate: null,
          current: true,
          description: [
            'Led UX design for mobile app used by 20M+ users, increasing engagement by 45%',
            'Conducted user research with 500+ participants, identifying key pain points',
            'Created comprehensive design system used by 50+ designers and developers',
            'Mentored team of 4 junior designers in user research and interaction design'
          ]
        },
        {
          company: 'Creative Agency',
          position: 'UX Designer',
          startDate: '2015-06',
          endDate: '2019-01',
          description: [
            'Designed user flows and wireframes for 30+ client projects',
            'Conducted usability testing sessions, improving conversion rates by average 30%',
            'Collaborated with developers to ensure pixel-perfect implementation'
          ]
        }
      ],
      education: [
        {
          degree: 'Master of Fine Arts in Interaction Design',
          institution: 'Rhode Island School of Design',
          graduationYear: 2015
        }
      ],
      skills: [
        'UX Design', 'UI Design', 'User Research', 'Wireframing', 'Prototyping',
        'Usability Testing', 'Figma', 'Sketch', 'Adobe XD', 'InVision',
        'Design Systems', 'Interaction Design', 'Information Architecture',
        'User Personas', 'Journey Mapping', 'A/B Testing'
      ],
      certifications: [
        {
          name: 'Certified Usability Analyst',
          issuer: 'Human Factors International',
          date: '2020-03'
        }
      ]
    },
    expectedScore: { min: 85, max: 100 },
    expectedIssues: []
  },
  // MARKETING CVS
  {
    role: 'Marketing Manager (Strong)',
    profile: {
      personalInfo: {
        fullName: 'David Lee',
        email: 'david.lee@marketing.com',
        phone: '+1-555-4567',
        location: 'Austin, TX'
      },
      summary: 'Results-driven Marketing Manager with 7+ years of experience in digital marketing and brand strategy. Proven track record of increasing brand awareness by 200% and generating $5M+ in revenue. Expert in SEO, content marketing, social media, and marketing automation. Skilled in Google Analytics, HubSpot, and Salesforce.',
      experience: [
        {
          company: 'E-commerce Company',
          position: 'Marketing Manager',
          startDate: '2020-03',
          endDate: null,
          current: true,
          description: [
            'Developed and executed digital marketing strategy, increasing website traffic by 150%',
            'Managed $500K annual marketing budget, achieving 300% ROI',
            'Led content marketing team creating 100+ blog posts, generating 50K+ monthly organic visitors',
            'Implemented marketing automation with HubSpot, improving lead conversion by 40%'
          ]
        },
        {
          company: 'Marketing Agency',
          position: 'Digital Marketing Specialist',
          startDate: '2017-06',
          endDate: '2020-03',
          description: [
            'Managed SEO campaigns for 15+ clients, improving average ranking by 25 positions',
            'Created and managed social media campaigns with 2M+ impressions',
            'Analyzed campaign performance using Google Analytics and Data Studio'
          ]
        }
      ],
      education: [
        {
          degree: 'Bachelor of Business Administration in Marketing',
          institution: 'University of Texas at Austin',
          graduationYear: 2017
        }
      ],
      skills: [
        'Digital Marketing', 'SEO', 'Content Marketing', 'Social Media Marketing',
        'Email Marketing', 'Marketing Automation', 'Google Analytics', 'Google Ads',
        'Facebook Ads', 'HubSpot', 'Salesforce', 'A/B Testing', 'Conversion Optimization',
        'Brand Strategy', 'Market Research', 'Budget Management'
      ],
      certifications: [
        {
          name: 'Google Analytics Certified',
          issuer: 'Google',
          date: '2022-01'
        },
        {
          name: 'HubSpot Inbound Marketing Certification',
          issuer: 'HubSpot',
          date: '2021-06'
        }
      ]
    },
    expectedScore: { min: 85, max: 100 },
    expectedIssues: []
  },
  // EXECUTIVE CVS
  {
    role: 'VP of Engineering (Strong)',
    profile: {
      personalInfo: {
        fullName: 'Jennifer Wu',
        email: 'jennifer.wu@executive.com',
        phone: '+1-555-7890',
        location: 'Seattle, WA'
      },
      summary: 'Strategic technology leader with 15+ years of experience scaling engineering teams and delivering high-impact products. VP of Engineering leading 100+ engineers across 12 teams. Expert in building technical strategy, hiring top talent, and fostering engineering excellence. Proven track record of delivering products serving 100M+ users.',
      experience: [
        {
          company: 'Tech Giant',
          position: 'VP of Engineering',
          startDate: '2020-01',
          endDate: null,
          current: true,
          description: [
            'Lead engineering organization of 120+ engineers across platform, mobile, and infrastructure teams',
            'Defined technical strategy and roadmap, aligning with business objectives and delivering $50M+ in revenue',
            'Built high-performance engineering culture, reducing turnover from 18% to 5%',
            'Scaled infrastructure to support 100M+ monthly active users with 99.99% uptime',
            'Established architecture review board and engineering best practices'
          ]
        },
        {
          company: 'Growing Startup',
          position: 'Director of Engineering',
          startDate: '2016-06',
          endDate: '2020-01',
          description: [
            'Grew engineering team from 15 to 60 engineers during Series B and C funding rounds',
            'Led product development from MVP to $20M ARR',
            'Implemented agile processes and continuous delivery practices',
            'Partnered with product and design to define product strategy'
          ]
        }
      ],
      education: [
        {
          degree: 'Master of Science in Computer Science',
          institution: 'MIT',
          graduationYear: 2009
        },
        {
          degree: 'Bachelor of Science in Computer Engineering',
          institution: 'UC Berkeley',
          graduationYear: 2007
        }
      ],
      skills: [
        'Engineering Leadership', 'Technical Strategy', 'Team Building', 'Hiring',
        'Architecture', 'Agile', 'Cloud Infrastructure', 'Microservices',
        'Product Development', 'Stakeholder Management', 'Budget Management',
        'Performance Management', 'Engineering Culture', 'Technical Roadmap'
      ]
    },
    expectedScore: { min: 80, max: 100 },
    expectedIssues: []
  },
  // POOR FORMATTING CVS
  {
    role: 'Developer (Poor Formatting)',
    profile: {
      personalInfo: {
        fullName: 'Test User',
        email: 'test@test.com'
      },
      summary: 'I am a developer who can code in many languages. I have experience with web development and databases. I am looking for a new opportunity.',
      experience: [
        {
          company: 'Company Name',
          position: 'Software Developer',
          startDate: '2020-01',
          endDate: '2023-12',
          description: [
            'Worked on various projects',
            'Used different technologies',
            'Fixed bugs and added features',
            'Participated in meetings'
          ]
        }
      ],
      education: [
        {
          degree: 'Computer Science',
          institution: 'Some University',
          graduationYear: 2020
        }
      ],
      skills: ['Python', 'Java', 'SQL']
    },
    expectedScore: { min: 30, max: 60 },
    expectedIssues: ['generic-summary', 'vague-experience', 'missing-metrics', 'few-skills', 'missing-contact']
  }
];

// ============================================================
// TEST JOB DESCRIPTIONS
// ============================================================

const TEST_JOB_DESCRIPTIONS: TestJobDescription[] = [
  {
    title: 'Senior Full Stack Developer',
    description: `
We're looking for a Senior Full Stack Developer to join our growing team!

Requirements:
- 5+ years of professional software development experience
- Expert knowledge of React, Node.js, and TypeScript
- Experience with AWS cloud services (Lambda, S3, EC2, RDS)
- Strong understanding of RESTful APIs and GraphQL
- Experience with microservices architecture
- Proficiency in SQL and NoSQL databases (PostgreSQL, MongoDB)
- Experience with Docker and Kubernetes
- Strong problem-solving and debugging skills
- Excellent communication and teamwork abilities
- Bachelor's degree in Computer Science or related field

Nice to have:
- Experience with CI/CD pipelines
- Knowledge of Redis and caching strategies
- Familiarity with Agile/Scrum methodologies
- AWS certifications

Responsibilities:
- Design and develop scalable web applications
- Write clean, maintainable, and testable code
- Collaborate with product managers and designers
- Mentor junior developers
- Participate in code reviews and architecture discussions
- Troubleshoot and optimize application performance
    `,
    expectedSkills: ['React', 'Node.js', 'TypeScript', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB'],
    expectedKeywords: ['Full Stack', 'microservices', 'RESTful', 'GraphQL', 'scalable', 'cloud']
  },
  {
    title: 'Senior UX Designer',
    description: `
Join our design team as a Senior UX Designer!

Requirements:
- 6+ years of UX/UI design experience
- Expert in Figma, Sketch, or Adobe XD
- Strong portfolio demonstrating user-centered design
- Experience conducting user research and usability testing
- Proficiency in creating wireframes, prototypes, and high-fidelity designs
- Knowledge of design systems and component libraries
- Understanding of accessibility standards (WCAG)
- Excellent presentation and communication skills
- Bachelor's or Master's degree in Design, HCI, or related field

Responsibilities:
- Lead end-to-end design process from research to final implementation
- Conduct user interviews and usability testing
- Create user flows, wireframes, and interactive prototypes
- Collaborate with product and engineering teams
- Maintain and evolve design system
- Present design concepts to stakeholders
    `,
    expectedSkills: ['UX Design', 'UI Design', 'Figma', 'User Research', 'Wireframing', 'Prototyping', 'Usability Testing'],
    expectedKeywords: ['user-centered', 'design system', 'accessibility', 'portfolio', 'user flows']
  },
  {
    title: 'Digital Marketing Manager',
    description: `
We're hiring a Digital Marketing Manager to drive our online presence!

Requirements:
- 5+ years of digital marketing experience
- Proven track record of increasing web traffic and conversions
- Expert in SEO, SEM, and content marketing
- Experience with Google Analytics, Google Ads, and Facebook Ads
- Proficiency in marketing automation platforms (HubSpot, Marketo)
- Strong analytical skills and data-driven decision making
- Experience managing marketing budgets
- Excellent written and verbal communication skills
- Bachelor's degree in Marketing, Business, or related field

Responsibilities:
- Develop and execute digital marketing strategies
- Manage SEO and content marketing initiatives
- Create and optimize paid advertising campaigns
- Analyze campaign performance and ROI
- Collaborate with sales team on lead generation
- Manage marketing budget and vendor relationships
    `,
    expectedSkills: ['SEO', 'SEM', 'Content Marketing', 'Google Analytics', 'Google Ads', 'HubSpot', 'Marketing Automation'],
    expectedKeywords: ['digital marketing', 'conversions', 'ROI', 'lead generation', 'data-driven', 'budget']
  }
];

// ============================================================
// VALIDATION TESTS
// ============================================================

class ATSValidator {
  private results: ValidationResult[] = [];
  private startTime: number = Date.now();

  // Test 1: End-to-End Flow Test
  async testEndToEndFlow(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 1: End-to-End Flow');
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check backend health
      console.log('  → Checking backend health...');
      try {
        await axios.get(`${API_BASE}/health`);
        console.log('  ✓ Backend is running');
      } catch (error) {
        errors.push('Backend not responding at ' + API_BASE);
        return { testName: 'End-to-End Flow', passed: false, errors, warnings };
      }

      // Test ATS analysis endpoint
      console.log('  → Testing ATS analysis endpoint...');
      const testProfile = TEST_CVS[0].profile;
      
      try {
        const analysisResponse = await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
          profile: testProfile
        }, { timeout: 5000 });

        if (!analysisResponse.data) {
          errors.push('ATS analysis returned empty response');
        } else {
          console.log('  ✓ ATS analysis successful');
          console.log(`    Score: ${analysisResponse.data.overallScore}`);
        }
      } catch (error: any) {
        errors.push(`ATS analysis failed: ${error.message}`);
      }

      // Test job matching endpoint
      console.log('  → Testing job matching endpoint...');
      try {
        const matchResponse = await axios.post(`${API_BASE}/career/ats/match-job-profile`, {
          profile: testProfile,
          jobDescription: TEST_JOB_DESCRIPTIONS[0].description
        }, { timeout: 5000 });

        if (!matchResponse.data) {
          errors.push('Job matching returned empty response');
        } else {
          console.log('  ✓ Job matching successful');
          console.log(`    Match: ${matchResponse.data.overallMatch}%`);
        }
      } catch (error: any) {
        errors.push(`Job matching failed: ${error.message}`);
      }

      return {
        testName: 'End-to-End Flow',
        passed: errors.length === 0,
        errors,
        warnings
      };
    } catch (error: any) {
      return {
        testName: 'End-to-End Flow',
        passed: false,
        errors: [error.message],
        warnings
      };
    }
  }

  // Test 2: Score Validation
  async testScoreValidation(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 2: Score Validation Logic');
    const errors: string[] = [];
    const warnings: string[] = [];
    let passed = true;

    for (const testCV of TEST_CVS) {
      console.log(`  → Testing: ${testCV.role}`);
      
      try {
        const response = await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
          profile: testCV.profile
        }, { timeout: 5000 });

        const score = response.data.overallScore;
        console.log(`    Score: ${score} (expected: ${testCV.expectedScore.min}-${testCV.expectedScore.max})`);

        if (score < testCV.expectedScore.min || score > testCV.expectedScore.max) {
          errors.push(`${testCV.role}: Score ${score} outside expected range ${testCV.expectedScore.min}-${testCV.expectedScore.max}`);
          passed = false;
        } else {
          console.log('    ✓ Score in expected range');
        }

        // Check if expected issues are detected
        if (testCV.expectedIssues.length > 0) {
          const allIssues = response.data.categories.flatMap((cat: any) => cat.issues || []);
          const allRecommendations = response.data.recommendations.map((rec: any) => rec.type);
          
          for (const expectedIssue of testCV.expectedIssues) {
            const found = allIssues.some((issue: string) => 
              issue.toLowerCase().includes(expectedIssue.toLowerCase())
            ) || allRecommendations.some((type: string) => 
              type.toLowerCase().includes(expectedIssue.toLowerCase())
            );

            if (!found) {
              warnings.push(`${testCV.role}: Expected issue "${expectedIssue}" not detected`);
            }
          }
        }
      } catch (error: any) {
        errors.push(`${testCV.role}: Analysis failed - ${error.message}`);
        passed = false;
      }
    }

    return {
      testName: 'Score Validation',
      passed,
      errors,
      warnings
    };
  }

  // Test 3: Job Description Parsing
  async testJobDescriptionParsing(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 3: Job Description Parsing');
    const errors: string[] = [];
    const warnings: string[] = [];
    let passed = true;

    for (const jobDesc of TEST_JOB_DESCRIPTIONS) {
      console.log(`  → Testing: ${jobDesc.title}`);
      
      try {
        const response = await axios.post(`${API_BASE}/career/ats/match-job-profile`, {
          profile: TEST_CVS[0].profile, // Use strong developer CV
          jobDescription: jobDesc.description
        }, { timeout: 5000 });

        // Check skill extraction
        const extractedSkills = response.data.breakdown?.find((b: any) => b.category === 'Skills')?.missing || [];
        let skillsFound = 0;
        
        for (const expectedSkill of jobDesc.expectedSkills) {
          const found = extractedSkills.some((skill: string) => 
            skill.toLowerCase().includes(expectedSkill.toLowerCase()) ||
            expectedSkill.toLowerCase().includes(skill.toLowerCase())
          );
          if (found) skillsFound++;
        }

        const skillAccuracy = (skillsFound / jobDesc.expectedSkills.length) * 100;
        console.log(`    Skills Accuracy: ${skillAccuracy.toFixed(0)}%`);

        if (skillAccuracy < 50) {
          errors.push(`${jobDesc.title}: Low skill extraction accuracy (${skillAccuracy.toFixed(0)}%)`);
          passed = false;
        } else if (skillAccuracy < 70) {
          warnings.push(`${jobDesc.title}: Moderate skill extraction accuracy (${skillAccuracy.toFixed(0)}%)`);
        }

      } catch (error: any) {
        errors.push(`${jobDesc.title}: Parsing failed - ${error.message}`);
        passed = false;
      }
    }

    return {
      testName: 'Job Description Parsing',
      passed,
      errors,
      warnings
    };
  }

  // Test 4: Recommendation Quality
  async testRecommendationQuality(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 4: Recommendation Quality');
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const response = await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
        profile: TEST_CVS[1].profile // Use weak CV
      }, { timeout: 5000 });

      const recommendations = response.data.recommendations || [];
      console.log(`  → Found ${recommendations.length} recommendations`);

      if (recommendations.length === 0) {
        errors.push('No recommendations generated for weak CV');
      }

      // Check for duplicate recommendations
      const recTitles = recommendations.map((r: any) => r.title);
      const uniqueTitles = new Set(recTitles);
      if (recTitles.length !== uniqueTitles.size) {
        warnings.push('Duplicate recommendations detected');
      }

      // Check recommendation structure
      for (const rec of recommendations) {
        if (!rec.title || !rec.description || !rec.priority || !rec.impact) {
          errors.push('Recommendation missing required fields');
        }
        if (!rec.action) {
          warnings.push('Recommendation missing action field');
        }
      }

      // Check priority distribution
      const priorities = recommendations.reduce((acc: any, rec: any) => {
        acc[rec.priority] = (acc[rec.priority] || 0) + 1;
        return acc;
      }, {});
      console.log('  → Priority distribution:', priorities);

      return {
        testName: 'Recommendation Quality',
        passed: errors.length === 0,
        errors,
        warnings,
        metrics: { totalRecommendations: recommendations.length, priorities }
      };
    } catch (error: any) {
      return {
        testName: 'Recommendation Quality',
        passed: false,
        errors: [error.message],
        warnings
      };
    }
  }

  // Test 5: ATS Simulator Accuracy
  async testATSSimulator(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 5: ATS Simulator Parsing Accuracy');
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const testProfile = TEST_CVS[0].profile; // Strong developer CV
      const response = await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
        profile: testProfile
      }, { timeout: 5000 });

      const parsedData = response.data.parsedData;
      console.log(`  → Parse Success Rate: ${parsedData.parseSuccessRate}%`);

      // Check contact info extraction
      if (parsedData.contactInfo.name !== testProfile.personalInfo.fullName) {
        errors.push('Name not parsed correctly');
      }
      if (parsedData.contactInfo.email !== testProfile.personalInfo.email) {
        errors.push('Email not parsed correctly');
      }
      if (parsedData.contactInfo.phone !== testProfile.personalInfo.phone) {
        errors.push('Phone not parsed correctly');
      }

      // Check skills extraction
      const parsedSkills = parsedData.skills || [];
      const actualSkills = testProfile.skills || [];
      const skillMatchRate = (parsedSkills.length / actualSkills.length) * 100;
      console.log(`  → Skills Match: ${skillMatchRate.toFixed(0)}%`);

      if (skillMatchRate < 80) {
        warnings.push(`Low skill extraction rate: ${skillMatchRate.toFixed(0)}%`);
      }

      // Check experience parsing
      const parsedExperience = parsedData.experience || [];
      const actualExperience = testProfile.experience || [];
      if (parsedExperience.length < actualExperience.length) {
        warnings.push('Not all experience entries parsed');
      }

      return {
        testName: 'ATS Simulator Accuracy',
        passed: errors.length === 0,
        errors,
        warnings,
        metrics: {
          parseSuccessRate: parsedData.parseSuccessRate,
          skillMatchRate: skillMatchRate.toFixed(1)
        }
      };
    } catch (error: any) {
      return {
        testName: 'ATS Simulator Accuracy',
        passed: false,
        errors: [error.message],
        warnings
      };
    }
  }

  // Test 6: Performance Benchmarks
  async testPerformance(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 6: Performance Benchmarks');
    const errors: string[] = [];
    const warnings: string[] = [];

    const testProfile = TEST_CVS[0].profile;
    const jobDesc = TEST_JOB_DESCRIPTIONS[0].description;

    // Test ATS Analysis Time
    console.log('  → Testing ATS analysis speed...');
    const atsStart = Date.now();
    try {
      await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
        profile: testProfile
      }, { timeout: 5000 });
      const atsTime = Date.now() - atsStart;
      console.log(`    ATS Analysis: ${atsTime}ms`);

      if (atsTime > 2000) {
        errors.push(`ATS analysis too slow: ${atsTime}ms (target: <2000ms)`);
      } else if (atsTime > 1500) {
        warnings.push(`ATS analysis slow: ${atsTime}ms`);
      }
    } catch (error: any) {
      errors.push(`ATS analysis failed: ${error.message}`);
    }

    // Test Job Match Time
    console.log('  → Testing job match speed...');
    const matchStart = Date.now();
    try {
      await axios.post(`${API_BASE}/career/ats/match-job-profile`, {
        profile: testProfile,
        jobDescription: jobDesc
      }, { timeout: 5000 });
      const matchTime = Date.now() - matchStart;
      console.log(`    Job Match: ${matchTime}ms`);

      if (matchTime > 2000) {
        errors.push(`Job matching too slow: ${matchTime}ms (target: <2000ms)`);
      } else if (matchTime > 1500) {
        warnings.push(`Job matching slow: ${matchTime}ms`);
      }
    } catch (error: any) {
      errors.push(`Job matching failed: ${error.message}`);
    }

    return {
      testName: 'Performance Benchmarks',
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  // Test 7: Error Handling
  async testErrorHandling(): Promise<ValidationResult> {
    console.log('\n🧪 TEST 7: Error Handling');
    const errors: string[] = [];
    const warnings: string[] = [];

    // Test with empty profile
    console.log('  → Testing with empty profile...');
    try {
      const response = await axios.post(`${API_BASE}/career/ats/analyze-profile`, {
        profile: {}
      }, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('    ✓ Handled gracefully');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('    ✓ Returns 400 error as expected');
      } else {
        warnings.push('Empty profile should return 400 error');
      }
    }

    // Test with invalid job description
    console.log('  → Testing with invalid job description...');
    try {
      const response = await axios.post(`${API_BASE}/career/ats/match-job-profile`, {
        profile: TEST_CVS[0].profile,
        jobDescription: ''
      }, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('    ✓ Handled gracefully');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.log('    ✓ Returns 400 error as expected');
      } else {
        warnings.push('Empty job description should return 400 error');
      }
    }

    return {
      testName: 'Error Handling',
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  PHASE Ω.2E — ATS PLATFORM VALIDATION SUITE');
    console.log('═══════════════════════════════════════════════════════\n');

    this.results = [];
    this.startTime = Date.now();

    // Run tests sequentially
    this.results.push(await this.testEndToEndFlow());
    this.results.push(await this.testScoreValidation());
    this.results.push(await this.testJobDescriptionParsing());
    this.results.push(await this.testRecommendationQuality());
    this.results.push(await this.testATSSimulator());
    this.results.push(await this.testPerformance());
    this.results.push(await this.testErrorHandling());

    const totalTime = Date.now() - this.startTime;

    // Generate report
    this.generateReport(totalTime);
  }

  // Generate comprehensive report
  private generateReport(totalTime: number): void {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  VALIDATION REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);

    console.log('📊 TEST RESULTS:');
    console.log(`  ✅ Passed: ${passed}/${this.results.length}`);
    console.log(`  ❌ Failed: ${failed}/${this.results.length}`);
    console.log(`  ⚠️  Errors: ${totalErrors}`);
    console.log(`  ⚡ Warnings: ${totalWarnings}`);
    console.log(`  ⏱️  Total Time: ${totalTime}ms\n`);

    // Detailed results
    console.log('📋 DETAILED RESULTS:\n');
    for (const result of this.results) {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.testName}`);
      
      if (result.score !== undefined) {
        console.log(`   Score: ${result.score}`);
      }
      
      if (result.errors.length > 0) {
        console.log('   Errors:');
        result.errors.forEach(err => console.log(`     - ${err}`));
      }
      
      if (result.warnings.length > 0) {
        console.log('   Warnings:');
        result.warnings.forEach(warn => console.log(`     - ${warn}`));
      }
      
      if (result.metrics) {
        console.log('   Metrics:', result.metrics);
      }
      
      console.log('');
    }

    // Calculate Production Readiness Score
    const readinessScore = this.calculateProductionReadiness();
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  PRODUCTION READINESS: ${readinessScore}%`);
    console.log('═══════════════════════════════════════════════════════\n');

    if (readinessScore >= 90) {
      console.log('✅ READY FOR PRODUCTION');
      console.log('   Proceed to Phase Ω.2A — One-Click Fix Engine\n');
    } else if (readinessScore >= 75) {
      console.log('⚠️  READY FOR BETA TESTING');
      console.log('   Fix critical issues before production\n');
    } else {
      console.log('❌ NOT READY FOR PRODUCTION');
      console.log('   Address critical issues before proceeding\n');
    }

    // Save report to file
    this.saveReportToFile(readinessScore);
  }

  private calculateProductionReadiness(): number {
    let score = 100;

    // Deduct for failed tests
    const failed = this.results.filter(r => !r.passed).length;
    score -= failed * 15;

    // Deduct for errors
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0);
    score -= totalErrors * 5;

    // Deduct for warnings
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0);
    score -= totalWarnings * 2;

    return Math.max(0, score);
  }

  private saveReportToFile(readinessScore: number): void {
    const report = {
      timestamp: new Date().toISOString(),
      readinessScore,
      results: this.results,
      summary: {
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        totalErrors: this.results.reduce((sum, r) => sum + r.errors.length, 0),
        totalWarnings: this.results.reduce((sum, r) => sum + r.warnings.length, 0)
      }
    };

    const reportPath = path.join(__dirname, 'ats-validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Full report saved to: ${reportPath}\n`);
  }
}

// ============================================================
// RUN VALIDATION
// ============================================================

async function main() {
  const validator = new ATSValidator();
  await validator.runAllTests();
}

main().catch(console.error);
