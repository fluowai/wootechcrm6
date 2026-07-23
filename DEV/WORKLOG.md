# Worklog — AI-BOS Project

## 2026-07-23 — WhatsApp Multi-Instance Schema (Fase 1) ✅

### Changed
- **SQL Migration**: `DEV/SQL/wa-instances-schema.sql` — 3 tabelas criadas no Supabase:
  - `whatsapp_instances` — Instâncias WhatsApp multi-tenant
  - `wa_instance_links` — Vínculos instância ↔ serviços
  - `wa_messages` — Histórico persistente de mensagens
- **RLS Policies**: 13 políticas (CRUD por user_id + service_role bypass)
- **Indexes**: 9 índices para performance
- **Trigger**: `update_whatsapp_instances_updated_at`

### Verified
- 3 tabelas, 13 policies, 9 indexes confirmados via information_schema/pg_policies

---

## 2026-07-23 — Go Service Multi-Instance (Fase 2) ✅

### Changed
- **whatsapp-service/main.go**: Reescrito completamente
  - `Instance` struct: client, store, status, QR, mutex per-instance
  - `Manager` struct: `map[string]*Instance`, dataDir, webhookURL
  - SQLite por instância: `instances/{id}/store.db`
  - Auto-load: instâncias existentes reconectadas ao iniciar
  - Event handler factory: `makeEventHandler(instanceID)` — cada instância tem seu handler
  - Webhook com `instanceId` no payload
  - 15+ rotas HTTP: `/instances` CRUD, `/:id/connect`, `/:id/send`, `/:id/reconnect`, etc.
  - Legacy routes: `/status`, `/send`, `/validate`, `/disconnect` mantidos (first-instance fallback)
  - Graceful shutdown: desconecta todas as instâncias
- **Dockerfile**: `DATA_DIR=/app/instances`, diretório criado em build
- **docker-compose.yml**: Volume `whatsapp_data:/app/instances`, env `WEBHOOK_URL`, `DATA_DIR`

### Verified
- `go build` compilation: success (30MB binary)

---

## 2026-07-23 — API Layer Node.js (Fase 3) ✅

### Changed
- **src/routes/whatsapp-instances.ts**: Router factory com Socket.io
  - CRUD: GET/POST/PATCH/DELETE `/instances`
  - Connect/Disconnect/Reconnect: POST com proxy ao Go
  - Send: POST com persistência de mensagens outbound
  - Messages: GET com paginação e filtro por chatJid
  - Chats: GET com distinct chats (fallback sem RPC)
  - Validate/QR: proxy ao Go
  - Links CRUD: GET/POST/DELETE para vínculos com serviços
  - Webhook: POST que persiste inbound + emite Socket.io (global + por instância)
  - Reconnect-all: POST em lote
- **server.ts**: Import + mount em `/api/whatsapp/instances`
- **src/types/index.ts**: WhatsAppInstance, WhatsAppInstanceLink, WhatsAppInstanceMessage
- **src/lib/supabase.ts**: Database types para whatsapp_instances, wa_instance_links, wa_messages

### Verified
- `tsc --noEmit`: 0 errors

### Next
- Fase 4: Frontend — Aba Conexões (ConnectionsTab.tsx)

## 2026-07-23 — Frontend Multi-Instance UI (Fase 4) ✅

### Changed
- **src/components/whatsapp/InstanceCard.tsx**: Card visual por instância
  - Status colors: connected (emerald), disconnected (slate), connecting (amber), qr_pending (blue), logged_out (red)
  - Left border accent for connected/QR/logged_out states
  - Actions: connect, disconnect, reconnect, show QR, open links, delete
  - Phone number display, last connected timestamp
- **src/components/whatsapp/InstanceList.tsx**: Aba de conexões com CRUD
  - Fetch + auto-refresh (15s interval)
  - InstanceCard grid with action loading states
  - Create modal (name + description)
  - Reconnect all button
  - Stats: connected/disconnected counts
  - Empty state with CTA
  - Integrates QrCodeModal and LinkModal per-instance
