-- ==============================================================================
-- WOOTECH CRM - FULL SCHEMA CONSOLIDATED
-- All tables: CRM + AI-BOS + WhatsApp Multi-Instance
-- Execute no SQL Editor do Supabase (dev: omxbbhxrwftcklmsaasa)
-- Idempotent: safe to re-run (IF NOT EXISTS on all objects)
-- ==============================================================================

-- ==============================================================================
-- 0. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. HELPER FUNCTIONS
-- ==============================================================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-provision company + contact when user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.companies (user_id, razao_social, nome_fantasia, cnpj, situacao, cnae_code, cnae_text, capital_social, porte, natureza_juridica, endereco)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa'),
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa'),
        COALESCE(NEW.raw_user_meta_data->>'cnpj', ''),
        'ATIVA',
        '',
        '',
        0,
        'EPP',
        '',
        '{}'::jsonb
    );

    INSERT INTO public.contacts (user_id, company_id, company_name, name, role, department, whatsapp, email)
    VALUES (
        NEW.id,
        (SELECT id FROM public.companies WHERE user_id = NEW.id LIMIT 1),
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Empresa'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'Admin',
        '',
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.email, '')
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 2. CRM TABLES (from supabase/migrations/001_initial_schema.sql)
-- ==============================================================================

-- Companies
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
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

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'task',
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    assigned_to TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WhatsApp Chats (legacy single-session)
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- WhatsApp Messages (legacy single-session)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    content TEXT NOT NULL,
    media_type TEXT,
    media_url TEXT,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automations
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- 3. AI-BOS TABLES (from DEV/SQL/aios-schema.sql)
-- ==============================================================================

