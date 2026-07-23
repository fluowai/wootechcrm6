const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const mask = 'wootech-aios-xor';

(async () => {
  try {
    await client.connect();
    const res = await client.query('SELECT provider, api_key_encrypted, enabled FROM public.ai_llm_providers WHERE enabled = true');
    for (const row of res.rows) {
      const decoded = Buffer.from(row.api_key_encrypted, 'base64').toString('binary');
      let decrypted = '';
      for (let i = 0; i < decoded.length; i++) {
        decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ mask.charCodeAt(i % mask.length));
      }
      const preview = decrypted.substring(0, 8) + '...' + decrypted.substring(decrypted.length - 4);
      console.log(`${row.provider}: ${preview} (${decrypted.length} chars, enabled: ${row.enabled})`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
