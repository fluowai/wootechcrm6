# AI Business Operating System (AI-BOS) — Architecture v2

## 1. Visão

Transformar o WooTech CRM em um **Sistema Operacional de Negócios por IA** onde uma organização completa de agentes autônomos trabalha 24/7, usando Paperclip como infraestrutura invisível, enquanto toda UX, marca, inteligência e interação permanecem 100% WooTech CRM.

## 2. Princípios Fundamentais

1. **Paperclip é invisível** — Nunca exposto ao usuário final
2. **Não reinventar** — Usar nativos do Paperclip: org charts, memória, heartbeats, governança
3. **WooTech domina a experiência** — UI, marca, lógica de negócio, métricas
4. **Agentes são funcionários** — Missão, KPIs, autonomia total
5. **Execução contínua** — Agentes trabalham em heartbeats, não esperam comandos
6. **Autonomia total (Nível 3)** — Padrão para todos os agentes. Aprovação apenas para operações extremamente sensíveis (ex: escritório de advocacia)
7. **Múltiplos LLMs gratuitos** — Sistema de fallback automático entre provedores

## 3. Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                  WOOTECH CRM (Frontend)                      │
│  React 19 + Tailwind CSS 4                                  │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Command    │ │ AI Center  │ │ Agent    │ │ Executive │  │
│  │ Center     │ │            │ │ Monitor  │ │ Insights  │  │
│  └────────────┘ └────────────┘ └──────────┘ └───────────┘  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Onboarding: "Descreva sua empresa" → Agentes criados  │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                 AI GATEWAY (Express)                         │
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Agent API    │ │ LLM Router   │ │ Metrics Engine     │  │
│  │ Routes       │ │ (Fallback)   │ │ (Business KPIs)    │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐  │
│  │ Tool         │ │ Industry     │ │ Approval Gate      │  │
│  │ Registry     │ │ Agent Factory│ │ (sensitive ops)    │  │
│  └──────────────┘ └──────────────┘ └────────────────────┘  │
└───────┬──────────────────┬──────────────────┬───────────────┘
        │                  │                  │
┌───────▼──────┐ ┌────────▼────────┐ ┌──────▼──────────────┐
│ PAPERCLIP    │ │ LLM PROVIDERS   │ │ CRM TOOLS           │
│ RUNTIME      │ │ (Free Tier)     │ │                     │
│              │ │                  │ │ ┌──────┐ ┌────────┐ │
│ Org Charts   │ │ 1. Gemini 3.5   │ │ │CRM   │ │WhatsApp│ │
│ Memory       │ │ 2. Groq         │ │ └──────┘ └────────┘ │
│ Heartbeats   │ │ 3. OpenRouter   │ │ ┌──────┐ ┌────────┐ │
│ Governance   │ │ 4. Cerebras     │ │ │Email │ │Calendar│ │
│ Audit Logs   │ │ 5. NVIDIA NIM   │ │ └──────┘ └────────┘ │
│ Goals        │ │ 6. Mistral      │ │ ┌──────┐ ┌────────┐ │
│ Budgets      │ │ 7. DeepSeek     │ │ │Prosp.│ │Reports │ │
│              │ │ 8. HuggingFace  │ │ └──────┘ └────────┘ │
│              │ │ 9. Ollama (local)│ │ ┌──────────────┐   │
│              │ │ 10. Cohere      │ │ │Financial     │   │
│              │ │ 11. Cloudflare  │ │ └──────────────┘   │
│              │ │ 12. Puter.js    │ │                     │
└──────────────┘ └─────────────────┘ └─────────────────────┘
```

## 4. Sistema de LLM Multi-Provider com Fallback

### 4.1 Provedores Gratuitos Integrados

| # | Provedor | Modelos | Rate Limit (Free) | Cartão? | Melhor Para |
|---|---|---|---|---|---|
| 1 | **Google Gemini** | Gemini 3.5 Flash | 1,500 req/dia, 15 RPM | Não | Qualidade geral, multimodal, 1M context |
| 2 | **Groq** | Llama 3.3 70B, Mistral | 14,400 req/dia, 6K TPM | Não | Velocidade (700+ tok/s) |
| 3 | **OpenRouter** | 20+ modelos free | 200 req/dia (free) | Não | Variedade de modelos |
| 4 | **Cerebras** | gpt-oss-120b, Llama 3.1 8B | 14,400 req/dia | Não | Throughput alto |
| 5 | **NVIDIA NIM** | DeepSeek V4, GLM 5.2, Kimi | 40 RPM | Não | Modelos open-source premium |
| 6 | **Mistral** | Mistral Small/Large | 1B tokens/mês (Experiment) | Não | Multilíngue, function calling |
| 7 | **DeepSeek** | DeepSeek V4 Pro/Flash | Trial credits | Não | Código, raciocínio, custo baixo |
| 8 | **HuggingFace** | 100+ modelos | Free inference API | Não | Modelos open-source diversos |
| 9 | **Ollama (local)** | Llama, Mistral, Gemma | Sem limite | Não | Privacidade, sem limite de requests |
| 10 | **Cohere** | Command R+ | 1,000 req/mês | Não | RAG, embeddings, classificação |
| 11 | **Cloudflare Workers AI** | Modelos open | 10K neurons/dia | Não | Edge, baixa latência |
| 12 | **Puter.js** | 400+ modelos | Sem limite | Não | Fallback universal, zero setup |

### 4.2 Hierarquia de Fallback

```
Requisição do Agente
    │
    ▼
