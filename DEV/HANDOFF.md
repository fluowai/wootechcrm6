# Handoff — AI-BOS Project

## WhatsApp Multi-Instance (Em Progresso)

### Fase 1: Database Schema ✅
- `DEV/SQL/wa-instances-schema.sql` — Migration executada com sucesso
- Tabelas: `whatsapp_instances`, `wa_instance_links`, `wa_messages`
- RLS, indexes, triggers todos configurados

### Fase 2: Go Service Multi-Instance ✅
- `whatsapp-service/main.go` — Reescrito com `Manager` + `Instance` structs
- Multi-instância: `map[string]*Instance` com SQLite por instância (`instances/{id}/store.db`)
- Auto-load: instâncias existentes são reconectadas ao iniciar
- Webhook com `instance_id` no payload
- Rotas legacy mantidas para backward compat (apontam para primeira instância)
- Dockerfile atualizado com `DATA_DIR=/app/instances`
- docker-compose: volume `whatsapp_data:/app/instances`, env `WEBHOOK_URL`
- Build verificado: `whatsmeow-service.exe` (30MB)

### Fase 3: API Layer Node.js ✅
- `src/routes/whatsapp-instances.ts` — Router factory com Socket.io
  - CRUD: GET/POST/PATCH/DELETE `/instances`
  - Connect/Disconnect/Reconnect: POST `/instances/:id/connect|disconnect|reconnect`
  - Send: POST `/instances/:id/send` (persiste outbound no Supabase)
  - Messages: GET `/instances/:id/messages` (histórico do Supabase)
  - Chats: GET `/instances/:id/chats` (distinct chats)
  - Validate: GET `/instances/:id/validate`
  - QR: GET `/instances/:id/qr`
  - Links CRUD: GET/POST/DELETE `/instances/:id/links`
  - Webhook: POST `/instances/webhook` (persiste inbound + Socket.io emit)
  - Reconnect-all: POST `/instances/reconnect-all`
- `server.ts` — Router montado em `/api/whatsapp/instances`
- `src/types/index.ts` — WhatsAppInstance, WhatsAppInstanceLink, WhatsAppInstanceMessage
- `src/lib/supabase.ts` — Database types para 3 novas tabelas

### Fase 4: Frontend Multi-Instance UI ✅
- `src/components/whatsapp/WhatsAppView.tsx` — View reescrita com 3 abas (Instâncias, Mensagens, Validador)
- `src/components/whatsapp/InstanceList.tsx` — CRUD de instâncias com auto-refresh, stats, create modal, reconnect all
- `src/components/whatsapp/InstanceCard.tsx` — Card visual com status colors, actions, phone number, last connected
- `src/components/whatsapp/QrCodeModal.tsx` — Modal QR com SVG rendering, polling (5s), timeout (2min), connected detection
- `src/components/whatsapp/LinkModal.tsx` — CRUD vínculos com 5 service types (AI Agent, Automação, Chatbot, Broadcast, Webhook)
- `src/lib/whatsapp-api.ts` — Cliente API com 15 funções type-safe
- `tsc --noEmit`: 0 errors

### Fase 5: MessagesView Refactor ✅
- `src/components/whatsapp/MessagesView.tsx` — Self-contained: carrega chats do Supabase, histórico com paginação, merge com Socket.io real-time, dedup, auto-scroll, busca
- `src/lib/whatsapp-api.ts` — Adicionado `getChats()` + `ChatSummary` type
- `src/components/whatsapp/WhatsAppView.tsx` — Simplificado (400→130 linhas), usa `<MessagesView />`
- `tsc --noEmit`: 0 errors

### Fase 6: ServiceLinks Improvements ✅
- `src/components/whatsapp/LinkModal.tsx` — Service Picker (dropdown com busca), Config per type (5 tipos com campos específicos), Validation (campos obrigatórios, URL, numérico), Config display em links existentes
- `src/lib/whatsapp-api.ts` — Adicionado `getAvailableAgents()`, `getAvailableAutomations()`, `ServiceOption` type
- `tsc --noEmit`: 0 errors

### Próximas Fases
- **Fase 4**: Frontend — Aba Conexões ✅
- **Fase 5**: Frontend — Aba Mensagens refactor ✅
- **Fase 6**: Frontend — Vínculos com serviços ✅
- **Todas as fases completas** ✅

---

## O Que Foi Feito (TODAS AS FASES COMPLETAS + Hermes/Jarvis Integration)

### Phase 1: Foundation ✅
- Paperclip Docker service
- LLM Router com 12 provedores gratuitos + Hermes (priority 9)
- AI Gateway (Paperclip HTTP client)
- API Routes `/api/ai-os/*`
- Frontend: AICenterView.tsx com 7 abas
- Sidebar: "AI Center" substitui "IA Comercial"

### Phase 2: Agent Organization ✅
- AgentForm.tsx (CRUD completo com autonomia 0-3)
- GoalForm.tsx (CRUD de metas estratégicas)
- ActivityFeed.tsx (Feed de atividades com filtros)
- Agent status management (active/paused/inactive)

### Phase 3: Tools & Execution ✅
- CRM Tool Endpoints (query, update, metrics)
- Communication Tools (WhatsApp via Whatsmeow)
- Intelligence Tools (Prospecting, Enrichment, AI generation)
- Execution Engine (Heartbeat, Goal evaluation, Task delegation)

### Phase 4: Intelligence ✅
- SuggestionsPanel.tsx (Painel de sugestões com categorias)
- InsightsView.tsx (Métricas e analytics)
- Agent-to-Agent Conversations (Comunicação entre agentes)
- Autonomy Enforcement (Levels 0-3 com circuit breaker)

