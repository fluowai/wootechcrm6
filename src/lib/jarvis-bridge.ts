/**
 * Jarvis Bridge — HTTP Client for Jarvis AI Assistant
 *
 * Translates CRM events ↔ Jarvis.
 * Jarvis is a Python/FastAPI self-hosted AI with VNC, WhatsApp, RAG, Docker.
 * Dashboard: http://localhost:8443
 * API: http://jarvis:8443/api
 */

import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────

export interface JarvisConfig {
  baseUrl: string;
  username: string;
  password: string;
  secret: string;
}

export interface JarvisCommandRequest {
  command: string;
  context?: Record<string, unknown>;
  timeout?: number;
}

export interface JarvisCommandResponse {
  output: string;
  status: 'success' | 'error' | 'timeout';
  executionTimeMs: number;
}

export interface JarvisStatus {
  status: 'online' | 'offline' | 'error';
  version?: string;
  uptime?: number;
  vncAvailable?: boolean;
  dockerAvailable?: boolean;
  whatsappAvailable?: boolean;
}

export interface JarvisDelegateRequest {
  task: string;
  agent?: string;
  priority?: 'low' | 'normal' | 'high';
  callbackUrl?: string;
}

export interface JarvisDelegateResponse {
  taskId: string;
  status: 'accepted' | 'rejected';
  estimatedCompletion?: string;
}

// ─── Validation Schemas ──────────────────────────────────────────

export const JarvisCommandSchema = z.object({
  command: z.string().min(1).max(5000),
  context: z.record(z.string(), z.unknown()).optional(),
  timeout: z.number().positive().max(300000).optional(),
});

export const JarvisDelegateSchema = z.object({
  task: z.string().min(1).max(5000),
  agent: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  callbackUrl: z.string().url().optional(),
});

// ─── Jarvis Client ───────────────────────────────────────────────

class JarvisBridge {
  private config: JarvisConfig;
  private connected: boolean = false;
  private authToken: string | null = null;

  constructor() {
    this.config = {
      baseUrl: process.env.JARVIS_URL || 'http://jarvis:8443',
      username: process.env.JARVIS_USERNAME || 'admin',
      password: process.env.JARVIS_PASSWORD || 'admin',
      secret: process.env.JARVIS_SECRET || 'wootech-jarvis-secret-change-in-prod',
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    requiresAuth: boolean = true
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jarvis API error ${response.status}: ${error}`);
    }

    return response.json();
  }

  private async getAuthToken(): Promise<string | null> {
    if (this.authToken) return this.authToken;

    try {
      const response = await fetch(`${this.config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.config.username,
          password: this.config.password,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { token: string };
        this.authToken = data.token;
        return this.authToken;
      }
    } catch {
      // Auth failed
    }

    return null;
  }

  // ─── Health ──────────────────────────────────────────────────

  async healthCheck(): Promise<JarvisStatus> {
    try {
      const status = await this.request<JarvisStatus>('GET', '/api/health', undefined, false);
      this.connected = true;
      return status;
    } catch {
      this.connected = false;
      return { status: 'offline' };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // ─── Commands ───────────────────────────────────────────────

  async executeCommand(req: JarvisCommandRequest): Promise<JarvisCommandResponse> {
    const validated = JarvisCommandSchema.parse(req);
    const start = Date.now();

    const response = await this.request<{
      output: string;
      status: string;
    }>('POST', '/api/commands/execute', validated);

    return {
      output: response.output || '',
      status: (response.status as JarvisCommandResponse['status']) || 'success',
      executionTimeMs: Date.now() - start,
    };
  }

  // ─── Delegation ─────────────────────────────────────────────

  async delegate(req: JarvisDelegateRequest): Promise<JarvisDelegateResponse> {
    const validated = JarvisDelegateSchema.parse(req);

    return this.request<JarvisDelegateResponse>('POST', '/api/delegate', validated);
  }

  // ─── WhatsApp ───────────────────────────────────────────────

  async sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string }> {
    return this.request('POST', '/api/whatsapp/send', { to, message });
  }

  async getWhatsAppStatus(): Promise<{ connected: boolean; phone?: string }> {
    return this.request('GET', '/api/whatsapp/status');
  }

  // ─── RAG ────────────────────────────────────────────────────

  async queryRAG(query: string, context?: string): Promise<{ answer: string; sources: string[] }> {
    return this.request('POST', '/api/rag/query', { query, context });
  }

  async indexDocument(document: string, metadata?: Record<string, unknown>): Promise<{ success: boolean; documentId: string }> {
    return this.request('POST', '/api/rag/index', { document, metadata });
  }

  // ─── Docker ─────────────────────────────────────────────────

  async getDockerContainers(): Promise<Array<{ name: string; status: string; image: string }>> {
    return this.request('GET', '/api/docker/containers');
  }

  async executeDockerCommand(container: string, command: string): Promise<{ output: string; exitCode: number }> {
    return this.request('POST', '/api/docker/exec', { container, command });
  }

  // ─── VNC ────────────────────────────────────────────────────

  async getVNCStatus(): Promise<{ available: boolean; url?: string }> {
    return this.request('GET', '/api/vnc/status');
  }

  // ─── General ────────────────────────────────────────────────

  async getStatus(): Promise<JarvisStatus> {
    return this.request('GET', '/api/status');
  }

  async getConfig(): Promise<Record<string, unknown>> {
    return this.request('GET', '/api/config');
  }
}

// ─── Singleton ───────────────────────────────────────────────────

export const jarvisBridge = new JarvisBridge();
