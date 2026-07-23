/**
 * AI-OS Hermes Routes
 * 
 * Express routes for Hermes Agent integration.
 * Mount at /api/ai-os/hermes
 */

import { Router } from 'express';
import { hermesBridge } from '../lib/hermes-bridge.js';
import { aiGateway } from '../lib/ai-gateway.js';

const router = Router();

// ─── Health ──────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const health = await hermesBridge.healthCheck();
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// ─── Chat ────────────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
  try {
    const { model, messages, temperature, maxTokens } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    const response = await hermesBridge.chat({ model, messages, temperature, maxTokens });
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Skills ──────────────────────────────────────────────────────

router.get('/skills', async (req, res) => {
  try {
    const skills = await hermesBridge.getSkills();
    res.json({ success: true, data: skills });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/skills/:name', async (req, res) => {
  try {
    const skill = await hermesBridge.getSkill(req.params.name);
    res.json({ success: true, data: skill });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/skills/:name/execute', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'prompt is required' });
    }

    const response = await hermesBridge.executeSkill(req.params.name, prompt);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Tasks ───────────────────────────────────────────────────────

router.post('/tasks', async (req, res) => {
  try {
    const { title, description, assignee, priority } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, error: 'title and description are required' });
    }

    const task = await hermesBridge.createTask({ title, description, assignee, priority });
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await hermesBridge.getTasks();
    res.json({ success: true, data: tasks });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/tasks/:id', async (req, res) => {
  try {
    const task = await hermesBridge.getTask(req.params.id);
    res.json({ success: true, data: task });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Models ──────────────────────────────────────────────────────

router.get('/models', async (req, res) => {
  try {
    const models = await hermesBridge.getModels();
    res.json({ success: true, data: models });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Providers ───────────────────────────────────────────────────

router.get('/providers', async (req, res) => {
  try {
    const providers = await hermesBridge.getProviderStatus();
    res.json({ success: true, data: providers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