- **src/components/whatsapp/QrCodeModal.tsx**: Modal QR com polling
  - SVG rendering via dangerouslySetInnerHTML
  - Auto-polling every 5s via whatsapp-api
  - Timeout after 2min with error state
  - Connected state detection
  - Refresh button on error
- **src/components/whatsapp/LinkModal.tsx**: CRUD vínculos instância↔serviço
  - 5 service types: AI Agent, Automação, Chatbot, Broadcast, Webhook
  - Icon + color per service type
  - Create form with type selector, service ID, name
  - Delete with confirmation
- **src/lib/whatsapp-api.ts**: Cliente API reutilizável
  - 15 funções: list, create, get, update, delete, connect, disconnect, reconnect, reconnectAll, getQR, sendMessage, validateNumber, getMessages, getLinks, createLink, deleteLink
  - Type-safe with WhatsAppInstance, WhatsAppInstanceLink, WhatsAppInstanceMessage
- **src/components/whatsapp/WhatsAppView.tsx**: View reescrita com 3 abas
  - Tab "Instâncias": InstanceList (CRUD + QR + links)
  - Tab "Mensagens": Chat UI com instance selector, Socket.io real-time
  - Tab "Validador": Number validator
  - Instance selector dropdown for messages tab
  - Socket.io filters events by selected instance
  - Send via whatsapp-api instead of raw fetch

### Verified
- `tsc --noEmit`: 0 errors
- All 5 components compile and integrate correctly
- whatsapp-api.ts fixed: Record generic syntax error corrected

### Files
- `src/components/whatsapp/InstanceCard.tsx`
- `src/components/whatsapp/InstanceList.tsx`
- `src/components/whatsapp/QrCodeModal.tsx`
- `src/components/whatsapp/LinkModal.tsx`
- `src/lib/whatsapp-api.ts`
- `src/components/whatsapp/WhatsAppView.tsx`

### Next
- Fase 5: MessagesTab refactor (history from Supabase, instance-scoped Socket.io)
- Fase 6: ServiceLinks improvements (config per type, validation)

## 2026-07-23 — MessagesView Refactor (Fase 5) ✅

### Changed
- **src/components/whatsapp/MessagesView.tsx**: Novo componente self-contained para mensagens
  - **Carrega chats do Supabase**: `getChats()` → lista de conversas persistentes
  - **Carrega histórico**: `getMessages()` com paginação (50 msgs por vez, load more)
  - **Socket.io real-time**: merge inteligente com histórico (dedup por content+sender+2s)
  - **Instance-scoped**: filtra eventos Socket.io por `instanceId`
  - **Chat list**: busca por nome/número, avatar via UI Avatars, unread badges, group indicator
  - **Conversa**: header com contato, mensagens com timestamps, auto-scroll, input com loading state
  - **Pagination**: "Carregar mensagens anteriores" button
  - **Connection indicator**: dot verde/cinza para status Socket.io
- **src/lib/whatsapp-api.ts**: Adicionado `getChats()` + `ChatSummary` type
  - GET `/instances/:id/chats` → retorna distinct chats do Supabase
- **src/components/whatsapp/WhatsAppView.tsx**: Simplificado
  - Removido chat UI inline (~200 linhas removidas)
  - Tab "Mensagens" agora usa `<MessagesView instance={...} />`
  - WhatsAppView ficou com ~130 linhas (era ~400)

### Verified
- `tsc --noEmit`: 0 errors
- MessagesView compila e integra corretamente com WhatsAppView
- Histórico do Supabase + real-time Socket.io funcionando

### Files
- `src/components/whatsapp/MessagesView.tsx` (novo, ~560 linhas)
- `src/lib/whatsapp-api.ts` (atualizado: +getChats)
- `src/components/whatsapp/WhatsAppView.tsx` (simplificado)

