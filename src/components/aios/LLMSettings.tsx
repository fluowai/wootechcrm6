import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface LLMProvider {
  id: string;
  provider: string;
  priority: number;
  enabled: boolean;
  rate_limit_per_minute: number;
  tokens_used_today: number;
  tokens_used_month: number;
  last_used_at: string | null;
  last_error: string | null;
  models: string[];
}

interface NewProvider {
  provider: string;
  apiKey: string;
  priority: number;
  rateLimitPerMinute: number;
}

const PROVIDER_OPTIONS = [
  { id: 'gemini', label: 'Google Gemini', icon: '🧠', free: true, description: '15 req/min gratuito' },
  { id: 'groq', label: 'Groq', icon: '⚡', free: true, description: '30 req/min, Llama 3.3 70B' },
  { id: 'openrouter', label: 'OpenRouter', icon: '🔀', free: true, description: 'Vários modelos gratuitos' },
  { id: 'cerebras', label: 'Cerebras', icon: '🔬', free: true, description: 'Llama 3.3 70B gratuito' },
  { id: 'nvidia-nim', label: 'NVIDIA NIM', icon: '💚', free: true, description: '10 req/min gratuito' },
  { id: 'mistral', label: 'Mistral AI', icon: '🌊', free: true, description: '30 req/min gratuito' },
  { id: 'deepseek', label: 'DeepSeek', icon: '🔍', free: true, description: '10 req/min gratuito' },
  { id: 'huggingface', label: 'HuggingFace', icon: '🤗', free: true, description: '10 req/min gratuito' },
  { id: 'cohere', label: 'Cohere', icon: '💎', free: true, description: '10 req/min gratuito' },
  { id: 'cloudflare', label: 'Cloudflare Workers AI', icon: '☁️', free: true, description: '10 req/min gratuito' },
  { id: 'puter', label: 'Puter', icon: '🌐', free: true, description: 'GPT-4o-mini gratuito' },
];

export const LLMSettings: React.FC = () => {
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newProvider, setNewProvider] = useState<NewProvider>({
    provider: 'gemini',
    apiKey: '',
    priority: 1,
    rateLimitPerMinute: 30,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/ai-os/llm-providers');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newProvider.apiKey.trim()) {
      setMessage({ type: 'error', text: 'Insira a chave da API' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/ai-os/llm-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProvider),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: `${PROVIDER_OPTIONS.find(p => p.id === newProvider.provider)?.label || newProvider.provider} salvo com sucesso!` });
        setNewProvider({ provider: 'gemini', apiKey: '', priority: providers.length + 1, rateLimitPerMinute: 30 });
        setShowAdd(false);
        fetchProviders();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Erro ao salvar' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/ai-os/llm-providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      fetchProviders();
    } catch (err) {
      console.error('Error toggling provider:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este provedor?')) return;
    try {
      await fetch(`/api/ai-os/llm-providers/${id}`, { method: 'DELETE' });
      fetchProviders();
      setMessage({ type: 'success', text: 'Provedor removido' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting provider:', err);
    }
  };

  const enabledCount = providers.filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            Provedores LLM
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Configure as chaves de API dos provedores de IA. As chaves são rotacionadas automaticamente.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Provedor
        </button>
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Rotação Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-purple-900">Rotação Automática</h4>
            <p className="text-sm text-purple-700 mt-1">
              {enabledCount} provedor(es) ativo(s). O sistema tenta cada provedor em ordem de prioridade.
              Se um falhar ou atingir o rate limit, automaticamente usa o próximo. Nunca fica sem tokens.
            </p>
          </div>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-gray-900">Novo Provedor</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provedor</label>
              <select
                value={newProvider.provider}
                onChange={(e) => setNewProvider({ ...newProvider, provider: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {PROVIDER_OPTIONS.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label} {p.free ? '(Gratuito)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <input
                type="number"
                value={newProvider.priority}
                onChange={(e) => setNewProvider({ ...newProvider, priority: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min="1"
                max="12"
              />
              <p className="text-xs text-gray-500 mt-1">1 = primeiro a ser chamado</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave da API</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={newProvider.apiKey}
                onChange={(e) => setNewProvider({ ...newProvider, apiKey: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono"
                placeholder="Cole sua chave de API aqui..."
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              A chave é salva criptografada. Nunca é enviada ao frontend.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !newProvider.apiKey.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Provider List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum provedor configurado</p>
          <p className="text-sm mt-1">Adicione pelo menos um provedor de LLM para usar o AI-BOS</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => {
            const info = PROVIDER_OPTIONS.find(p => p.id === provider.provider);
            return (
              <div
                key={provider.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  provider.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{info?.icon || '🔧'}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {info?.label || provider.provider}
                      {info?.free && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Gratuito</span>}
                    </div>
                    <div className="text-sm text-gray-500">
                      Prioridade: {provider.priority} · Rate limit: {provider.rate_limit_per_minute}/min
                      {provider.tokens_used_month > 0 && ` · Usados: ${provider.tokens_used_month.toLocaleString()} tokens`}
                    </div>
                    {provider.last_error && (
                      <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Último erro: {provider.last_error}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(provider.id, !provider.enabled)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      provider.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {provider.enabled ? 'Ativo' : 'Inativo'}
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
