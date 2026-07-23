/**
 * WhatsApp Instances Routes — Multi-Instance Management
 *
 * CRUD de instâncias no Supabase + proxy para Go service (whatsmeow).
 * Webhook handler: recebe eventos do Go, emite via Socket.io, persiste mensagens.
 */

import { Router, Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { supabaseAdmin } from '../lib/supabase';
import axios from 'axios';

const WHATSAPP_API_URL = process.env.WHATSAPP_BRIDGE_URL || process.env.WHATSAPP_API_URL || 'http://localhost:8091';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || '';
const bridgeHeaders = BRIDGE_SECRET ? { 'X-Bridge-Secret': BRIDGE_SECRET } : {};

// ─── Mappers: snake_case ↔ camelCase ─────────────────────────────

function instanceToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    phoneNumber: row.phone_number,
    status: row.status,
    qrCode: row.qr_code,
    webhookSecret: row.webhook_secret,
    settings: row.settings || {},
    lastConnectedAt: row.last_connected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function linkToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    instanceId: row.instance_id,
    serviceType: row.service_type,
    serviceId: row.service_id,
    serviceName: row.service_name,
    config: row.config || {},
    active: row.active,
    createdAt: row.created_at,
  };
}

function messageToCamel(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    instanceId: row.instance_id,
    chatJid: row.chat_jid,
    senderJid: row.sender_jid,
    senderName: row.sender_name,
    content: row.content,
    messageType: row.message_type,
    isGroup: row.is_group,
    groupName: row.group_name,
    direction: row.direction,
    status: row.status,
    timestamp: row.timestamp,
    rawEvent: row.raw_event,
    createdAt: row.created_at,
  };
}

// ─── Router Factory (receives Socket.io instance) ────────────────