[Gemini 3.5 Flash] ──失败──▶ [Groq Llama 70B] ──失败──▶ [OpenRouter Free]
    │                              │                           │
    │ OK                           │ OK                        │ OK
    ▼                              ▼                           ▼
Resposta                      Resposta                    Resposta
    │                              │                           │
    └──────────────────────────────┴───────────────────────────┘
                               │
                          Se TODOS falharem:
                               │
                               ▼
                    [Ollama Local] (garantia)
```

**Regras de fallback:**
1. Tentar Gemini primeiro (melhor qualidade)
2. Se rate limit (429) → Groq (mais rápido)
3. Se Groq falhar → OpenRouter (variedade)
4. Se OpenRouter falhar → Cerebras
5. Se todos os cloud falharem → Ollama local (backup garantido)
6. **Nunca falhar** — sempre tem um próximo candidato

### 4.3 Configuração do LLM Router

```typescript
// src/lib/llm-router.ts
const LLM_PROVIDERS = [
  { name: 'gemini',    priority: 1, free: true,  model: 'gemini-3.5-flash' },
  { name: 'groq',      priority: 2, free: true,  model: 'llama-3.3-70b-versatile' },
  { name: 'openrouter', priority: 3, free: true,  model: 'auto' },
  { name: 'cerebras',  priority: 4, free: true,  model: 'gpt-oss-120b' },
  { name: 'nvidia_nim', priority: 5, free: true,  model: 'deepseek-v4-pro' },
  { name: 'mistral',   priority: 6, free: true,  model: 'mistral-small-latest' },
  { name: 'deepseek',  priority: 7, free: true,  model: 'deepseek-v4-flash' },
  { name: 'ollama',    priority: 10, free: true,  model: 'llama3.3:70b', local: true },
];
```

### 4.4 Sistema de Backup (Sobreaviso)

Cada provedor cloud tem:
- **Rate limit tracking** — Contador de requests por minuto/dia
- **Health check** — Ping a cada 5 minutos
- **Auto-recovery** — Quando rate limit reseta, provedor volta ao pool
- **Alertas** — WebSocket notifica quando provedor fica offline

O **Ollama local** é o seguro ultimate — sempre disponível, sem dependência de internet.

## 5. Onboarding: "Descreva sua Empresa → Agentes Criados"

### 5.1 Conceito

O usuário descreve sua empresa e o sistema cria automaticamente toda a organização de agentes:

```
┌─────────────────────────────────────────────────┐
│         ONBOARDING AI-BOS                        │
│                                                  │
│  "Conte-nos sobre sua empresa"                   │
│                                                  │
│  Ramo de atuação: [_____]                        │
│  Tamanho da equipe: [_____]                      │
│  Faturamento mensal: [_____]                     │
│  Principais produtos/serviços: [_____]           │
│  Canais de venda: [_____]                        │
│  Objetivo principal: [_____]                     │
│                                                  │
│  [Criar Minha Organização de Agentes]            │
└─────────────────────────────────────────────────┘
```

### 5.2 Mapeamento Ramo → Agentes

O sistema possui templates de organização por ramo:

| Ramo | Agentes Criados | Autonomia Padrão |
|---|---|---|
| **B2B SaaS** | CEO, CSO, SDR, Closer, CSM, CMO, Content, Data, Billing | Nível 3 |
| **E-commerce** | CEO, CSO, Closer, Inventory, Marketing, Content, Support, Finance | Nível 3 |
| **Serviços Profissionais** | CEO, CSO, Closer, Delivery, QA, Marketing, Finance | Nível 3 |
| **Advocacia** | CEO, CSO, Closer, Jurídico (Nível 0!), Finance, Marketing | **Nível 0 para jurídico** |
| **Saúde** | CEO, CSO, Patient Success, Marketing, Finance, Compliance | **Nível 0 para clínico** |
| **Educação** | CEO, CSO, Student Success, Content, Marketing, Finance | Nível 3 |
| **Indústria** | CEO, CSO, Production, Quality, Supply Chain, Finance, Sales | Nível 3 |
| **Imobiliário** | CEO, CSO, Closer, Listing, Marketing, Finance | Nível 3 |
| **Consultoria** | CEO, CSO, Closer, Consultant, Delivery, Finance, Marketing | Nível 3 |
| **Restaurantes** | CEO, CSO, Kitchen, Delivery, Marketing, Finance | Nível 3 |
| **Personalizado** | CEO + agentes que o usuário definir | Nível 3 |

### 5.3 Fluxo de Onboarding

```
1. Usuário descreve empresa (ramo, tamanho, objetivo)
    │
    ▼
