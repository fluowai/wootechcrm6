/**
 * AI-OS Jarvis Routes
 * 
 * Express routes for Jarvis AI integration.
 * Mount at /api/ai-os/jarvis
 */

import { Router } from 'express';
import { jarvisBridge } from '../lib/jarvis-bridge.js';
import { aiGateway } from '../lib/ai-gateway.js';

const router = Router();

// ─── Health ──────────────────────────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const status = await jarvisBridge.healthCheck();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(503).json({ success: false, error: err.message });
  }
});

// ─── Status ──────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  try {
    const status = await jarvisBridge.getStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Commands ────────────────────────────────────────────────────

router.post('/commands/execute', async (req, res) => {
  try {
    const { command, context, timeout } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: 'command is required' });
    }

    const response = await jarvisBridge.executeCommand({ command, context, timeout });
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Delegation ──────────────────────────────────────────────────

router.post('/delegate', async (req, res) => {
  try {
    const { task, agent, priority, callbackUrl } = req.body;
    if (!task) {
      return res.status(400).json({ success: false, error: 'task is required' });
    }

    const response = await jarvisBridge.delegate({ task, agent, priority, callbackUrl });
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── WhatsApp ────────────────────────────────────────────────────

router.get('/whatsapp/status', async (req, res) => {
  try {
    const status = await jarvisBridge.getWhatsAppStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/whatsapp/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ success: false, error: 'to and message are required' });
    }

    const response = await jarvisBridge.sendWhatsAppMessage(to, message);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── RAG ─────────────────────────────────────────────────────────

router.post('/rag/query', async (req, res) => {
  try {
    const { query, context } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'query is required' });
    }

    const response = await jarvisBridge.queryRAG(query, context);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/rag/index', async (req, res) => {
  try {
    const { document, metadata } = req.body;
    if (!document) {
      return res.status(400).json({ success: false, error: 'document is required' });
    }

    const response = await jarvisBridge.indexDocument(document, metadata);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Docker ──────────────────────────────────────────────────────

router.get('/docker/containers', async (req, res) => {
  try {
    const containers = await jarvisBridge.getDockerContainers();
    res.json({ success: true, data: containers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/docker/exec', async (req, res) => {
  try {
    const { container, command } = req.body;
    if (!container || !command) {
      return res.status(400).json({ success: false, error: 'container and command are required' });
    }

    const response = await jarvisBridge.executeDockerCommand(container, command);
    res.json({ success: true, data: response });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── VNC ─────────────────────────────────────────────────────────

router.get('/vnc/status', async (req, res) => {
  try {
    const status = await jarvisBridge.getVNCStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