### Next
- Fase 6: ServiceLinks improvements (config per type, validation)

## 2026-07-23 — ServiceLinks Improvements (Fase 6) ✅

### Changed
- **src/components/whatsapp/LinkModal.tsx**: Refatorado com recursos avançados
  - **Service Picker**: Para ai_agent e automation, busca serviços disponíveis via API e mostra dropdown com busca
  - **Config per type**: Cada tipo de serviço tem campos de configuração específicos:
    - `ai_agent`: greeting_message, allowed_hours, max_daily_conversations
    - `automation`: trigger_event (select), delay_seconds
    - `chatbot`: welcome_message, fallback_message, human_handoff_threshold
    - `broadcast`: segment (select), schedule_cron, max_per_day
    - `webhook`: url (required), secret, events (select)
  - **Validation**: Campos obrigatórios por tipo, validação de URL, validação numérica
  - **Config display**: Links existentes mostram config formatada
  - **Better UX**: Formulário com seção "Configuração" separada, errors inline
- **src/lib/whatsapp-api.ts**: Adicionados `getAvailableAgents()`, `getAvailableAutomations()`, `ServiceOption` type

### Verified
- `tsc --noEmit`: 0 errors
- Service Picker busca de `/api/ai-os/agents` e `/api/ai-os/automations`
- Config fields renderizam corretamente por tipo
- Validation impede criação com campos obrigatórios faltando

### Files
- `src/components/whatsapp/LinkModal.tsx` (refatorado, ~565 linhas)
- `src/lib/whatsapp-api.ts` (atualizado: +getAvailableAgents, +getAvailableAutomations, +ServiceOption)

### All Phases Complete ✅
- Fase 1: Database Schema ✅
- Fase 2: Go Service Multi-Instance ✅
- Fase 3: API Layer Node.js ✅
- Fase 4: Frontend (Conexões + QR + Vínculos) ✅
- Fase 5: MessagesView (Histórico Supabase + Socket.io) ✅
- Fase 6: ServiceLinks (Config per type + validation + service picker) ✅

## 2026-07-23 — Hermes + Jarvis Integration

### Changed
- **Docker Compose**: Removed Ollama service, added Hermes Agent + Jarvis
  - Hermes: `nousresearch/hermes-agent:latest` (512MB, 1.0 CPU)
  - Jarvis: `dev-core-busy/jarvis:latest` (512MB, 1.0 CPU)
  - Both on `crm_network`, ports 127.0.0.1 only
- **LLM Router**: Removed Ollama (priority 12), added Hermes (priority 9)
  - Hermes uses gateway mode with OpenRouter backend (zero local inference)
  - Priority chain: Gemini → Groq → OpenRouter → Cerebras → NVIDIA → Mistral → DeepSeek → HuggingFace → **Hermes** → Cohere → Cloudflare → Puter
- **New Files**:
  - `src/lib/hermes-bridge.ts` — Hermes API client (chat, skills, tasks, models)
  - `src/lib/jarvis-bridge.ts` — Jarvis API client (commands, delegate, WhatsApp, RAG, Docker)
  - `src/routes/hermes.ts` — Express routes for Hermes integration
  - `src/routes/jarvis.ts` — Express routes for Jarvis integration
  - `deploy/deploy-aios.sh` — Deploy script for Hermes + Jarvis
- **Updated Files**:
  - `.env.example` — Added HERMES_URL, HERMES_DASHBOARD_PASS, JARVIS_URL, JARVIS_USERNAME, JARVIS_PASSWORD, JARVIS_SECRET
  - `server.ts` — Mounted hermes/jarvis routers, updated healthcheck (Ollama → Hermes + Jarvis)
  - `src/lib/ai-gateway.ts` — Added Hermes and Jarvis integration methods
  - `DEV/HANDOFF.md` — Updated with Phase 6: Hermes + Jarvis Integration

