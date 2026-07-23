/**
 * AIOS Token Budget Management
 * 
 * Tracks and enforces token budgets per agent and globally.
 * Provides usage analytics and alerts when approaching limits.
 */

import { supabaseAdmin } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

interface TokenUsage {
  agentId: string;
  agentName: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEstimate: number;
  timestamp: string;
}

interface BudgetStatus {
  agentId: string;
  agentName: string;
  monthlyBudget: number;
  usedThisMonth: number;
  remaining: number;
  percentageUsed: number;
  projectedMonthlyUsage: number;
  daysInMonth: number;
  daysElapsed: number;
}

interface GlobalBudget {
  totalBudget: number;
  totalUsed: number;
  remaining: number;
  byProvider: Record<string, number>;
  byAgent: Record<string, number>;
}

// ─── Token Tracking ──────────────────────────────────────────────

/**
 * Record token usage for an agent
 */
export async function recordTokenUsage(
  agentId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  latencyMs: number = 0
): Promise<void> {
  // Get agent details
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('ai_agents')
    .select('user_id, name')
    .eq('id', agentId)
    .single();

  if (agentError || !agent) {
    console.error('Agent not found for token recording:', agentId);
    return;
  }

  // Record usage
  const { error } = await supabaseAdmin
    .from('ai_llm_usage')
    .insert({
      user_id: agent.user_id,
      agent_id: agentId,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      success: true,
    });

  if (error) {
    console.error('Failed to record token usage:', error);
    return;
  }

  // Update agent's monthly usage
  const totalTokens = inputTokens + outputTokens;
  await supabaseAdmin
    .from('ai_agents')
    .update({
      tokens_used_this_month: supabaseAdmin.rpc('increment_tokens', {
        agent_id: agentId,
        tokens_to_add: totalTokens,
      }),
    })
    .eq('id', agentId);
}

/**
 * Record failed LLM call
 */
export async function recordFailedLLMCall(
  agentId: string,
  provider: string,
  model: string,
  errorMessage: string
): Promise<void> {
  const { data: agent } = await supabaseAdmin
    .from('ai_agents')
    .select('user_id')
    .eq('id', agentId)
    .single();

  if (!agent) return;

  await supabaseAdmin
    .from('ai_llm_usage')
    .insert({
      user_id: agent.user_id,
      agent_id: agentId,
      provider,
      model,
      input_tokens: 0,
      output_tokens: 0,
      success: false,
      error_message: errorMessage,
    });
}

// ─── Budget Checking ─────────────────────────────────────────────

/**
 * Check if an agent has budget remaining
 */
