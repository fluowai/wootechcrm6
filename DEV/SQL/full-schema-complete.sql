-- ==============================================================================
-- WOOTECH CRM — SCHEMA COMPLETO (20 tabelas)
-- Supabase Dev: omxbbhxrwftcklmsaasa
-- Execute no SQL Editor do Supabase — idempotente (DROP IF EXISTS + IF NOT EXISTS)
-- ==============================================================================

-- ==============================================================================
-- 0. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. FUNCTIONS
-- ==============================================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create company + contact on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  company_name TEXT;
  user_email TEXT;
  new_company_id UUID;
BEGIN
  user_email := COALESCE(NEW.email, '');
  company_name := COALESCE(
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'full_name',
    split_part(user_email, '@', 1)
  );

  INSERT INTO public.companies (user_id, razao_social, nome_fantasia, cnpj, endereco)
  VALUES (
    NEW.id,
    company_name,
    company_name,
    '',
    '{}'::jsonb
  )
  RETURNING id INTO new_company_id;

  INSERT INTO public.contacts (
    user_id, company_id, company_name, name, role, department, whatsapp, email
  )
  VALUES (
    NEW.id,
    new_company_id,
    company_name,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(user_email, '@', 1)),
    'Owner',
    'Diretoria',
    COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
    user_email
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. TABLES — CRM (7)
-- ==============================================================================

-- 2.1 companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  situacao TEXT NOT NULL DEFAULT 'ATIVA',
  cnae_code TEXT NOT NULL DEFAULT '',
  cnae_text TEXT NOT NULL DEFAULT '',
  capital_social NUMERIC DEFAULT 0,
  fundacao TEXT DEFAULT '',
  porte TEXT NOT NULL DEFAULT 'EPP',
  natureza_juridica TEXT NOT NULL DEFAULT '',
  endereco JSONB NOT NULL DEFAULT '{}',
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  linkedin TEXT,
  telefones TEXT[] DEFAULT '{}',
  emails TEXT[] DEFAULT '{}',
  observacoes TEXT,
  tags TEXT[] DEFAULT '{}',
  enriched BOOLEAN DEFAULT FALSE,
  score_comercial NUMERIC,
  rating_gmb NUMERIC,
  reviews_count_gmb NUMERIC,
  place_id_gmb TEXT,
  tech_stack JSONB,
  decision_makers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 contacts
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  linkedin TEXT,
  birthday TEXT,
  observacoes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_decision_maker BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 deals
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  probability NUMERIC NOT NULL DEFAULT 50,
  expected_revenue NUMERIC NOT NULL DEFAULT 0,
  stage_id TEXT NOT NULL DEFAULT 'prospecting',
  assigned_to TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  contact_whatsapp TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  time_in_stage_days NUMERIC NOT NULL DEFAULT 1,
  priority TEXT NOT NULL DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  loss_reason TEXT,
  win_reason TEXT,
  history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'task',
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  assigned_to TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 whatsapp_chats
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  company_name TEXT,
  avatar TEXT,
  last_message TEXT NOT NULL DEFAULT '',
  last_message_timestamp TEXT NOT NULL DEFAULT '',
  unread_count NUMERIC NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT,
  has_whatsapp BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.6 whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES whatsapp_chats(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  media_type TEXT,
  media_url TEXT,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.7 automations
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active BOOLEAN DEFAULT TRUE,
  nodes JSONB DEFAULT '[]',
  edges JSONB DEFAULT '[]',
  execution_count NUMERIC NOT NULL DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABLES — AI-BOS (8)
-- ==============================================================================

-- 3.1 ai_company_profile
CREATE TABLE IF NOT EXISTS ai_company_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  industry TEXT NOT NULL,
  company_size TEXT,
  monthly_revenue NUMERIC(14,2),
  products_services TEXT,
  sales_channels TEXT[],
  primary_goal TEXT,
  org_config JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 ai_agents
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  paperclip_agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  mission TEXT NOT NULL,
  autonomy_level INTEGER DEFAULT 3 CHECK (autonomy_level BETWEEN 0 AND 3),
  kpis JSONB DEFAULT '[]'::jsonb,
  permissions JSONB DEFAULT '[]'::jsonb,
  limits JSONB DEFAULT '[]'::jsonb,
  heartbeat_interval_minutes INTEGER DEFAULT 30,
  llm_provider_preference TEXT DEFAULT 'gemini',
  monthly_token_budget NUMERIC(10,2) DEFAULT 0,
  tokens_used_this_month NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  last_heartbeat_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 ai_goals
CREATE TABLE IF NOT EXISTS ai_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('revenue', 'growth', 'retention', 'efficiency', 'custom')),
  target_value NUMERIC(14,2),
  current_value NUMERIC(14,2) DEFAULT 0,
  unit TEXT,
  priority TEXT DEFAULT 'high' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned', 'paused')),
  assigned_agent_id UUID REFERENCES ai_agents(id),
  deadline DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 ai_activities
