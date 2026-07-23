const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3010, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let b = ''; res.on('data', (c) => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject); req.write(data); req.end();
  });
}

(async () => {
  console.log('=== Pede para criar agentes ===');
  const res = await post('/api/ai-os/chat', {
    message: 'Crie 3 agentes para minha empresa: um SDR, um Closer e um CS',
    history: [],
  });
  const data = JSON.parse(res.body);
  console.log('Status:', res.status);
  console.log('Response:', data.response?.substring(0, 600));
  console.log('Actions:', JSON.stringify(data.actions));
  console.log('Provider:', data.provider);

  // Verify agents were created
  console.log('\n=== Verifica agentes no banco ===');
  const http2 = require('http');
  const agents = await new Promise((resolve) => {
    http2.get('http://localhost:3010/api/ai-os/agents', (res) => {
      let b = ''; res.on('data', (c) => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
  });
  console.log('Total agents:', agents.agents?.length || 0);
  agents.agents?.forEach(a => console.log(` - ${a.name} (${a.role}) [${a.status}]`));
})();
