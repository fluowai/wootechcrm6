/**
 * AIOS Autonomy Enforcement — Level Checks and Action Control
 * 
 * Enforces autonomy levels (0-3) for agent actions:
 * - Level 0: All actions require human approval
 * - Level 1: Auto-execute simple tasks only
 * - Level 2: Execute within defined rules
 * - Level 3: Full autonomy with post-execution reporting
 */

import { supabaseAdmin } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  autonomyLevel: number;
  permissions: string[];
  limits: Record<string, unknown>;
}

interface ActionRequest {
  agentId: string;
  actionType: string;
  actionData: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact?: number;
}

interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  actionType: string;
  actionData: Record<string, unknown>;
  riskLevel: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  expiresAt: string;
}

// ─── Autonomy Levels ─────────────────────────────────────────────

export const AUTONOMY_LEVELS = {
  0: {
    name: 'Aprovação Manual',
    description: 'Todas as ações precisam de aprovação humana',
    autoApprove: [],
    requiresApproval: ['*'],
  },
  1: {
    name: 'Tarefas Simples',
    description: 'Auto-executa tarefas simples, aprovação para complexas',
    autoApprove: ['read', 'analyze', 'suggest', 'log'],
    requiresApproval: ['write', 'send', 'execute', 'delete'],
  },
  2: {
    name: 'Regras Definidas',
    description: 'Executa dentro de regras pré-definidas',
    autoApprove: ['read', 'analyze', 'suggest', 'log', 'write', 'send'],
    requiresApproval: ['execute', 'delete', 'financial'],
  },
  3: {
    name: 'Autonomia Total',
    description: 'Executa livremente, reporta resultados',
    autoApprove: ['read', 'analyze', 'suggest', 'log', 'write', 'send', 'execute'],
    requiresApproval: ['delete', 'financial', 'irreversible'],
  },
};

// ─── Risk Assessment ─────────────────────────────────────────────

/**
 * Assess the risk level of an action
 */
export function assessRisk(actionType: string, actionData: Record<string, unknown>): 'low' | 'medium' | 'high' | 'critical' {
  const lowerAction = actionType.toLowerCase();
  
  // Critical actions
  if (lowerAction.includes('delete') || 
      lowerAction.includes('remove') ||
      lowerAction.includes('cancel') ||
      lowerAction.includes('terminate')) {
    return 'critical';
  }

  // High risk actions
  if (lowerAction.includes('financial') ||
      lowerAction.includes('payment') ||
      lowerAction.includes('transfer') ||
      lowerAction.includes('send') ||
      lowerAction.includes('publish')) {
    
    // Check amount if present
    const amount = actionData.amount || actionData.value || actionData.total;
    if (typeof amount === 'number' && amount > 10000) {
      return 'critical';
    }
    if (typeof amount === 'number' && amount > 1000) {
      return 'high';
    }
    
    return 'high';
  }

  // Medium risk actions
  if (lowerAction.includes('update') ||
      lowerAction.includes('modify') ||
      lowerAction.includes('edit') ||
      lowerAction.includes('create')) {
    return 'medium';
  }

  // Low risk actions
  return 'low';
}

/**
 * Check if an action is allowed based on agent's autonomy level
 */
export function isActionAllowed(
  agent: Agent,
  actionType: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): { allowed: boolean; requiresApproval: boolean; reason?: string } {
  const levelConfig = AUTONOMY_LEVELS[agent.autonomyLevel as keyof typeof AUTONOMY_LEVELS];
  
  if (!levelConfig) {
    return { allowed: false, requiresApproval: true, reason: 'Invalid autonomy level' };
  }

  // Check if action is in auto-approve list
  const lowerAction = actionType.toLowerCase();
  const autoApproved = levelConfig.autoApprove.some(pattern => 
    lowerAction.includes(pattern.toLowerCase())
  );

  if (autoApproved) {
    // Even if auto-approved, check risk level
    if (riskLevel === 'critical' && agent.autonomyLevel < 3) {
      return { 
        allowed: false, 
        requiresApproval: true, 
        reason: 'Critical actions require approval regardless of autonomy level' 
      };
    }
    if (riskLevel === 'high' && agent.autonomyLevel < 2) {
      return { 
        allowed: false, 
        requiresApproval: true, 
        reason: 'High-risk actions require higher autonomy level' 
      };
    }
    return { allowed: true, requiresApproval: false };
  }

  // Check if action requires approval
  const requiresApproval = levelConfig.requiresApproval.some(pattern => 
    pattern === '*' || lowerAction.includes(pattern.toLowerCase())
  );

  if (requiresApproval) {
    return { 
      allowed: true, 
      requiresApproval: true, 
      reason: `Action requires approval at autonomy level ${agent.autonomyLevel}` 
    };
  }

  // Default: require approval for unknown actions
  return { 
    allowed: true, 
    requiresApproval: true, 
    reason: 'Unknown action type requires approval' 
  };
}