CREATE TABLE IF NOT EXISTS ai_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('analysis', 'suggestion', 'execution', 'delegation', 'alert', 'heartbeat', 'goal_check', 'llm_call')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  result JSONB,
  llm_provider TEXT,
  tokens_used NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 ai_suggestions
CREATE TABLE IF NOT EXISTS ai_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  agent_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('pipeline', 'hiring', 'marketing', 'pricing', 'retention', 'operations', 'custom')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_estimate TEXT DEFAULT 'medium' CHECK (impact_estimate IN ('high', 'medium', 'low')),
  data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'accepted', 'dismissed', 'implemented')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  participants JSONB NOT NULL,
  summary TEXT,
  resolution TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 ai_conversation_messages
CREATE TABLE IF NOT EXISTS ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 ai_llm_usage
CREATE TABLE IF NOT EXISTS ai_llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES ai_agents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. TABLES — WHATSAPP MULTI-INSTANCE (3)
-- ==============================================================================

-- 4.1 whatsapp_instances
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_pending', 'logged_out')),
  qr_code TEXT,
  webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
  settings JSONB DEFAULT '{}'::jsonb,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 wa_instance_links
CREATE TABLE IF NOT EXISTS wa_instance_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL
    CHECK (service_type IN ('ai_agent', 'automation', 'chatbot', 'broadcast', 'webhook')),
  service_id TEXT NOT NULL,
  service_name TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 wa_messages
CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
  chat_jid TEXT NOT NULL,
  sender_jid TEXT NOT NULL,
  sender_name TEXT,
  content TEXT,
  message_type TEXT DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact')),
  is_group BOOLEAN DEFAULT false,
  group_name TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  timestamp TIMESTAMPTZ NOT NULL,
  raw_event JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. TABLES — INFRA (2)
-- ==============================================================================

-- 5.1 cnpj_cache
CREATE TABLE IF NOT EXISTS cnpj_cache (
  cnpj VARCHAR(14) PRIMARY KEY,
  data JSONB NOT NULL,
  source VARCHAR(50),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- 5.2 scraping_jobs
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bullmq_id VARCHAR(100),
  keyword TEXT,
  location TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  results_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ==============================================================================
-- 6. INDEXES (38)
-- ==============================================================================

-- CRM
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);