2. Sistema seleciona template de organização
    │
    ▼
3. AI Gateway cria agentes no Paperclip
    │
    ▼
4. Cada agente recebe: nome, missão, KPIs, ferramentas, heartbeat
    │
    ▼
5. Agentes começam a trabalhar automaticamente
    │
    ▼
6. Usuário vê no Command Center: "Sua equipe de 12 agentes está ativa"
```

## 6. Organização de Agentes

### 6.1 Organograma Base (aplicável a qualquer ramo)

```
CEO (Supervisor Executivo)
│   Missão: Garantir crescimento sustentável
│
├── CSO (Supervisor Comercial)
│   ├── SDR Agent (Prospecção ativa)
│   │   Missão: Encontrar e qualificar leads
│   ├── Closer Agent (Negociação)
│   │   Missão: Fechar contratos
│   └── Customer Success Agent (Retenção)
│       Missão: Manter clientes satisfeitos
│
├── CMO (Supervisor de Marketing)
│   ├── Content Agent (Conteúdo)
│   │   Missão: Criar conteúdo que converte
│   └── Campaign Agent (Campanhas)
│       Missão: Gerenciar campanhas de aquisição
│
├── CTO (Supervisor Tecnológico)
│   ├── Data Agent (Análise de Dados)
│   │   Missão: Transformar dados em decisões
│   └── Ops Agent (Operações)
│       Missão: Manter sistemas rodando
│
├── CFO (Supervisor Financeiro)
│   ├── Billing Agent (Cobrança)
│   │   Missão: Garantir receita recorrente
│   └── Forecast Agent (Previsão)
│       Missão: Prever fluxo de caixa
│
└── COO (Supervisor Operacional)
    ├── Process Agent (Processos)
    │   Missão: Otimizar fluxos de trabalho
    └── Quality Agent (Qualidade)
        Missão: Manter padrões de qualidade
