/**
 * AIOS Routes — Express Router for /api/ai-os/*
 * 
 * All AI-BOS endpoints go through here.
 * Translates CRM requests ↔ Paperclip tasks.
 */

import { Router, Request, Response } from 'express';
import { aiGateway, CreateAgentSchema, CreateGoalSchema } from '../lib/ai-gateway';
import { generateCompletion, getAvailableProviders, getProviderStats } from '../lib/llm-router';

const router = Router();

// ─── Health & Status ─────────────────────────────────────────────

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const paperclipHealthy = await aiGateway.healthCheck();
    const providers = getAvailableProviders();

    res.json({
      status: paperclipHealthy ? 'ok' : 'degraded',
      paperclip: paperclipHealthy ? 'connected' : 'disconnected',
      providers: providers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

router.get('/providers', (_req: Request, res: Response) => {
  const stats = getProviderStats();
  res.json({ providers: stats });
});

// ─── Agents CRUD ─────────────────────────────────────────────────

router.get('/agents', async (_req: Request, res: Response) => {
  try {
    const agents = await aiGateway.getAgents();
    res.json({ agents });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch agents',
    });
  }
});

router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await aiGateway.getAgent(req.params.id);
    res.json({ agent });
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Agent not found',
    });
  }
});

router.post('/agents', async (req: Request, res: Response) => {
  try {
    const validated = CreateAgentSchema.parse(req.body);
    const agent = await aiGateway.createAgent(validated);
    res.status(201).json({ agent });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid agent data',
    });
  }
});

router.patch('/agents/:id', async (req: Request, res: Response) => {
  try {
    const agent = await aiGateway.updateAgent(req.params.id, req.body);
    res.json({ agent });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update agent',
    });
  }
});

router.delete('/agents/:id', async (req: Request, res: Response) => {
  try {
    await aiGateway.deleteAgent(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to delete agent',
    });
  }
});

router.post('/agents/:id/pause', async (req: Request, res: Response) => {
  try {
    const agent = await aiGateway.pauseAgent(req.params.id);
    res.json({ agent });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to pause agent',
    });
  }
});

router.post('/agents/:id/resume', async (req: Request, res: Response) => {
  try {
    const agent = await aiGateway.resumeAgent(req.params.id);
    res.json({ agent });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to resume agent',
    });
  }
});

// ─── Goals CRUD ──────────────────────────────────────────────────

router.get('/goals', async (_req: Request, res: Response) => {
  try {
    const goals = await aiGateway.getGoals();
    res.json({ goals });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch goals',
    });
  }
});

router.get('/goals/:id', async (req: Request, res: Response) => {
  try {
    const goal = await aiGateway.getGoal(req.params.id);
    res.json({ goal });
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : 'Goal not found',
    });
  }
});

router.post('/goals', async (req: Request, res: Response) => {
  try {
    const validated = CreateGoalSchema.parse(req.body);
    const goal = await aiGateway.createGoal(validated);
    res.status(201).json({ goal });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid goal data',
    });
  }
});

router.patch('/goals/:id', async (req: Request, res: Response) => {
  try {
    const goal = await aiGateway.updateGoal(req.params.id, req.body);
    res.json({ goal });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update goal',
    });
  }
});

router.delete('/goals/:id', async (req: Request, res: Response) => {
  try {
    await aiGateway.deleteGoal(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to delete goal',
    });
  }
});

// ─── Activities ──────────────────────────────────────────────────

router.get('/activities', async (req: Request, res: Response) => {
  try {
    const { agentId, action, limit, offset } = req.query;
    const activities = await aiGateway.getActivities({
      agentId: agentId as string,
      action: action as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });
    res.json({ activities });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch activities',
    });
  }
});

// ─── Suggestions ─────────────────────────────────────────────────

router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { agentId, status, limit } = req.query;
    const suggestions = await aiGateway.getSuggestions({
      agentId: agentId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch suggestions',
    });
  }
});

router.patch('/suggestions/:id', async (req: Request, res: Response) => {
  try {
    const suggestion = await aiGateway.updateSuggestion(req.params.id, req.body);
    res.json({ suggestion });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to update suggestion',
    });
  }
});

// ─── Conversations ──────────────────────────────────────────────

router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const { agentId, status, limit } = req.query;
    const conversations = await aiGateway.getConversations({
      agentId: agentId as string,
      status: status as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch conversations',
    });
  }
});

router.post('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    await aiGateway.sendMessage(req.params.id, content);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Failed to send message',
    });
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

    const response = await generateCompletion({
      messages,
      model,
      temperature,
      maxTokens,
    });

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'LLM generation failed',
    });
  }
});

// ─── CRM Event Bridge ───────────────────────────────────────────

router.post('/events/crm', async (req: Request, res: Response) => {
  try {
    await aiGateway.notifyCRMEvent(req.body);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to notify CRM event',
    });
  }
});

router.get('/metrics/crm', async (_req: Request, res: Response) => {
  try {
    const metrics = await aiGateway.getCRMMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch CRM metrics',
    });
  }
});

export default router;