export default function createWhatsAppInstancesRouter(io: SocketIOServer) {
  const router = Router();

  // ─── GET /instances — List user's instances ─────────────────────
  router.get('/instances', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string || '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabaseAdmin
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with Go service status
      const enriched = await Promise.all(
        (data || []).map(async (row: any) => {
          try {
            const goRes = await axios.get(`${WHATSAPP_API_URL}/instances/${row.id}/status`, { timeout: 3000, headers: bridgeHeaders });
            return {
              ...instanceToCamel(row),
              status: goRes.data?.status || row.status,
              phoneNumber: goRes.data?.phoneNumber || row.phone_number,
            };
          } catch {
            return instanceToCamel(row);
          }
        })
      );

      res.json({ success: true, instances: enriched });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── POST /instances — Create instance ──────────────────────────
  router.post('/instances', async (req: Request, res: Response) => {
    try {
      const userId = req.body.userId || '00000000-0000-0000-0000-000000000000';
      const { name, description, settings } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, error: 'name is required' });
      }

      // Create in Supabase first
      const { data: dbRow, error: dbError } = await supabaseAdmin
        .from('whatsapp_instances')
        .insert({
          user_id: userId,
          name,
          description: description || null,
          status: 'disconnected',
          settings: settings || {},
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create in Go service
      try {
        await axios.post(`${WHATSAPP_API_URL}/instances`, {
          id: dbRow.id,
          name,
          webhookUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/whatsapp/instances/webhook`,
        }, { timeout: 5000, headers: bridgeHeaders });
      } catch (goErr: any) {
        console.warn('[WA Instances] Go service create failed:', goErr.message);
      }

      res.json({ success: true, instance: instanceToCamel(dbRow) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── GET /instances/:id — Get instance details ──────────────────
  router.get('/instances/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('whatsapp_instances')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ success: false, error: 'Instance not found' });
      }

      // Get live status from Go
      let liveStatus = data.status;
      let phoneNumber = data.phone_number;
      try {
        const goRes = await axios.get(`${WHATSAPP_API_URL}/instances/${id}/status`, { timeout: 3000, headers: bridgeHeaders });
        liveStatus = goRes.data?.status || data.status;
        phoneNumber = goRes.data?.phoneNumber || data.phone_number;
      } catch { /* Go offline */ }

      res.json({
        success: true,
        instance: { ...instanceToCamel(data), status: liveStatus, phoneNumber },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── PATCH /instances/:id — Update instance ─────────────────────
  router.patch('/instances/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, settings } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (settings !== undefined) updates.settings = settings;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const { data, error } = await supabaseAdmin
        .from('whatsapp_instances')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, instance: instanceToCamel(data) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── DELETE /instances/:id — Delete instance ────────────────────
  router.delete('/instances/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Disconnect from Go first
      try {
        await axios.post(`${WHATSAPP_API_URL}/instances/${id}/disconnect`, {}, { timeout: 3000, headers: bridgeHeaders });
      } catch { /* ignore */ }

      // Delete from Go
      try {
        await axios.delete(`${WHATSAPP_API_URL}/instances/${id}`, { timeout: 3000, headers: bridgeHeaders });
      } catch { /* ignore */ }

      // Delete from Supabase (cascades to links and messages)
      const { error } = await supabaseAdmin
        .from('whatsapp_instances')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── POST /instances/:id/connect — Connect instance ─────────────
  router.post('/instances/:id/connect', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Update Supabase status
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: 'connecting' })
        .eq('id', id);

      // Tell Go to connect
      const goRes = await axios.post(`${WHATSAPP_API_URL}/instances/${id}/connect`, {}, { timeout: 30000, headers: bridgeHeaders });

      // Sync status back
      const newStatus = goRes.data?.status || 'connecting';
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: newStatus })
        .eq('id', id);

      res.json({ success: true, status: newStatus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── POST /instances/:id/disconnect — Disconnect ────────────────
  router.post('/instances/:id/disconnect', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await axios.post(`${WHATSAPP_API_URL}/instances/${id}/disconnect`, {}, { timeout: 5000, headers: bridgeHeaders });

      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: 'disconnected' })
        .eq('id', id);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── POST /instances/:id/reconnect — Reconnect ──────────────────
  router.post('/instances/:id/reconnect', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: 'connecting' })
        .eq('id', id);

      const goRes = await axios.post(`${WHATSAPP_API_URL}/instances/${id}/reconnect`, {}, { timeout: 30000, headers: bridgeHeaders });

      const newStatus = goRes.data?.status || 'connecting';
      await supabaseAdmin
        .from('whatsapp_instances')
        .update({ status: newStatus })
        .eq('id', id);

      res.json({ success: true, status: newStatus });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── GET /instances/:id/qr — Get QR code ───────────────────────
  router.get('/instances/:id/qr', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const goRes = await axios.get(`${WHATSAPP_API_URL}/instances/${id}/qr`, { timeout: 5000, headers: bridgeHeaders });
      res.json({ success: true, qr: goRes.data?.qr, status: goRes.data?.status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── POST /instances/:id/send — Send message ────────────────────
  router.post('/instances/:id/send', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { to, message } = req.body;

      if (!to || !message) {
        return res.status(400).json({ success: false, error: 'to and message are required' });
      }

      const goRes = await axios.post(`${WHATSAPP_API_URL}/instances/${id}/send`, { to, message }, { timeout: 10000, headers: bridgeHeaders });

      // Persist outbound message
      if (goRes.data?.success) {
        const normalizedTo = to.replace(/\D/g, '');
        const phone = normalizedTo.startsWith('55') ? normalizedTo : `55${normalizedTo}`;

        await supabaseAdmin.from('wa_messages').insert({
          instance_id: id,
          chat_jid: `${phone}@s.whatsapp.net`,
          sender_jid: 'me',
          sender_name: 'You',
          content: message,
          message_type: 'text',
          direction: 'outbound',
          status: 'sent',
          timestamp: new Date().toISOString(),
        });
      }

      res.json({ success: true, to: goRes.data?.to });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── GET /instances/:id/messages — Message history ───────────────
  router.get('/instances/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const chatJid = req.query.chatJid as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      let query = supabaseAdmin
        .from('wa_messages')
        .select('*')
        .eq('instance_id', id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (chatJid) {
        query = query.eq('chat_jid', chatJid);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.json({
        success: true,
        messages: (data || []).map(messageToCamel),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── GET /instances/:id/chats — List chats for instance ──────────
  router.get('/instances/:id/chats', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Get distinct chats from messages, latest first
      const { data, error } = await supabaseAdmin
        .rpc('get_instance_chats', { p_instance_id: id })
        .select();

      // Fallback if RPC not available: raw query via distinct chat_jids
      if (error || !data) {
        const { data: msgs } = await supabaseAdmin
          .from('wa_messages')
          .select('chat_jid, sender_name, content, timestamp, is_group, group_name, direction')
          .eq('instance_id', id)
          .order('timestamp', { ascending: false })
          .limit(200);

        const chatMap = new Map<string, any>();
        for (const msg of msgs || []) {
          if (!chatMap.has(msg.chat_jid)) {
            chatMap.set(msg.chat_jid, {
              chatJid: msg.chat_jid,
              contactName: msg.sender_name || msg.chat_jid,
              lastMessage: msg.content,
              lastMessageTimestamp: msg.timestamp,
              isGroup: msg.is_group,
              groupName: msg.group_name,
            });
          }
        }

        return res.json({ success: true, chats: Array.from(chatMap.values()) });
      }

      res.json({ success: true, chats: data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── GET /instances/:id/validate — Validate number ──────────────
  router.get('/instances/:id/validate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const number = req.query.number as string;
      if (!number) {
        return res.status(400).json({ success: false, error: 'number is required' });
      }

      const goRes = await axios.get(`${WHATSAPP_API_URL}/instances/${id}/validate?number=${number}`, { timeout: 10000, headers: bridgeHeaders });
      res.json({ success: true, valid: goRes.data?.valid, jid: goRes.data?.jid });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Service Links ──────────────────────────────────────────────

  // GET /instances/:id/links
  router.get('/instances/:id/links', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('wa_instance_links')
        .select('*')
        .eq('instance_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.json({ success: true, links: (data || []).map(linkToCamel) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /instances/:id/links
  router.post('/instances/:id/links', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { serviceType, serviceId, serviceName, config } = req.body;

      if (!serviceType || !serviceId) {
        return res.status(400).json({ success: false, error: 'serviceType and serviceId are required' });
      }

      const { data, error } = await supabaseAdmin
        .from('wa_instance_links')
        .insert({
          instance_id: id,
          service_type: serviceType,
          service_id: serviceId,
          service_name: serviceName || null,
          config: config || {},
        })
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, link: linkToCamel(data) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // DELETE /instances/:id/links/:linkId
  router.delete('/instances/:id/links/:linkId', async (req: Request, res: Response) => {
    try {
      const { linkId } = req.params;

      const { error } = await supabaseAdmin
        .from('wa_instance_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Webhook (from Go service) ──────────────────────────────────
  // POST /instances/webhook — receives events with instance_id
  router.post('/instances/webhook', async (req: Request, res: Response) => {
    try {
      const { type, instanceId, chatId, sender, pushName, isGroup, groupName, avatar, content, timestamp, data } = req.body;

      if (!instanceId) {
        return res.status(400).json({ success: false, error: 'instanceId required' });
      }

      // Forward to Socket.io with instance context
      io.emit('whatsapp_event', {
        type,
        instanceId,
        chatId,
        sender,
        pushName,
        isGroup,
        groupName,
        avatar,
        content,
        timestamp,
        data,
      });

      // Persist status changes
      if (type === 'connected') {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'connected', last_connected_at: new Date().toISOString() })
          .eq('id', instanceId);
      } else if (type === 'disconnected' || type === 'logged_out') {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: type })
          .eq('id', instanceId);
      }

      // Persist inbound messages
      if (type === 'message' && content) {
        await supabaseAdmin.from('wa_messages').insert({
          instance_id: instanceId,
          chat_jid: chatId,
          sender_jid: sender,
          sender_name: pushName,
          content,
          message_type: 'text',
          is_group: isGroup || false,
          group_name: groupName || null,
          direction: 'inbound',
          status: 'delivered',
          timestamp: timestamp || new Date().toISOString(),
          raw_event: req.body,
        });
      }

      // Emit instance-specific event
      io.emit(`whatsapp:${instanceId}`, {
        type,
        chatId,
        sender,
        pushName,
        content,
        timestamp,
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error('[WA Webhook] Error:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Bulk: Reconnect all ────────────────────────────────────────
  router.post('/instances/reconnect-all', async (req: Request, res: Response) => {
    try {
      const goRes = await axios.post(`${WHATSAPP_API_URL}/instances/reconnect-all`, {}, { timeout: 60000, headers: bridgeHeaders });
      res.json({ success: true, reconnecting: goRes.data?.reconnecting });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
