-- ==============================================================================
-- WOOTECH CRM - WHATSAPP MULTI-INSTANCE SCHEMA
-- Fase 1: Database — whatsapp_instances, wa_instance_links, wa_messages
-- Execute no SQL Editor do Supabase ou via pg client
-- ==============================================================================

-- ==============================================================================
-- 1. WHATSAPP_INSTANCES — Instâncias WhatsApp multi-tenant
-- ==============================================================================
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

-- ==============================================================================
-- 2. WA_INSTANCE_LINKS — Vínculos instância ↔ serviços
-- ==============================================================================
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

-- ==============================================================================
-- 3. WA_MESSAGES — Histórico persistente de mensagens por instância
-- ==============================================================================
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
-- 4. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_wa_instances_user_id ON public.whatsapp_instances(user_id);
CREATE INDEX IF NOT EXISTS idx_wa_instances_status ON public.whatsapp_instances(status);

CREATE INDEX IF NOT EXISTS idx_wa_links_instance_id ON public.wa_instance_links(instance_id);
CREATE INDEX IF NOT EXISTS idx_wa_links_service ON public.wa_instance_links(service_type, service_id);

CREATE INDEX IF NOT EXISTS idx_wa_messages_instance_id ON public.wa_messages(instance_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_chat ON public.wa_messages(instance_id, chat_jid, timestamp DESC);

-- ==============================================================================
-- 5. TRIGGERS (reutiliza update_updated_at_column do schema principal)
-- ==============================================================================
CREATE TRIGGER update_whatsapp_instances_updated_at
    BEFORE UPDATE ON public.whatsapp_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. RLS — Row Level Security
-- ==============================================================================
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_instance_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances: usuário vê apenas suas instâncias
CREATE POLICY "Users can view their own WA instances"
    ON public.whatsapp_instances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own WA instances"
    ON public.whatsapp_instances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own WA instances"
    ON public.whatsapp_instances FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own WA instances"
    ON public.whatsapp_instances FOR DELETE USING (auth.uid() = user_id);

-- wa_instance_links: acesso via instância do usuário
CREATE POLICY "Users can view links of their WA instances"
    ON public.wa_instance_links FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert links to their WA instances"
    ON public.wa_instance_links FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can update links of their WA instances"
    ON public.wa_instance_links FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can delete links of their WA instances"
    ON public.wa_instance_links FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_instance_links.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );

-- wa_messages: acesso via instância do usuário
CREATE POLICY "Users can view messages of their WA instances"
    ON public.wa_messages FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_messages.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );
CREATE POLICY "Users can insert messages to their WA instances"
    ON public.wa_messages FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.whatsapp_instances
            WHERE whatsapp_instances.id = wa_messages.instance_id
            AND whatsapp_instances.user_id = auth.uid()
        )
    );

-- ==============================================================================
-- 7. SERVICE ROLE BYPASS (para o backend Node.js com service_role key)
-- ==============================================================================
CREATE POLICY "Service role full access on WA instances"
    ON public.whatsapp_instances FOR ALL
    USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on WA links"
    ON public.wa_instance_links FOR ALL
    USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on WA messages"
    ON public.wa_messages FOR ALL
    USING (auth.role() = 'service_role');
