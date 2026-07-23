# Worklog — AI-BOS Project

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
