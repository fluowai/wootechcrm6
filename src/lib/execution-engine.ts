/**
 * AIOS Execution Engine — Heartbeat, Goal Evaluation, Task Delegation
 * 
 * This module handles the autonomous execution of agent tasks,
 * including heartbeats, goal evaluation, and task delegation.
 */

import { supabaseAdmin } from './supabase';
import { aiGateway } from './ai-gateway';
import { generateCompletion } from './llm-router';
import { runAgentTask } from './agentic-loop';

// ─── Types ───────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  mission: string;
  autonomyLevel: 0 | 1 | 2 | 3;
  heartbeatIntervalMinutes: number;
  llmProviderPreference: string;
  monthlyTokenBudget: number;
  tokensUsedThisMonth: number;
  status: 'active' | 'paused' | 'inactive';
  lastHeartbeatAt: string | null;
  config: Record<string, unknown>;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  target_value: number;
  current_value: number;
  status: string;
  assigned_agent_id: string;
  deadline?: string;
}

// ─── Heartbeat Processor ─────────────────────────────────────────

/**
 * Process heartbeats for all active agents
 */
export async function processHeartbeats(): Promise<void> {
  console.log('[ExecutionEngine] Processing heartbeats...');

  try {
    // Get all active agents
    const { data: agents, error } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;
    if (!agents || agents.length === 0) {
      console.log('[ExecutionEngine] No active agents found');
      return;
    }

    const now = new Date();

    for (const agent of agents) {
      const lastHeartbeat = agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at) : null;
      const intervalMs = (agent.heartbeat_interval_minutes || 30) * 60 * 1000;

      // Check if heartbeat is due
      if (lastHeartbeat && (now.getTime() - lastHeartbeat.getTime()) < intervalMs) {
        continue;
      }

      console.log(`[ExecutionEngine] Processing heartbeat for agent: ${agent.name}`);

      try {
        // Execute agent heartbeat
        await executeAgentHeartbeat(agent);

        // Update last heartbeat timestamp
        await supabaseAdmin
          .from('ai_agents')
          .update({ last_heartbeat_at: now.toISOString() })
          .eq('id', agent.id);

        // Log activity
        await logActivity(agent.id, agent.name, 'heartbeat', 
          `Heartbeat executado com sucesso`, {
            provider: agent.llm_provider_preference,
            timestamp: now.toISOString(),
          });
      } catch (err) {
        console.error(`[ExecutionEngine] Heartbeat failed for ${agent.name}:`, err);
        
        await logActivity(agent.id, agent.name, 'alert',
          `Heartbeat falhou: ${err instanceof Error ? err.message : 'Unknown error'}`, {
            error: true,
          }, 'failed');
      }
    }
  } catch (err) {
    console.error('[ExecutionEngine] Error processing heartbeats:', err);
  }
}

/**
 * Execute a single agent heartbeat
 */
