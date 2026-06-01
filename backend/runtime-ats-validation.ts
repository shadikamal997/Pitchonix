/**
 * PHASE Ω.3 — RUNTIME ATS VALIDATION
 * 
 * Real-world runtime testing of ATS features with actual HTTP requests.
 * No assumptions. No static analysis. Runtime verification only.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Test user credentials (will need to register/login)
let authToken: string | null = null;
let testUserId: string | null = null;
let testDocumentId: string | null = null;

// Helper to log with colors
function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Helper to measure execution time
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Test 1: Backend Health Check
async function testBackendHealth(): Promise<TestResult> {
  log('\n📋 TEST 1: Backend Health Check', 'cyan');
  const start = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    const duration = Date.now() - start;
    
    if (response.data.status === 'ok') {
      log(`  ✅ Backend is healthy (${duration}ms)`, 'green');
      return { name: 'Backend Health', passed: true, duration, details: response.data };
    } else {
      log(`  ❌ Backend returned unexpected status`, 'red');
      return { name: 'Backend Health', passed: false, duration, error: 'Unexpected status' };
    }
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ Backend health check failed: ${error.message}`, 'red');
    return { name: 'Backend Health', passed: false, duration, error: error.message };
  }
}

// Test 2: User Authentication
async function testAuthentication(): Promise<TestResult> {
  log('\n📋 TEST 2: User Authentication', 'cyan');
  const start = Date.now();
  
  try {
    // Try to register a test user
    const email = `ats-test-${Date.now()}@test.com`;
    const password = 'TestPassword123!';
    
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        name: 'ATS Test User',
      });
      
      log(`  ✅ User registered successfully`, 'green');
    } catch (regError: any) {
      if (regError.response?.status === 409) {
        log(`  ℹ️  User already exists, will try login`, 'yellow');
      } else {
        throw regError;
      }
    }
    
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password,
    });
    
    authToken = loginResponse.data.token;
    testUserId = loginResponse.data.user.id;
    const duration = Date.now() - start;
    
    log(`  ✅ Authentication successful (${duration}ms)`, 'green');
    log(`  👤 User ID: ${testUserId}`, 'blue');
    
    return { name: 'Authentication', passed: true, duration, details: { userId: testUserId } };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ Authentication failed: ${error.message}`, 'red');
    return { name: 'Authentication', passed: false, duration, error: error.message };
  }
}

// Test 3: Create Test CV Document
async function testCreateDocument(): Promise<TestResult> {
  log('\n📋 TEST 3: Create CV Document', 'cyan');
  const start = Date.now();
  
  if (!authToken) {
    log(`  ❌ Skipped: No auth token`, 'red');
    return { name: 'Create Document', passed: false, duration: 0, error: 'No auth token' };
  }
  
  try {
    // Step 1: Create document
    const createResponse = await axios.post(
      `${API_BASE}/career/documents`,
      {
        doctype: 'cv',
        title: 'ATS Test CV - John Developer',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    testDocumentId = createResponse.data.id;
    log(`  ✅ Document created (ID: ${testDocumentId})`, 'green');
    
    // Step 2: Update profile with CV data
    const cvProfile = {
      personalInfo: {
        fullName: 'John Developer',
        email: 'john.dev@example.com',
        phone: '+1-555-0123',
        location: 'San Francisco, CA',
        title: 'Senior Full Stack Developer',
        summary: 'Experienced software engineer with 8+ years developing scalable web applications using React, Node.js, and AWS. Led teams of 5+ developers and delivered projects worth $2M+.',
      },
      skills: [
        { id: 's1', name: 'JavaScript', level: 'expert' },
        { id: 's2', name: 'TypeScript', level: 'expert' },
        { id: 's3', name: 'React', level: 'expert' },
        { id: 's4', name: 'Node.js', level: 'advanced' },
        { id: 's5', name: 'AWS', level: 'advanced' },
        { id: 's6', name: 'Docker', level: 'intermediate' },
        { id: 's7', name: 'PostgreSQL', level: 'advanced' },
      ],
      experience: [
        {
          id: 'exp1',
          title: 'Senior Full Stack Developer',
          company: 'Tech Corp',
          startDate: '2019-01',
          endDate: null,
          current: true,
          description: '• Led development of microservices architecture serving 1M+ users\n• Reduced API response time by 60% through optimization\n• Mentored 5 junior developers\n• Implemented CI/CD pipeline reducing deployment time by 80%',
        },
        {
          id: 'exp2',
          title: 'Full Stack Developer',
          company: 'Startup Inc',
          startDate: '2016-03',
          endDate: '2018-12',
          current: false,
          description: '• Built e-commerce platform generating $5M annual revenue\n• Developed RESTful APIs handling 10K requests/day\n• Integrated payment systems (Stripe, PayPal)',
        },
      ],
      education: [
        {
          id: 'edu1',
          degree: 'Bachelor of Science in Computer Science',
          school: 'State University',
          year: '2015',
          gpa: '3.8',
        },
      ],
      certifications: [
        { id: 'cert1', name: 'AWS Certified Solutions Architect', year: '2021' },
        { id: 'cert2', name: 'Google Cloud Professional', year: '2022' },
      ],
    };
    
    await axios.patch(
      `${API_BASE}/career/profile`,
      cvProfile,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    
    log(`  ✅ Profile updated with CV data`, 'green');
    
    const duration = Date.now() - start;
    log(`  ✅ Document and profile ready (${duration}ms)`, 'green');
    
    return { name: 'Create Document', passed: true, duration, details: { documentId: testDocumentId } };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ Document creation failed: ${error.response?.data?.message || error.message}`, 'red');
    return { name: 'Create Document', passed: false, duration, error: error.message };
  }
}

// Test 4: ATS Analysis (WITHOUT Job Description)
async function testATSAnalysisWithoutJob(): Promise<TestResult> {
  log('\n📋 TEST 4: ATS Analysis (No Job Description)', 'cyan');
  const start = Date.now();
  
  if (!authToken || !testDocumentId) {
    log(`  ❌ Skipped: Missing requirements`, 'red');
    return { name: 'ATS Analysis (No Job)', passed: false, duration: 0, error: 'Missing requirements' };
  }
  
  try {
    const response = await axios.post(
      `${API_BASE}/career/ats/analyze`,
      { documentId: testDocumentId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const result = response.data;
    const duration = Date.now() - start;
    
    // Validation
    const checks = {
      hasOverallScore: typeof result.overallScore === 'number',
      hasBreakdown: result.breakdown && typeof result.breakdown === 'object',
      hasRecommendations: Array.isArray(result.recommendations),
      hasParsedData: result.parsedData && typeof result.parsedData === 'object',
      hasRisks: Array.isArray(result.risks),
      hasStrengths: Array.isArray(result.strengths),
      scoreInRange: result.overallScore >= 0 && result.overallScore <= 100,
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    log(`  Score: ${result.overallScore}/100`, 'blue');
    log(`  Recommendations: ${result.recommendations?.length || 0}`, 'blue');
    log(`  Risks: ${result.risks?.length || 0}`, 'blue');
    log(`  Strengths: ${result.strengths?.length || 0}`, 'blue');
    
    if (allPassed) {
      log(`  ✅ ATS Analysis passed all checks (${duration}ms)`, 'green');
    } else {
      log(`  ⚠️  Some checks failed`, 'yellow');
      Object.entries(checks).forEach(([key, value]) => {
        if (!value) log(`    ❌ ${key}`, 'red');
      });
    }
    
    return {
      name: 'ATS Analysis (No Job)',
      passed: allPassed,
      duration,
      details: { score: result.overallScore, checks },
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ ATS Analysis failed: ${error.response?.data?.message || error.message}`, 'red');
    return { name: 'ATS Analysis (No Job)', passed: false, duration, error: error.message };
  }
}

// Test 5: ATS Analysis (WITH Job Description)
async function testATSAnalysisWithJob(): Promise<TestResult> {
  log('\n📋 TEST 5: ATS Analysis (With Job Description)', 'cyan');
  const start = Date.now();
  
  if (!authToken || !testDocumentId) {
    log(`  ❌ Skipped: Missing requirements`, 'red');
    return { name: 'ATS Analysis (With Job)', passed: false, duration: 0, error: 'Missing requirements' };
  }
  
  const jobDescription = `
Senior Full Stack Developer

We are seeking an experienced Full Stack Developer to join our team. 

Requirements:
- 5+ years of experience in web development
- Expert knowledge of React and TypeScript
- Strong experience with Node.js and Express
- Experience with AWS cloud services
- Knowledge of microservices architecture
- PostgreSQL or MySQL database experience
- Docker and containerization experience
- CI/CD pipeline experience
- Strong communication skills

Nice to have:
- GraphQL experience
- Kubernetes knowledge
- TDD/BDD practices
`;
  
  try {
    const response = await axios.post(
      `${API_BASE}/career/ats/analyze`,
      {
        documentId: testDocumentId,
        jobDescription,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const result = response.data;
    const duration = Date.now() - start;
    
    // Validation
    const checks = {
      hasOverallScore: typeof result.overallScore === 'number',
      hasBreakdown: result.breakdown && typeof result.breakdown === 'object',
      hasKeywordsCategory: result.breakdown?.keywords,
      hasSkillsCategory: result.breakdown?.skills,
      hasRecommendations: Array.isArray(result.recommendations),
      scoreInRange: result.overallScore >= 0 && result.overallScore <= 100,
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    log(`  Score: ${result.overallScore}/100`, 'blue');
    log(`  Keywords Score: ${result.breakdown?.keywords?.score || 0}`, 'blue');
    log(`  Skills Score: ${result.breakdown?.skills?.score || 0}`, 'blue');
    log(`  Recommendations: ${result.recommendations?.length || 0}`, 'blue');
    
    if (allPassed) {
      log(`  ✅ ATS Analysis with job passed (${duration}ms)`, 'green');
    } else {
      log(`  ⚠️  Some checks failed`, 'yellow');
    }
    
    return {
      name: 'ATS Analysis (With Job)',
      passed: allPassed,
      duration,
      details: { score: result.overallScore, checks },
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ ATS Analysis with job failed: ${error.response?.data?.message || error.message}`, 'red');
    return { name: 'ATS Analysis (With Job)', passed: false, duration, error: error.message };
  }
}

// Test 6: Job Matching
async function testJobMatching(): Promise<TestResult> {
  log('\n📋 TEST 6: Job Matching', 'cyan');
  const start = Date.now();
  
  if (!authToken || !testDocumentId) {
    log(`  ❌ Skipped: Missing requirements`, 'red');
    return { name: 'Job Matching', passed: false, duration: 0, error: 'Missing requirements' };
  }
  
  const jobDescription = `
Senior Full Stack Developer

We are seeking an experienced Full Stack Developer to join our team. 

Requirements:
- 5+ years of experience in web development
- Expert knowledge of React and TypeScript
- Strong experience with Node.js and Express
- Experience with AWS cloud services
- Knowledge of microservices architecture
- PostgreSQL or MySQL database experience
- Docker and containerization experience
- CI/CD pipeline experience
- Strong communication skills
`;
  
  try {
    const response = await axios.post(
      `${API_BASE}/career/ats/match-job`,
      {
        documentId: testDocumentId,
        jobDescription,
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    const result = response.data;
    const duration = Date.now() - start;
    
    // Validation
    const checks = {
      hasOverallMatch: typeof result.overallMatch === 'number',
      hasRecommendation: typeof result.recommendation === 'string',
      hasBreakdown: result.breakdown && typeof result.breakdown === 'object',
      hasGaps: Array.isArray(result.gaps),
      hasStrengths: Array.isArray(result.strengths),
      hasImprovements: Array.isArray(result.improvements),
      matchInRange: result.overallMatch >= 0 && result.overallMatch <= 100,
      validRecommendation: ['strong-match', 'good-match', 'partial-match', 'weak-match'].includes(result.recommendation),
    };
    
    const allPassed = Object.values(checks).every(v => v);
    
    log(`  Match Score: ${result.overallMatch}%`, 'blue');
    log(`  Recommendation: ${result.recommendation}`, 'blue');
    log(`  Gaps: ${result.gaps?.length || 0}`, 'blue');
    log(`  Strengths: ${result.strengths?.length || 0}`, 'blue');
    log(`  Improvements: ${result.improvements?.length || 0}`, 'blue');
    
    if (allPassed) {
      log(`  ✅ Job Matching passed all checks (${duration}ms)`, 'green');
    } else {
      log(`  ⚠️  Some checks failed`, 'yellow');
      Object.entries(checks).forEach(([key, value]) => {
        if (!value) log(`    ❌ ${key}`, 'red');
      });
    }
    
    return {
      name: 'Job Matching',
      passed: allPassed,
      duration,
      details: { match: result.overallMatch, recommendation: result.recommendation, checks },
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(`  ❌ Job Matching failed: ${error.response?.data?.message || error.message}`, 'red');
    return { name: 'Job Matching', passed: false, duration, error: error.message };
  }
}

// Test 7: Performance Benchmarks
async function testPerformance(): Promise<TestResult> {
  log('\n📋 TEST 7: Performance Benchmarks', 'cyan');
  
  if (!authToken || !testDocumentId) {
    log(`  ❌ Skipped: Missing requirements`, 'red');
    return { name: 'Performance', passed: false, duration: 0, error: 'Missing requirements' };
  }
  
  const jobDescription = 'Senior Developer with React and Node.js experience. AWS knowledge required.';
  
  try {
    // Run ATS analysis 3 times
    const atsTests = await Promise.all([
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/analyze`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/analyze`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/analyze`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
    ]);
    
    // Run job matching 3 times
    const matchTests = await Promise.all([
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/match-job`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/match-job`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
      measureTime(() => axios.post(
        `${API_BASE}/career/ats/match-job`,
        { documentId: testDocumentId, jobDescription },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )),
    ]);
    
    const atsAvg = atsTests.reduce((sum, t) => sum + t.duration, 0) / atsTests.length;
    const matchAvg = matchTests.reduce((sum, t) => sum + t.duration, 0) / matchTests.length;
    const atsMax = Math.max(...atsTests.map(t => t.duration));
    const matchMax = Math.max(...matchTests.map(t => t.duration));
    
    log(`  ATS Analysis Average: ${atsAvg.toFixed(0)}ms`, 'blue');
    log(`  ATS Analysis Worst: ${atsMax}ms`, 'blue');
    log(`  Job Match Average: ${matchAvg.toFixed(0)}ms`, 'blue');
    log(`  Job Match Worst: ${matchMax}ms`, 'blue');
    
    const targetAvg = 2000; // 2s target
    const targetWorst = 5000; // 5s worst case
    
    const passed = atsAvg < targetAvg && matchAvg < targetAvg && atsMax < targetWorst && matchMax < targetWorst;
    
    if (passed) {
      log(`  ✅ Performance targets met`, 'green');
    } else {
      log(`  ⚠️  Performance targets not met`, 'yellow');
      if (atsAvg >= targetAvg) log(`    ⚠️  ATS avg (${atsAvg}ms) >= ${targetAvg}ms`, 'yellow');
      if (matchAvg >= targetAvg) log(`    ⚠️  Match avg (${matchAvg}ms) >= ${targetAvg}ms`, 'yellow');
      if (atsMax >= targetWorst) log(`    ⚠️  ATS worst (${atsMax}ms) >= ${targetWorst}ms`, 'yellow');
      if (matchMax >= targetWorst) log(`    ⚠️  Match worst (${matchMax}ms) >= ${targetWorst}ms`, 'yellow');
    }
    
    return {
      name: 'Performance',
      passed,
      duration: atsAvg + matchAvg,
      details: { atsAvg, atsMax, matchAvg, matchMax },
    };
  } catch (error: any) {
    log(`  ❌ Performance test failed: ${error.message}`, 'red');
    return { name: 'Performance', passed: false, duration: 0, error: error.message };
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         PHASE Ω.3 — RUNTIME ATS VALIDATION                ║', 'cyan');
  log('║         Real-world Testing with HTTP Requests              ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');
  
  const tests = [
    testBackendHealth,
    testAuthentication,
    testCreateDocument,
    testATSAnalysisWithoutJob,
    testATSAnalysisWithJob,
    testJobMatching,
    testPerformance,
  ];
  
  for (const test of tests) {
    const result = await test();
    results.push(result);
  }
  
  // Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name.padEnd(35)} ${result.duration}ms`, color);
  });
  
  log('\n' + '─'.repeat(60), 'cyan');
  log(`Passed: ${passed}/${results.length}`, passed === results.length ? 'green' : 'yellow');
  log(`Failed: ${failed}/${results.length}`, failed > 0 ? 'red' : 'green');
  log(`Total Time: ${totalDuration}ms`, 'blue');
  log('─'.repeat(60) + '\n', 'cyan');
  
  const successRate = (passed / results.length) * 100;
  
  if (successRate === 100) {
    log('🎉 ALL TESTS PASSED - RUNTIME VALIDATED ✅', 'green');
  } else if (successRate >= 80) {
    log(`⚠️  MOSTLY PASSING - ${successRate.toFixed(0)}% SUCCESS RATE`, 'yellow');
  } else {
    log(`❌ VALIDATION FAILED - ${successRate.toFixed(0)}% SUCCESS RATE`, 'red');
  }
  
  // Save results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
      successRate: successRate.toFixed(2),
      totalDuration,
    },
    tests: results,
  };
  
  require('fs').writeFileSync(
    'runtime-ats-validation-report.json',
    JSON.stringify(report, null, 2)
  );
  
  log('\n📄 Report saved to: runtime-ats-validation-report.json', 'blue');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
