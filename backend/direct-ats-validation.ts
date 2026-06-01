/**
 * PHASE Ω.2E — DIRECT SERVICE VALIDATION
 * Test ATS services without HTTP server
 */

import { AtsAnalyzerService } from './src/career/ats-analyzer.service';
import { JobMatcherService } from './src/career/job-matcher.service';

// ============================================================
// TEST DATA
// ============================================================

const STRONG_DEVELOPER_PROFILE = {
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
};

const WEAK_DEVELOPER_PROFILE = {
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
};

const JOB_DESCRIPTION_SENIOR_DEV = `
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
`;

// ============================================================
// VALIDATION FUNCTIONS
// ============================================================

async function validateATSScoring() {
  console.log('\n🧪 TEST 1: ATS Scoring Validation\n');
  
  const atsAnalyzer = new AtsAnalyzerService();
  
  // Test 1: Strong CV should score high
  console.log('  → Testing STRONG developer CV...');
  const strongResult = await atsAnalyzer.analyzeCV(STRONG_DEVELOPER_PROFILE as any, {} as any, JOB_DESCRIPTION_SENIOR_DEV);
  console.log(`    Overall Score: ${strongResult.overallScore}/100`);
  console.log(`    Status: ${strongResult.overallStatus}`);
  console.log(`    Categories: ${strongResult.categories.length}`);
  console.log(`    Recommendations: ${strongResult.recommendations.length}`);
  console.log(`    Risks: ${strongResult.risks.length}`);
  console.log(`    Strengths: ${strongResult.strengths.length}`);
  
  if (strongResult.overallScore < 75) {
    console.log(`    ❌ FAIL: Strong CV scored too low (${strongResult.overallScore})`);
  } else {
    console.log(`    ✅ PASS: Strong CV scored appropriately (${strongResult.overallScore})`);
  }
  
  // Test 2: Weak CV should score low
  console.log('\n  → Testing WEAK developer CV...');
  const weakResult = await atsAnalyzer.analyzeCV(WEAK_DEVELOPER_PROFILE as any, {} as any);
  console.log(`    Overall Score: ${weakResult.overallScore}/100`);
  console.log(`    Status: ${weakResult.overallStatus}`);
  console.log(`    Recommendations: ${weakResult.recommendations.length}`);
  console.log(`    Risks: ${weakResult.risks.length}`);
  
  if (weakResult.overallScore > 60) {
    console.log(`    ❌ FAIL: Weak CV scored too high (${weakResult.overallScore})`);
  } else {
    console.log(`    ✅ PASS: Weak CV scored appropriately (${weakResult.overallScore})`);
  }
  
  // Test 3: Verify category breakdown
  console.log('\n  → Checking category breakdown...');
  const categories = ['Keywords', 'Skills', 'Experience', 'Education', 'Formatting', 'Sections', 'Readability'];
  const foundCategories = strongResult.categories.map(c => c.category);
  
  let allCategoriesPresent = true;
  for (const cat of categories) {
    if (!foundCategories.includes(cat)) {
      console.log(`    ❌ Missing category: ${cat}`);
      allCategoriesPresent = false;
    }
  }
  
  if (allCategoriesPresent) {
    console.log(`    ✅ PASS: All 7 categories present`);
  }
  
  return {
    strongScore: strongResult.overallScore,
    weakScore: weakResult.overallScore,
    passed: strongResult.overallScore >= 75 && weakResult.overallScore <= 60 && allCategoriesPresent
  };
}