export async function hasBudgetRemaining(agentId: string): Promise<{
  hasBudget: boolean;
  status: BudgetStatus;
}> {
  const { data: agent, error } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error || !agent) {
    return {
      hasBudget: false,
      status: {
        agentId,
        agentName: 'Unknown',
        monthlyBudget: 0,
        usedThisMonth: 0,
        remaining: 0,
        percentageUsed: 100,
        projectedMonthlyUsage: 0,
        daysInMonth: 30,
        daysElapsed: 0,
      },
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const daysElapsed = now.getDate();

  const monthlyBudget = agent.monthly_token_budget || 0;
  const usedThisMonth = agent.tokens_used_this_month || 0;
  const remaining = monthlyBudget > 0 ? Math.max(0, monthlyBudget - usedThisMonth) : Infinity;
  const percentageUsed = monthlyBudget > 0 ? (usedThisMonth / monthlyBudget) * 100 : 0;

  // Project monthly usage based on current rate
  const dailyRate = daysElapsed > 0 ? usedThisMonth / daysElapsed : 0;
  const projectedMonthlyUsage = dailyRate * daysInMonth;

  return {
    hasBudget: monthlyBudget === 0 || remaining > 0,
    status: {
      agentId,
      agentName: agent.name,
      monthlyBudget,
      usedThisMonth,
      remaining: remaining === Infinity ? -1 : remaining,
      percentageUsed: Math.round(percentageUsed * 100) / 100,
      projectedMonthlyUsage: Math.round(projectedMonthlyUsage),
      daysInMonth,
      daysElapsed,
    },
  };
}

/**
 * Get budget status for all agents
 */
export async function getAllBudgetStatuses(): Promise<BudgetStatus[]> {
  const { data: agents, error } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .order('name');

  if (error || !agents) return [];

  const statuses: BudgetStatus[] = [];

  for (const agent of agents) {
    const { status } = await hasBudgetRemaining(agent.id);
    statuses.push(status);
  }

  return statuses;
}

/**
 * Get global budget overview
 */
export async function getGlobalBudget(): Promise<GlobalBudget> {
  const { data: agents, error } = await supabaseAdmin
    .from('ai_agents')
    .select('*');

  if (error || !agents) {
    return {
      totalBudget: 0,
      totalUsed: 0,
      remaining: 0,
      byProvider: {},
      byAgent: {},
    };
  }

  const totalBudget = agents.reduce((sum, a) => sum + (a.monthly_token_budget || 0), 0);
  const totalUsed = agents.reduce((sum, a) => sum + (a.tokens_used_this_month || 0), 0);

  // Get usage by provider
  const { data: usageByProvider } = await supabaseAdmin
    .from('ai_llm_usage')
    .select('provider, input_tokens, output_tokens')
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

  const byProvider: Record<string, number> = {};
  if (usageByProvider) {
    for (const usage of usageByProvider) {
      const provider = usage.provider || 'unknown';
      byProvider[provider] = (byProvider[provider] || 0) + 
        (usage.input_tokens || 0) + (usage.output_tokens || 0);
    }
  }

  // Get usage by agent
  const byAgent: Record<string, number> = {};
  for (const agent of agents) {
    byAgent[agent.name] = agent.tokens_used_this_month || 0;
  }

  return {
    totalBudget,
    totalUsed,
    remaining: totalBudget > 0 ? totalBudget - totalUsed : -1,
    byProvider,
    byAgent,
  };
}

// ─── Budget Alerts ───────────────────────────────────────────────

/**
 * Check for agents approaching budget limits
 */
export async function checkBudgetAlerts(): Promise<Array<{
  agentId: string;
  agentName: string;
  alertType: 'warning' | 'critical' | 'exceeded';
  percentageUsed: number;
  message: string;
}>> {
  const alerts: Array<{
    agentId: string;
    agentName: string;
    alertType: 'warning' | 'critical' | 'exceeded';
    percentageUsed: number;
    message: string;
  }> = [];

  const statuses = await getAllBudgetStatuses();

  for (const status of statuses) {
    if (status.monthlyBudget === 0) continue; // No budget set

    if (status.percentageUsed >= 100) {
      alerts.push({
        agentId: status.agentId,
        agentName: status.agentName,
        alertType: 'exceeded',
        percentageUsed: status.percentageUsed,
        message: `Budget exceeded: ${status.usedThisMonth} / ${status.monthlyBudget} tokens used`,
      });
    } else if (status.percentageUsed >= 80) {
      alerts.push({
        agentId: status.agentId,
        agentName: status.agentName,
        alertType: 'critical',
        percentageUsed: status.percentageUsed,
        message: `Budget critical: ${status.percentageUsed}% used (${status.remaining} tokens remaining)`,
      });
    } else if (status.percentageUsed >= 60) {
      alerts.push({
        agentId: status.agentId,
        agentName: status.agentName,
        alertType: 'warning',
        percentageUsed: status.percentageUsed,
        message: `Budget warning: ${status.percentageUsed}% used`,
      });
    }
  }

  return alerts;
}

/**
 * Pause agents that have exceeded their budget
 */
export async function enforceBudgetLimits(): Promise<string[]> {
  const pausedAgents: string[] = [];
  const statuses = await getAllBudgetStatuses();

  for (const status of statuses) {
    if (status.monthlyBudget === 0) continue;
    if (status.percentageUsed >= 100) {
      await supabaseAdmin
        .from('ai_agents')
        .update({ status: 'paused' })
        .eq('id', status.agentId)
        .eq('status', 'active');

      pausedAgents.push(status.agentName);
      
      console.log(`[BudgetManager] Paused agent ${status.agentName} due to budget exceeded`);
    }
  }

  return pausedAgents;
}

// ─── Usage Analytics ─────────────────────────────────────────────

/**
 * Get token usage history for an agent
 */
export async function getAgentUsageHistory(
  agentId: string,
  days: number = 30
): Promise<TokenUsage[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: usage, error } = await supabaseAdmin
    .from('ai_llm_usage')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (error || !usage) return [];

  return usage.map(u => ({
    agentId: u.agent_id,
    agentName: '',
    provider: u.provider,
    model: u.model,
    inputTokens: u.input_tokens || 0,
    outputTokens: u.output_tokens || 0,
    totalTokens: (u.input_tokens || 0) + (u.output_tokens || 0),
    costEstimate: 0,
    timestamp: u.created_at,
  }));
}

/**
 * Get daily token usage aggregation
 */
export async function getDailyUsage(
  days: number = 30
): Promise<Array<{
  date: string;
  totalTokens: number;
  byProvider: Record<string, number>;
}>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: usage, error } = await supabaseAdmin
    .from('ai_llm_usage')
    .select('provider, input_tokens, output_tokens, created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error || !usage) return [];

  const dailyMap = new Map<string, {
    totalTokens: number;
    byProvider: Record<string, number>;
  }>();

  for (const u of usage) {
    const date = u.created_at.split('T')[0];
    const tokens = (u.input_tokens || 0) + (u.output_tokens || 0);
    const provider = u.provider || 'unknown';

    if (!dailyMap.has(date)) {
      dailyMap.set(date, { totalTokens: 0, byProvider: {} });
    }

    const day = dailyMap.get(date)!;
    day.totalTokens += tokens;
    day.byProvider[provider] = (day.byProvider[provider] || 0) + tokens;
  }

  return Array.from(dailyMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }));
}
