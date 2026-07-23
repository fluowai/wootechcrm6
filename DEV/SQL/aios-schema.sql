-- ==============================================================================
-- WOOTECH CRM - AI-BOS SCHEMA MIGRATION v2
-- Multi-LLM, Autonomia Total, Onboarding por Ramo
-- Execute no SQL Editor do Supabase
-- ==============================================================================

-- ==============================================================================
-- 1. AI COMPANY PROFILE — Perfil da empresa (onboarding)
-- ==============================================================================
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

-- ==============================================================================
-- 2. AI AGENTS — Registro de agentes
-- ==============================================================================
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

-- ==============================================================================
-- 3. AI GOALS — Objetivos estratégicos
-- ==============================================================================
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

-- ==============================================================================
-- 4. AI ACTIVITIES — Log de atividades
-- ==============================================================================
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

-- ==============================================================================
-- 5. AI SUGGESTIONS — Sugestões dos agentes
-- ==============================================================================
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

-- ==============================================================================
-- 6. AI CONVERSATIONS — Discussões entre agentes
-- ==============================================================================
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

CREATE TABLE IF NOT EXISTS public.ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- 7. AI LLM USAGE — Controle de uso de LLMs
-- ==============================================================================
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
-- 8. INDEXES
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
-- 9. TRIGGERS
-- ==============================================================================
CREATE TRIGGER update_ai_company_profile_updated_at BEFORE UPDATE ON public.ai_company_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_agents_updated_at BEFORE UPDATE ON public.ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_goals_updated_at BEFORE UPDATE ON public.ai_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. RLS
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
CREATE POLICY "Users can view their own company profile" ON public.ai_company_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own company profile" ON public.ai_company_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company profile" ON public.ai_company_profile FOR UPDATE USING (auth.uid() = user_id);

-- ai_agents
CREATE POLICY "Users can view their own agents" ON public.ai_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own agents" ON public.ai_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON public.ai_agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON public.ai_agents FOR DELETE USING (auth.uid() = user_id);

-- ai_goals
CREATE POLICY "Users can view their own goals" ON public.ai_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.ai_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.ai_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.ai_goals FOR DELETE USING (auth.uid() = user_id);

-- ai_activities
CREATE POLICY "Users can view their own activities" ON public.ai_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own activities" ON public.ai_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ai_suggestions
CREATE POLICY "Users can view their own suggestions" ON public.ai_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own suggestions" ON public.ai_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own suggestions" ON public.ai_suggestions FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversations
CREATE POLICY "Users can view their own conversations" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);

-- ai_conversation_messages
CREATE POLICY "Users can view messages in their conversations" ON public.ai_conversation_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_conversation_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert messages in their conversations" ON public.ai_conversation_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_conversations
            WHERE ai_conversations.id = ai_conversation_messages.conversation_id
            AND ai_conversations.user_id = auth.uid()
        )
    );

-- ai_llm_usage
CREATE POLICY "Users can view their own LLM usage" ON public.ai_llm_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own LLM usage" ON public.ai_llm_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