// ─── Approval Queue ──────────────────────────────────────────────

/**
 * Create an approval request
 */
export async function createApprovalRequest(
  request: ActionRequest
): Promise<ApprovalRequest> {
  // Get agent details
  const { data: agent, error: agentError } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .eq('id', request.agentId)
    .single();

  if (agentError || !agent) {
    throw new Error('Agent not found');
  }

  // Assess risk if not provided
  const riskLevel = request.riskLevel || assessRisk(request.actionType, request.actionData);

  // Check autonomy level
  const permission = isActionAllowed(agent, request.actionType, riskLevel);

  if (!permission.allowed) {
    throw new Error(`Action not allowed: ${permission.reason}`);
  }

  // If no approval needed, return immediately
  if (!permission.requiresApproval) {
    return {
      id: `auto-${Date.now()}`,
      agentId: request.agentId,
      agentName: agent.name,
      actionType: request.actionType,
      actionData: request.actionData,
      riskLevel,
      status: 'approved',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  // Create approval request in database
  const { data: approvalRequest, error } = await supabaseAdmin
    .from('ai_approval_requests')
    .insert({
      agent_id: request.agentId,
      agent_name: agent.name,
      action_type: request.actionType,
      action_data: request.actionData,
      risk_level: riskLevel,
      status: 'pending',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return approvalRequest;
}

/**
 * Approve a pending request
 */
export async function approveRequest(requestId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ai_approval_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Reject a pending request
 */
export async function rejectRequest(requestId: string, reason?: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ai_approval_requests')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

/**
 * Get pending approval requests
 */
export async function getPendingRequests(): Promise<ApprovalRequest[]> {
  const { data: requests, error } = await supabaseAdmin
    .from('ai_approval_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return requests || [];
}

/**
 * Check if a request has been approved
 */
export async function isRequestApproved(requestId: string): Promise<boolean> {
  const { data: request, error } = await supabaseAdmin
    .from('ai_approval_requests')
    .select('status')
    .eq('id', requestId)
    .single();

  if (error || !request) return false;
  return request.status === 'approved';
}

// ─── Enforcement Middleware ───────────────────────────────────────

/**
 * Middleware to enforce autonomy levels on agent actions
 */
export async function enforceAutonomy(
  agentId: string,
  actionType: string,
  actionData: Record<string, unknown>
): Promise<{
  allowed: boolean;
  requiresApproval: boolean;
  approvalRequestId?: string;
  reason?: string;
}> {
  // Get agent
  const { data: agent, error } = await supabaseAdmin
    .from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (error || !agent) {
    return { allowed: false, requiresApproval: false, reason: 'Agent not found' };
  }

  // Check if agent is active
  if (agent.status !== 'active') {
    return { allowed: false, requiresApproval: false, reason: 'Agent is not active' };
  }

  // Check token budget
  if (agent.monthly_token_budget > 0 && 
      agent.tokens_used_this_month >= agent.monthly_token_budget) {
    return { allowed: false, requiresApproval: false, reason: 'Token budget exceeded' };
  }

  // Assess risk
  const riskLevel = assessRisk(actionType, actionData);

  // Check permission
  const permission = isActionAllowed(agent, actionType, riskLevel);

  if (!permission.allowed) {
    return { 
      allowed: false, 
      requiresApproval: false, 
      reason: permission.reason 
    };
  }

  // If approval required, create request
  if (permission.requiresApproval) {
    try {
      const request = await createApprovalRequest({
        agentId,
        actionType,
        actionData,
        riskLevel,
      });

      return {
        allowed: true,
        requiresApproval: true,
        approvalRequestId: request.id,
        reason: permission.reason,
      };
    } catch (err) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: err instanceof Error ? err.message : 'Failed to create approval request',
      };
    }
  }

  // Action allowed without approval
  return {
    allowed: true,
    requiresApproval: false,
  };
}
