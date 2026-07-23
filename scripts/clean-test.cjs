const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://omxbbhxrwftcklmsaasa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9teGJiaHhyd2Z0Y2tsbXNhYXNhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc0OTYzNCwiZXhwIjoyMTAwMzI1NjM0fQ.V07J9q1nn0ezuWLgvm0GcBvQ_zHsOuFv6CsEWu949b0'
);
(async () => {
  await sb.from('ai_agents').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('ai_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('ai_company_profile').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleaned test data');
})();
