/**
 * AI Gateway — Paperclip HTTP Client
 * 
 * Translates CRM events ↔ Paperclip tasks.
 * All communication with Paperclip goes through this module.
 * 
 * Paperclip is 100% invisible to end users — all UX is WooTech CRM.
 */

import { z } from 'zod';
import { generateCompletion, type LLMRequest, type LLMResponse } from './llm-router';
import { hermesBridge, type HermesChatRequest, type HermesChatResponse } from './hermes-bridge';
import { jarvisBridge, type JarvisCommandRequest, type JarvisCommandResponse, type JarvisDelegateRequest, type JarvisDelegateResponse } from './jarvis-bridge';

// ─── Types ───────────────────────────────────────────────────────

export interface PaperclipConfig {
  baseUrl: string;
  secretKey: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  mission: string;
  autonomyLevel: 0 | 1 | 2 | 3;
  heartbeatIntervalMs: number;
  status: 'active' | 'paused' | 'inactive';
  tokenBudget: number;
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'growth' | 'efficiency' | 'retention' | 'hiring' | 'marketing';
  target: number;
  current: number;
  deadline: Date;
  status: 'active' | 'completed' | 'paused' | 'failed';
  assignedAgentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  agentId: string;
  action: string;
  details: Record<string, unknown>;
  status: 'success' | 'failure' | 'pending';
  createdAt: Date;
}

export interface Suggestion {
  id: string;
  agentId: string;
  title: string;
  description: string;
  category: string;
  impact: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'dismissed' | 'implemented';
  createdAt: Date;
}

export interface Conversation {
  id: string;
  agentIds: string[];
  topic: string;
  status: 'active' | 'completed' | 'escalated';
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Validation Schemas ──────────────────────────────────────────

export const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  mission: z.string().min(1).max(500),
  autonomyLevel: z.number().min(0).max(3).default(3),
  heartbeatIntervalMs: z.number().min(60000).default(300000), // 5 min default
  tokenBudget: z.number().min(0).default(1000000),
});

export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: z.enum(['revenue', 'growth', 'efficiency', 'retention', 'hiring', 'marketing']),
  target: z.number().positive(),
  deadline: z.string().datetime(),
  assignedAgentIds: z.array(z.string()).default([]),
});

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

// ─── Paperclip Client ────────────────────────────────────────────

class AIGateway {
  private config: PaperclipConfig;
  private connected: boolean = false;

