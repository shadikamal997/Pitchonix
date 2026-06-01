import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE = 'http://localhost:4000/api';

async function testAnalyzeProfile() {
  try {
    // Step 1: Authenticate (register new user)
    console.log('🔐 Authenticating...');
    const timestamp = Date.now();
    const authResponse = await axios.post(`${API_BASE}/auth/register`, {
      email: `test-ats-${timestamp}@example.com`,
      password: 'password123',
      name: 'Test User'
    });
    
    const token = authResponse.data.token;
    console.log('✅ Authenticated\n');
    
    // Step 2: Load a sample CV
    const cvPath = path.join(__dirname, 'validation-data', 'cvs', 'developer', 'dev-001.json');
    const cvData = JSON.parse(fs.readFileSync(cvPath, 'utf-8'));
    
    console.log('📝 Testing /career/ats/analyze-profile endpoint\n');
    console.log('Profile structure:', JSON.stringify(cvData.profile, null, 2).slice(0, 800), '...\n');
    
    // Step 3: Test analyze-profile endpoint
    const response = await axios.post(
      `${API_BASE}/career/ats/analyze-profile`,
      {
        profile: cvData.profile,
        jobDescription: undefined
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ SUCCESS!');
    console.log('Overall Score:', response.data.overallScore);
    console.log('Breakdown:', JSON.stringify(response.data.breakdown, null, 2));
  } catch (error: any) {
    console.log('❌ ERROR:', error.response?.status, error.response?.statusText);
    console.log('Error Message:', error.response?.data?.message || error.message);
    console.log('Error Details:', JSON.stringify(error.response?.data, null, 2));
  }
}

testAnalyzeProfile();