-- AI Company Profile (onboarding)
CREATE TABLE IF NOT EXISTS public.ai_company_profile (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agents
CREATE TABLE IF NOT EXISTS public.ai_agents (
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
    last_heartbeat_at TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Goals
CREATE TABLE IF NOT EXISTS public.ai_goals (
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
    assigned_agent_id UUID REFERENCES public.ai_agents(id),
    deadline DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Activities
CREATE TABLE IF NOT EXISTS public.ai_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    agent_name TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('analysis', 'suggestion', 'execution', 'delegation', 'alert', 'heartbeat', 'goal_check', 'llm_call')),
    title TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    result JSONB,
    llm_provider TEXT,
    tokens_used NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Suggestions
CREATE TABLE IF NOT EXISTS public.ai_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    agent_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('pipeline', 'hiring', 'marketing', 'pricing', 'retention', 'operations', 'custom')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    impact_estimate TEXT DEFAULT 'medium' CHECK (impact_estimate IN ('high', 'medium', 'low')),
    data JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'accepted', 'dismissed', 'implemented')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic TEXT NOT NULL,
    participants JSONB NOT NULL,
    summary TEXT,
    resolution TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Conversation Messages
CREATE TABLE IF NOT EXISTS public.ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI LLM Usage
CREATE TABLE IF NOT EXISTS public.ai_llm_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 4. WHATSAPP MULTI-INSTANCE TABLES (from DEV/SQL/wa-instances-schema.sql)
-- ==============================================================================

-- WhatsApp Instances (multi-tenant)
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
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
    last_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Instance Links (instance <-> services)
CREATE TABLE IF NOT EXISTS public.wa_instance_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL
        CHECK (service_type IN ('ai_agent', 'automation', 'chatbot', 'broadcast', 'webhook')),
    service_id TEXT NOT NULL,
    service_name TEXT,
    config JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp Messages (per-instance persistent history)
CREATE TABLE IF NOT EXISTS public.wa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 5. INFRA TABLES (from infra/postgres/init.sql — optional, for local services)
-- ==============================================================================

-- CNPJ Cache (used by cnpj-service)
CREATE TABLE IF NOT EXISTS public.cnpj_cache (
    cnpj VARCHAR(14) PRIMARY KEY,
    data JSONB NOT NULL,
    source VARCHAR(50),
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Scraping Jobs (used by colly-service)
CREATE TABLE IF NOT EXISTS public.scraping_jobs (
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
-- 6. INDEXES — CRM
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON public.contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_user_id ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_user_id ON public.whatsapp_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_chat_id ON public.whatsapp_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON public.automations(user_id);

-- ==============================================================================
-- 7. INDEXES — AI-BOS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_company_profile_user_id ON public.ai_company_profile(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_agents_user_id ON public.ai_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_status ON public.ai_agents(status);
CREATE INDEX IF NOT EXISTS idx_ai_agents_role ON public.ai_agents(role);
CREATE INDEX IF NOT EXISTS idx_ai_agents_department ON public.ai_agents(department);

CREATE INDEX IF NOT EXISTS idx_ai_goals_user_id ON public.ai_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_goals_status ON public.ai_goals(status);
CREATE INDEX IF NOT EXISTS idx_ai_goals_priority ON public.ai_goals(priority);

CREATE INDEX IF NOT EXISTS idx_ai_activities_user_id ON public.ai_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_activities_agent_id ON public.ai_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_activities_action_type ON public.ai_activities(action_type);
CREATE INDEX IF NOT EXISTS idx_ai_activities_created_at ON public.ai_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON public.ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_status ON public.ai_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_category ON public.ai_suggestions(category);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversation_messages_conv_id ON public.ai_conversation_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_user_id ON public.ai_llm_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_provider ON public.ai_llm_usage(provider);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_agent_id ON public.ai_llm_usage(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_llm_usage_created_at ON public.ai_llm_usage(created_at DESC);

-- ==============================================================================
-- 8. INDEXES — WhatsApp Multi-Instance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_wa_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_instances_status ON public.whatsapp_instances(status);

CREATE INDEX IF NOT EXISTS idx_wa_links_instance_id ON public.wa_instance_links(instance_id);
CREATE INDEX IF NOT EXISTS idx_wa_links_service ON public.wa_instance_links(service_type, service_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_instance_id ON public.wa_messages(instance_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON public.wa_messages(instance_id, chat_jid, timestamp DESC);

-- ==============================================================================
-- 9. INDEXES — Infra
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_expires ON public.cnpj_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_nome_fantasia ON public.cnpj_cache((data->>'nome_fantasia'));
CREATE INDEX IF NOT EXISTS idx_cnpj_cache_razao_social ON public.cnpj_cache((data->>'razao_social'));

-- ==============================================================================
-- 10. TRIGGERS — CRM
-- ==============================================================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_deals_updated_at ON public.deals;
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_whatsapp_chats_updated_at ON public.whatsapp_chats;
CREATE TRIGGER update_whatsapp_chats_updated_at BEFORE UPDATE ON public.whatsapp_chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_automations_updated_at ON public.automations;
CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 11. TRIGGERS — AI-BOS
-- ==============================================================================
DROP TRIGGER IF EXISTS update_ai_company_profile_updated_at ON public.ai_company_profile;
CREATE TRIGGER update_ai_company_profile_updated_at BEFORE UPDATE ON public.ai_company_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_agents_updated_at ON public.ai_agents;
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_goals_updated_at ON public.ai_goals;
CREATE TRIGGER update_ai_goals_updated_at BEFORE UPDATE ON public.ai_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 12. TRIGGERS — WhatsApp Multi-Instance
-- ==============================================================================
DROP TRIGGER IF EXISTS update_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 13. TRIGGER — Auth Auto-Provisioning
-- ==============================================================================
-- Fires when a new user signs up via Supabase Auth
-- Auto-creates company + contact from user metadata
-- NOTE: This trigger must be on auth.users, not a public table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION handle_new_user();
    END IF;
END
$$;

-- ==============================================================================
-- 14. RLS — CRM Tables
-- ==============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

-- Companies
DROP POLICY IF EXISTS "Users can view own companies" ON public.companies;
CREATE POLICY "Users can view own companies" ON public.companies FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own companies" ON public.companies;
CREATE POLICY "Users can insert own companies" ON public.companies FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own companies" ON public.companies;
CREATE POLICY "Users can update own companies" ON public.companies FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own companies" ON public.companies;
CREATE POLICY "Users can delete own companies" ON public.companies FOR DELETE USING (auth.uid() = user_id);

-- Contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON public.contacts;
CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
CREATE POLICY "Users can insert own contacts" ON public.contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
CREATE POLICY "Users can update own contacts" ON public.contacts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;
CREATE POLICY "Users can delete own contacts" ON public.contacts FOR DELETE USING (auth.uid() = user_id);

-- Deals
DROP POLICY IF EXISTS "Users can view own deals" ON public.deals;
CREATE POLICY "Users can view own deals" ON public.deals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own deals" ON public.deals;
CREATE POLICY "Users can insert own deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own deals" ON public.deals;
CREATE POLICY "Users can update own deals" ON public.deals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own deals" ON public.deals;
CREATE POLICY "Users can delete own deals" ON public.deals FOR DELETE USING (auth.uid() = user_id);

-- Tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.tasks;
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.tasks;
CREATE POLICY "Users can insert own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own tasks" ON public.tasks;
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp Chats
DROP POLICY IF EXISTS "Users can view own whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Users can view own whatsapp_chats" ON public.whatsapp_chats FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Users can insert own whatsapp_chats" ON public.whatsapp_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Users can update own whatsapp_chats" ON public.whatsapp_chats FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Users can delete own whatsapp_chats" ON public.whatsapp_chats FOR DELETE USING (auth.uid() = user_id);

-- WhatsApp Messages
DROP POLICY IF EXISTS "Users can view own whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Users can view own whatsapp_messages" ON public.whatsapp_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Users can insert own whatsapp_messages" ON public.whatsapp_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Automations
DROP POLICY IF EXISTS "Users can view own automations" ON public.automations;
CREATE POLICY "Users can view own automations" ON public.automations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own automations" ON public.automations;
CREATE POLICY "Users can insert own automations" ON public.automations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own automations" ON public.automations;
CREATE POLICY "Users can update own automations" ON public.automations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own automations" ON public.automations;
CREATE POLICY "Users can delete own automations" ON public.automations FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- 15. RLS — AI-BOS Tables
-- ==============================================================================
ALTER TABLE public.ai_company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_llm_usage ENABLE ROW LEVEL SECURITY;

-- ai_company_profile
DROP POLICY IF EXISTS "Users can view their own company profile" ON public.ai_company_profile;
CREATE POLICY "Users can view their own company profile" ON public.ai_company_profile FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own company profile" ON public.ai_company_profile;
CREATE POLICY "Users can insert their own company profile" ON public.ai_company_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own company profile" ON public.ai_company_profile;
CREATE POLICY "Users can update their own company profile" ON public.ai_company_profile FOR UPDATE USING (auth.uid() = user_id);

-- ai_agents
DROP POLICY IF EXISTS "Users can view their own agents" ON public.ai_agents;
CREATE POLICY "Users can view their own agents" ON public.ai_agents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own agents" ON public.ai_agents;
CREATE POLICY "Users can insert their own agents" ON public.ai_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own agents" ON public.ai_agents;
CREATE POLICY "Users can update their own agents" ON public.ai_agents FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.ai_agents;
CREATE POLICY "Users can delete their own agents" ON public.ai_agents FOR DELETE USING (auth.uid() = user_id);

-- ai_goals
DROP POLICY IF EXISTS "Users can view their own goals" ON public.ai_goals;
CREATE POLICY "Users can view their own goals" ON public.ai_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.ai_goals;
CREATE POLICY "Users can insert their own goals" ON public.ai_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own goals" ON public.ai_goals;
CREATE POLICY "Users can update their own goals" ON public.ai_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own goals" ON public.ai_goals;
CREATE POLICY "Users can delete their own goals" ON public.ai_goals FOR DELETE USING (auth.uid() = user_id);

-- ai_activities
DROP POLICY IF EXISTS "Users can view their own activities" ON public.ai_activities;
CREATE POLICY "Users can view their own activities" ON public.ai_activities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.ai_activities;
CREATE POLICY "Users can insert their own activities" ON public.ai_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ai_suggestions
DROP POLICY IF EXISTS "Users can view their own suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can view their own suggestions" ON public.ai_suggestions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can insert their own suggestions" ON public.ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own suggestions" ON public.ai_suggestions;
CREATE POLICY "Users can update their own suggestions" ON public.ai_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversations
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can view their own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can insert their own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.ai_conversations;
CREATE POLICY "Users can update their own conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversation_messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.ai_conversation_messages;
CREATE POLICY "Users can view messages in their conversations" ON public.ai_conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_conversation_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON public.ai_conversation_messages;
CREATE POLICY "Users can insert messages in their conversations" ON public.ai_conversation_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_conversation_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- ai_llm_usage
DROP POLICY IF EXISTS "Users can view their own LLM usage" ON public.ai_llm_usage;
CREATE POLICY "Users can view their own LLM usage" ON public.ai_llm_usage FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own LLM usage" ON public.ai_llm_usage;
CREATE POLICY "Users can insert their own LLM usage" ON public.ai_llm_usage FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 16. RLS — WhatsApp Multi-Instance Tables
-- ==============================================================================
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_instance_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances
DROP POLICY IF EXISTS "Users can view their own WA instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view their own WA instances" ON public.whatsapp_instances FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own WA instances" ON public.whatsapp_instances;
CREATE POLICY "Users can insert their own WA instances" ON public.whatsapp_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own WA instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update their own WA instances" ON public.whatsapp_instances FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own WA instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete their own WA instances" ON public.whatsapp_instances FOR DELETE USING (auth.uid() = user_id);

-- wa_instance_links
DROP POLICY IF EXISTS "Users can view links of their WA instances" ON public.wa_instance_links;
CREATE POLICY "Users can view links of their WA instances" ON public.wa_instance_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can insert links to their WA instances" ON public.wa_instance_links;
CREATE POLICY "Users can insert links to their WA instances" ON public.wa_instance_links
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can update links of their WA instances" ON public.wa_instance_links;
CREATE POLICY "Users can update links of their WA instances" ON public.wa_instance_links
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can delete links of their WA instances" ON public.wa_instance_links;
CREATE POLICY "Users can delete links of their WA instances" ON public.wa_instance_links
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );

-- wa_messages
DROP POLICY IF EXISTS "Users can view messages of their WA instances" ON public.wa_messages;
CREATE POLICY "Users can view messages of their WA instances" ON public.wa_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_messages.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
DROP POLICY IF EXISTS "Users can insert messages to their WA instances" ON public.wa_messages;
CREATE POLICY "Users can insert messages to their WA instances" ON public.wa_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_messages.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 17. RLS — Infra Tables
-- ==============================================================================
-- cnpj_cache and scraping_jobs are internal service tables, no user-facing RLS needed
-- They are accessed by the Node.js backend with service_role key

-- ==============================================================================
-- 18. SERVICE ROLE BYPASS (for backend with service_role key)
-- ==============================================================================
-- WhatsApp Instances
DROP POLICY IF EXISTS "Service role full access on WA instances" ON public.whatsapp_instances;
CREATE POLICY "Service role full access on WA instances"
    ON public.whatsapp_instances FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on WA links" ON public.wa_instance_links;
CREATE POLICY "Service role full access on WA links"
    ON public.wa_instance_links FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on WA messages" ON public.wa_messages;
CREATE POLICY "Service role full access on WA messages"
    ON public.wa_messages FOR ALL USING (auth.role() = 'service_role');

-- AI-BOS (backend needs service_role for agent operations)
DROP POLICY IF EXISTS "Service role full access on ai_company_profile" ON public.ai_company_profile;
CREATE POLICY "Service role full access on ai_company_profile"
    ON public.ai_company_profile FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_agents" ON public.ai_agents;
CREATE POLICY "Service role full access on ai_agents"
    ON public.ai_agents FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_goals" ON public.ai_goals;
CREATE POLICY "Service role full access on ai_goals"
    ON public.ai_goals FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_activities" ON public.ai_activities;
CREATE POLICY "Service role full access on ai_activities"
    ON public.ai_activities FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_suggestions" ON public.ai_suggestions;
CREATE POLICY "Service role full access on ai_suggestions"
    ON public.ai_suggestions FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_conversations" ON public.ai_conversations;
CREATE POLICY "Service role full access on ai_conversations"
    ON public.ai_conversations FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_conversation_messages" ON public.ai_conversation_messages;
CREATE POLICY "Service role full access on ai_conversation_messages"
    ON public.ai_conversation_messages FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on ai_llm_usage" ON public.ai_llm_usage;
CREATE POLICY "Service role full access on ai_llm_usage"
    ON public.ai_llm_usage FOR ALL USING (auth.role() = 'service_role');

-- CRM (backend needs service_role for operations)
DROP POLICY IF EXISTS "Service role full access on companies" ON public.companies;
CREATE POLICY "Service role full access on companies"
    ON public.companies FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on contacts" ON public.contacts;
CREATE POLICY "Service role full access on contacts"
    ON public.contacts FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on deals" ON public.deals;
CREATE POLICY "Service role full access on deals"
    ON public.deals FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on tasks" ON public.tasks;
CREATE POLICY "Service role full access on tasks"
    ON public.tasks FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on whatsapp_chats" ON public.whatsapp_chats;
CREATE POLICY "Service role full access on whatsapp_chats"
    ON public.whatsapp_chats FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Service role full access on whatsapp_messages"
    ON public.whatsapp_messages FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on automations" ON public.automations;
CREATE POLICY "Service role full access on automations"
    ON public.automations FOR ALL USING (auth.role() = 'service_role');

-- Infra
DROP POLICY IF EXISTS "Service role full access on cnpj_cache" ON public.cnpj_cache;
CREATE POLICY "Service role full access on cnpj_cache"
    ON public.cnpj_cache FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role full access on scraping_jobs" ON public.scraping_jobs;
CREATE POLICY "Service role full access on scraping_jobs"
    ON public.scraping_jobs FOR ALL USING (auth.role() = 'service_role');

-- ==============================================================================
-- DONE. Summary:
-- Tables: 20 (7 CRM + 8 AI-BOS + 3 WA Multi-Instance + 2 Infra)
-- Indexes: 34
-- Triggers: 12 (updated_at) + 1 (auth provisioning)
-- RLS Policies: 60+ (user-scoped + service_role bypass)
-- Functions: 2 (update_updated_at_column, handle_new_user)
-- ==============================================================================
