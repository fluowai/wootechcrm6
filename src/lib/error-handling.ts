/**
 * AIOS Error Handling — Graceful Degradation
 * 
 * Handles errors gracefully, ensuring the system continues to function
 * even when individual components fail.
 */

import { supabaseAdmin } from './supabase';
import { emitSystemAlert } from './websocket-events';

// ─── Types ───────────────────────────────────────────────────────

interface ErrorContext {
  component: string;
  operation: string;
  agentId?: string;
  userId?: string;
  timestamp?: string;
  error: Error;
  metadata?: Record<string, unknown>;
}

interface RecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'alert' | 'shutdown';
  delay?: number;
  fallbackValue?: unknown;
  message?: string;
}

// ─── Error Handler ───────────────────────────────────────────────

/**
 * Handle errors with graceful degradation
 */
export async function handleError(
  context: Omit<ErrorContext, 'timestamp'>,
  recovery: RecoveryAction = { type: 'skip' }
): Promise<{ success: boolean; result?: unknown }> {
  const errorContext: ErrorContext = {
    ...context,
    timestamp: new Date().toISOString(),
  };

  // Log error to database
  await logError(errorContext);

  // Emit system alert
  emitSystemAlert(
    recovery.type === 'shutdown' ? 'error' : 'warning',
    `[${context.component}] ${context.operation} failed: ${context.error.message}`,
    {
      component: context.component,
      operation: context.operation,
      agentId: context.agentId,
      recoveryType: recovery.type,
    }
  );

  // Execute recovery action
  switch (recovery.type) {
    case 'retry':
      return await retryOperation(context, recovery.delay || 1000);

    case 'fallback':
      return { success: true, result: recovery.fallbackValue };

    case 'skip':
      console.warn(`[AIOS] Skipping failed operation: ${context.operation}`);
      return { success: false };

    case 'alert':
      console.error(`[AIOS] Critical error: ${context.operation}`, context.error);
      return { success: false };

    case 'shutdown':
      console.error(`[AIOS] Shutting down due to critical error: ${context.operation}`);
      process.exit(1);

    default:
      return { success: false };
  }
}

/**
 * Retry an operation with exponential backoff
 */
async function retryOperation(
  context: Omit<ErrorContext, 'timestamp'>,
  delay: number,
  maxRetries: number = 3
): Promise<{ success: boolean; result?: unknown }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[AIOS] Retry attempt ${attempt}/${maxRetries} for ${context.operation}`);
    
    await new Promise(resolve => setTimeout(resolve, delay * attempt));
    
    try {
      // This would need to be implemented per-operation
      // For now, just log and return failure
      console.log(`[AIOS] Retry ${attempt} for ${context.operation}`);
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false };
      }
    }
  }

  return { success: false };
}

/**
 * Log error to database
 */
async function logError(context: ErrorContext): Promise<void> {
  try {
    await supabaseAdmin.from('ai_errors').insert({
      component: context.component,
      operation: context.operation,
      agent_id: context.agentId || null,
      user_id: context.userId || null,
      error_message: context.error.message,
      error_stack: context.error.stack,
      metadata: context.metadata || {},
      timestamp: context.timestamp,
    });
  } catch (err) {
    console.error('[AIOS] Failed to log error to database:', err);
  }
}

// ─── Component-Specific Error Handlers ───────────────────────────

/**
 * Handle LLM provider errors
 */
export async function handleLLMError(
  provider: string,
  error: Error,
  agentId?: string
): Promise<{ success: boolean; fallbackProvider?: string }> {
  console.error(`[AIOS] LLM error from ${provider}:`, error.message);

  // Log the error
  await logError({
    component: 'llm-router',
    operation: `generateCompletion(${provider})`,
    agentId,
    error,
    metadata: { provider },
  });

  // Determine fallback provider
  const fallbackProviders = ['gemini', 'groq', 'openrouter', 'cerebras', 'ollama'];
  const fallbackProvider = fallbackProviders.find(p => p !== provider);

  if (fallbackProvider) {
    return { success: false, fallbackProvider };
  }

  return { success: false };
}

/**
 * Handle Paperclip connection errors
 */
export async function handlePaperclipError(
  error: Error
): Promise<{ success: boolean; degraded: boolean }> {
  console.error('[AIOS] Paperclip connection error:', error.message);

  await logError({
    component: 'paperclip',
    operation: 'connection',
    error,
    metadata: { url: process.env.PAPERCLIP_URL },
  });

  // Emit alert
  emitSystemAlert('error', 'Paperclip connection lost. Operating in degraded mode.', {
    error: error.message,
  });

  // Return degraded mode flag
  return { success: false, degraded: true };
}

/**
 * Handle Supabase errors
 */
export async function handleSupabaseError(
  operation: string,
  error: Error
): Promise<{ success: boolean }> {
  console.error(`[AIOS] Supabase error in ${operation}:`, error.message);

  await logError({
    component: 'supabase',
    operation,
    error,
  });

  return { success: false };
}

/**
 * Handle WebSocket errors
 */
export async function handleWebSocketError(
  error: Error
): Promise<void> {
  console.error('[AIOS] WebSocket error:', error.message);

  await logError({
    component: 'websocket',
    operation: 'emit',
    error,
  });
}

// ─── Health Check ────────────────────────────────────────────────

/**
 * Perform system health check
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, { status: string; latency?: number; error?: string }>;
}> {
  const components: Record<string, { status: string; latency?: number; error?: string }> = {};
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check Supabase
  try {
    const start = Date.now();
    await supabaseAdmin.from('ai_agents').select('id').limit(1);
    components.supabase = { status: 'ok', latency: Date.now() - start };
  } catch (error) {
    components.supabase = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
    overallStatus = 'unhealthy';
  }

  // Check Paperclip
  try {
    const start = Date.now();
    const response = await fetch(`${process.env.PAPERCLIP_URL || 'http://localhost:4100'}/health`);
    components.paperclip = { 
      status: response.ok ? 'ok' : 'error', 
      latency: Date.now() - start 
    };
    if (!response.ok) overallStatus = 'degraded';
  } catch (error) {
    components.paperclip = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
    overallStatus = 'degraded';
  }

  // Check Ollama
  try {
    const start = Date.now();
    const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:11434'}/api/tags`);
    components.ollama = { 
      status: response.ok ? 'ok' : 'error', 
      latency: Date.now() - start 
    };
  } catch (error) {
    components.ollama = { 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
    // Ollama is optional, so don't degrade overall status
  }

  return { status: overallStatus, components };
}

// ─── Circuit Breaker ─────────────────────────────────────────────

const circuitBreakers = new Map<string, {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
}>();

/**
 * Check if circuit breaker is open (should skip operation)
 */
export function isCircuitOpen(component: string): boolean {
  const breaker = circuitBreakers.get(component);
  if (!breaker) return false;

  if (breaker.state === 'open') {
    // Check if enough time has passed to try again
    const timeSinceLastFailure = Date.now() - breaker.lastFailure;
    if (timeSinceLastFailure > 60000) { // 1 minute
      breaker.state = 'half-open';
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Record circuit breaker failure
 */
export function recordCircuitFailure(component: string): void {
  const breaker = circuitBreakers.get(component) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed' as const,
  };

  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= 5) {
    breaker.state = 'open';
    console.warn(`[AIOS] Circuit breaker opened for ${component} after ${breaker.failures} failures`);
  }

  circuitBreakers.set(component, breaker);
}

/**
 * Record circuit breaker success
 */
export function recordCircuitSuccess(component: string): void {
  circuitBreakers.delete(component);
}
