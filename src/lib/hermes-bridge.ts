/**
 * Hermes Bridge — HTTP Client for Hermes Agent
 *
 * Translates CRM events ↔ Hermes gateway.
 * Hermes is a self-hosted LLM gateway with skill system.
 * Dashboard: http://localhost:9119
 * API: http://hermes:8642/v1
 */

import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────

export interface HermesConfig {
  baseUrl: string;
  dashboardPass: string;
}

export interface HermesChatRequest {
  model?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface HermesChatResponse {
  content: string;
  model: string;
  tokens: { input: number; output: number; total: number };
  latencyMs: number;
}

export interface HermesSkill {
  name: string;
  description: string;
  path: string;
  enabled: boolean;
}

export interface HermesHealth {
  status: 'ok' | 'error';
  version?: string;
  uptime?: number;
  model?: string;
  gatewayMode?: boolean;
}

// ─── Validation Schemas ──────────────────────────────────────────

export const HermesChatSchema = z.object({
  model: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export const HermesSkillSchema = z.object({
  name: z.string().min(1).max(100),
  prompt: z.string().min(1).max(5000),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

// ─── Hermes Client ───────────────────────────────────────────────

class HermesBridge {
  private config: HermesConfig;
  private connected: boolean = false;

  constructor() {
    this.config = {
      baseUrl: process.env.HERMES_URL || 'http://hermes:8642',
      dashboardPass: process.env.HERMES_DASHBOARD_PASS || 'admin',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hermes API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  // ─── Health ──────────────────────────────────────────────────

  async healthCheck(): Promise<HermesHealth> {
    try {
      const health = await this.request<HermesHealth>('GET', '/health');
      this.connected = true;
      return health;
    } catch {
      this.connected = false;
      return { status: 'error' };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ─── Chat ────────────────────────────────────────────────────

  async chat(req: HermesChatRequest): Promise<HermesChatResponse> {
    const validated = HermesChatSchema.parse(req);
    const start = Date.now();

    const response = await this.request<{
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model: string;
    }>('POST', '/v1/chat/completions', validated);

    const content = response.choices?.[0]?.message?.content || '';
    const tokens = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      content,
      model: response.model || validated.model || 'unknown',
      tokens,
      latencyMs: Date.now() - start,
    };
  }

  // ─── Skills ─────────────────────────────────────────────────

  async getSkills(): Promise<HermesSkill[]> {
    return this.request<HermesSkill[]>('GET', '/api/skills');
  }

  async getSkill(name: string): Promise<HermesSkill> {
    return this.request<HermesSkill>('GET', `/api/skills/${name}`);
  }

  async executeSkill(name: string, prompt: string): Promise<HermesChatResponse> {
    const validated = HermesSkillSchema.parse({ name, prompt });
    const start = Date.now();

    const response = await this.request<{
      content: string;
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    }>('POST', `/api/skills/${validated.name}/execute`, { prompt: validated.prompt });

    const tokens = {
      input: response.usage?.prompt_tokens || 0,
      output: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    };

    return {
      content: response.content,
      model: response.model,
      tokens,
      latencyMs: Date.now() - start,
    };
  }

  // ─── Tasks ──────────────────────────────────────────────────

  async createTask(task: {
    title: string;
    description: string;
    assignee?: string;
    priority?: 'low' | 'normal' | 'high';
  }): Promise<{ id: string; status: string }> {
    return this.request('POST', '/api/tasks', task);
  }

  async getTasks(): Promise<Array<{ id: string; title: string; status: string }>> {
    return this.request('GET', '/api/tasks');
  }

  async getTask(id: string): Promise<{ id: string; title: string; status: string; result?: string }> {
    return this.request('GET', `/api/tasks/${id}`);
  }

  // ─── Gateway Mode ──────────────────────────────────────────

  async getModels(): Promise<string[]> {
    const response = await this.request<{ models: string[] }>('GET', '/v1/models');
    return response.models || [];
  }

  async getProviderStatus(): Promise<Record<string, unknown>> {
    return this.request('GET', '/api/providers');
  }
}

// ─── Singleton ───────────────────────────────────────────────────

export const hermesBridge = new HermesBridge();
