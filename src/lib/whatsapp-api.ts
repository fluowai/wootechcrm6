/**
 * WhatsApp Instances API Client
 * Thin wrapper around /api/whatsapp/instances/*
 */

import type { WhatsAppInstance, WhatsAppInstanceLink, WhatsAppInstanceMessage } from '../types';

const BASE = '/api/whatsapp/instances';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Instances ───────────────────────────────────────────────────

export async function listInstances(userId?: string): Promise<WhatsAppInstance[]> {
  const qs = userId ? `?userId=${userId}` : '';
  const res = await request<{ success: boolean; instances: WhatsAppInstance[] }>(qs);
  return res.instances || [];
}

export async function createInstance(data: {
  name: string;
  description?: string;
  userId?: string;
}): Promise<WhatsAppInstance> {
  const res = await request<{ success: boolean; instance: WhatsAppInstance }>('', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.instance;
}

export async function getInstance(id: string): Promise<WhatsAppInstance> {
  const res = await request<{ success: boolean; instance: WhatsAppInstance }>(`/${id}`);
  return res.instance;
}

export async function updateInstance(
  id: string,
  data: { name?: string; description?: string; settings?: Record<string, any> }
): Promise<WhatsAppInstance> {
  const res = await request<{ success: boolean; instance: WhatsAppInstance }>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return res.instance;
}

export async function deleteInstance(id: string): Promise<void> {
  await request<{ success: boolean }>(`/${id}`, { method: 'DELETE' });
}

// ─── Connection ──────────────────────────────────────────────────

export async function connectInstance(id: string): Promise<{ status: string }> {
  const res = await request<{ success: boolean; status: string }>(`/${id}/connect`, {
    method: 'POST',
  });
  return { status: res.status };
}

export async function disconnectInstance(id: string): Promise<void> {
  await request<{ success: boolean }>(`/${id}/disconnect`, { method: 'POST' });
}

export async function reconnectInstance(id: string): Promise<{ status: string }> {
  const res = await request<{ success: boolean; status: string }>(`/${id}/reconnect`, {
    method: 'POST',
  });
  return { status: res.status };
}

export async function reconnectAll(): Promise<Record<string, string>> {
  const res = await request<{ success: boolean; reconnecting: Record<string, string> }>(
    '/reconnect-all',
    { method: 'POST' }
  );
  return res.reconnecting || {};
}

// ─── QR ──────────────────────────────────────────────────────────

export async function getQR(id: string): Promise<{ qr: string; status: string }> {
  const res = await request<{ success: boolean; qr: string; status: string }>(`/${id}/qr`);
  return { qr: res.qr, status: res.status };
}

// ─── Send ────────────────────────────────────────────────────────

export async function sendMessage(
  id: string,
  to: string,
  message: string
): Promise<{ success: boolean; to: string }> {
  return request<{ success: boolean; to: string }>(`/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ to, message }),
  });
}

// ─── Validate ────────────────────────────────────────────────────

export async function validateNumber(
  id: string,
  number: string
): Promise<{ valid: boolean; jid?: string }> {
  return request<{ valid: boolean; jid?: string }>(`/${id}/validate?number=${encodeURIComponent(number)}`);
}

// ─── Messages ────────────────────────────────────────────────────

export async function getMessages(
  id: string,
  opts?: { chatJid?: string; limit?: number; offset?: number }
): Promise<WhatsAppInstanceMessage[]> {
  const params = new URLSearchParams();
  if (opts?.chatJid) params.set('chatJid', opts.chatJid);
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.offset) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const res = await request<{ success: boolean; messages: WhatsAppInstanceMessage[] }>(
    `/${id}/messages${qs ? '?' + qs : ''}`
  );
  return res.messages || [];
}

// ─── Chats ───────────────────────────────────────────────────────

export interface ChatSummary {
  chatJid: string;
  contactName: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  isGroup: boolean;
  groupName?: string;
}

export async function getChats(id: string): Promise<ChatSummary[]> {
  const res = await request<{ success: boolean; chats: ChatSummary[] }>(`/${id}/chats`);
  return res.chats || [];
}

// ─── Service Links ───────────────────────────────────────────────

export async function getLinks(id: string): Promise<WhatsAppInstanceLink[]> {
  const res = await request<{ success: boolean; links: WhatsAppInstanceLink[] }>(`/${id}/links`);
  return res.links || [];
}

export async function createLink(
  instanceId: string,
  data: {
    serviceType: string;
    serviceId: string;
    serviceName?: string;
    config?: Record<string, any>;
  }
): Promise<WhatsAppInstanceLink> {
  const res = await request<{ success: boolean; link: WhatsAppInstanceLink }>(`/${instanceId}/links`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.link;
}

export async function deleteLink(instanceId: string, linkId: string): Promise<void> {
  await request<{ success: boolean }>(`/${instanceId}/links/${linkId}`, { method: 'DELETE' });
}

// ─── Available Services (for linking) ────────────────────────────

export interface ServiceOption {
  id: string;
  name: string;
  type: 'ai_agent' | 'automation';
  status?: string;
  description?: string;
}

export async function getAvailableAgents(): Promise<ServiceOption[]> {
  try {
    const res = await fetch('/api/ai-os/agents', { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.agents || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: 'ai_agent' as const,
      status: a.status,
      description: a.mission || a.role,
    }));
  } catch {
    return [];
  }
}

export async function getAvailableAutomations(): Promise<ServiceOption[]> {
  try {
    const res = await fetch('/api/ai-os/automations', { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.automations || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      type: 'automation' as const,
      status: a.active ? 'active' : 'inactive',
      description: a.description,
    }));
  } catch {
    return [];
  }
}