```

### 6.2 Agentes por Especialidade (mínimo 15 agentes)

| # | Agente | Ramo | Missão | Heartbeat | Autonomia |
|---|---|---|---|---|---|
| 1 | CEO | Geral | Crescimento sustentável | 30min | Nível 3 |
| 2 | CSO | Comercial | Receita e pipeline | 15min | Nível 3 |
| 3 | SDR | Prospecção | Encontrar leads qualificados | 10min | Nível 3 |
| 4 | Closer | Negociação | Fechar contratos | 15min | Nível 3 |
| 5 | CSM | Retenção | Manter clientes | 30min | Nível 3 |
| 6 | CMO | Marketing | Aquisição e marca | 30min | Nível 3 |
| 7 | Content | Conteúdo | Conteúdo que converte | 60min | Nível 3 |
| 8 | Campaign | Campanhas | ROI de ads | 30min | Nível 3 |
| 9 | CTO | Tecnologia | Infraestrutura | 60min | Nível 3 |
| 10 | Data | Dados | Analytics e BI | 30min | Nível 3 |
| 11 | Ops | Operações | Sistemas rodando | 15min | Nível 3 |
| 12 | CFO | Financeiro | Fluxo de caixa | 60min | Nível 3 |
| 13 | Billing | Cobrança | Receber pagamentos | 30min | Nível 3 |
| 14 | Forecast | Previsão | Prever resultados | 60min | Nível 3 |
| 15 | COO | Operações | Processos eficientes | 30min | Nível 3 |
| 16 | Process | Processos | Otimizar workflows | 60min | Nível 3 |
| 17 | Quality | Qualidade | Padrões e excelência | 60min | Nível 3 |
| 18 | Legal | Jurídico* | Compliance | 120min | **Nível 0** |
| 19 | Recruiter | RH | Atrair talentos | 120min | Nível 3 |
| 20 | Support | Suporte | Resolver problemas | 10min | Nível 3 |

*\*Nível 0 para agentes jurídicos/clínicos — requer aprovação humana*

### 6.3 Autonomia

**Nível 3 (Padrão para todos os agentes)**:
- Executa tudo dentro das regras
- Cria trabalho proativamente
- Sugere melhorias
- Resolve problemas
- Delega para outros agentes
- Não precisa de aprovação

**Nível 0 (Exceção — apenas para operações sensíveis)**:
- Advocacia: decisões jurídicas
- Saúde: prescrições clínicas
- Financeiro: transferências acima de R$ 50.000
- Qualquer coisa que gere risco legal/REGULATÓRIO

## 7. Database Schema (Novas Tabelas)

### 7.1 `ai_agents`

```sql
CREATE TABLE public.ai_agents (
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
```

### 7.2 `ai_goals`

```sql
CREATE TABLE public.ai_goals (
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
```

### 7.3 `ai_activities`

```sql
CREATE TABLE public.ai_activities (
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
```

### 7.4 `ai_suggestions`

```sql
CREATE TABLE public.ai_suggestions (
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
```

### 7.5 `ai_conversations` + `ai_conversation_messages`

```sql
CREATE TABLE public.ai_conversations (
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

CREATE TABLE public.ai_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 7.6 `ai_llm_usage` — Controle de uso de LLMs

```sql
CREATE TABLE public.ai_llm_usage (
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

CREATE INDEX idx_ai_llm_usage_provider ON public.ai_llm_usage(provider);
CREATE INDEX idx_ai_llm_usage_created_at ON public.ai_llm_usage(created_at DESC);
```

### 7.7 `ai_company_profile` — Perfil da empresa para onboarding

```sql
CREATE TABLE public.ai_company_profile (
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
```

## 8. Componentes Frontend

### 8.1 Nova Tab Sidebar: "AI Center"

```
AI Center
├── Command Center (overview de todos os agentes + metas)
├── Onboarding (descreva sua empresa)
├── Agents (lista + config de cada agente)
├── Goals (objetivos estratégicos)
├── Activity Feed (o que os agentes estão fazendo)
├── Suggestions (recomendações dos agentes)
├── Conversations (discussões entre agentes)
└── Insights (analytics dos agentes)
```

### 8.2 Componentes

| Componente | Caminho | Função |
|---|---|---|
| `AICenterView` | `src/components/aios/AICenterView.tsx` | Container principal |
| `CommandCenter` | `src/components/aios/CommandCenter.tsx` | Dashboard: status agentes, metas, atividade |
| `OnboardingView` | `src/components/aios/OnboardingView.tsx` | Formulário "Descreva sua empresa" |
| `AgentsView` | `src/components/aios/AgentsView.tsx` | Grid de cards de agentes |
| `AgentDetailModal` | `src/components/aios/AgentDetailModal.tsx` | Config detalhada do agente |
| `GoalsView` | `src/components/aios/GoalsView.tsx` | Metas estratégicas |
| `GoalDetailModal` | `src/components/aios/GoalDetailModal.tsx` | Detalhe + progresso da meta |
| `ActivityFeed` | `src/components/aios/ActivityFeed.tsx` | Stream de atividades |
| `SuggestionsPanel` | `src/components/aios/SuggestionsPanel.tsx` | Recomendações aceitar/recusar |
| `ConversationsView` | `src/components/aios/ConversationsView.tsx` | Discussões entre agentes |
| `InsightsView` | `src/components/aios/InsightsView.tsx` | Analytics e métricas |
| `LLMStatusPanel` | `src/components/aios/LLMStatusPanel.tsx` | Status dos provedores LLM |

## 9. API Routes (AI Gateway)

### 9.1 Onboarding
```
POST   /api/ai-os/onboarding          — Descrever empresa + criar agentes
GET    /api/ai-os/onboarding/status   — Status do onboarding
```

### 9.2 Agentes
```
GET    /api/ai-os/agents              — Listar agentes
GET    /api/ai-os/agents/:id          — Detalhe do agente
POST   /api/ai-os/agents              — Criar agente
PATCH  /api/ai-os/agents/:id          — Atualizar config
POST   /api/ai-os/agents/:id/pause    — Pausar
POST   /api/ai-os/agents/:id/resume   — Retomar
```

### 9.3 Metas
```
GET    /api/ai-os/goals               — Listar metas
POST   /api/ai-os/goals               — Criar meta
PATCH  /api/ai-os/goals/:id           — Atualizar
DELETE /api/ai-os/goals/:id           — Arquivar
```

### 9.4 Atividade & Sugestões
```
GET    /api/ai-os/activities          — Feed de atividades
GET    /api/ai-os/suggestions         — Sugestões
PATCH  /api/ai-os/suggestions/:id     — Aceitar/recusar
```

### 9.5 Conversas
```
GET    /api/ai-os/conversations       — Discussões entre agentes
GET    /api/ai-os/conversations/:id   — Mensagens
```

### 9.6 LLM Status
```
GET    /api/ai-os/llm/status          — Status de todos os provedores
GET    /api/ai-os/llm/usage           — Uso de tokens por provedor/agente
```

### 9.7 Tools (para agentes Paperclip chamarem)
```
POST   /api/ai-os/tools/crm/query        — Consultar CRM
POST   /api/ai-os/tools/crm/update       — Atualizar registro
POST   /api/ai-os/tools/whatsapp/send    — Enviar WhatsApp
POST   /api/ai-os/tools/email/send       — Enviar email
POST   /api/ai-os/tools/calendar/create  — Criar evento
POST   /api/ai-os/tools/prospecting/run  — Prospecção
POST   /api/ai-os/tools/enrichment/run   — Enriquecimento
GET    /api/ai-os/tools/metrics          — Métricas de negócio
POST   /api/ai-os/tools/report/generate  — Gerar relatório
```

### 9.8 WebSocket Events
```
aios:agent_activity    — Nova atividade
aios:suggestion        — Nova sugestão
aios:goal_progress     — Progresso de meta
aios:agent_status      — Status de agente
aios:llm_status        — Status de provedor LLM
aios:conversation      — Nova conversa entre agentes
```

## 10. Docker Compose

```yaml
# Adicionar ao docker-compose.yml
paperclip:
  image: paperclipai/paperclip:latest
  container_name: wootech_paperclip
  restart: always
  ports:
    - "4100:4100"
  environment:
    - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/crm_db
    - REDIS_URL=redis://redis:6379
    - PAPERCLIP_PORT=4100
    # LLM keys (todas gratuitas)
    - GEMINI_API_KEY=${GEMINI_API_KEY:-}
    - GROQ_API_KEY=${GROQ_API_KEY:-}
    - OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
    - NVIDIA_NIM_API_KEY=${NVIDIA_NIM_API_KEY:-}
    - MISTRAL_API_KEY=${MISTRAL_API_KEY:-}
    - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
    - COHERE_API_KEY=${COHERE_API_KEY:-}
    - OLLAMA_BASE_URL=http://ollama:11434
  depends_on:
    - postgres
    - redis
    - ollama
  networks:
    - crm_network

# Ollama local (backup garantido, sem limite)
ollama:
  image: ollama/ollama:latest
  container_name: wootech_ollama
  restart: always
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
  networks:
    - crm_network
```

## 11. Segurança

1. **Paperclip nunca exposto externamente** — Apenas rede interna Docker
2. **AI Gateway valida todas as chamadas** — Agentes só chamam ferramentas permitidas
3. **RLS nas novas tabelas** — Mesmo padrão de isolamento por user_id
4. **Orçamentos de tokens enforced server-side** — Agentes não podem exceder
5. **Audit trail imutável** — Todas as ações logadas em Paperclip e Supabase
6. **Sem secrets na memória** — Agentes nunca armazenam API keys
7. **Aprovação apenas para operações sensíveis** — Advocacia, saúde, transferências altas

## 12. Estratégia de Migração

- `AIAssistantView` existente → substituído por `AICenterView`
- Rota `/api/ai/generate` mantida para compatibilidade
- Novas rotas sob `/api/ai-os/*`
- Migration bancária é aditiva (novas tabelas apenas)
- Paperclip como novo container Docker
- Onboarding automático na primeira vez que o usuário acessa AI Center
