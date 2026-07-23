const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '..', 'DEV', 'SQL', 'aios-schema.sql'),
  'utf8'
);

const client = new Client({
  connectionString: 'postgresql://postgres.omxbbhxrwftcklmsaasa:7DUhocw8oIqOkhVe@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  console.log('Connected to Supabase Postgres');
  try {
    await client.query(sql);
    console.log('Migration executed successfully!');
  } catch (e) {
    console.error('Migration error:', e.message);
  }

  // Verify tables
  for (const t of ['ai_company_profile', 'ai_agents', 'ai_goals', 'ai_activities', 'ai_suggestions', 'ai_conversations', 'ai_conversation_messages', 'ai_llm_usage']) {
    const { rows } = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [t]);
    console.log(t + ':', rows[0].exists ? 'EXISTS' : 'MISSING');
  }

  await client.end();
})();
