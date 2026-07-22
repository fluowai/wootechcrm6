import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  CheckCheck,
  QrCode,
  Smartphone,
  ShieldCheck,
  Plus,
  Play,
  FileText,
  Building2,
  User,
  Zap,
  CheckCircle2,
  X,
  PhoneCall,
  Loader2
} from 'lucide-react';
import { WhatsAppSession, WhatsAppChat, WhatsAppMessage, QuickReply } from '../../types';

interface WhatsAppViewProps {
  sessions: WhatsAppSession[];
  chats: WhatsAppChat[];
  messages: Record<string, WhatsAppMessage[]>;
  quickReplies: QuickReply[];
  onSendMessage: (chatId: string, content: string) => void;
}

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  sessions,
  chats,
  messages,
  quickReplies,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'validator' | 'sessions'>('inbox');
  const [selectedChatId, setSelectedChatId] = useState<string>(chats[0]?.id || 'chat-1');
  const [messageText, setMessageText] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Validator state
  const [numbersToValidate, setNumbersToValidate] = useState(
    '(41) 99887-1122\n(48) 99112-3344\n(11) 98877-6655\n(81) 99222-0000'
  );
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const activeChat = chats.find((c) => c.id === selectedChatId);
  const activeMessages = messages[selectedChatId] || [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    onSendMessage(selectedChatId, messageText);
    setMessageText('');
  };

  const handleSelectQuickReply = (qr: QuickReply) => {
    setMessageText(qr.content);
    setShowQuickReplies(false);
  };

  const handleValidateNumbers = async () => {
    setIsValidating(true);
    const nums = numbersToValidate
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean);

    try {
      const res = await fetch('/api/whatsapp/validate-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: nums }),
      });
      const data = await res.json();
      if (data.success && data.validated) {
        setValidationResults(data.validated);
      }
    } catch (e) {
      console.error('Validation error:', e);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-600" />
            <span>WhatsApp Central & Multi-Atendimento (Whatsmeow)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Múltiplas sessões de WhatsApp, QR Code pairing, respostas rápidas e validação de números ativos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inbox'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Conversas Inbox
          </button>
          <button
            onClick={() => setActiveTab('validator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'validator'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Validador de Números
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-800 transition-all"
          >
            <QrCode size={14} />
            <span>Sessões / QR Code</span>
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      {activeTab === 'inbox' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[650px] grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left Chat List */}
          <div className="md:col-span-4 border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
            {/* Search */}
            <div className="p-3 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar conversas ou contatos..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Chat Thread Item */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {chats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <img
                      src={chat.avatar}
                      alt={chat.contactName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{chat.contactName}</p>
                        <span className="text-[10px] text-slate-400 font-medium">{chat.lastMessageTimestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{chat.lastMessage}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {chat.companyName}
                        </span>
                        {chat.unreadCount > 0 && (
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Chat Conversation */}
          <div className="md:col-span-8 flex flex-col h-full bg-[#E5DDD5]/30 relative">
            {activeChat ? (
              <>
                {/* Chat Header */}
                <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeChat.avatar}
                      alt={activeChat.contactName}
                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{activeChat.contactName}</h4>
                      <p className="text-[10px] text-emerald-700 font-semibold">{activeChat.contactNumber} • WhatsApp Business</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded text-[11px]">Sessão Matriz SP</span>
                  </div>
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeMessages.map((msg) => {
                    const isMe = msg.sender === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3 shadow-sm text-xs space-y-1 ${
                            isMe
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                          }`}
                        >
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 text-[9px] font-medium ${
                              isMe ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{msg.timestamp}</span>
                            {isMe && <CheckCheck size={12} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Replies Popup Menu */}
                {showQuickReplies && (
                  <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-xl shadow-xl p-3 space-y-2 z-10">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                      <span>Respostas Rápidas (Snippets)</span>
                      <button onClick={() => setShowQuickReplies(false)} className="text-slate-400">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => handleSelectQuickReply(qr)}
                          className="w-full text-left p-2 rounded-lg hover:bg-slate-50 text-xs transition-colors"
                        >
                          <span className="font-bold text-emerald-700">{qr.shortcut}</span> - <span className="font-semibold text-slate-800">{qr.title}</span>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{qr.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSend}
                  className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setShowQuickReplies(!showQuickReplies)}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors"
                    title="Respostas Rápidas"
                  >
                    <Zap size={16} />
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem do WhatsApp ou digite / para respostas..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                  />

                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-sm shadow-emerald-600/20"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
                Selecione uma conversa para iniciar o atendimento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validator Tab */}
      {activeTab === 'validator' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Verificador e Validador de Ativos no WhatsApp</h3>
          </div>
          <p className="text-xs text-slate-500">
            Cole a lista de números de telefone para verificar previamente quais possuem conta no WhatsApp antes de disparar campanhas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Números de Telefone (1 por linha)</label>
              <textarea
                value={numbersToValidate}
                onChange={(e) => setNumbersToValidate(e.target.value)}
                rows={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              />
              <button
                onClick={handleValidateNumbers}
                disabled={isValidating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-sm transition-all flex items-center gap-2"
              >
                {isValidating ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                <span>{isValidating ? 'Validando...' : 'Verificar WhatsApp Ativo'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Resultado da Validação</h4>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 h-60 overflow-y-auto space-y-2">
                {validationResults.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-12 font-medium">
                    Nenhuma verificação executada ainda.
                  </p>
                ) : (
                  validationResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs font-mono"
                    >
                      <span className="font-bold text-slate-800">{item.formattedNumber}</span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Conta Ativa ({item.accountType})
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Session Pairing Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <QrCode size={18} className="text-emerald-600" />
                <span>Pareamento Whatsmeow</span>
              </h3>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 flex flex-col items-center">
              <div className="w-44 h-44 bg-white border-2 border-slate-900 p-2 rounded-xl flex items-center justify-center shadow-inner">
                {/* SVG Mock QR Code */}
                <div className="w-full h-full bg-slate-900 p-2 grid grid-cols-5 gap-1 rounded">
                  {Array.from({ length: 25 }).map((_, i) => (
                    <div key={i} className={i % 2 === 0 ? 'bg-white rounded-sm' : 'bg-slate-900'} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Abra o WhatsApp no seu celular &gt; Aparelhos Conectados &gt; Conectar um Aparelho.
              </p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm"
            >
              Conectar Sessão
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