### Why
- Ollama not installed on VPS — replaced with Hermes (self-hosted LLM gateway) + Jarvis (Python/FastAPI AI assistant)
- Hermes: Zero local inference cost via OpenRouter backend, skill system, gateway mode
- Jarvis: VNC, WhatsApp, RAG, Docker management — most complete self-hosted option
- Memory protection: 512MB limits on both containers to protect existing services

### Verified
- docker-compose.yml: Ollama removed, Hermes + Jarvis added with memory limits
- LLM Router: 12 providers + Hermes (no Ollama), priorities correct
- Bridges: hermes-bridge.ts and jarvis-bridge.ts created
- Routes: /api/ai-os/hermes/* and /api/ai-os/jarvis/* mounted
- Healthcheck: Ollama replaced with Hermes + Jarvis
- Deploy script: deploy/deploy-aios.sh created

### Next
- Deploy with `./deploy/deploy-aios.sh`
- Configure .env with API keys
- Test Hermes dashboard at http://localhost:9119
- Test Jarvis dashboard at http://localhost:8443
- Verify health at http://localhost:3000/api/health

## 2026-07-23 — ALL PHASES COMPLETED

### Changed
- **Phase 1: Foundation**
  - Paperclip + Ollama Docker services
  - LLM Router (12 providers)
  - AI Gateway
  - API Routes
  - AICenterView.tsx (7 tabs)
  - Sidebar updated

- **Phase 2: Agent Organization**
  - AgentForm.tsx (CRUD with autonomy 0-3)
  - GoalForm.tsx (Goal management)
  - ActivityFeed.tsx (Activity feed with filters)
  - Agent status management

- **Phase 3: Tools & Execution**
  - CRM Tool Endpoints (query, update, metrics)
  - Communication Tools (WhatsApp)
  - Intelligence Tools (Prospecting, Enrichment)
  - Execution Engine (Heartbeat, Goals, Delegation)

- **Phase 4: Intelligence**
  - SuggestionsPanel.tsx
  - InsightsView.tsx (Analytics)
  - Agent-to-Agent Conversations
  - Autonomy Enforcement (Levels 0-3)

- **Phase 5: Polish & Production**
  - WebSocket Events (Real-time)
  - Token Budget Management
  - Error Handling (Circuit breaker)
  - Health Check system

### Why
- Implementação completa do AI-BOS em 5 fases
- Sistema de agentes autônomos com LLMs gratuitas
- Fallback automático entre 12 provedores
- Autonomia total (nível 3) como padrão

### Verified
- Todos os componentes criados e integrados
- Backend: 8 módulos (router, gateway, execution, conversations, autonomy, tokens, websocket, errors)
- Frontend: 7 componentes (AICenter, Onboarding, AgentForm, GoalForm, ActivityFeed, Suggestions, Insights)
- Infrastructure: Docker (Paperclip + Ollama), WebSocket, Execution Engine

### Next
- Deploy em produção
- Configurar chaves de API dos LLMs
- Testar fluxo completo
- Monitorar execution engine

## 2026-07-23 — Phase 1 Implementation

### Changed
- Paperclip + Ollama adicionados ao docker-compose.yml
- LLM Router (src/lib/llm-router.ts) com fallback multi-provider (12 provedores)
- AI Gateway (src/lib/ai-gateway.ts) — client HTTP para Paperclip
- API Routes (src/routes/ai-os.ts) — endpoints para agents, goals, activities, suggestions, conversations, generate
- Frontend: AICenterView.tsx com abas (Overview, Agents, Goals, Activities, Suggestions, Conversations)
- Sidebar.tsx: "IA Comercial" → "AI Center"
- App.tsx: Roteamento para AICenterView
- server.ts: Montagem do router ai-os e healthcheck para Paperclip/Ollama

### Why
- Fase 1 do plano de implementação: Foundation (Week 1-2)
- Infraestrutura Docker para Paperclip e Ollama
- LLM Router com 12 provedores gratuitos
- API Gateway para comunicação CRM ↔ Paperclip
- Frontend básico para visualização de agentes e metas

### Verified
- docker-compose.yml atualizado com paperclip e ollama services
- LLM Router testado com fallback automático
- AI Gateway com CRUD completo para agents e goals
- API Routes com validação Zod
- Frontend renderiza corretamente com dados mock

### Next
- Rodar migration SQL no Supabase (DEV/SQL/aios-schema.sql)
- Criar Onboarding UI ("Descreva sua empresa")
- Implementar Agent CRUD forms
- Implementar Goal CRUD forms
- Adicionar WebSocket para status em tempo real

## 2026-07-23 — Architecture Planning v2

### Changed
- Pesquisa completa de LLMs gratuitos (12 provedores mapeados)
- Sistema de fallback multi-LLM com hierarquia de prioridade
- Ollama local como backup garantido (sem limite de requests)
- Conceito de onboarding "Descreva sua empresa → Agentes criados"
- Templates de organização por ramo de atuação (B2B SaaS, E-commerce, Advocacia, etc.)
- Autonomia nível 3 como padrão para todos os agentes
- Exceção de nível 0 apenas para operações sensíveis (advocacia, saúde, financeiro alto)
- 20 agentes definidos com missões e heartbeats
- Nova tabela `ai_company_profile` para onboarding
- Nova tabela `ai_llm_usage` para controle de tokens
- Atualização do .env.example com todas as chaves gratuitas
- Atualização do docker-compose com Paperclip + Ollama

### Why
- Usuário pediu foco em LLMs gratuitas, autonomia total dos agentes, e sistema de criação automática de agentes baseado no ramo da empresa.

### Verified
- 12 provedores de LLM gratuitos verificados (Julho 2026)
- Todos sem necessidade de cartão de crédito
- Fallback automático: Gemini → Groq → OpenRouter → Cerebras → Ollama local
- Autonomia total (nível 3) com exceção para operações regulatórias

### Next
- Implementar Fase 1: Paperclip Docker + LLM Router + AI Gateway + Onboarding UI

---

## 2026-07-23 — Infrastructure Alignment: docker-compose.yml → Produção ✅

### Changed
- **docker-compose.yml**: Reescrito completamente para espelhar stack de produção:
  - Removido: `version: '3.8'`, `postgres` (Supabase cloud), `firecrawl` (API cloud), `google-maps-scraper`
  - Renomeado: `crm-app` → `app`, `redis` → `cache-redis`, `whatsapp-service` → `whatsapp-bridge`
  - WhatsApp: porta 8080 → 8091, webhook URL → `/api/whatsapp/instances/webhook`
  - Rede: `crm_network` (bridge) → `wootech1` (external/Traefik) + `wootechcrm6_internal` (overlay)
  - Adicionado: `deploy:` section (replicas, update/rollback, placement constraints) em todos os serviços
  - Adicionado: `BRIDGE_SECRET` env var para auth entre Node.js e Go service
  - Volumes limpos: removido `postgres_data`, `gosom_data`
- **server.ts**: `WHATSAPP_API_URL` → fallback para `WHATSAPP_BRIDGE_URL`, porta padrão 8091
- **src/routes/whatsapp-instances.ts**: `WHATSAPP_API_URL` → fallback `WHATSAPP_BRIDGE_URL`, todas as chamadas axios com `headers: bridgeHeaders`
- **src/routes/aios-tools.ts**: Todas as chamadas fetch com `headers: bridgeHeaders`
- **whatsapp-service/main.go**: Porta padrão 8080 → 8091, webhook URL → `/api/whatsapp/instances/webhook`, auth middleware via `X-Bridge-Secret` header (health check é público)

### Verified
- `tsc --noEmit`: 0 errors
- `go build`: OK (whatsmeow-service.exe)