async function validateJobMatching() {
  console.log('\n\n🧪 TEST 2: Job Matching Validation\n');
  
  const jobMatcher = new JobMatcherService();
  
  // Test 1: Strong match
  console.log('  → Testing STRONG developer against job...');
  const strongMatch = await jobMatcher.matchCVToJob(STRONG_DEVELOPER_PROFILE as any, JOB_DESCRIPTION_SENIOR_DEV);
  console.log(`    Match Score: ${strongMatch.overallMatch}%`);
  console.log(`    Recommendation: ${strongMatch.matchRecommendation}`);
  console.log(`    Breakdown: ${strongMatch.breakdown.length} categories`);
  console.log(`    Gaps: ${strongMatch.gaps.length}`);
  console.log(`    Strengths: ${strongMatch.strengths.length}`);
  console.log(`    Improvements: ${strongMatch.improvements.length}`);
  
  if (strongMatch.overallMatch < 70) {
    console.log(`    ❌ FAIL: Strong match scored too low (${strongMatch.overallMatch}%)`);
  } else {
    console.log(`    ✅ PASS: Strong match scored appropriately (${strongMatch.overallMatch}%)`);
  }
  
  // Test 2: Weak match
  console.log('\n  → Testing WEAK developer against job...');
  const weakMatch = await jobMatcher.matchCVToJob(WEAK_DEVELOPER_PROFILE as any, JOB_DESCRIPTION_SENIOR_DEV);
  console.log(`    Match Score: ${weakMatch.overallMatch}%`);
  console.log(`    Recommendation: ${weakMatch.matchRecommendation}`);
  console.log(`    Gaps: ${weakMatch.gaps.length}`);
  
  if (weakMatch.overallMatch > 50) {
    console.log(`    ❌ FAIL: Weak match scored too high (${weakMatch.overallMatch}%)`);
  } else {
    console.log(`    ✅ PASS: Weak match scored appropriately (${weakMatch.overallMatch}%)`);
  }
  
  // Test 3: Verify skill extraction
  console.log('\n  → Checking job description parsing...');
  const skillsBreakdown = strongMatch.breakdown.find(b => b.category === 'Skills');
  if (skillsBreakdown) {
    console.log(`    Required skills found: ${skillsBreakdown.required?.length || 0}`);
    console.log(`    Matched skills: ${skillsBreakdown.matched?.length || 0}`);
    console.log(`    Missing skills: ${skillsBreakdown.missing?.length || 0}`);
    
    if (skillsBreakdown.required && skillsBreakdown.required.length > 5) {
      console.log(`    ✅ PASS: Extracted ${skillsBreakdown.required.length} required skills`);
    } else {
      console.log(`    ⚠️  WARNING: Only extracted ${skillsBreakdown.required?.length || 0} required skills`);
    }
  }
  
  return {
    strongMatch: strongMatch.overallMatch,
    weakMatch: weakMatch.overallMatch,
    passed: strongMatch.overallMatch >= 70 && weakMatch.overallMatch <= 50
  };
}

