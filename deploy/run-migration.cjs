const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL');
    
    // Check existing tables
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ai_%' ORDER BY table_name"
    );
    console.log('Existing tables:', tables.rows.map(r => r.table_name));
    
    // Check existing triggers
    const triggers = await client.query(
      "SELECT trigger_name FROM information_schema.triggers WHERE trigger_name LIKE 'update_ai_%' ORDER BY trigger_name"
    );
    console.log('Existing triggers:', triggers.rows.map(r => r.trigger_name));

    // Check RLS
    const rls = await client.query(
      "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'ai_%' ORDER BY tablename"
    );
    console.log('RLS status:', rls.rows.map(r => `${r.tablename}: ${r.rowsecurity}`));

    // Drop and recreate triggers with IF NOT EXISTS approach
    const fixTriggers = `
      DROP TRIGGER IF EXISTS update_ai_company_profile_updated_at ON public.ai_company_profile;
      DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON public.ai_agents;
      DROP TRIGGER IF EXISTS update_ai_goals_updated_at ON public.ai_goals;
      DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;

      CREATE TRIGGER update_ai_company_profile_updated_at BEFORE UPDATE ON public.ai_company_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_ai_goals_updated_at BEFORE UPDATE ON public.ai_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;
    
    await client.query(fixTriggers);
    console.log('Triggers recreated successfully');

    // Verify RLS policies exist
    const policies = await client.query(
      "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename LIKE 'ai_%' ORDER BY tablename, policyname"
    );
    console.log('RLS policies:', policies.rows.length, 'policies');
    policies.rows.forEach(r => console.log(`  ${r.tablename}: ${r.policyname}`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
})();
