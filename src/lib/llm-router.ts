/**
 * LLM Router — Multi-Provider Fallback System
 * 
 * Maximiza uso de provedores gratuitos com fallback automático.
 * Prioridade: Gemini → Groq → OpenRouter → Cerebras → NVIDIA NIM → Mistral → DeepSeek → Ollama local
 * 
 * Cada provedor tem rate limits diferentes. O router tenta o próximo quando o atual falha.
 */

import { z } from 'zod';

// ─── Types ───────────────────────────────────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  agentId?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  tokens: { input: number; output: number; total: number };
  latencyMs: number;
  cached: boolean;
}

export type LLMProvider = 
  | 'gemini'
  | 'groq'
  | 'openrouter'
  | 'cerebras'
  | 'nvidia-nim'
  | 'mistral'
  | 'deepseek'
  | 'huggingface'
  | 'ollama'
  | 'cohere'
  | 'cloudflare'
  | 'puter';

interface ProviderConfig {
  name: LLMProvider;
  priority: number;
  baseUrl: string;
  apiKeyEnv: string;
  models: string[];
  defaultModel: string;
  maxTokensPerRequest: number;
  rateLimitPerMinute: number;
  free: boolean;
}

// ─── Provider Registry ───────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'gemini',
    priority: 1,
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GEMINI_API_KEY',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    maxTokensPerRequest: 8192,
    rateLimitPerMinute: 15,
    free: true,
  },
  {
    name: 'groq',
    priority: 2,
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defaultModel: 'llama-3.3-70b-versatile',
    maxTokensPerRequest: 32768,
    rateLimitPerMinute: 30,
    free: true,
  },
  {
    name: 'openrouter',
    priority: 3,
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: ['meta-llama/llama-3.3-70b-instruct', 'qwen/qwen-2.5-72b-instruct'],
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    maxTokensPerRequest: 8192,
    rateLimitPerMinute: 20,
    free: true,
  },
  {
    name: 'cerebras',
    priority: 4,
    baseUrl: 'https://api.cerebras.ai/v1',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    models: ['llama-3.3-70b', 'llama-3.1-8b'],
    defaultModel: 'llama-3.3-70b',
    maxTokensPerRequest: 8192,
    rateLimitPerMinute: 30,
    free: true,
  },
  {
    name: 'nvidia-nim',
    priority: 5,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    apiKeyEnv: 'NVIDIA_NIM_API_KEY',
    models: ['meta/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'],
    defaultModel: 'meta/llama-3.3-70b-instruct',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'mistral',
    priority: 6,
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: ['mistral-small-latest', 'mistral-medium-latest'],
    defaultModel: 'mistral-small-latest',
    maxTokensPerRequest: 8192,
    rateLimitPerMinute: 30,
    free: true,
  },
  {
    name: 'deepseek',
    priority: 7,
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'huggingface',
    priority: 8,
    baseUrl: 'https://api-inference.huggingface.co/v1',
    apiKeyEnv: 'HUGGINGFACE_API_KEY',
    models: ['meta-llama/Llama-3.3-70B-Instruct', 'Qwen/Qwen2.5-72B-Instruct'],
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'cohere',
    priority: 9,
    baseUrl: 'https://api.cohere.com/v2',
    apiKeyEnv: 'COHERE_API_KEY',
    models: ['command-r-plus', 'command-r'],
    defaultModel: 'command-r',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'cloudflare',
    priority: 10,
    baseUrl: 'https://api.cloudflare.com/client/v4',
    apiKeyEnv: 'CLOUDFLARE_API_KEY',
    models: ['@cf/meta/llama-3.3-70b-instruct-fp16'],
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp16',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'puter',
    priority: 11,
    baseUrl: 'https://api.puter.com/v1',
    apiKeyEnv: 'PUTER_API_KEY',
    models: ['gpt-4o-mini'],
    defaultModel: 'gpt-4o-mini',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 10,
    free: true,
  },
  {
    name: 'ollama',
    priority: 12,
    baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    apiKeyEnv: '',
    models: ['llama3.1:8b', 'llama3.1:70b', 'mistral:7b', 'codellama:13b'],
    defaultModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    maxTokensPerRequest: 4096,
    rateLimitPerMinute: 999,
    free: true,
  },
];

// ─── Rate Limit Tracker ──────────────────────────────────────────

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(provider: LLMProvider): boolean {
  const config = PROVIDERS.find(p => p.name === provider);
  if (!config) return false;

  const now = Date.now();
  const limit = rateLimits.get(provider);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(provider, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= config.rateLimitPerMinute) {
    return false;
  }

  limit.count++;
  return true;
}

// ─── Provider Callers ────────────────────────────────────────────

