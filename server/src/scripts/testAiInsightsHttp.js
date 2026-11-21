const { apiRequest } = require('./apiTestClient');
const config = require('../config/env');

async function testHttp() {
  console.log('--- Testing AI Insights HTTP Endpoints on http://localhost:5000/api/v1/ai-insights ---');

  // 1. Log in as Admin to obtain genuine session and cookie
  console.log(`\n1. Authenticating as ${config.ADMIN_EMAIL}...`);
  const loginRes = await apiRequest('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: config.ADMIN_EMAIL,
      password: config.ADMIN_PASSWORD
    })
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.data)}`);
  }

  const cookie = loginRes.setCookie;
  console.log(`Authenticated successfully! Session established.`);

  const authHeaders = {
    Cookie: cookie
  };

  // 2. GET /samples
  console.log('\n2. Testing GET /api/v1/ai-insights/samples...');
  const samplesRes = await apiRequest('http://localhost:5000/api/v1/ai-insights/samples', {
    headers: authHeaders
  });
  console.log(`Status: ${samplesRes.status}, Samples count: ${samplesRes.data?.data?.samples?.length}`);
  if (samplesRes.status !== 200 || !samplesRes.data?.data?.samples?.length) {
    throw new Error(`GET /samples failed: ${JSON.stringify(samplesRes.data)}`);
  }

  // 3. POST /analyze with sampleKey
  console.log('\n3. Testing POST /api/v1/ai-insights/analyze (sampleKey: donations)...');
  const analyzeRes = await apiRequest('http://localhost:5000/api/v1/ai-insights/analyze', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ sampleKey: 'donations' })
  });
  console.log(`Status: ${analyzeRes.status}, Health Score: ${analyzeRes.data?.data?.insights?.healthScore}`);
  if (analyzeRes.status !== 200 || !analyzeRes.data?.data?.insights) {
    throw new Error(`POST /analyze failed: ${JSON.stringify(analyzeRes.data)}`);
  }

  // 4. POST /export-pdf
  console.log('\n4. Testing POST /api/v1/ai-insights/export-pdf...');
  const pdfRes = await apiRequest('http://localhost:5000/api/v1/ai-insights/export-pdf', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      datasetName: 'Q3 Corporate Donations Ledger',
      insights: analyzeRes.data.data.insights,
      structure: analyzeRes.data.data.structure
    })
  });

  const isBuffer = Buffer.isBuffer(pdfRes.data);
  const size = isBuffer ? pdfRes.data.length : (typeof pdfRes.data === 'string' ? pdfRes.data.length : 0);
  console.log(`Status: ${pdfRes.status}, Size: ${size} bytes, Header: ${pdfRes.headers['content-type']}`);
  if (pdfRes.status !== 200 || !pdfRes.headers['content-type']?.includes('application/pdf') || size < 3000) {
    throw new Error(`POST /export-pdf failed: status ${pdfRes.status}, size ${size}`);
  }

  console.log('\n All HTTP integration tests for AI Data Insights & Report Studio PASSED!');
}

testHttp().catch((err) => {
  console.error('HTTP test failed:', err);
  process.exit(1);
});
