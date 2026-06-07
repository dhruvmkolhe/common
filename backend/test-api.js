/**
 * Antigravity URL Shortener - Integration Test Suite
 * Run with: node test-api.js (Requires server to be running)
 */

const BASE_URL = 'http://localhost:5000';
let jwtToken = '';
let createdLinkId = '';
let shortCode = '';

async function runTests() {
  console.log('==================================================');
  console.log('🧪 STARTING URL SHORTENER INTEGRATION TESTS...');
  console.log('==================================================\n');

  try {
    // Test 1: User Signup
    console.log('Test 1: User Registration (/api/auth/signup)...');
    const signupEmail = `tester-${Math.floor(Math.random() * 10000)}@test.com`;
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail,
        password: 'securePassword123'
      })
    });
    
    const signupData = await signupRes.json();
    if (!signupRes.ok) throw new Error(`Signup failed: ${JSON.stringify(signupData)}`);
    console.log(`✅ Success! Registered user: ${signupEmail}`);
    
    // Test 2: User Login
    console.log('\nTest 2: User Authentication (/api/auth/login)...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupEmail,
        password: 'securePassword123'
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    jwtToken = loginData.token;
    console.log('✅ Success! Token acquired.');

    // Test 3: Shorten URL
    console.log('\nTest 3: URL Shortening (/api/links/shorten)...');
    const shortenRes = await fetch(`${BASE_URL}/api/links/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({
        longUrl: 'https://example.com/deep/path/to/test-api?utm_source=integration_test',
        customAlias: `test-${Math.floor(Math.random() * 1000)}`
      })
    });

    const shortenData = await shortenRes.json();
    if (!shortenRes.ok) throw new Error(`Shortening failed: ${JSON.stringify(shortenData)}`);
    createdLinkId = shortenData.id;
    shortCode = shortenData.code;
    console.log(`✅ Success! Mapped original URL to: ${shortenData.shortUrl}`);
    console.log(`📄 Title: "${shortenData.metadata.title}"`);

    // Test 4: Redirection check
    console.log(`\nTest 4: Redirection Engine (GET /${shortCode})...`);
    const redirectRes = await fetch(`${BASE_URL}/${shortCode}`, {
      method: 'GET',
      redirect: 'manual' // Prevent following redirect to check headers
    });
    
    console.log(`⚡ Status Code: ${redirectRes.status}`);
    console.log(`📍 Redirect Location: ${redirectRes.headers.get('location')}`);
    if (redirectRes.status !== 302) throw new Error('Incorrect redirect status code. Expected 302.');
    console.log('✅ Success! Redirection successfully resolved with a temporary HTTP 302.');

    // Test 5: Verify click analytics
    console.log(`\nTest 5: Click Telemetry Aggregation (/api/links/${createdLinkId}/stats)...`);
    // Wait a brief millisecond for async click capture to register
    await new Promise(r => setTimeout(r, 1000));
    
    const statsRes = await fetch(`${BASE_URL}/api/links/${createdLinkId}/stats`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    const statsData = await statsRes.json();
    if (!statsRes.ok) throw new Error(`Stats fetch failed: ${JSON.stringify(statsData)}`);
    console.log(`📈 Total clicks captured: ${statsData.totalClicks}`);
    console.log(`📱 Devices split: ${JSON.stringify(statsData.analytics.devices)}`);
    console.log(`🌍 Countries split: ${JSON.stringify(statsData.analytics.countries)}`);
    
    if (statsData.totalClicks === 0) {
      throw new Error('Analytics failed to capture redirect click.');
    }
    console.log('✅ Success! Click tracked and tabulated accurately in the background.');

    console.log('\n==================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('==================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
