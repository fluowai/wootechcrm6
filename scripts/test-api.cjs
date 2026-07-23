const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3010,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  // Test POST agent
  const agentRes = await post('/api/ai-os/agents', {
    name: 'CEO Agent',
    role: 'Chief Executive Officer',
    department: 'executivo',
    mission: 'Gerir a empresa',
    autonomyLevel: 3,
    heartbeatIntervalMinutes: 30,
    llmProviderPreference: 'gemini',
    monthlyTokenBudget: 100000,
    kpis: ['receita', 'retencao'],
    permissions: ['all'],
  });
  console.log('POST /agents:', agentRes.status, agentRes.body.substring(0, 200));

  // Test GET agents
  const getRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:3010/api/ai-os/agents', (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: body.substring(0, 300) }));
    }).on('error', reject);
  });
  console.log('GET /agents:', getRes.status, getRes.body);

  // Test POST profile
  const profileRes = await post('/api/ai-os/profile', {
    industry: 'b2b_saas',
    companySize: '11-50',
    monthlyRevenue: '50000',
    productsServices: 'CRM para PMEs',
    salesChannels: ['whatsapp', 'linkedin'],
    primaryGoal: 'Crescer 3x em 12 meses',
  });
  console.log('POST /profile:', profileRes.status, profileRes.body.substring(0, 200));

  // Test POST goal
  const goalRes = await post('/api/ai-os/goals', {
    title: 'Aumentar MRR',
    description: 'Crescer receita recorrente',
    category: 'revenue',
    targetValue: 100000,
    currentValue: 0,
    unit: 'BRL',
    priority: 'high',
  });
  console.log('POST /goals:', goalRes.status, goalRes.body.substring(0, 200));
})();
