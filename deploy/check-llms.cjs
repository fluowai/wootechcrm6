const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    const cols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_llm_providers' ORDER BY ordinal_position");
    console.log('Columns:', cols.rows.map(r => r.column_name));
    const res = await client.query('SELECT * FROM public.ai_llm_providers ORDER BY id LIMIT 20');
    console.log(JSON.stringify(res.rows, null, 2));
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
