# Handoff — AI-BOS Project

## O Que Foi Feito
- Análise completa do WooTech CRM (32 componentes, 12 rotas API, 8 tabelas DB)
- Pesquisa Paperclip + 12 provedores de LLM gratuitos
- Arquitetura AIOS v2 com multi-LLM fallback
- Migration SQL com 8 tabelas (7 principais + 1 de uso LLM)
- Plano de implementação em 5 fases (10 semanas, 60+ tarefas)
- Sistema de onboarding "Descreva sua empresa"
- 20 agentes definidos com missões e heartbeats
- Autonomia total (nível 3) como padrão
- **Phase 1 completa:**
  - Paperclip + Ollama adicionados ao docker-compose.yml
  - LLM Router com fallback multi-provider (12 provedores)
  - AI Gateway (client HTTP para Paperclip)
  - API Routes `/api/ai-os/*` (agents, goals, activities, suggestions, conversations, generate)
  - Frontend: AICenterView.tsx com abas (Overview, Agents, Goals, Activities, Suggestions, Conversations)
  - Sidebar atualizado: "IA Comercial" → "AI Center"
  - App.tsx roteado para AICenterView

## Próximos Passos
1. **Database Migration** — Rodar `DEV/SQL/aios-schema.sql` no Supabase
2. **Onboarding UI** — Componente "Descreva sua empresa"
3. **Agent CRUD** — Forms para criar/editar agentes
4. **Goal CRUD** — Forms para criar/editar metas
5. **WebSocket Updates** — Status em tempo real dos agentes

## Decisões Chave
- 12 provedores LLM gratuitos integrados (Gemini, Groq, OpenRouter, Cerebras, NVIDIA NIM, Mistral, DeepSeek, HuggingFace, Ollama, Cohere, Cloudflare, Puter.js)
- Ollama local como seguro ultimate (sem limite de requests)
- Autonomia nível 3 para todos (exceto advocacia/saúde = nível 0)
- Onboarding automático por ramo de atuação
- Paperclip na porta 4100 (interno apenas)
- Sidebar: "AI Center" substitui "IA Comercial"

## Riscos
- Paperclip jovem (v2026.707.0) — API pode mudar
- Tokens podem escalar com muitos agentes em heartbeats
- LLMs gratuitos têm rate limits — fallback resolve mas adiciona latência
- Ollama local requer hardware (mínimo 8GB RAM para Llama 70B)
