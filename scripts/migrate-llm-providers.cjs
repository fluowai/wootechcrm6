const { Client } = require('pg');

const sql = `
-- Tabela para armazenar provedores LLM configurados pelo usuário
CREATE TABLE IF NOT EXISTS public.ai_llm_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    provider TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    models JSONB DEFAULT '[]'::jsonb,
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    rate_limit_per_minute INTEGER DEFAULT 30,
    tokens_used_today NUMERIC(12,2) DEFAULT 0,
    tokens_used_month NUMERIC(14,2) DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ai_llm_providers_user ON public.ai_llm_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_providers_enabled ON public.ai_llm_providers(enabled);

-- RLS
ALTER TABLE public.ai_llm_providers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own LLM providers" ON public.ai_llm_providers
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_ai_llm_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_llm_providers_updated_at
    BEFORE UPDATE ON public.ai_llm_providers
    FOR EACH ROW EXECUTE FUNCTION update_ai_llm_providers_updated_at();
`;

const client = new Client({
  connectionString: 'postgresql://postgres.omxbbhxrwftcklmsaasa:7DUhocw8oIqOkhVe@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

(async () => {
  await client.connect();
  try {
    await client.query(sql);
    console.log('ai_llm_providers table created successfully');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Table already exists, skipping');
    } else {
      console.error('Error:', e.message);
    }
  }
  await client.end();
})();
