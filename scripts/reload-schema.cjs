const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://omxbbhxrwftcklmsaasa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9teGJiaHhyd2Z0Y2tsbXNhYXNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0OTYzNCwiZXhwIjoyMTAwMzI1NjM0fQ.V07J9q1nn0ezuWLgvm0GcBvQ_zHsOuFv6CsEWu949b0'
);

(async () => {
  // Try notifying PostgREST to reload schema
  const { error } = await sb.rpc('exec_sql', {
    query: "SELECT pg_notify('pgrst', 'reload schema')"
  });
  console.log('Schema reload:', error ? error.message : 'OK');

  // Test the tables
  for (const t of ['ai_agents', 'ai_goals', 'ai_activities', 'ai_suggestions']) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    console.log(t + ':', error ? error.message : 'OK (' + (data?.length || 0) + ' rows)');
  }
})();
