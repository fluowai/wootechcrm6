import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Search,
  Send,
  CheckCheck,
  Loader2,
  MessageSquare,
  Phone,
  Users,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import * as waApi from '../../lib/whatsapp-api';
import { displayWhatsAppNumber, formatWhatsAppNumber } from '../../utils/whatsapp';
import type { WhatsAppInstance, WhatsAppInstanceMessage } from '../../types';
import type { ChatSummary } from '../../lib/whatsapp-api';

// ─── Display types ───────────────────────────────────────────────

interface DisplayChat {
  id: string;
  contactName: string;
  contactNumber: string;
  avatar: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  isGroup: boolean;
}

interface DisplayMessage {
  id: string;
  sender: string;
  pushName: string;
  content: string;
  timestamp: string;
  isMe: boolean;
  isGroup: boolean;
  groupName?: string;
 fromHistory: boolean; // marks if loaded from Supabase history
}

// ─── Helpers ─────────────────────────────────────────────────────

function chatJidToDisplay(jid: string): { name: string; number: string; isGroup: boolean } {
  const isGroup = jid.endsWith('@g.us');
  const raw = jid.split('@')[0];
  const number = isGroup ? raw : raw.replace(/^55/, '');
  return {
    name: isGroup ? `Grupo ${raw}` : displayWhatsAppNumber(raw),
    number: isGroup ? raw : `+${raw}`,
    isGroup,
  };
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) {
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return ts;
  }
}

function formatFullTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return ts;
  }
}

// ─── Component ───────────────────────────────────────────────────

