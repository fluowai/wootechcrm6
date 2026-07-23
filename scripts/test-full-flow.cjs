const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost',
      port: 3010,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1. Check available providers
  console.log('=== Checking env for LLM keys ===');
  const geminiKey = process.env.GEMINI_API_KEY || '';
  console.log('GEMINI_API_KEY configured:', geminiKey ? geminiKey.substring(0, 8) + '...' : 'NO');

  // 2. List providers (should be empty)
  const list1 = await request('GET', '/api/ai-os/llm-providers');
  console.log('\n=== Providers before ===');
  console.log(list1.body);

  // 3. Get profile
  const profile = await request('GET', '/api/ai-os/profile');
  console.log('\n=== Profile ===');
  console.log(profile.body);

  // 4. Test generate without LLM key (should fail gracefully)
  console.log('\n=== Testing generate-agents (no LLM key yet) ===');
  const gen = await request('POST', '/api/ai-os/generate-agents', {
    profile: {
      industry: 'b2b_saas',
      companySize: '11-50',
      monthlyRevenue: '50000',
      productsServices: 'CRM para PMEs',
      salesChannels: ['whatsapp', 'linkedin'],
      primaryGoal: 'Crescer 3x em 12 meses',
    },
  });
  console.log('Status:', gen.status);
  console.log('Body:', gen.body.substring(0, 300));
})();
