# Handoff — AI-BOS Project

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
- `src/components/aios/AICenterView.tsx` — Main container (7 tabs)
- `src/components/aios/OnboardingView.tsx` — Company setup wizard
- `src/components/aios/AgentForm.tsx` — Agent CRUD form
- `src/components/aios/GoalForm.tsx` — Goal CRUD form
- `src/components/aios/ActivityFeed.tsx` — Activity feed
- `src/components/aios/SuggestionsPanel.tsx` — Suggestions panel
- `src/components/aios/InsightsView.tsx` — Analytics dashboard

### Infrastructure
- `docker-compose.yml` — Paperclip + Hermes + Jarvis services (Ollama removed)
- `deploy/deploy-aios.sh` — Deploy script for Hermes + Jarvis (NEW)
- `.env.example` — Updated with Hermes/Jarvis env vars
- `server.ts` — Mounted hermes/jarvis routers, updated healthcheck

## Próximos Passos (Pós-Deploy)
1. Rodar migration SQL no Supabase
2. Configurar chaves de API dos LLMs no .env
3. Deploy com `./deploy/deploy-aios.sh`
4. Verificar Hermes dashboard em http://localhost:9119
5. Verificar Jarvis dashboard em http://localhost:8443
6. Testar fluxo completo de onboarding
7. Monitorar execution engine nos logs

## Decisões Chave
- 12 provedores LLM gratuitos integrados + Hermes (gateway mode)
- Hermes como fallback priority 9 (sempre disponível, sem rate limits)
- Jarvis com VNC, WhatsApp, RAG, Docker management
- Autonomia nível 3 como padrão
- Circuit breaker para falhas de provider
- WebSocket para updates em tempo real
- Token budget por agente com auto-pause
- Memory limits: 512MB por container Hermes/Jarvis