async function callGemini(req: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const model = req.model || config.defaultModel;
  const start = Date.now();

  const response = await fetch(
    `${config.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: req.messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        systemInstruction: req.messages.find(m => m.role === 'system')
          ? { parts: [{ text: req.messages.find(m => m.role === 'system')!.content }] }
          : undefined,
        generationConfig: {
          temperature: req.temperature ?? 0.7,
          maxOutputTokens: req.maxTokens ?? config.maxTokensPerRequest,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokens = {
    input: data.usageMetadata?.promptTokenCount || 0,
    output: data.usageMetadata?.candidatesTokenCount || 0,
    total: data.usageMetadata?.totalTokenCount || 0,
  };

  return {
    content,
    provider: 'gemini',
    model,
    tokens,
    latencyMs: Date.now() - start,
    cached: false,
  };
}

async function callOpenAICompatible(
  req: LLMRequest,
  config: ProviderConfig,
  provider: LLMProvider
): Promise<LLMResponse> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error(`${config.apiKeyEnv} not set`);

  const model = req.model || config.defaultModel;
  const start = Date.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter special headers
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://wootechcrm.com';
    headers['X-Title'] = 'WooTech CRM';
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? config.maxTokensPerRequest,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${provider} error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokens = {
    input: data.usage?.prompt_tokens || 0,
    output: data.usage?.completion_tokens || 0,
    total: data.usage?.total_tokens || 0,
  };

  return {
    content,
    provider,
    model,
    tokens,
    latencyMs: Date.now() - start,
    cached: false,
  };
}

async function callOllama(req: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
  const model = req.model || config.defaultModel;
  const start = Date.now();

  const response = await fetch(`${config.baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: req.messages,
      stream: false,
      options: {
        temperature: req.temperature ?? 0.7,
        num_predict: req.maxTokens ?? config.maxTokensPerRequest,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Ollama error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.message?.content || '';
  const tokens = {
    input: data.prompt_eval_count || 0,
    output: data.eval_count || 0,
    total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
  };

  return {
    content,
    provider: 'ollama',
    model,
    tokens,
    latencyMs: Date.now() - start,
    cached: false,
  };
}

async function callCohere(req: LLMRequest, config: ProviderConfig): Promise<LLMResponse> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error('COHERE_API_KEY not set');

  const model = req.model || config.defaultModel;
  const start = Date.now();

  const response = await fetch(`${config.baseUrl}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? config.maxTokensPerRequest,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cohere error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const content = data.message?.content?.[0]?.text || '';
  const tokens = {
    input: data.usage?.tokens?.input_tokens || 0,
    output: data.usage?.tokens?.output_tokens || 0,
    total: (data.usage?.tokens?.input_tokens || 0) + (data.usage?.tokens?.output_tokens || 0),
  };

  return {
    content,
    provider: 'cohere',
    model,
    tokens,
    latencyMs: Date.now() - start,
    cached: false,
  };
}

// ─── Main Router ─────────────────────────────────────────────────

const PROVIDER_CALLERS: Record<LLMProvider, (req: LLMRequest, config: ProviderConfig) => Promise<LLMResponse>> = {
  gemini: callGemini,
  groq: (req, config) => callOpenAICompatible(req, config, 'groq'),
  openrouter: (req, config) => callOpenAICompatible(req, config, 'openrouter'),
  cerebras: (req, config) => callOpenAICompatible(req, config, 'cerebras'),
  'nvidia-nim': (req, config) => callOpenAICompatible(req, config, 'nvidia-nim'),
  mistral: (req, config) => callOpenAICompatible(req, config, 'mistral'),
  deepseek: (req, config) => callOpenAICompatible(req, config, 'deepseek'),
  huggingface: (req, config) => callOpenAICompatible(req, config, 'huggingface'),
  ollama: callOllama,
  cohere: callCohere,
  cloudflare: (req, config) => callOpenAICompatible(req, config, 'cloudflare'),
  puter: (req, config) => callOpenAICompatible(req, config, 'puter'),
};

/**
 * Generate a completion using the LLM fallback chain.
 * Tries providers in priority order, skipping those without API keys.
 */
export async function generateCompletion(req: LLMRequest): Promise<LLMResponse> {
  const errors: Array<{ provider: LLMProvider; error: string }> = [];

  // Sort providers by priority
  const sortedProviders = [...PROVIDERS].sort((a, b) => a.priority - b.priority);

  for (const config of sortedProviders) {
    // Skip if no API key (except Ollama which doesn't need one)
    if (config.apiKeyEnv && !process.env[config.apiKeyEnv]) {
      continue;
    }

    // Skip if rate limited
    if (!checkRateLimit(config.name)) {
      errors.push({ provider: config.name, error: 'Rate limited' });
      continue;
    }

    try {
      const caller = PROVIDER_CALLERS[config.name];
      const response = await caller(req, config);
      
      // Log successful usage
      console.log(`[LLM] ${config.name} success in ${response.latencyMs}ms`);
      
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ provider: config.name, error: errorMessage });
      console.warn(`[LLM] ${config.name} failed: ${errorMessage}`);
      continue;
    }
  }

  throw new Error(`All LLM providers failed: ${errors.map(e => `${e.provider}: ${e.error}`).join(', ')}`);
}

/**
 * Check which providers are available (have API keys configured).
 */
export function getAvailableProviders(): Array<{ name: LLMProvider; free: boolean; models: string[] }> {
  return PROVIDERS
    .filter(p => !p.apiKeyEnv || process.env[p.apiKeyEnv])
    .map(p => ({ name: p.name, free: p.free, models: p.models }));
}

/**
 * Get provider stats for monitoring.
 */
export function getProviderStats(): Array<{
  name: LLMProvider;
  available: boolean;
  rateLimitRemaining: number;
  priority: number;
}> {
  return PROVIDERS.map(config => {
    const limit = rateLimits.get(config.name);
    const remaining = limit
      ? Math.max(0, config.rateLimitPerMinute - limit.count)
      : config.rateLimitPerMinute;
    
    return {
      name: config.name,
      available: !config.apiKeyEnv || !!process.env[config.apiKeyEnv],
      rateLimitRemaining: remaining,
      priority: config.priority,
    };
  });
}
