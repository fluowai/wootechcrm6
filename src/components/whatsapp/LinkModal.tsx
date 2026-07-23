import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Link2,
  Bot,
  Workflow,
  MessageSquare,
  Radio,
  Webhook,
  Loader2,
  Search,
  Check,
  ChevronDown,
} from 'lucide-react';
import * as waApi from '../../lib/whatsapp-api';
import type { WhatsAppInstance, WhatsAppInstanceLink } from '../../types';
import type { ServiceOption } from '../../lib/whatsapp-api';

// ─── Service type config ─────────────────────────────────────────

const SERVICE_TYPES = [
  { value: 'ai_agent', label: 'Agente IA', icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50', accent: 'border-violet-300' },
  { value: 'automation', label: 'Automação', icon: Workflow, color: 'text-blue-600', bg: 'bg-blue-50', accent: 'border-blue-300' },
  { value: 'chatbot', label: 'Chatbot', icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50', accent: 'border-emerald-300' },
  { value: 'broadcast', label: 'Broadcast', icon: Radio, color: 'text-orange-600', bg: 'bg-orange-50', accent: 'border-orange-300' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-slate-600', bg: 'bg-slate-100', accent: 'border-slate-300' },
] as const;

// ─── Config fields per service type ──────────────────────────────

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
}

const CONFIG_FIELDS: Record<string, ConfigField[]> = {
  ai_agent: [
    { key: 'greeting_message', label: 'Mensagem de saudação', type: 'textarea', placeholder: 'Olá! Como posso ajudar?' },
    { key: 'allowed_hours_start', label: 'Horário início', type: 'text', placeholder: '08:00' },
    { key: 'allowed_hours_end', label: 'Horário fim', type: 'text', placeholder: '18:00' },
    { key: 'max_daily_conversations', label: 'Máx. conversas/dia', type: 'text', placeholder: '100' },
  ],
  automation: [
    { key: 'trigger_event', label: 'Evento trigger', type: 'select', placeholder: 'Selecione...', options: [
      { value: 'message_received', label: 'Mensagem recebida' },
      { value: 'message_sent', label: 'Mensagem enviada' },
      { value: 'instance_connected', label: 'Instância conectada' },
      { value: 'instance_disconnected', label: 'Instância desconectada' },
      { value: 'new_chat', label: 'Nova conversa' },
    ]},
    { key: 'delay_seconds', label: 'Atraso (segundos)', type: 'text', placeholder: '0' },
  ],
  chatbot: [
    { key: 'welcome_message', label: 'Mensagem de boas-vindas', type: 'textarea', placeholder: 'Olá! Sou o assistente virtual.' },
    { key: 'fallback_message', label: 'Mensagem de fallback', type: 'textarea', placeholder: 'Não entendi. Pode reformular?' },
    { key: 'human_handoff_threshold', label: 'Threshold handoff', type: 'text', placeholder: '3' },
  ],
  broadcast: [
    { key: 'segment', label: 'Segmento', type: 'select', placeholder: 'Selecione...', options: [
      { value: 'all', label: 'Todos os contatos' },
      { value: 'leads', label: 'Leads qualificados' },
      { value: 'customers', label: 'Clientes ativos' },
      { value: 'inactive', label: 'Inativos' },
    ]},
    { key: 'schedule_cron', label: 'Agendamento (cron)', type: 'text', placeholder: '0 9 * * 1-5' },
    { key: 'max_per_day', label: 'Máx. por dia', type: 'text', placeholder: '50' },
  ],
  webhook: [
    { key: 'url', label: 'URL do webhook', type: 'text', placeholder: 'https://example.com/webhook', required: true },
    { key: 'secret', label: 'Secret', type: 'text', placeholder: 'Chave de verificação' },
    { key: 'events', label: 'Eventos', type: 'select', placeholder: 'Selecione...', options: [
      { value: 'all', label: 'Todos os eventos' },
      { value: 'message_received', label: 'Mensagem recebida' },
      { value: 'message_sent', label: 'Mensagem enviada' },
      { value: 'status_change', label: 'Mudança de status' },
    ]},
  ],
};

// ─── Service Picker Component ────────────────────────────────────

interface ServicePickerProps {
  type: string;
  value: string;
  onChange: (id: string, name: string) => void;
}

const ServicePicker: React.FC<ServicePickerProps> = ({ type, value, onChange }) => {
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetcher = type === 'ai_agent' ? waApi.getAvailableAgents : waApi.getAvailableAutomations;
    fetcher().then(data => {
      setOptions(data);
      setLoading(false);
    });
  }, [type]);

  const filtered = search
    ? options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find(o => o.id === value);

  return (
    <div className="relative">
      <label className="block text-[11px] font-bold text-slate-500 mb-1">
        {type === 'ai_agent' ? 'Agente' : type === 'automation' ? 'Automação' : 'Serviço'} *
      </label>

      {loading ? (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <Loader2 size={12} className="animate-spin text-slate-400" />
          <span className="text-[11px] text-slate-400">Carregando...</span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-left flex items-center justify-between hover:border-slate-300 transition-all"
          >
            <span className={`text-xs font-medium ${selected ? 'text-slate-900' : 'text-slate-400'}`}>
              {selected ? selected.name : 'Selecione...'}
            </span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {options.length > 3 && (
                <div className="p-2 border-b border-slate-100">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2 py-1.5 text-[11px] focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-400">
                    Nenhum {type === 'ai_agent' ? 'agente' : 'automação'} encontrado.
                  </div>
                ) : (
                  filtered.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onChange(opt.id, opt.name);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-slate-50 transition-all ${
                        opt.id === value ? 'bg-emerald-50' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        type === 'ai_agent' ? 'bg-violet-50' : 'bg-blue-50'
                      }`}>
                        {type === 'ai_agent' ? (
                          <Bot size={13} className="text-violet-600" />
                        ) : (
                          <Workflow size={13} className="text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{opt.name}</p>
                        {opt.description && (
                          <p className="text-[10px] text-slate-400 truncate">{opt.description}</p>
                        )}
                      </div>
                      {opt.id === value && <Check size={14} className="text-emerald-600 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────

interface LinkModalProps {
  instance: WhatsAppInstance;
  initialLinks: WhatsAppInstanceLink[];
  onClose: () => void;
  onUpdated: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({
  instance,
  initialLinks,
  onClose,
  onUpdated,
}) => {
  const [links, setLinks] = useState<WhatsAppInstanceLink[]>(initialLinks);
  const [showCreate, setShowCreate] = useState(false);
  const [newType, setNewType] = useState<string>('ai_agent');
  const [newServiceId, setNewServiceId] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newConfig, setNewConfig] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [configErrors, setConfigErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  // Reset form when type changes
  useEffect(() => {
    setNewServiceId('');
    setNewServiceName('');
    setNewConfig({});
    setConfigErrors({});
  }, [newType]);

  const getConfigFields = useCallback((): ConfigField[] => {
    return CONFIG_FIELDS[newType] || [];
  }, [newType]);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const fields = getConfigFields();

    for (const field of fields) {
      if (field.required && !newConfig[field.key]?.trim()) {
        errors[field.key] = `${field.label} é obrigatório`;
      }
    }

    // Webhook URL validation
    if (newType === 'webhook' && newConfig.url) {
      try {
        new URL(newConfig.url);
      } catch {
        errors.url = 'URL inválida';
      }
    }

    // Numeric fields
    for (const field of fields) {
      if (field.key.includes('threshold') || field.key.includes('max') || field.key.includes('delay')) {
        if (newConfig[field.key] && isNaN(Number(newConfig[field.key]))) {
          errors[field.key] = 'Debe ser um número';
        }
      }
    }

    setConfigErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newType, newConfig, getConfigFields]);

  const handleCreate = async () => {
    if (!newServiceId.trim()) return;
    if (!validate()) return;

    setCreating(true);
    try {
      // Build clean config (remove empty values)
      const cleanConfig: Record<string, any> = {};
      for (const [k, v] of Object.entries(newConfig)) {
        const val = String(v ?? '');
        if (val.trim()) cleanConfig[k] = val.trim();
      }

      const link = await waApi.createLink(instance.id, {
        serviceType: newType,
        serviceId: newServiceId.trim(),
        serviceName: newServiceName.trim() || undefined,
        config: Object.keys(cleanConfig).length > 0 ? cleanConfig : undefined,
      });
      setLinks(prev => [link, ...prev]);
      resetForm();
      onUpdated();
    } catch (err: any) {
      alert(`Erro ao criar vínculo: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Remover este vínculo?')) return;
    setDeletingId(linkId);
    try {
      await waApi.deleteLink(instance.id, linkId);
      setLinks(prev => prev.filter(l => l.id !== linkId));
      onUpdated();
    } catch (err: any) {
      alert(`Erro ao remover: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setShowCreate(false);
    setNewServiceId('');
    setNewServiceName('');
    setNewConfig({});
    setConfigErrors({});
  };

  const getServiceMeta = (type: string) => {
    return SERVICE_TYPES.find(s => s.value === type) || SERVICE_TYPES[0];
  };

  const configFields = getConfigFields();
  const canCreate = newServiceId.trim() && Object.keys(configErrors).length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
              <Link2 size={16} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Vínculos com Serviços</h3>
              <p className="text-[11px] text-slate-400">{instance.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* Links List */}
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {links.length === 0 ? (
            <div className="text-center py-8">
              <Link2 size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-400 font-medium">Nenhum vínculo</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Conecte esta instância a um agente, chatbot ou automação.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map(link => {
                const meta = getServiceMeta(link.serviceType);
                const Icon = meta.icon;
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                  >
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {link.serviceName || link.serviceId}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {meta.label} · {link.serviceId}
                      </p>
                      {link.config && Object.keys(link.config).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(link.config).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="text-[9px] bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
                              {k}: {String(v).slice(0, 20)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(link.id)}
                      disabled={deletingId === link.id}
                      className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-all disabled:opacity-50 shrink-0"
                    >
                      {deletingId === link.id ? (
                        <Loader2 size={12} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={12} className="text-red-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create Form */}
        {showCreate ? (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 space-y-3 shrink-0 max-h-[50vh] overflow-y-auto">
            {/* Service Type Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Tipo de Serviço</label>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_TYPES.map(st => {
                  const Icon = st.icon;
                  return (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => setNewType(st.value)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        newType === st.value
                          ? `${st.bg} ${st.color} ring-1 ring-current/20`
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={11} />
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service Picker (for ai_agent and automation) */}
            {(newType === 'ai_agent' || newType === 'automation') && (
              <ServicePicker
                type={newType}
                value={newServiceId}
                onChange={(id, name) => {
                  setNewServiceId(id);
                  setNewServiceName(name);
                }}
              />
            )}

            {/* Manual ID input (for other types) */}
            {newType !== 'ai_agent' && newType !== 'automation' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">ID do Serviço *</label>
                <input
                  type="text"
                  value={newServiceId}
                  onChange={e => setNewServiceId(e.target.value)}
                  placeholder={
                    newType === 'chatbot' ? 'Ex: bot-vendas' :
                    newType === 'broadcast' ? 'Ex: campanha-natal' :
                    'Ex: webhook-payments'
                  }
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus
                />
              </div>
            )}

            {/* Name (optional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Nome (opcional)</label>
              <input
                type="text"
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="Nome amigável para este vínculo"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Config Fields */}
            {configFields.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuração</p>
                {configFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-0.5">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={newConfig[field.key] || ''}
                        onChange={e => setNewConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        <option value="">{field.placeholder || 'Selecione...'}</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={newConfig[field.key] || ''}
                        onChange={e => setNewConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={newConfig[field.key] || ''}
                        onChange={e => setNewConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    )}
                    {configErrors[field.key] && (
                      <p className="text-[10px] text-red-500 mt-0.5">{configErrors[field.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!canCreate || creating}
                className="flex-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Vincular
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all"
            >
              <Plus size={14} />
              Novo Vínculo
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