interface MessagesViewProps {
  instance: WhatsAppInstance;
  onBack?: () => void;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ instance, onBack }) => {
  // Chat list
  const [chats, setChats] = useState<DisplayChat[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected chat
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // Socket.io
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Pagination
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatListRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef(instance.id);

  // ─── Load chats from Supabase ──────────────────────────────────

  const fetchChats = useCallback(async () => {
    setChatsLoading(true);
    try {
      const raw = await waApi.getChats(instance.id);
      const display: DisplayChat[] = raw.map(c => {
        const info = chatJidToDisplay(c.chatJid);
        return {
          id: c.chatJid,
          contactName: c.contactName || info.name,
          contactNumber: info.number,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(c.contactName || info.name)}&background=random&size=80`,
          lastMessage: c.lastMessage || '',
          lastMessageTimestamp: formatTimestamp(c.lastMessageTimestamp),
          unreadCount: 0,
          isGroup: c.isGroup,
        };
      });
      setChats(display);
    } catch (err) {
      console.error('[MessagesView] fetchChats error:', err);
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }, [instance.id]);

  // ─── Load messages for a chat ──────────────────────────────────

  const fetchMessages = useCallback(async (chatJid: string, offset = 0) => {
    if (offset === 0) {
      setMessagesLoading(true);
      setMessages([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const raw = await waApi.getMessages(instance.id, { chatJid, limit: 50, offset });
      const display: DisplayMessage[] = raw.reverse().map(m => ({
        id: m.id,
        sender: m.senderJid,
        pushName: m.senderName || m.senderJid.split('@')[0],
        content: m.content || '',
        timestamp: formatFullTimestamp(m.timestamp),
        isMe: m.direction === 'outbound',
        isGroup: m.isGroup,
        groupName: m.groupName,
       fromHistory: true,
      }));

      if (offset === 0) {
        setMessages(display);
        setHasMore(raw.length === 50);
      } else {
        setMessages(prev => [...display, ...prev]);
        setHasMore(raw.length === 50);
      }
    } catch (err) {
      console.error('[MessagesView] fetchMessages error:', err);
    } finally {
      setMessagesLoading(false);
      setLoadingMore(false);
    }
  }, [instance.id]);

  // ─── Socket.io ─────────────────────────────────────────────────

  useEffect(() => {
    instanceIdRef.current = instance.id;
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => setConnected(false));

    newSocket.on('whatsapp_event', (event: any) => {
      // Filter by instance
      if (event.instanceId && event.instanceId !== instanceIdRef.current) return;
      if (event.type !== 'message') return;

      const chatId = event.chatId;
      const senderPhone = formatWhatsAppNumber(event.sender);
      const displayName = event.isGroup ? event.groupName : event.pushName || senderPhone;

      const newMsg: DisplayMessage = {
        id: `rt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: senderPhone,
        pushName: event.pushName || displayName,
        content: event.content,
        timestamp: formatFullTimestamp(event.timestamp || new Date().toISOString()),
        isMe: false,
        isGroup: event.isGroup,
        groupName: event.groupName,
       fromHistory: false,
      };

      // Append to messages if this chat is open
      setMessages(prev => {
        // Dedup: skip if identical content+sender within 2s
        const last = prev[prev.length - 1];
        if (
          last &&
          last.sender === newMsg.sender &&
          last.content === newMsg.content &&
          Math.abs(new Date(last.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 2000
        ) {
          return prev;
        }
        return [...prev, newMsg];
      });

      // Update or create chat in list
      setChats(prev => {
        const existing = prev.find(c => c.id === chatId);
        const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=80`;
        if (existing) {
          const updated: DisplayChat = {
            ...existing,
            lastMessage: newMsg.content,
            lastMessageTimestamp: newMsg.timestamp,
            unreadCount: existing.id === selectedChatId ? 0 : existing.unreadCount + 1,
            contactName: displayName,
            avatar,
          };
          return [updated, ...prev.filter(c => c.id !== chatId)];
        }
        const info = chatJidToDisplay(chatId);
        return [{
          id: chatId,
          contactName: displayName,
          contactNumber: info.number,
          avatar,
          lastMessage: newMsg.content,
          lastMessageTimestamp: newMsg.timestamp,
          unreadCount: 1,
          isGroup: event.isGroup,
        }, ...prev];
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [instance.id, selectedChatId]);

  // ─── Initial fetch ─────────────────────────────────────────────

  useEffect(() => {
    fetchChats();
    setSelectedChatId(null);
    setMessages([]);
  }, [instance.id, fetchChats]);

  // ─── Auto-scroll ───────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Select chat ───────────────────────────────────────────────

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMessages([]);
    setHasMore(true);
    fetchMessages(chatId, 0);

    // Mark as read
    setChats(prev =>
      prev.map(c => (c.id === chatId ? { ...c, unreadCount: 0 } : c))
    );
  };

  // ─── Load more (older messages) ────────────────────────────────

  const handleLoadMore = () => {
    if (!selectedChatId || loadingMore || !hasMore) return;
    fetchMessages(selectedChatId, messages.length);
  };

  // ─── Send message ──────────────────────────────────────────────

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChatId || sending) return;

    const optimistic: DisplayMessage = {
      id: `sent-${Date.now()}`,
      sender: 'me',
      pushName: 'Eu',
      content: messageText,
      timestamp: formatFullTimestamp(new Date().toISOString()),
      isMe: true,
      isGroup: false,
     fromHistory: false,
    };

    setMessages(prev => [...prev, optimistic]);
    setMessageText('');
    setSending(true);

    try {
      await waApi.sendMessage(instance.id, selectedChatId, messageText);
    } catch (err) {
      console.error('[MessagesView] send error:', err);
    } finally {
      setSending(false);
    }
  };

  // ─── Filtered chats ────────────────────────────────────────────

  const filteredChats = searchQuery
    ? chats.filter(c =>
        c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactNumber.includes(searchQuery)
      )
    : chats;

  const activeChat = chats.find(c => c.id === selectedChatId);

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[650px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
      {/* Chat list */}
      <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        {/* Header */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {onBack && (
                <button onClick={onBack} className="md:hidden p-1 rounded-lg hover:bg-slate-100">
                  <ArrowLeft size={14} className="text-slate-500" />
                </button>
              )}
              <h4 className="text-xs font-bold text-slate-900">{instance.name}</h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <button
                onClick={fetchChats}
                disabled={chatsLoading}
                className="p-1 rounded-lg hover:bg-slate-100 transition-all"
                title="Atualizar"
              >
                <RefreshCw size={12} className={`text-slate-400 ${chatsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar conversas..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none"
            />
          </div>
        </div>

        {/* Chat list */}
        <div ref={chatListRef} className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {chatsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-emerald-600" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 font-medium">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                As conversas aparecem quando mensagens são recebidas.
              </p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = chat.id === selectedChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat.id)}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-100/80'
                  }`}
                >
                  <img
                    src={chat.avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate">{chat.contactName}</p>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                        {chat.lastMessageTimestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{chat.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {chat.isGroup && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400">
                          <Users size={8} />
                          Grupo
                        </span>
                      )}
                      {chat.unreadCount > 0 && (
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full ml-auto">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="md:col-span-8 flex flex-col h-full bg-[#E5DDD5]/30 relative">
        {activeChat ? (
          <>
            {/* Chat header */}
            <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={activeChat.avatar}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{activeChat.contactName}</h4>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                    <Phone size={9} />
                    {activeChat.contactNumber}
                    {activeChat.isGroup && ' · Grupo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Load more button */}
              {hasMore && messages.length > 0 && (
                <div className="text-center py-2">
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-all"
                  >
                    {loadingMore ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 size={10} className="animate-spin" />
                        Carregando...
                      </span>
                    ) : (
                      'Carregar mensagens anteriores'
                    )}
                  </button>
                </div>
              )}

              {/* Loading indicator */}
              {messagesLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-emerald-600" />
                </div>
              )}

              {/* Messages */}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-md rounded-2xl p-3 shadow-sm text-xs space-y-1 ${
                      msg.isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                    }`}
                  >
                    {!msg.isMe && activeChat.isGroup && (
                      <p className="text-[10px] font-bold text-slate-400 mb-1">
                        {msg.pushName}
                      </p>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] font-medium opacity-80">
                      <span>{msg.timestamp}</span>
                      {msg.isMe && <CheckCheck size={12} />}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={sending}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-xs text-slate-400 font-medium">
                Selecione uma conversa para visualizar mensagens.
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Histórico carregado do Supabase + mensagens em tempo real.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
