import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare,
  Search,
  Send,
  QrCode,
  ShieldCheck,
  Zap,
  X,
  CheckCheck,
  Loader2
} from 'lucide-react';
import { displayWhatsAppNumber, formatWhatsAppNumber } from '../../utils/whatsapp';

interface WAMessage {
  id: string;
  sender: string;
  pushName: string;
  isGroup: boolean;
  groupName: string;
  avatar: string;
  content: string;
  timestamp: string;
  isMe: boolean;
}

interface WAChat {
  id: string; // The JID (phone number or group id)
  contactName: string; // Pushname or GroupName
  contactNumber: string;
  avatar: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  isGroup: boolean;
}

export const WhatsAppView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'validator' | 'sessions'>('inbox');
  
  // Real-time states
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chats, setChats] = useState<WAChat[]>([]);
  const [messages, setMessages] = useState<Record<string, WAMessage[]>>({});
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // Quick Replies mock
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const quickReplies = [
    { id: '1', shortcut: '/bomdia', title: 'Saudação Manhã', content: 'Bom dia! Como posso ajudar você hoje?' },
    { id: '2', shortcut: '/proposta', title: 'Enviar Proposta', content: 'Segue a proposta que conversamos. Qualquer dúvida estou à disposição.' }
  ];

  // Validator state
  const [numbersToValidate, setNumbersToValidate] = useState('5511999999999');
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Setup WebSocket
  useEffect(() => {
    // Try connecting to the Node Server
    const newSocket = io("http://localhost:3000"); 
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("WebSocket connected!");
    });

    newSocket.on("whatsapp_event", (event: any) => {
      if (event.type === "qr_code") {
        setQrCodeData(event.code);
        setShowQrModal(true);
      }
      
      if (event.type === "message") {
        const chatId = event.chatId; // Either group JID or user JID
        
        // Regra Rigorosa de Formatação e Validação (O backend Go já garantiu que começou com 55)
        const senderPhone = formatWhatsAppNumber(event.sender);
        const displayName = event.isGroup ? event.groupName : event.pushName || senderPhone;
        const displayPhone = displayWhatsAppNumber(senderPhone);

        const newMsg: WAMessage = {
          id: Date.now().toString() + Math.random(),
          sender: senderPhone,
          pushName: event.pushName,
          isGroup: event.isGroup,
          groupName: event.groupName,
          avatar: event.avatar || "https://ui-avatars.com/api/?name=W+A&background=random",
          content: event.content,
          timestamp: new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          isMe: false, // We can determine this if sender == myNumber
        };

        // Update Messages
        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newMsg]
        }));

        // Update or Create Chat Thread
        setChats(prev => {
          const existing = prev.find(c => c.id === chatId);
          if (existing) {
            // Update existing thread and move to top
            const updated = {
              ...existing,
              lastMessage: newMsg.content,
              lastMessageTimestamp: newMsg.timestamp,
              unreadCount: existing.id === selectedChatId ? 0 : existing.unreadCount + 1,
              contactName: displayName, // update in case they changed pushname
              avatar: newMsg.avatar // update avatar
            };
            return [updated, ...prev.filter(c => c.id !== chatId)];
          } else {
            // New thread
            return [{
              id: chatId,
              contactName: displayName,
              contactNumber: displayPhone,
              avatar: newMsg.avatar,
              lastMessage: newMsg.content,
              lastMessageTimestamp: newMsg.timestamp,
              unreadCount: 1,
              isGroup: newMsg.isGroup
            }, ...prev];
          }
        });
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [selectedChatId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChatId) return;
    
    // Optimistic UI for sent message
    const msg: WAMessage = {
      id: Date.now().toString(),
      sender: 'me',
      pushName: 'Eu',
      isGroup: false,
      groupName: '',
      avatar: '',
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isMe: true
    };

    setMessages(prev => ({
      ...prev,
      [selectedChatId]: [...(prev[selectedChatId] || []), msg]
    }));

    // Todo: Send to Go Microservice via API
    fetch('http://localhost:8080/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jid: selectedChatId, text: messageText })
    }).catch(console.error);

    setMessageText('');
  };

  const activeChat = chats.find((c) => c.id === selectedChatId);
  const activeMessages = selectedChatId ? (messages[selectedChatId] || []) : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-600" />
            <span>WhatsApp Central (Whatsmeow + Socket.io)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Conexão bidirecional em tempo real. Exibindo nomes e fotos nativas do WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inbox' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Conversas / Atendimentos
          </button>
          <button
            onClick={() => setActiveTab('validator')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'validator' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Validador Rigoroso
          </button>
          <button
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-1.5 bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-800 transition-all"
          >
            <QrCode size={14} />
            <span>Conectar Dispositivo</span>
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
                  placeholder="Buscar conversas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Chat Thread Item */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {chats.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">Aguardando mensagens via Socket.io...</div>
              )}
              {chats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      chat.unreadCount = 0; // reset
                    }}
                    className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-600' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <img src={chat.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 truncate">{chat.contactName}</p>
                        <span className="text-[10px] text-slate-400 font-medium">{chat.lastMessageTimestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{chat.lastMessage}</p>
                      {chat.unreadCount > 0 && (
                        <div className="flex justify-end mt-1">
                          <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                            {chat.unreadCount}
                          </span>
                        </div>
                      )}
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
                <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <img src={activeChat.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-slate-200" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{activeChat.contactName}</h4>
                      <p className="text-[10px] text-emerald-700 font-semibold">{activeChat.contactNumber} {activeChat.isGroup && '(Grupo)'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {activeMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-md rounded-2xl p-3 shadow-sm text-xs space-y-1 ${
                        msg.isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-none'
                      }`}>
                        {!msg.isMe && activeChat.isGroup && (
                           <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.pushName} ({displayWhatsAppNumber(msg.sender)})</p>
                        )}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 text-[9px] font-medium opacity-80">
                          <span>{msg.timestamp}</span>
                          {msg.isMe && <CheckCheck size={12} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSend} className="bg-white border-t border-slate-200 p-3 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium focus:outline-none"
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-all shadow-sm">
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
                Selecione uma conversa para visualizar e enviar mensagens.
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
            <h3 className="text-sm font-bold text-slate-900">Verificador Rigoroso (API Node + Go)</h3>
          </div>
          <p className="text-xs text-slate-500">
            Valide e formate números. Números que não existirem no Whatsmeow Go serão ignorados. Padrão +55 exibido.
          </p>
          <textarea
            value={numbersToValidate}
            onChange={(e) => setNumbersToValidate(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:outline-none"
          />
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && qrCodeData && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-xl">
             <h3 className="font-bold">QR Code Recebido pelo Go!</h3>
             <div className="text-xs font-mono bg-slate-100 p-2 break-all">{qrCodeData}</div>
             <p className="text-xs text-slate-500">Utilize um gerador online SVG para ler esta RAW string, ou verifique os logs do Go.</p>
             <button onClick={() => setShowQrModal(false)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};
