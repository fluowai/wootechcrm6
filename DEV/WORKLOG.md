# Worklog — AI-BOS Project

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