-- AI-BOS
CREATE INDEX IF NOT EXISTS idx_ai_company_profile_user_id ON ai_company_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_role ON ai_agents(role);
CREATE INDEX IF NOT EXISTS idx_ai_agents_department ON ai_agents(department);
CREATE INDEX IF NOT EXISTS idx_ai_goals_user_id ON ai_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_goals_status ON ai_goals(status);
CREATE INDEX IF NOT EXISTS idx_ai_goals_priority ON ai_goals(priority);
CREATE INDEX IF NOT EXISTS idx_ai_activities_user_id ON ai_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_activities_agent_id ON ai_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_activities_action_type ON ai_activities(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_activities_created_at ON ai_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_category ON ai_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_conv_id ON ai_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_user_id ON ai_llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_provider ON ai_llm_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_agent_id ON ai_llm_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_created_at ON ai_llm_usage(created_at DESC);

-- WhatsApp Multi-Instance
CREATE INDEX IF NOT EXISTS idx_wa_instances_user_id ON whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_wa_links_instance_id ON wa_instance_links(instance_id);
CREATE INDEX IF NOT EXISTS idx_wa_links_service ON wa_instance_links(service_type, service_id);
CREATE INDEX IF NOT EXISTS idx_wa_messages_instance_id ON wa_messages(instance_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON wa_messages(instance_id, chat_jid, timestamp DESC);

-- Infra
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_expires ON cnpj_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_nome_fantasia ON cnpj_cache((data->>'nome_fantasia'));
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_razao_social ON cnpj_cache((data->>'razao_social'));

-- ==============================================================================
-- 7. ROW LEVEL SECURITY — Enable + Policies (79+)
-- ==============================================================================

-- ── CRM ──────────────────────────────────────────────────────────────────────
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

-- companies
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can insert own companies" ON companies;
DROP POLICY IF EXISTS "Users can update own companies" ON companies;
DROP POLICY IF EXISTS "Users can delete own companies" ON companies;
CREATE POLICY "Users can view own companies" ON companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own companies" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own companies" ON companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own companies" ON companies FOR DELETE USING (auth.uid() = user_id);

-- contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- deals
DROP POLICY IF EXISTS "Users can view own deals" ON deals;
DROP POLICY IF EXISTS "Users can insert own deals" ON deals;
DROP POLICY IF EXISTS "Users can update own deals" ON deals;
DROP POLICY IF EXISTS "Users can delete own deals" ON deals;
CREATE POLICY "Users can view own deals" ON deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deals" ON deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own deals" ON deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own deals" ON deals FOR DELETE USING (auth.uid() = user_id);

-- tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- whatsapp_chats
DROP POLICY IF EXISTS "Users can view own whatsapp_chats" ON whatsapp_chats;
DROP POLICY IF EXISTS "Users can insert own whatsapp_chats" ON whatsapp_chats;
DROP POLICY IF EXISTS "Users can update own whatsapp_chats" ON whatsapp_chats;
DROP POLICY IF EXISTS "Users can delete own whatsapp_chats" ON whatsapp_chats;
CREATE POLICY "Users can view own whatsapp_chats" ON whatsapp_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp_chats" ON whatsapp_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp_chats" ON whatsapp_chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whatsapp_chats" ON whatsapp_chats FOR DELETE USING (auth.uid() = user_id);

-- whatsapp_messages
DROP POLICY IF EXISTS "Users can view own whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert own whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can update own whatsapp_messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete own whatsapp_messages" ON whatsapp_messages;
CREATE POLICY "Users can view own whatsapp_messages" ON whatsapp_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own whatsapp_messages" ON whatsapp_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own whatsapp_messages" ON whatsapp_messages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own whatsapp_messages" ON whatsapp_messages FOR DELETE USING (auth.uid() = user_id);

-- automations
DROP POLICY IF EXISTS "Users can view own automations" ON automations;
DROP POLICY IF EXISTS "Users can insert own automations" ON automations;
DROP POLICY IF EXISTS "Users can update own automations" ON automations;
DROP POLICY IF EXISTS "Users can delete own automations" ON automations;
CREATE POLICY "Users can view own automations" ON automations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own automations" ON automations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own automations" ON automations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own automations" ON automations FOR DELETE USING (auth.uid() = user_id);

-- ── AI-BOS ───────────────────────────────────────────────────────────────────
ALTER TABLE ai_company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_llm_usage ENABLE ROW LEVEL SECURITY;

-- ai_company_profile
DROP POLICY IF EXISTS "Users can view their own company profile" ON ai_company_profile;
DROP POLICY IF EXISTS "Users can insert their own company profile" ON ai_company_profile;
DROP POLICY IF EXISTS "Users can update their own company profile" ON ai_company_profile;
CREATE POLICY "Users can view their own company profile" ON ai_company_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own company profile" ON ai_company_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company profile" ON ai_company_profile FOR UPDATE USING (auth.uid() = user_id);

-- ai_agents
DROP POLICY IF EXISTS "Users can view their own agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can insert their own agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON ai_agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON ai_agents;
CREATE POLICY "Users can view their own agents" ON ai_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agents" ON ai_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON ai_agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON ai_agents FOR DELETE USING (auth.uid() = user_id);

-- ai_goals
DROP POLICY IF EXISTS "Users can view their own goals" ON ai_goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON ai_goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON ai_goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON ai_goals;
CREATE POLICY "Users can view their own goals" ON ai_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON ai_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON ai_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON ai_goals FOR DELETE USING (auth.uid() = user_id);

-- ai_activities
DROP POLICY IF EXISTS "Users can view their own activities" ON ai_activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON ai_activities;
CREATE POLICY "Users can view their own activities" ON ai_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activities" ON ai_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ai_suggestions
DROP POLICY IF EXISTS "Users can view their own suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON ai_suggestions;
DROP POLICY IF EXISTS "Users can update their own suggestions" ON ai_suggestions;
CREATE POLICY "Users can view their own suggestions" ON ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own suggestions" ON ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suggestions" ON ai_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON ai_conversations;
CREATE POLICY "Users can view their own conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversation_messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON ai_conversation_messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON ai_conversation_messages;
CREATE POLICY "Users can view messages in their conversations" ON ai_conversation_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert messages in their conversations" ON ai_conversation_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_conversation_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
    )
  );

-- ai_llm_usage
DROP POLICY IF EXISTS "Users can view their own LLM usage" ON ai_llm_usage;
DROP POLICY IF EXISTS "Users can insert their own LLM usage" ON ai_llm_usage;
CREATE POLICY "Users can view their own LLM usage" ON ai_llm_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own LLM usage" ON ai_llm_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── WHATSAPP MULTI-INSTANCE ──────────────────────────────────────────────────
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_instance_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances
DROP POLICY IF EXISTS "Users can view their own WA instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can insert their own WA instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can update their own WA instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete their own WA instances" ON whatsapp_instances;
DROP POLICY IF EXISTS "Service role full access on WA instances" ON whatsapp_instances;
CREATE POLICY "Users can view their own WA instances" ON whatsapp_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own WA instances" ON whatsapp_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own WA instances" ON whatsapp_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own WA instances" ON whatsapp_instances FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on WA instances" ON whatsapp_instances FOR ALL USING (auth.role() = 'service_role');

