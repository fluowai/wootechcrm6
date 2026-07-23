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
      let b = '';
      res.on('data', (c) => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log('Testing chat with Groq...\n');
  const res = await post('/api/ai-os/chat', {
    message: 'Olá! Crie 5 agentes essenciais para uma empresa de ERP/CRM B2B.',
    history: [],
  });

  console.log('Status:', res.status);
  const data = JSON.parse(res.body);
  if (data.response) {
    console.log('Response:', data.response.substring(0, 500));
    console.log('\nProvider:', data.provider);
    console.log('Model:', data.model);
    console.log('Tokens:', data.tokens);
    console.log('Latency:', data.latencyMs, 'ms');
    console.log('Actions:', data.actions?.length || 0);
  } else {
    console.log('Error:', res.body.substring(0, 300));
  }
})();