### Phase 5: Polish & Production ✅
- WebSocket Events (Tempo real para todas as atualizações)
- Token Budget Management (Controle por agente)
- Error Handling (Graceful degradation, circuit breaker)
- Health Check system (Supabase, Paperclip, Hermes, Jarvis)

### Phase 6: Hermes + Jarvis Integration ✅
- Hermes Agent: Self-hosted LLM gateway (OpenRouter backend, zero local inference)
- Jarvis: Python/FastAPI AI assistant (VNC, WhatsApp, RAG, Docker)
- Hermes Bridge: `src/lib/hermes-bridge.ts` — Chat, Skills, Tasks, Models
- Jarvis Bridge: `src/lib/jarvis-bridge.ts` — Commands, Delegate, WhatsApp, RAG, Docker
- LLM Router: Ollama removed, Hermes added (priority 9, gateway mode)
- API Routes: `/api/ai-os/hermes/*` and `/api/ai-os/jarvis/*`
- Deploy Script: `deploy/deploy-aios.sh` — Portainer/SSH deployment

## Arquivos Criados/Atualizados

### Backend
- `src/lib/llm-router.ts` — Multi-provider LLM fallback (12 providers, Hermes priority 9)
- `src/lib/ai-gateway.ts` — Paperclip + Hermes + Jarvis integration
- `src/lib/hermes-bridge.ts` — Hermes Agent HTTP client (NEW)
- `src/lib/jarvis-bridge.ts` — Jarvis AI HTTP client (NEW)
- `src/lib/execution-engine.ts` — Heartbeat, goals, delegation
- `src/lib/agent-conversations.ts` — Agent-to-agent communication
- `src/lib/autonomy-enforcement.ts` — Level checks (0-3)
- `src/lib/token-budget.ts` — Budget management
- `src/lib/websocket-events.ts` — Real-time events
- `src/lib/error-handling.ts` — Graceful degradation
- `src/routes/ai-os.ts` — Main AIOS routes
- `src/routes/aios-tools.ts` — CRM/Comm/Intel tools
- `src/routes/hermes.ts` — Hermes Agent routes (NEW)
- `src/routes/jarvis.ts` — Jarvis AI routes (NEW)

### Frontend
- `src/components/whatsapp/WhatsAppView.tsx` — View reescrita com 3 abas (Instâncias, Mensagens, Validador)
- `src/components/whatsapp/InstanceList.tsx` — CRUD de instâncias com auto-refresh
- `src/components/whatsapp/InstanceCard.tsx` — Card visual com status e actions
- `src/components/whatsapp/QrCodeModal.tsx` — Modal QR com polling e SVG
- `src/components/whatsapp/MessagesView.tsx` — Chat UI com histórico Supabase + Socket.io real-time
- `src/components/whatsapp/LinkModal.tsx` — CRUD vínculos com Service Picker, config per type, validation
- `src/lib/whatsapp-api.ts` — Cliente API reutilizável (18 funções + ServiceOption type)
- `src/components/aios/AICenterView.tsx` — Main container (7 tabs)
- `src/components/aios/OnboardingView.tsx` — Company setup wizard
- `src/components/aios/AgentForm.tsx` — Agent CRUD form
- `src/components/aios/GoalForm.tsx` — Goal CRUD form
- `src/components/aios/ActivityFeed.tsx` — Activity feed
- `src/components/aios/SuggestionsPanel.tsx` — Suggestions panel
- `src/components/aios/InsightsView.tsx` — Analytics dashboard

### Infrastructure
- `docker-compose.yml` — Reescrito para alinhar com produção Docker Swarm
  - Rede: `wootech1` (external/Traefik) + `wootechcrm6_internal` (overlay)
  - Serviços: app, cache-redis, whatsapp-bridge (8091), browserless, unstructured, cnpj-service, colly-service, paperclip, hermes, jarvis
  - Removidos: postgres (Supabase cloud), firecrawl (API cloud), google-maps-scraper
  - Deploy config: replicas, update/rollback, placement constraints
- `deploy/deploy-aios.sh` — Deploy script for Hermes + Jarvis (NEW)
- `.env.example` — Updated with Hermes/Jarvis env vars
- `server.ts` — Mounted hermes/jarvis routers, updated healthcheck

## Próximos Passos (Pós-Deploy)
1. ~~Rodar migration SQL no Supabase~~ ✅ (AIOS + WA multi-instance)
2. Configurar chaves de API dos LLMs no .env
3. Deploy com `./deploy/deploy-aios.sh`
4. Verificar Hermes dashboard em http://localhost:9119
5. Verificar Jarvis dashboard em http://localhost:8443
6. Testar fluxo completo de onboarding
7. Monitorar execution engine nos logs
8. ~~WhatsApp Fase 2: Refatorar Go service multi-instance~~ ✅

## Decisões Chave
- 12 provedores LLM gratuitos integrados + Hermes (gateway mode)
- Hermes como fallback priority 9 (sempre disponível, sem rate limits)
- Jarvis com VNC, WhatsApp, RAG, Docker management
- Autonomia nível 3 como padrão
- Circuit breaker para falhas de provider
- WebSocket para updates em tempo real
- Token budget por agente com auto-pause
- Memory limits: 512MB por container Hermes/Jarvis
- **WhatsApp Bridge**: porta 8091, auth via `X-Bridge-Secret` header
- **Firecrawl**: usa API cloud, não self-hosted