async function executeAgentHeartbeat(agent: Agent): Promise<void> {
  // Get recent activities for context
  const { data: recentActivities } = await supabaseAdmin
    .from('ai_activities')
    .select('*')
    .eq('agent_id', agent.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get assigned goals
  const { data: goals } = await supabaseAdmin
    .from('ai_goals')
    .select('*')
    .eq('assigned_agent_id', agent.id)
    .eq('status', 'active');

  // Build context for the agent
  const context = {
    agent: {
      name: agent.name,
      role: agent.role,
      mission: agent.mission,
      department: agent.department,
    },
    recentActivities: recentActivities || [],
    activeGoals: goals || [],
    timestamp: new Date().toISOString(),
  };

  // Generate agent's analysis/action using LLM
  const response = await generateCompletion({
    messages: [
      {
        role: 'system',
        content: `Você é ${agent.name}, ${agent.role} no departamento de ${agent.department}.
Sua missão é: ${agent.mission}

Você está executando um heartbeat. Analise o contexto e determine se há alguma ação necessária.
Se houver, descreva a ação recomendada. Se não, confirme que tudo está normal.`
      },
      {
        role: 'user',
        content: `Contexto do heartbeat:\n${JSON.stringify(context, null, 2)}`
      }
    ],
    agentId: agent.id,
  });

  // Process the response
  if (response.content) {
    // Check if the agent recommends an action
    const lowerContent = response.content.toLowerCase();
    const hasAction = lowerContent.includes('recomendo') || 
                     lowerContent.includes('ação') ||
                     lowerContent.includes('deveria') ||
                     lowerContent.includes('sugiro');

    if (hasAction) {
      // Create a suggestion
      await createSuggestion(agent, response.content);
    }
  }
}

// ─── Goal Evaluation ─────────────────────────────────────────────

/**
 * Evaluate progress on all active goals
 */
export async function evaluateGoals(): Promise<void> {
  console.log('[ExecutionEngine] Evaluating goals...');

  try {
    // Get all active goals
    const { data: goals, error } = await supabaseAdmin
      .from('ai_goals')
      .select('*')
      .eq('status', 'active');

    if (error) throw error;
    if (!goals || goals.length === 0) {
      console.log('[ExecutionEngine] No active goals found');
      return;
    }

    for (const goal of goals) {
      try {
        await evaluateGoal(goal);
      } catch (err) {
        console.error(`[ExecutionEngine] Goal evaluation failed for ${goal.title}:`, err);
      }
    }
  } catch (err) {
    console.error('[ExecutionEngine] Error evaluating goals:', err);
  }
}

/**
 * Evaluate a single goal's progress
 */
async function evaluateGoal(goal: Goal): Promise<void> {
  // Get the assigned agent
  const { data: agent } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .eq('id', goal.assigned_agent_id)
    .single();

  if (!agent) {
    console.log(`[ExecutionEngine] No agent assigned to goal: ${goal.title}`);
    return;
  }

  // Calculate progress
  const progress = goal.target_value > 0 
    ? (goal.current_value / goal.target_value) * 100 
    : 0;

  // Check deadline
  const deadline = new Date(goal.deadline);
  const now = new Date();
  const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Generate evaluation using LLM
  const response = await generateCompletion({
    messages: [
      {
        role: 'system',
        content: `Você é um analista avaliando o progresso de uma meta estratégica.
Forneça uma avaliação concisa e recomendações de ação se necessário.`
      },
      {
        role: 'user',
        content: `Meta: ${goal.title}
Descrição: ${goal.description}
Progresso: ${Math.round(progress)}% (${goal.current_value} / ${goal.target_value})
Dias restantes: ${daysRemaining}
Status: ${goal.status}

Avalie o progresso e recomende ações se necessário.`
      }
    ],
    agentId: agent.id,
  });

  // Log the evaluation
  await logActivity(agent.id, agent.name, 'goal_check',
    `Avaliação da meta "${goal.title}": ${Math.round(progress)}% concluído`,
    {
      goalId: goal.id,
      progress,
      daysRemaining,
      evaluation: response.content,
    });

  // If goal is at risk, create a suggestion
  if (progress < 50 && daysRemaining < 7) {
    await createSuggestion(agent, 
      `Meta "${goal.title}" está em risco. Progresso: ${Math.round(progress)}%, ${daysRemaining} dias restantes. ${response.content}`);
  }
}

// ─── Task Delegation ─────────────────────────────────────────────

/**
 * Delegate tasks from CEO to sub-agents
 */
export async function delegateTasks(): Promise<void> {
  console.log('[ExecutionEngine] Delegating tasks...');

  try {
    // Find the CTO agent
    const { data: cto, error: ctoError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('role', 'CTO')
      .eq('status', 'active')
      .single();

    if (ctoError || !cto) {
      console.log('[ExecutionEngine] No active CTO agent found');
      return;
    }

    // Get all other active agents
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from('ai_agents')
      .select('*')
      .eq('status', 'active')
      .neq('id', cto.id);

    if (agentsError || !agents || agents.length === 0) {
      console.log('[ExecutionEngine] No sub-agents found');
      return;
    }

    // Get recent activities and suggestions
    const { data: recentActivities } = await supabaseAdmin
      .from('ai_activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const { data: pendingSuggestions } = await supabaseAdmin
      .from('ai_suggestions')
      .select('*')
      .eq('status', 'new')
      .limit(10);

    // Build context for CTO
    const context = {
      subAgents: agents.map(a => ({
        name: a.name,
        role: a.role,
        department: a.department,
        mission: a.mission,
      })),
      recentActivities: recentActivities || [],
      pendingSuggestions: pendingSuggestions || [],
      timestamp: new Date().toISOString(),
    };

    // Ask CTO to delegate tasks
    const response = await generateCompletion({
      messages: [
        {
          role: 'system',
          content: `Você é o CTO (Chief Technology Officer) de Inteligência Artificial de uma empresa.
Sua missão é orquestrar os agentes subordinados para atingir os objetivos operacionais e estratégicos.
O Dono/CEO da empresa já definiu a visão geral. Analise o contexto e delegue tarefas para os agentes apropriados.

Retorne um JSON com as delegações:
{
  "delegations": [
    {
      "agentRole": "role do agente",
      "task": "descrição da tarefa",
      "priority": "high|medium|low"
    }
  ]
}

Se não houver nada para delegar, retorne {"delegations": []}`
        },
        {
          role: 'user',
          content: `Contexto para delegação:\n${JSON.stringify(context, null, 2)}`
        }
      ],
      agentId: cto.id,
    });

    // Parse and execute delegations
    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const delegations = JSON.parse(jsonMatch[0]);
        
        if (delegations.delegations && Array.isArray(delegations.delegations)) {
          for (const delegation of delegations.delegations) {
            // Find the target agent
            const targetAgent = agents.find(a => 
              a.role.toLowerCase().includes(delegation.agentRole.toLowerCase()) ||
              delegation.agentRole.toLowerCase().includes(a.role.toLowerCase())
            );

            if (targetAgent) {
              // Log the delegation
              await logActivity(cto.id, cto.name, 'delegation',
                `Delegou tarefa para ${targetAgent.name}: ${delegation.task}`,
                {
                  targetAgentId: targetAgent.id,
                  targetAgentName: targetAgent.name,
                  task: delegation.task,
                  priority: delegation.priority,
                });

              // Log activity for the target agent too (mark as pending so it can be picked up)
              await logActivity(targetAgent.id, targetAgent.name, 'execution',
                `Tarefa recebida do CTO: ${delegation.task}`,
                {
                  sourceAgentId: cto.id,
                  sourceAgentName: cto.name,
                  task: delegation.task,
                  priority: delegation.priority,
                }, 'pending');
            }
          }
        }
      }
    } catch (parseErr) {
      console.error('[ExecutionEngine] Failed to parse delegation response:', parseErr);
    }
  } catch (err) {
    console.error('[ExecutionEngine] Error delegating tasks:', err);
  }
}

// ─── Task Execution (Agentic Loop) ───────────────────────────────

/**
 * Process pending tasks for all active agents
 */
export async function processAgentTasks(): Promise<void> {
  console.log('[ExecutionEngine] Processing pending tasks for agents...');
  
  try {
    // Get all pending execution tasks
    const { data: pendingTasks, error } = await supabaseAdmin
      .from('ai_activities')
      .select('*, ai_agents(*)')
      .eq('status', 'pending')
      .eq('action_type', 'execution')
      .order('created_at', { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!pendingTasks || pendingTasks.length === 0) {
      return;
    }

    for (const task of pendingTasks) {
      const agent = task.ai_agents;
      if (!agent || agent.status !== 'active') continue;

      console.log(`[ExecutionEngine] Agent ${agent.name} executing task: ${task.title}`);

      try {
        // Mark as in-progress
        await supabaseAdmin
          .from('ai_activities')
          .update({ status: 'in_progress' })
          .eq('id', task.id);

        const taskDesc = typeof task.metadata?.task === 'string' ? task.metadata.task : task.title;
        const conversationId = task.metadata?.conversation_id as string | undefined;

        // Execute task using ReAct Loop with tools
        const result = await runAgentTask(agent, taskDesc, conversationId);

        // Update task as completed with result
        await supabaseAdmin
          .from('ai_activities')
          .update({ 
            status: 'completed', 
            description: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

      } catch (execErr) {
        console.error(`[ExecutionEngine] Task execution failed for agent ${agent.name}:`, execErr);
        // Mark as failed
        await supabaseAdmin
          .from('ai_activities')
          .update({ 
            status: 'failed', 
            description: `Erro: ${execErr instanceof Error ? execErr.message : 'Unknown'}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }
    }
  } catch (err) {
    console.error('[ExecutionEngine] Error processing agent tasks:', err);
  }
}

// ─── Helper Functions ────────────────────────────────────────────

/**
 * Create a suggestion from an agent
 */
async function createSuggestion(agent: Agent, content: string): Promise<void> {
  // Determine category based on content
  const lowerContent = content.toLowerCase();
  let category = 'custom';
  
  if (lowerContent.includes('venda') || lowerContent.includes('pipeline') || lowerContent.includes('receita')) {
    category = 'pipeline';
  } else if (lowerContent.includes('cliente') || lowerContent.includes('retenção')) {
    category = 'retention';
  } else if (lowerContent.includes('marketing') || lowerContent.includes('campanha')) {
    category = 'marketing';
  } else if (lowerContent.includes('contratar') || lowerContent.includes('equipe')) {
    category = 'hiring';
  } else if (lowerContent.includes('preço') || lowerContent.includes('custo')) {
    category = 'pricing';
  } else if (lowerContent.includes('processo') || lowerContent.includes('operação')) {
    category = 'operations';
  }

  // Determine impact
  let impactEstimate: 'high' | 'medium' | 'low' = 'medium';
  if (lowerContent.includes('urgente') || lowerContent.includes('crítico') || lowerContent.includes('perda')) {
    impactEstimate = 'high';
  } else if (lowerContent.includes('melhoria') || lowerContent.includes('otimizar')) {
    impactEstimate = 'low';
  }

  await supabaseAdmin.from('ai_suggestions').insert({
    user_id: agent.config?.user_id || 'system',
    agent_id: agent.id,
    agent_name: agent.name,
    category,
    title: content.substring(0, 100),
    description: content,
    impact_estimate: impactEstimate,
    status: 'new',
  });
}

/**
 * Log an activity
 */
async function logActivity(
  agentId: string,
  agentName: string,
  actionType: string,
  title: string,
  metadata: Record<string, unknown> = {},
  status: string = 'completed'
): Promise<void> {
  await supabaseAdmin.from('ai_activities').insert({
    user_id: metadata.user_id || 'system',
    agent_id: agentId,
    agent_name: agentName,
    action_type: actionType,
    title,
    description: metadata.description as string || '',
    metadata,
    status,
    llm_provider: metadata.llm_provider as string || null,
    tokens_used: metadata.tokens_used as number || 0,
  });
}

// ─── Main Execution Loop ─────────────────────────────────────────

/**
 * Run the execution engine
 */
export async function runExecutionEngine(): Promise<void> {
  console.log('[ExecutionEngine] Starting execution cycle...');

  try {
    // Process heartbeats
    await processHeartbeats();

    // Evaluate goals
    await evaluateGoals();

    // Delegate tasks
    await delegateTasks();

    // Process agent tasks (Agentic loop)
    await processAgentTasks();

    console.log('[ExecutionEngine] Execution cycle completed');
  } catch (err) {
    console.error('[ExecutionEngine] Execution cycle failed:', err);
  }
}