async function validateRecommendations() {
  console.log('\n\n🧪 TEST 3: Recommendation Quality\n');
  
  const atsAnalyzer = new AtsAnalyzerService();
  
  // Use weak CV to generate recommendations
  const result = await atsAnalyzer.analyzeCV(WEAK_DEVELOPER_PROFILE as any, {} as any);
  
  console.log(`  → Generated ${result.recommendations.length} recommendations`);
  
  // Check for duplicate titles
  const titles = result.recommendations.map(r => r.title);
  const uniqueTitles = new Set(titles);
  if (titles.length !== uniqueTitles.size) {
    console.log(`    ❌ FAIL: Duplicate recommendations detected`);
  } else {
    console.log(`    ✅ PASS: No duplicate recommendations`);
  }
  
  // Check priority distribution
  const priorities = result.recommendations.reduce((acc: any, rec) => {
    acc[rec.priority] = (acc[rec.priority] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`  → Priority distribution:`, priorities);
  
  // Check recommendation structure
  let structureValid = true;
  for (const rec of result.recommendations) {
    if (!rec.title || !rec.description || !rec.priority || !rec.impact) {
      console.log(`    ❌ FAIL: Recommendation missing required fields`);
      structureValid = false;
      break;
    }
  }
  
  if (structureValid) {
    console.log(`    ✅ PASS: All recommendations have required fields`);
  }
  
  // Sample some recommendations
  console.log(`\n  → Sample recommendations:`);
  result.recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`    ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
    console.log(`       Impact: +${rec.impact} ATS score`);
  });
  
  return {
    count: result.recommendations.length,
    passed: titles.length === uniqueTitles.size && structureValid
  };
}

async function validateATSSimulator() {
  console.log('\n\n🧪 TEST 4: ATS Simulator Parsing\n');
  
  const atsAnalyzer = new AtsAnalyzerService();
  
  const result = await atsAnalyzer.analyzeCV(STRONG_DEVELOPER_PROFILE as any, {} as any);
  const parsed = result.parsedData;
  
  console.log(`  → Parse Success Rate: ${parsed.parseSuccessRate}%`);
  
  // Check contact parsing
  console.log('\n  → Contact Information:');
  console.log(`    Name: ${parsed.contactInfo.name || 'NOT PARSED'} ${parsed.contactInfo.name === STRONG_DEVELOPER_PROFILE.personalInfo.fullName ? '✅' : '❌'}`);
  console.log(`    Email: ${parsed.contactInfo.email || 'NOT PARSED'} ${parsed.contactInfo.email === STRONG_DEVELOPER_PROFILE.personalInfo.email ? '✅' : '❌'}`);
  console.log(`    Phone: ${parsed.contactInfo.phone || 'NOT PARSED'} ${parsed.contactInfo.phone === STRONG_DEVELOPER_PROFILE.personalInfo.phone ? '✅' : '❌'}`);
  
  // Check skills parsing
  console.log(`\n  → Skills Parsed: ${parsed.skills?.length || 0}/${STRONG_DEVELOPER_PROFILE.skills.length}`);
  const skillMatchRate = ((parsed.skills?.length || 0) / STRONG_DEVELOPER_PROFILE.skills.length) * 100;
  console.log(`    Match Rate: ${skillMatchRate.toFixed(0)}% ${skillMatchRate >= 80 ? '✅' : '⚠️'}`);
  
  // Check experience parsing
  console.log(`\n  → Experience Entries: ${parsed.experience?.length || 0}/${STRONG_DEVELOPER_PROFILE.experience.length}`);
  if (parsed.experience) {
    parsed.experience.forEach((exp, i) => {
      console.log(`    ${i + 1}. ${exp.title} at ${exp.company} ${exp.parsedCorrectly ? '✅' : '❌'}`);
    });
  }
  
  // Check education parsing
  console.log(`\n  → Education Entries: ${parsed.education?.length || 0}/${STRONG_DEVELOPER_PROFILE.education.length}`);
  if (parsed.education) {
    parsed.education.forEach((edu, i) => {
      console.log(`    ${i + 1}. ${edu.degree} from ${edu.institution} ${edu.parsedCorrectly ? '✅' : '❌'}`);
    });
  }
  
  return {
    parseSuccessRate: parsed.parseSuccessRate,
    passed: parsed.parseSuccessRate >= 80
  };
}

// ============================================================
// RUN ALL VALIDATIONS
// ============================================================

async function runValidation() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  PHASE Ω.2E — DIRECT SERVICE VALIDATION');
  console.log('═══════════════════════════════════════════════════════');
  
  const startTime = Date.now();
  
  try {
    const results = {
      atsScoring: await validateATSScoring(),
      jobMatching: await validateJobMatching(),
      recommendations: await validateRecommendations(),
      atsSimulator: await validateATSSimulator()
    };
    
    const totalTime = Date.now() - startTime;
    
    // Generate report
    console.log('\n\n═══════════════════════════════════════════════════════');
    console.log('  VALIDATION REPORT');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 TEST RESULTS:');
    const passed = Object.values(results).filter(r => r.passed).length;
    const failed = Object.values(results).length - passed;
    console.log(`  ✅ Passed: ${passed}/4`);
    console.log(`  ❌ Failed: ${failed}/4`);
    console.log(`  ⏱️  Total Time: ${totalTime}ms\n`);
    
    console.log('📋 DETAILED RESULTS:\n');
    console.log(`  ${results.atsScoring.passed ? '✅' : '❌'} ATS Scoring`);
    console.log(`     Strong CV: ${results.atsScoring.strongScore}/100`);
    console.log(`     Weak CV: ${results.atsScoring.weakScore}/100\n`);
    
    console.log(`  ${results.jobMatching.passed ? '✅' : '❌'} Job Matching`);
    console.log(`     Strong Match: ${results.jobMatching.strongMatch}%`);
    console.log(`     Weak Match: ${results.jobMatching.weakMatch}%\n`);
    
    console.log(`  ${results.recommendations.passed ? '✅' : '❌'} Recommendations`);
    console.log(`     Count: ${results.recommendations.count}\n`);
    
    console.log(`  ${results.atsSimulator.passed ? '✅' : '❌'} ATS Simulator`);
    console.log(`     Parse Rate: ${results.atsSimulator.parseSuccessRate}%\n`);
    
    // Calculate production readiness
    const readinessScore = (passed / 4) * 100;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  PRODUCTION READINESS: ${readinessScore.toFixed(0)}%`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (readinessScore >= 90) {
      console.log('✅ READY FOR PRODUCTION');
      console.log('   Proceed to Phase Ω.2A — One-Click Fix Engine\n');
    } else if (readinessScore >= 75) {
      console.log('⚠️  READY FOR BETA TESTING');
      console.log('   Minor issues detected, but core functionality works\n');
    } else {
      console.log('❌ NOT READY FOR PRODUCTION');
      console.log('   Address critical issues before proceeding\n');
    }
    
  } catch (error) {
    console.error('\n❌ VALIDATION FAILED WITH ERROR:');
    console.error(error);
  }
}

runValidation().catch(console.error);
