/**
 * AIOS Routes — Express Router for /api/ai-os/*
 *
 * Direct Supabase backend (Paperclip bypass for local dev).
 * Maps camelCase (frontend) ↔ snake_case (DB) automatically.
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { generateCompletion, getAvailableProviders, getProviderStats } from '../lib/llm-router';

const router = Router();

const DEFAULT_USER = '00000000-0000-0000-0000-000000000000';

// ─── Mappers: camelCase ↔ snake_case ────────────────────────────

function agentToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    mission: row.mission,
    autonomyLevel: row.autonomy_level,
    heartbeatIntervalMinutes: row.heartbeat_interval_minutes,
    llmProviderPreference: row.llm_provider_preference,
    monthlyTokenBudget: row.monthly_token_budget,
    tokensUsedThisMonth: row.tokens_used_this_month,
    kpis: row.kpis || [],
    permissions: row.permissions || [],
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function goalToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetValue: row.target_value,
    currentValue: row.current_value,
    unit: row.unit,
    priority: row.priority,
    status: row.status,
    assignedAgentId: row.assigned_agent_id,
    deadline: row.deadline,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function activityToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    actionType: row.action_type,
    title: row.title,
    description: row.description,
    status: row.status,
    llmProvider: row.llm_provider,
    tokensUsed: row.tokens_used,
    createdAt: row.created_at,
  };
}

function suggestionToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    category: row.category,
    title: row.title,
    description: row.description,
    impactEstimate: row.impact_estimate,
    data: row.data,
    status: row.status,
    createdAt: row.created_at,
  };
}

function agentToSnake(body: any) {
  const row: any = {
    user_id: DEFAULT_USER,
    paperclip_agent_id: body.id || body.paperclipAgentId || `local-${Date.now()}`,
    name: body.name,
    role: body.role,
    department: body.department,
    mission: body.mission || '',
    autonomy_level: body.autonomyLevel ?? 3,
    heartbeat_interval_minutes: body.heartbeatIntervalMinutes ?? 30,
    llm_provider_preference: body.llmProviderPreference || 'gemini',
    monthly_token_budget: body.monthlyTokenBudget ?? 100000,
    tokens_used_this_month: body.tokensUsedThisMonth ?? 0,
    kpis: body.kpis || [],
    permissions: body.permissions || [],
    status: body.status || 'active',
  };
  if (body.id) row.id = body.id;
  return row;
}

function goalToSnake(body: any) {
  const row: any = {
    user_id: DEFAULT_USER,
    title: body.title,
    description: body.description || '',
    category: body.category || 'efficiency',
    target_value: body.targetValue ?? 100,
    current_value: body.currentValue ?? 0,
    unit: body.unit || '',
    priority: body.priority || 'medium',
    status: body.status || 'active',
    assigned_agent_id: body.assignedAgentId || null,
    deadline: body.deadline || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  };
  if (body.id) row.id = body.id;
  return row;
}

// ─── Health & Status ─────────────────────────────────────────────

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const providers = getAvailableProviders();
    res.json({
      status: 'ok',
      paperclip: 'bypassed (direct supabase)',
      providers: providers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.get('/providers', (_req: Request, res: Response) => {
  res.json({ providers: getProviderStats() });
});

// ─── Agents CRUD ─────────────────────────────────────────────────

router.get('/agents', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ agents: (data || []).map(agentToCamel) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch agents' });
  }
});

router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    res.json({ agent: agentToCamel(data) });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Agent not found' });
  }
});

router.post('/agents', async (req: Request, res: Response) => {
  try {
    const row = agentToSnake(req.body);
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ agent: agentToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid agent data' });
  }
});

router.patch('/agents/:id', async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (req.body.name !== undefined) update.name = req.body.name;
    if (req.body.role !== undefined) update.role = req.body.role;
    if (req.body.department !== undefined) update.department = req.body.department;
    if (req.body.mission !== undefined) update.mission = req.body.mission;
    if (req.body.autonomyLevel !== undefined) update.autonomy_level = req.body.autonomyLevel;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.monthlyTokenBudget !== undefined) update.monthly_token_budget = req.body.monthlyTokenBudget;
    if (req.body.kpis !== undefined) update.kpis = req.body.kpis;
    if (req.body.permissions !== undefined) update.permissions = req.body.permissions;

    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ agent: agentToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update agent' });
  }
});

router.delete('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('ai_agents').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete agent' });
  }
});

router.post('/agents/:id/pause', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .update({ status: 'paused' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ agent: agentToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to pause agent' });
  }
});

router.post('/agents/:id/resume', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_agents')
      .update({ status: 'active' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ agent: agentToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to resume agent' });
  }
});

// ─── Goals CRUD ──────────────────────────────────────────────────

router.get('/goals', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ goals: (data || []).map(goalToCamel) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch goals' });
  }
});

router.get('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_goals')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ goal: goalToCamel(data) });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Goal not found' });
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  try {
    const row = goalToSnake(req.body);
    const { data, error } = await supabaseAdmin
      .from('ai_goals')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ goal: goalToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid goal data' });
  }
});

router.patch('/goals/:id', async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (req.body.title !== undefined) update.title = req.body.title;
    if (req.body.description !== undefined) update.description = req.body.description;
    if (req.body.category !== undefined) update.category = req.body.category;
    if (req.body.targetValue !== undefined) update.target_value = req.body.targetValue;
    if (req.body.currentValue !== undefined) update.current_value = req.body.currentValue;
    if (req.body.unit !== undefined) update.unit = req.body.unit;
    if (req.body.priority !== undefined) update.priority = req.body.priority;
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.assignedAgentId !== undefined) update.assigned_agent_id = req.body.assignedAgentId;
    if (req.body.deadline !== undefined) update.deadline = req.body.deadline;

    const { data, error } = await supabaseAdmin
      .from('ai_goals')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ goal: goalToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update goal' });
  }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin.from('ai_goals').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete goal' });
  }
});

// ─── Activities ──────────────────────────────────────────────────

router.get('/activities', async (req: Request, res: Response) => {
  try {
    const { agent_id, action_type, limit: limitStr } = req.query;
    let query = supabaseAdmin
      .from('ai_activities')
      .select('*')
      .order('created_at', { ascending: false });

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (action_type) query = query.eq('action_type', action_type as string);

    const limit = limitStr ? parseInt(limitStr as string) : 50;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ activities: (data || []).map(activityToCamel) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch activities' });
  }
});

// ─── Suggestions ─────────────────────────────────────────────────

router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { agent_id, status, limit: limitStr } = req.query;
    let query = supabaseAdmin
      .from('ai_suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (status) query = query.eq('status', status as string);

    const limit = limitStr ? parseInt(limitStr as string) : 50;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ suggestions: (data || []).map(suggestionToCamel) });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch suggestions' });
  }
});

router.patch('/suggestions/:id', async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (req.body.status !== undefined) update.status = req.body.status;
    if (req.body.data !== undefined) update.data = req.body.data;

    const { data, error } = await supabaseAdmin
      .from('ai_suggestions')
      .update(update)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ suggestion: suggestionToCamel(data) });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update suggestion' });
  }
});

// ─── Conversations ──────────────────────────────────────────────

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { agent_id, status, limit: limitStr } = req.query;
    let query = supabaseAdmin
      .from('ai_conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (agent_id) query = query.eq('agent_id', agent_id as string);
    if (status) query = query.eq('status', status as string);

    const limit = limitStr ? parseInt(limitStr as string) : 50;
    query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ conversations: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { data: conv, error: convErr } = await supabaseAdmin
      .from('ai_conversations')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (convErr) throw convErr;

    const { data: messages, error: msgErr } = await supabaseAdmin
      .from('ai_conversation_messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });
    if (msgErr) throw msgErr;

    res.json({ conversation: conv, messages: messages || [] });
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : 'Conversation not found' });
  }
});

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('ai_conversation_messages')
      .insert({
        conversation_id: req.params.id,
        role: 'user',
        content,
        agent_name: 'User',
      });

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to send message' });
  }
});

// ─── Profile ─────────────────────────────────────────────────────

router.get('/profile', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_company_profile')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'No company profile found' });
      return;
    }
    res.json({ profile: data });
  } catch (error) {
    res.status(404).json({ error: 'No company profile found' });
  }
});

router.post('/profile', async (req: Request, res: Response) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('ai_company_profile')
      .select('id')
      .limit(1)
      .single();

    const profileData = {
      industry: req.body.industry || req.body.ramo || 'outro',
      company_size: req.body.companySize || req.body.tamanho || '',
      monthly_revenue: req.body.monthlyRevenue ? parseFloat(req.body.monthlyRevenue) : null,
      products_services: req.body.productsServices || req.body.produtosServicos || '',
      sales_channels: req.body.salesChannels || req.body.canaisVenda || [],
      primary_goal: req.body.primaryGoal || req.body.objetivoPrincipal || '',
      user_id: DEFAULT_USER,
    };

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from('ai_company_profile')
        .update(profileData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabaseAdmin
        .from('ai_company_profile')
        .insert(profileData)
        .select()
        .single();
    }

    if (result.error) throw result.error;
    res.json({ profile: result.data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save profile' });
  }
});

// ─── LLM Generation ─────────────────────────────────────────────

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { messages, model, temperature, maxTokens } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const response = await generateCompletion({ messages, model, temperature, maxTokens });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'LLM generation failed' });
  }
});

// ─── CRM Event Bridge ───────────────────────────────────────────

router.post('/events/crm', async (req: Request, res: Response) => {
  try {
    const { type, entityId, data: eventData } = req.body;

    const { error } = await supabaseAdmin
      .from('ai_activities')
      .insert({
        user_id: DEFAULT_USER,
        agent_id: null,
        agent_name: 'CRM',
        action_type: 'execution',
        title: `CRM event: ${type}`,
        description: `${type} on ${entityId}`,
        metadata: { entityId, ...eventData },
        status: 'completed',
      });

    if (error) throw error;
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to notify CRM event' });
  }
});

router.get('/metrics/crm', async (_req: Request, res: Response) => {
  try {
    const [companies, deals] = await Promise.all([
      supabaseAdmin.from('companies').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('deals').select('id, value', { count: 'exact' }),
    ]);

    const totalLeads = companies.count || 0;
    const totalDeals = deals.count || 0;
    const pipelineValue = (deals.data || []).reduce((sum: number, d: any) => sum + (d.value || 0), 0);

    res.json({ totalLeads, totalDeals, pipelineValue, conversionRate: 0 });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch CRM metrics' });
  }
});

// ─── AI Chat ────────────────────────────────────────────────────

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, conversationId } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get company profile for context
    const { data: profile } = await supabaseAdmin
      .from('ai_company_profile')
      .select('*')
      .limit(1)
      .single();

    // Get existing agents for context
    const { data: existingAgents } = await supabaseAdmin
      .from('ai_agents')
      .select('name, role, department, mission, status');

    const agentsContext = existingAgents && existingAgents.length > 0
      ? existingAgents.map((a: any) => `- ${a.name} (${a.role}) [${a.status}]`).join('\n')
      : 'Nenhum agente criado ainda.';

    const systemPrompt = `Você é o CEO AI do WooTech CRM. Seu nome é WOO.

CONTEXTO DA EMPRESA:
${profile ? `- Ramo: ${profile.industry}
- Tamanho: ${profile.company_size}
- Receita: R$ ${profile.monthly_revenue || 'não informado'}
- Produtos: ${profile.products_services}
- Canais: ${(profile.sales_channels || []).join(', ')}
- Objetivo: ${profile.primary_goal}` : 'Empresa não configurada.'}

AGENTES EXISTENTES:
${agentsContext}

REGRAS:
- Responda em português brasileiro, direto e prático.
- Quando o usuário pedir para CRIAR AGENTES, responda com o JSON exato abaixo entre crases triplos:
\`\`\`CREATE_AGENTS
[{"name":"NOME","role":"CARGO","department":"departamento","mission":"missão detalhada","kpis":["kpi1"],"permissions":["perm1"]}]
\`\`\`
- Quando o usuário pedir para CRIAR METAS, responda com:
\`\`\`CREATE_GOALS
[{"title":"Título","description":"Descrição","category":"revenue|growth|retention|efficiency|custom","targetValue":100,"unit":"unidade","priority":"high"}]
\`\`\`
- Sempre confirme o que foi criado depois de executar.
- Departments válidos: executivo, vendas, marketing, cs, financeiro, operacoes, juridico, ti, rh
- Categories válidos: revenue, growth, retention, efficiency, custom
- Priorities válidos: low, medium, high, critical
- Quando o usuário pedir para EXECUTAR UMA AÇÃO OU META (ex: "faturar 45k", "prospectar 10 leads"), você como CTO DEVE DELEGAR TAREFAS para os agentes competentes (Vendas, Marketing, etc) usando o formato:
\`\`\`DELEGATE_TASKS
[{"agentRole":"vendas","task":"prospectar 10 leads de tecnologia","priority":"high"}]
\`\`\`
- Você NÃO precisa enviar o JSON se o usuário não pedir criação ou delegação.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    const response = await generateCompletion({
      messages,
      temperature: 0.7,
      maxTokens: 2048,
    });

    let cleanResponse = response.content;
    const executedActions: any[] = [];

    // ─── Parse & Execute CREATE_AGENTS ──────────────────────────
    const agentsMatch = response.content.match(/```CREATE_AGENTS\s*\n([\s\S]*?)\n```/);
    if (agentsMatch) {
      try {
        const agentsList = JSON.parse(agentsMatch[1]);
        const created = [];
        for (const agent of agentsList) {
          const row = agentToSnake({
            name: agent.name,
            role: agent.role,
            department: agent.department || 'executivo',
            mission: agent.mission || '',
            autonomyLevel: 3,
            heartbeatIntervalMinutes: 30,
            llmProviderPreference: response.provider,
            monthlyTokenBudget: 100000,
            kpis: agent.kpis || [],
            permissions: agent.permissions || [],
            status: 'active',
          });
          const { data, error } = await supabaseAdmin
            .from('ai_agents')
            .insert(row)
            .select()
            .single();
          if (!error && data) created.push(agentToCamel(data));
        }
        if (created.length > 0) {
          executedActions.push({ type: 'create_agents', count: created.length });
          // Remove the code block from the visible response
          cleanResponse = cleanResponse.replace(/```CREATE_AGENTS\s*\n[\s\S]*?\n```/g, '').trim();
          cleanResponse += `\n\n✅ ${created.length} agente(s) criado(s): ${created.map(a => a.name).join(', ')}`;
        }
      } catch (e) {
        console.error('[Chat] Failed to parse CREATE_AGENTS:', e);
      }
    }

    // ─── Parse & Execute CREATE_GOALS ──────────────────────────
    const goalsMatch = response.content.match(/```CREATE_GOALS\s*\n([\s\S]*?)\n```/);
    if (goalsMatch) {
      try {
        const goalsList = JSON.parse(goalsMatch[1]);
        const created = [];
        for (const goal of goalsList) {
          const row = goalToSnake({
            title: goal.title,
            description: goal.description || '',
            category: goal.category || 'efficiency',
            targetValue: goal.targetValue ?? 100,
            currentValue: 0,
            unit: goal.unit || '',
            priority: goal.priority || 'medium',
            status: 'active',
            deadline: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          });
          const { data, error } = await supabaseAdmin
            .from('ai_goals')
            .insert(row)
            .select()
            .single();
          if (!error && data) created.push(goalToCamel(data));
        }
        if (created.length > 0) {
          executedActions.push({ type: 'create_goals', count: created.length });
          cleanResponse = cleanResponse.replace(/```CREATE_GOALS\s*\n[\s\S]*?\n```/g, '').trim();
          cleanResponse += `\n\n✅ ${created.length} meta(s) criada(s): ${created.map(g => g.title).join(', ')}`;
        }
      } catch (e) {
        console.error('[Chat] Failed to parse CREATE_GOALS:', e);
      }
    }

    // ─── Save conversation to DB ──────────────────────────────
    let convId = conversationId as string | undefined;

    if (convId) {
      // Verify the conversation exists
      const { data: existing } = await supabaseAdmin
        .from('ai_conversations')
        .select('id')
        .eq('id', convId)
        .single();
      if (!existing) convId = undefined;
    }

    if (!convId) {
      // Create new conversation
      const { data: conv } = await supabaseAdmin
        .from('ai_conversations')
        .insert({
          user_id: DEFAULT_USER,
          topic: message.substring(0, 100),
          participants: ['user', 'woo-ai'],
          status: 'active',
        })
        .select('id')
        .single();
      convId = conv?.id;
    }

    if (convId) {
      await supabaseAdmin.from('ai_conversation_messages').insert([
        { conversation_id: convId, role: 'user', content: message, agent_name: 'User' },
        { conversation_id: convId, role: 'assistant', content: cleanResponse, agent_name: 'CTO' },
      ]);
    }

    // ─── Parse & Execute DELEGATE_TASKS ──────────────────────────
    const tasksMatch = response.content.match(/```DELEGATE_TASKS\s*\n([\s\S]*?)\n```/);
    if (tasksMatch) {
      try {
        const tasksList = JSON.parse(tasksMatch[1]);
        let delegatedCount = 0;
        
        // Find the CTO agent
        const { data: cto } = await supabaseAdmin.from('ai_agents').select('id, name').eq('role', 'CTO').eq('status', 'active').single();

        for (const task of tasksList) {
          // Find target agent by role
          const { data: targetAgent } = await supabaseAdmin.from('ai_agents')
            .select('id, name')
            .ilike('role', `%${task.agentRole}%`)
            .eq('status', 'active')
            .limit(1)
            .single();

          if (targetAgent && cto) {
            await supabaseAdmin.from('ai_activities').insert({
              user_id: DEFAULT_USER,
              agent_id: targetAgent.id,
              agent_name: targetAgent.name,
              action_type: 'execution',
              title: `Tarefa recebida do CTO: ${task.task.substring(0, 50)}`,
              description: `Delegação gerada no chat.`,
              metadata: { 
                task: task.task, 
                priority: task.priority || 'medium',
                sourceAgentId: cto.id,
                conversation_id: convId // <-- Injecting conversation ID for group chat
              },
              status: 'pending',
            });
            delegatedCount++;
          }
        }
        
        if (delegatedCount > 0) {
          executedActions.push({ type: 'delegate_tasks', count: delegatedCount });
          cleanResponse = cleanResponse.replace(/```DELEGATE_TASKS\s*\n[\s\S]*?\n```/g, '').trim();
          cleanResponse += `\n\n✅ ${delegatedCount} tarefa(s) delegada(s) com sucesso para a equipe.`;
        }
      } catch (e) {
        console.error('[Chat] Failed to parse DELEGATE_TASKS:', e);
      }
    }

    // Log activity
    await supabaseAdmin.from('ai_activities').insert({
      user_id: DEFAULT_USER,
      agent_id: null,
      agent_name: 'CTO',
      action_type: 'execution',
      title: `Chat: ${message.substring(0, 80)}`,
      description: cleanResponse.substring(0, 200),
      metadata: { executedActions, provider: response.provider },
      status: 'completed',
      llm_provider: response.provider,
      tokens_used: response.tokens.total,
    });

    res.json({
      response: cleanResponse,
      actions: executedActions,
      provider: response.provider,
      model: response.model,
      tokens: response.tokens,
      latencyMs: response.latencyMs,
      conversationId: convId,
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Chat failed' });
  }
});

// ─── LLM Providers (Settings) ───────────────────────────────────

// Simple XOR cipher for key obfuscation (not production-grade encryption)
function encryptKey(key: string): string {
  const mask = 'wootech-aios-xor';
  let result = '';
  for (let i = 0; i < key.length; i++) {
    result += String.fromCharCode(key.charCodeAt(i) ^ mask.charCodeAt(i % mask.length));
  }
  return Buffer.from(result, 'binary').toString('base64');
}

function decryptKey(encrypted: string): string {
  const mask = 'wootech-aios-xor';
  const decoded = Buffer.from(encrypted, 'base64').toString('binary');
  let result = '';
  for (let i = 0; i < decoded.length; i++) {
    result += String.fromCharCode(decoded.charCodeAt(i) ^ mask.charCodeAt(i % mask.length));
  }
  return result;
}

router.get('/llm-providers', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_llm_providers')
      .select('id, provider, priority, enabled, rate_limit_per_minute, tokens_used_today, tokens_used_month, last_used_at, last_error, models')
      .order('priority', { ascending: true });

    if (error) throw error;
    res.json({ providers: data || [] });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch providers' });
  }
});

router.post('/llm-providers', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, models, priority, enabled, rateLimitPerMinute } = req.body;

    if (!provider || !apiKey) {
      res.status(400).json({ error: 'provider and apiKey are required' });
      return;
    }

    // Check if provider already exists for this user
    const { data: existing } = await supabaseAdmin
      .from('ai_llm_providers')
      .select('id')
      .eq('provider', provider)
      .eq('user_id', DEFAULT_USER)
      .single();

    const encrypted = encryptKey(apiKey);

    let result;
    if (existing) {
      result = await supabaseAdmin
        .from('ai_llm_providers')
        .update({
          api_key_encrypted: encrypted,
          models: models || [],
          priority: priority ?? 0,
          enabled: enabled ?? true,
          rate_limit_per_minute: rateLimitPerMinute ?? 30,
        })
        .eq('id', existing.id)
        .select('id, provider, priority, enabled')
        .single();
    } else {
      result = await supabaseAdmin
        .from('ai_llm_providers')
        .insert({
          user_id: DEFAULT_USER,
          provider,
          api_key_encrypted: encrypted,
          models: models || [],
          priority: priority ?? 0,
          enabled: enabled ?? true,
          rate_limit_per_minute: rateLimitPerMinute ?? 30,
        })
        .select('id, provider, priority, enabled')
        .single();
    }

    if (result.error) throw result.error;

    // Also set the env var for immediate use
    const envMap: Record<string, string> = {
      gemini: 'GEMINI_API_KEY',
      groq: 'GROQ_API_KEY',
      openrouter: 'OPENROUTER_API_KEY',
      cerebras: 'CEREBRAS_API_KEY',
      'nvidia-nim': 'NVIDIA_NIM_API_KEY',
      mistral: 'MISTRAL_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      huggingface: 'HUGGINGFACE_API_KEY',
      cohere: 'COHERE_API_KEY',
      cloudflare: 'CLOUDFLARE_API_KEY',
      puter: 'PUTER_API_KEY',
    };
    if (envMap[provider]) {
      process.env[envMap[provider]] = apiKey;
    }

    res.status(201).json({ provider: result.data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save provider' });
  }
});

router.delete('/llm-providers/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAdmin
      .from('ai_llm_providers')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to delete provider' });
  }
});

router.patch('/llm-providers/:id', async (req: Request, res: Response) => {
  try {
    const update: any = {};
    if (req.body.enabled !== undefined) update.enabled = req.body.enabled;
    if (req.body.priority !== undefined) update.priority = req.body.priority;
    if (req.body.rateLimitPerMinute !== undefined) update.rate_limit_per_minute = req.body.rateLimitPerMinute;

    const { data, error } = await supabaseAdmin
      .from('ai_llm_providers')
      .update(update)
      .eq('id', req.params.id)
      .select('id, provider, priority, enabled')
      .single();

    if (error) throw error;
    res.json({ provider: data });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to update provider' });
  }
});

// ─── Generate Agents from LLM ───────────────────────────────────

router.post('/generate-agents', async (req: Request, res: Response) => {
  try {
    const { profile } = req.body;
    if (!profile) {
      res.status(400).json({ error: 'Profile is required' });
      return;
    }

    const systemPrompt = `Você é um especialista em criar organogramas de agentes de IA para empresas.
Baseado no perfil da empresa abaixo, crie uma lista de agentes de IA necessários.

Retorne APENAS um JSON válido (sem markdown, sem código) com um array de agentes:
[
  {
    "name": "Nome do Agente",
    "role": "Cargo/Função",
    "department": "departamento (executivo|vendas|marketing|cs|financeiro|operacoes|juridico|ti|rh)",
    "mission": "Missão específica e detalhada deste agente em 2-3 frases",
    "autonomyLevel": 3,
    "kpis": ["kpi1", "kpi2"],
    "permissions": ["permissao1"]
  }
]

Crie entre 8 e 15 agentes cobrindo todas as áreas essenciais da empresa.
Todos devem ter autonomia level 3 (máxima).
KPIs devem ser mensuráveis.
Permissões devem ser relevantes para a função.`;

    const userPrompt = `Perfil da Empresa:
- Ramo/Indústria: ${profile.industry || profile.ramo || 'Não informado'}
- Tamanho: ${profile.companySize || profile.tamanho || 'Não informado'}
- Receita Mensal: ${profile.monthlyRevenue || profile.receitaMensal || 'Não informado'}
- Produtos/Serviços: ${profile.productsServices || profile.produtosServicos || 'Não informado'}
- Canais de Venda: ${JSON.stringify(profile.salesChannels || profile.canaisVenda || [])}
- Objetivo Principal: ${profile.primaryGoal || profile.objetivoPrincipal || 'Crescer receita'}
- Configuração Org: ${JSON.stringify(profile.orgConfig || {})}

Crie os agentes necessários para esta empresa funcionar com IA.`;

    const response = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 4096,
    });

    // Parse the LLM response
    let agents;
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        agents = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in LLM response');
      }
    } catch (parseError) {
      console.error('[LLM] Failed to parse agent generation response:', response.content);
      res.status(500).json({ error: 'LLM returned invalid data. Response: ' + response.content.substring(0, 200) });
      return;
    }

    // Save agents to database
    const savedAgents = [];
    for (const agent of agents) {
      const row = agentToSnake({
        name: agent.name,
        role: agent.role,
        department: agent.department,
        mission: agent.mission,
        autonomyLevel: agent.autonomyLevel ?? 3,
        heartbeatIntervalMinutes: 30,
        llmProviderPreference: response.provider,
        monthlyTokenBudget: 100000,
        kpis: agent.kpis || [],
        permissions: agent.permissions || [],
        status: 'active',
      });

      const { data, error } = await supabaseAdmin
        .from('ai_agents')
        .insert(row)
        .select()
        .single();

      if (!error && data) {
        savedAgents.push(agentToCamel(data));
      }
    }

    res.json({
      success: true,
      agents: savedAgents,
      llmProvider: response.provider,
      llmModel: response.model,
      tokensUsed: response.tokens.total,
      latencyMs: response.latencyMs,
    });
  } catch (error) {
    console.error('[GenerateAgents] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to generate agents' });
  }
});

// ─── Initial Briefing (CEO to CTO) ──────────────────────────────

router.post('/briefing', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Find the CTO
    const { data: cto } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('role', 'CTO')
      .eq('status', 'active')
      .single();

    if (!cto) {
      res.status(404).json({ error: 'CTO agent not found or inactive' });
      return;
    }

    // Log the briefing as a pending execution task for the CTO
    const { data, error } = await supabaseAdmin.from('ai_activities').insert({
      user_id: DEFAULT_USER,
      agent_id: cto.id,
      agent_name: cto.name,
      action_type: 'execution',
      title: `Master Briefing do Dono/CEO`,
      description: `Briefing recebido.`,
      metadata: { task: `Analise a seguinte diretriz do CEO e crie/delegue as tarefas necessárias: ${message}` },
      status: 'pending',
    }).select().single();

    if (error) throw error;
    res.json({ success: true, activity: data });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create briefing' });
  }
});

export default router;
