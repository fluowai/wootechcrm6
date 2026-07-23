import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Zap,
  Sparkles,
  Brain,
  Trash2,
  MessageSquare,
  Plus
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
  tokens?: number;
  latencyMs?: number;
  actions?: any[];
  agentName?: string;
}

interface Conversation {
  id: string;
  topic: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface AIChatProps {
  companyProfile?: any;
  agents?: any[];
}

export const AIChat: React.FC<AIChatProps> = ({ companyProfile, agents }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/ai-os/conversations?limit=20');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  // Poll active conversation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeConversationId) {
      interval = setInterval(() => {
        loadConversationMessages(activeConversationId, true);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeConversationId]);

  const loadConversationMessages = async (convId: string, isPolling = false) => {
    try {
      const res = await fetch(`/api/ai-os/conversations/${convId}`);
      const data = await res.json();
      if (data.messages) {
        const loaded: ChatMessage[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.agent_name === 'User' ? 'user' : 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at),
          provider: m.agent_name === 'CTO' || m.agent_name === 'WOO' ? 'WOO' : undefined,
          agentName: m.agent_name,
        }));
        
        setMessages(prev => {
          // Apenas atualiza se houve mudança na quantidade (evita flicker)
          if (isPolling && prev.length === loaded.length) return prev;
          return loaded;
        });

        if (!isPolling) {
          setActiveConversationId(convId);
          setShowSidebar(false);
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setShowSidebar(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-os/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history,
          conversationId: activeConversationId,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          provider: data.provider,
          tokens: data.tokens?.total,
          latencyMs: data.latencyMs,
          actions: data.actions,
        };
        setMessages(prev => [...prev, assistantMsg]);

        if (data.conversationId && !activeConversationId) {
          setActiveConversationId(data.conversationId);
          loadConversations();
        }
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Erro: ${data.error || 'Falha ao processar mensagem'}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Erro de conexão. Verifique se o servidor está rodando.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  return (
    <div className="flex h-[600px] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Conversa
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-400 p-3">Nenhuma conversa ainda</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadConversationMessages(conv.id)}
                  className={`w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-100 transition-colors ${
                    activeConversationId === conv.id ? 'bg-purple-50 border-l-2 border-l-purple-600' : ''
                  }`}
                >
                  <p className="text-sm text-gray-900 truncate">{conv.topic}</p>
                  <p className="text-xs text-gray-400">{new Date(conv.created_at).toLocaleDateString('pt-BR')}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Conversas"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <Brain className="w-5 h-5" />
            <span className="font-semibold">WOO — CEO AI</span>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {messages.length} msgs
            </span>
          </div>
          <button
            onClick={clearChat}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Olá! Eu sou o WOO
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                Seu CEO AI pronto para gerenciar sua operação. Me diga o que precisa
                e eu vou criar agentes, analisar dados e otimizar seus processos.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                {[
                  'Crie agentes para minha empresa',
                  'Analise meus deals em aberto',
                  'Sugira melhorias no processo de vendas',
                  'Quais KPIs devo acompanhar?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {msg.role === 'assistant' && msg.agentName && (
                  <div className="text-xs font-bold text-purple-700 mb-1 border-b border-purple-200/50 pb-1">
                    {msg.agentName}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                {msg.role === 'assistant' && msg.provider && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200/50">
                    <Zap className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {msg.provider} · {msg.tokens} tokens · {msg.latencyMs}ms
                    </span>
                  </div>
                )}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200/50">
                    <div className="flex items-center gap-1 text-xs text-purple-600">
                      <Sparkles className="w-3 h-3" />
                      {msg.actions.length} ação(ões) executada(s)
                    </div>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-purple-600" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  WOO está pensando...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem para o WOO..."
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
};