-- wa_instance_links
DROP POLICY IF EXISTS "Users can view links of their WA instances" ON wa_instance_links;
DROP POLICY IF EXISTS "Users can insert links to their WA instances" ON wa_instance_links;
DROP POLICY IF EXISTS "Users can update links of their WA instances" ON wa_instance_links;
DROP POLICY IF EXISTS "Users can delete links of their WA instances" ON wa_instance_links;
DROP POLICY IF EXISTS "Service role full access on WA links" ON wa_instance_links;
CREATE POLICY "Users can view links of their WA instances" ON wa_instance_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_instance_links.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert links to their WA instances" ON wa_instance_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_instance_links.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update links of their WA instances" ON wa_instance_links
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_instance_links.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete links of their WA instances" ON wa_instance_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_instance_links.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access on WA links" ON wa_instance_links FOR ALL USING (auth.role() = 'service_role');

-- wa_messages
DROP POLICY IF EXISTS "Users can view messages of their WA instances" ON wa_messages;
DROP POLICY IF EXISTS "Users can insert messages to their WA instances" ON wa_messages;
DROP POLICY IF EXISTS "Service role full access on WA messages" ON wa_messages;
CREATE POLICY "Users can view messages of their WA instances" ON wa_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_messages.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert messages to their WA instances" ON wa_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM whatsapp_instances
      WHERE whatsapp_instances.id = wa_messages.instance_id
      AND whatsapp_instances.user_id = auth.uid()
    )
  );
CREATE POLICY "Service role full access on WA messages" ON wa_messages FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- 8. TRIGGERS (13)
-- ==============================================================================

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_deals_updated_at ON deals;
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS update_whatsapp_chats_updated_at ON whatsapp_chats;
DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
DROP TRIGGER IF EXISTS update_ai_company_profile_updated_at ON ai_company_profile;
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON ai_agents;
DROP TRIGGER IF EXISTS update_ai_goals_updated_at ON ai_goals;
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON ai_conversations;
DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON whatsapp_instances;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_chats_updated_at BEFORE UPDATE ON whatsapp_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_company_profile_updated_at BEFORE UPDATE ON ai_company_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_goals_updated_at BEFORE UPDATE ON ai_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON whatsapp_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: auto-create company+contact on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ==============================================================================
-- 9. SUPER ADMIN — fluowai@gmail.com / Argo@15077399brsc
-- ==============================================================================

-- Criar ou atualizar super admin no Supabase Auth
-- confirmed_at é coluna gerada automaticamente a partir de email_confirmed_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'fluowai@gmail.com') THEN
    UPDATE auth.users SET
      encrypted_password = crypt('Argo@15077399brsc', gen_salt('bf')),
      raw_user_meta_data = '{"full_name": "Paulo Fluowai", "role": "super_admin"}',
      email_confirmed_at = NOW(),
      updated_at = NOW()
    WHERE email = 'fluowai@gmail.com';
  ELSE
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
      recovery_token, recovery_sent_at, email_change_token_new, email_change,
      email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
      phone_change, phone_change_token, phone_change_sent_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(), 'authenticated', 'authenticated',
      'fluowai@gmail.com', crypt('Argo@15077399brsc', gen_salt('bf')),
      NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Paulo Fluowai", "role": "super_admin"}',
      FALSE, NOW(), NOW(), NULL, NULL, '', '', NULL
    );
  END IF;
END $$;

-- Criar company + contact para o super admin (manualmente, pois o trigger pode falhar se já existir)
DO $$
DECLARE
  admin_user_id UUID;
  admin_company_id UUID;
BEGIN
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'fluowai@gmail.com';

  IF admin_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM companies WHERE user_id = admin_user_id
  ) THEN
    INSERT INTO companies (user_id, razao_social, nome_fantasia, cnpj, endereco)
    VALUES (admin_user_id, 'Fluowai', 'Fluowai', '', '{}'::jsonb)
    RETURNING id INTO admin_company_id;

    INSERT INTO contacts (
      user_id, company_id, company_name, name, role, department, whatsapp, email
    )
    VALUES (
      admin_user_id,
      admin_company_id,
      'Fluowai',
      'Paulo Fluowai',
      'Super Admin',
      'Diretoria',
      '',
      'fluowai@gmail.com'
    );
  END IF;
END $$;

-- ==============================================================================
-- 10. VERIFICACAO
-- ==============================================================================

-- Listar tabelas criadas
SELECT table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verificar usuário criado
SELECT id, email, role, created_at 
FROM auth.users 
WHERE email = 'fluowai@gmail.com';