  constructor() {
    this.config = {
      baseUrl: process.env.PAPERCLIP_URL || 'http://localhost:4100',
      secretKey: process.env.PAPERCLIP_SECRET_KEY || 'wootech-paperclip-secret-change-in-prod',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.secretKey}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Paperclip API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // ─── Health ──────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.request('GET', '/health');
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ─── Agents ─────────────────────────────────────────────────

  async createAgent(data: z.infer<typeof CreateAgentSchema>): Promise<Agent> {
    const validated = CreateAgentSchema.parse(data);
    return this.request<Agent>('POST', '/api/agents', validated);
  }

  async getAgents(): Promise<Agent[]> {
    return this.request<Agent[]>('GET', '/api/agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>('GET', `/api/agents/${id}`);
  }

  async updateAgent(id: string, data: Partial<Agent>): Promise<Agent> {
    return this.request<Agent>('PATCH', `/api/agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<void> {
    await this.request('DELETE', `/api/agents/${id}`);
  }

  async pauseAgent(id: string): Promise<Agent> {
    return this.request<Agent>('POST', `/api/agents/${id}/pause`);
  }

  async resumeAgent(id: string): Promise<Agent> {
    return this.request<Agent>('POST', `/api/agents/${id}/resume`);
  }

  // ─── Goals ──────────────────────────────────────────────────

  async createGoal(data: z.infer<typeof CreateGoalSchema>): Promise<Goal> {
    const validated = CreateGoalSchema.parse(data);
    return this.request<Goal>('POST', '/api/goals', validated);
  }

  async getGoals(): Promise<Goal[]> {
    return this.request<Goal[]>('GET', '/api/goals');
  }

  async getGoal(id: string): Promise<Goal> {
    return this.request<Goal>('GET', `/api/goals/${id}`);
  }

  async updateGoal(id: string, data: Partial<Goal>): Promise<Goal> {
    return this.request<Goal>('PATCH', `/api/goals/${id}`, data);
  }

  async deleteGoal(id: string): Promise<void> {
    await this.request('DELETE', `/api/goals/${id}`);
  }

  // ─── Activities ─────────────────────────────────────────────

  async getActivities(filters?: {
    agentId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set('agentId', filters.agentId);
    if (filters?.action) params.set('action', filters.action);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));

    const query = params.toString();
    return this.request<Activity[]>('GET', `/api/activities${query ? `?${query}` : ''}`);
  }

  // ─── Suggestions ────────────────────────────────────────────

  async getSuggestions(filters?: {
    agentId?: string;
    status?: string;
    limit?: number;
  }): Promise<Suggestion[]> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set('agentId', filters.agentId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    return this.request<Suggestion[]>('GET', `/api/suggestions${query ? `?${query}` : ''}`);
  }

  async updateSuggestion(id: string, data: Partial<Suggestion>): Promise<Suggestion> {
    return this.request<Suggestion>('PATCH', `/api/suggestions/${id}`, data);
  }

  // ─── Conversations ─────────────────────────────────────────

  async getConversations(filters?: {
    agentId?: string;
    status?: string;
    limit?: number;
  }): Promise<Conversation[]> {
    const params = new URLSearchParams();
    if (filters?.agentId) params.set('agentId', filters.agentId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));

    const query = params.toString();
    return this.request<Conversation[]>('GET', `/api/conversations${query ? `?${query}` : ''}`);
  }

  async sendMessage(conversationId: string, content: string): Promise<void> {
    const validated = SendMessageSchema.parse({ conversationId, content });
    await this.request('POST', `/api/conversations/${conversationId}/messages`, validated);
  }

  // ─── LLM Integration ───────────────────────────────────────

  async generateWithFallback(req: LLMRequest): Promise<LLMResponse> {
    return generateCompletion(req);
  }

  // ─── CRM Event Bridge ──────────────────────────────────────

  async notifyCRMEvent(event: {
    type: 'lead_created' | 'deal_updated' | 'contact_enriched' | 'activity_logged';
    entityId: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    await this.request('POST', '/api/events/crm', event);
  }

  async getCRMMetrics(): Promise<{
    totalLeads: number;
    totalDeals: number;
    pipelineValue: number;
    conversionRate: number;
  }> {
    return this.request('GET', '/api/metrics/crm');
  }

  // ─── Hermes Integration ─────────────────────────────────────

  async hermesHealth(): Promise<boolean> {
    const health = await hermesBridge.healthCheck();
    return health.status === 'ok';
  }

  async hermesChat(req: HermesChatRequest): Promise<HermesChatResponse> {
    return hermesBridge.chat(req);
  }

  async hermesGetSkills(): Promise<Array<{ name: string; description: string; enabled: boolean }>> {
    return hermesBridge.getSkills();
  }

  async hermesExecuteSkill(name: string, prompt: string): Promise<HermesChatResponse> {
    return hermesBridge.executeSkill(name, prompt);
  }

  async hermesCreateTask(task: { title: string; description: string; assignee?: string }): Promise<{ id: string; status: string }> {
    return hermesBridge.createTask(task);
  }

  async hermesGetModels(): Promise<string[]> {
    return hermesBridge.getModels();
  }

  // ─── Jarvis Integration ─────────────────────────────────────

  async jarvisHealth(): Promise<boolean> {
    const status = await jarvisBridge.healthCheck();
    return status.status === 'online';
  }

  async jarvisExecuteCommand(req: JarvisCommandRequest): Promise<JarvisCommandResponse> {
    return jarvisBridge.executeCommand(req);
  }

  async jarvisDelegate(req: JarvisDelegateRequest): Promise<JarvisDelegateResponse> {
    return jarvisBridge.delegate(req);
  }

  async jarvisSendWhatsApp(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    return jarvisBridge.sendWhatsAppMessage(to, message);
  }

  async jarvisQueryRAG(query: string, context?: string): Promise<{ answer: string; sources: string[] }> {
    return jarvisBridge.queryRAG(query, context);
  }

  async jarvisGetDockerContainers(): Promise<Array<{ name: string; status: string; image: string }>> {
    return jarvisBridge.getDockerContainers();
  }

  async jarvisGetStatus(): Promise<{ status: string; version?: string; vncAvailable?: boolean; dockerAvailable?: boolean }> {
    return jarvisBridge.getStatus();
  }
}

// ─── Singleton ───────────────────────────────────────────────────

export const aiGateway = new AIGateway();
