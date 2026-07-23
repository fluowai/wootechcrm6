/**
 * AIOS WebSocket Events — Real-time Updates
 * 
 * Handles WebSocket communication for real-time agent status updates,
 * activity feed, and suggestion notifications.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';

// ─── Types ───────────────────────────────────────────────────────

interface AgentStatusUpdate {
  agentId: string;
  agentName: string;
  status: 'active' | 'paused' | 'inactive';
  lastHeartbeatAt?: string;
  tokensUsed?: number;
}

interface ActivityUpdate {
  id: string;
  agentId: string;
  agentName: string;
  actionType: string;
  title: string;
  status: string;
  createdAt: string;
}

interface SuggestionUpdate {
  id: string;
  agentId: string;
  agentName: string;
  title: string;
  category: string;
  impactEstimate: string;
  status: string;
  createdAt: string;
}

interface GoalProgressUpdate {
  goalId: string;
  title: string;
  currentValue: number;
  targetValue: number;
  percentage: number;
}

interface TokenBudgetUpdate {
  agentId: string;
  agentName: string;
  used: number;
  budget: number;
  percentage: number;
}

// ─── Event Types ─────────────────────────────────────────────────

export const AIOS_EVENTS = {
  // Agent events
  AGENT_STATUS_CHANGED: 'aios:agent:status_changed',
  AGENT_HEARTBEAT: 'aios:agent:heartbeat',
  AGENT_TOKEN_UPDATE: 'aios:agent:token_update',
  
  // Activity events
  ACTIVITY_NEW: 'aios:activity:new',
  ACTIVITY_UPDATED: 'aios:activity:updated',
  
  // Suggestion events
  SUGGESTION_NEW: 'aios:suggestion:new',
  SUGGESTION_STATUS_CHANGED: 'aios:suggestion:status_changed',
  
  // Goal events
  GOAL_PROGRESS_UPDATED: 'aios:goal:progress_updated',
  GOAL_ACHIEVED: 'aios:goal:achieved',
  
  // Budget events
  BUDGET_WARNING: 'aios:budget:warning',
  BUDGET_EXCEEDED: 'aios:budget:exceeded',
  
  // Conversation events
  CONVERSATION_NEW: 'aios:conversation:new',
  CONVERSATION_MESSAGE: 'aios:conversation:message',
  CONVERSATION_ESCALATED: 'aios:conversation:escalated',
  
  // System events
  SYSTEM_ALERT: 'aios:system:alert',
  SYSTEM_STATUS: 'aios:system:status',
} as const;

// ─── WebSocket Manager ───────────────────────────────────────────

let io: SocketIOServer | null = null;

/**
 * Initialize WebSocket handler
 */
export function initWebSocket(socketServer: SocketIOServer): void {
  io = socketServer;

  io.on('connection', (socket: Socket) => {
    console.log('[WebSocket] Client connected:', socket.id);

    // Join AIOS room
    socket.join('aios');

    // Handle subscription to specific agent updates
    socket.on('aios:subscribe:agent', (agentId: string) => {
      socket.join(`aios:agent:${agentId}`);
    });

    // Handle unsubscription
    socket.on('aios:unsubscribe:agent', (agentId: string) => {
      socket.leave(`aios:agent:${agentId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('[WebSocket] Client disconnected:', socket.id);
    });
  });

  console.log('[WebSocket] AIOS WebSocket handler initialized');
}

/**
 * Get the WebSocket server instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

// ─── Event Emitters ──────────────────────────────────────────────

/**
 * Emit agent status change
 */
export function emitAgentStatusChange(update: AgentStatusUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.AGENT_STATUS_CHANGED, update);
  io.to(`aios:agent:${update.agentId}`).emit(AIOS_EVENTS.AGENT_STATUS_CHANGED, update);
}

/**
 * Emit agent heartbeat
 */
export function emitAgentHeartbeat(agentId: string, agentName: string): void {
  if (!io) return;

  const update = {
    agentId,
    agentName,
    timestamp: new Date().toISOString(),
  };

  io.to('aios').emit(AIOS_EVENTS.AGENT_HEARTBEAT, update);
  io.to(`aios:agent:${agentId}`).emit(AIOS_EVENTS.AGENT_HEARTBEAT, update);
}

/**
 * Emit new activity
 */
export function emitNewActivity(activity: ActivityUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.ACTIVITY_NEW, activity);
  io.to(`aios:agent:${activity.agentId}`).emit(AIOS_EVENTS.ACTIVITY_NEW, activity);
}

/**
 * Emit activity update
 */
export function emitActivityUpdate(activity: ActivityUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.ACTIVITY_UPDATED, activity);
}

/**
 * Emit new suggestion
 */
export function emitNewSuggestion(suggestion: SuggestionUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.SUGGESTION_NEW, suggestion);
  io.to(`aios:agent:${suggestion.agentId}`).emit(AIOS_EVENTS.SUGGESTION_NEW, suggestion);
}

/**
 * Emit suggestion status change
 */
export function emitSuggestionStatusChanged(suggestion: SuggestionUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.SUGGESTION_STATUS_CHANGED, suggestion);
}

/**
 * Emit goal progress update
 */
export function emitGoalProgressUpdate(update: GoalProgressUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.GOAL_PROGRESS_UPDATED, update);
}

/**
 * Emit goal achieved
 */
export function emitGoalAchieved(goalId: string, title: string): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.GOAL_ACHIEVED, { goalId, title, timestamp: new Date().toISOString() });
}

/**
 * Emit token budget warning
 */
export function emitBudgetWarning(update: TokenBudgetUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.BUDGET_WARNING, update);
  io.to(`aios:agent:${update.agentId}`).emit(AIOS_EVENTS.BUDGET_WARNING, update);
}

/**
 * Emit token budget exceeded
 */
export function emitBudgetExceeded(update: TokenBudgetUpdate): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.BUDGET_EXCEEDED, update);
  io.to(`aios:agent:${update.agentId}`).emit(AIOS_EVENTS.BUDGET_EXCEEDED, update);
}

/**
 * Emit new conversation
 */
export function emitNewConversation(conversationId: string, topic: string, participants: string[]): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.CONVERSATION_NEW, {
    conversationId,
    topic,
    participants,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit conversation message
 */
export function emitConversationMessage(
  conversationId: string,
  agentName: string,
  content: string
): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.CONVERSATION_MESSAGE, {
    conversationId,
    agentName,
    content,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit conversation escalated
 */
export function emitConversationEscalated(
  conversationId: string,
  topic: string,
  reason: string
): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.CONVERSATION_ESCALATED, {
    conversationId,
    topic,
    reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit system alert
 */
export function emitSystemAlert(
  level: 'info' | 'warning' | 'error',
  message: string,
  details?: Record<string, unknown>
): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.SYSTEM_ALERT, {
    level,
    message,
    details,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit system status
 */
export function emitSystemStatus(status: {
  agentsActive: number;
  agentsTotal: number;
  goalsActive: number;
  pendingSuggestions: number;
  tokenUsage: number;
}): void {
  if (!io) return;

  io.to('aios').emit(AIOS_EVENTS.SYSTEM_STATUS, {
    ...status,
    timestamp: new Date().toISOString(),
  });
}
