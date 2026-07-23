import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Loader2,
  Brain,
  Shield,
  Clock,
  Zap,
  AlertTriangle
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface Agent {
  id?: string;
  name: string;
  role: string;
  department: string;
  mission: string;
  autonomyLevel: 0 | 1 | 2 | 3;
  heartbeatIntervalMinutes: number;
  llmProviderPreference: string;
  monthlyTokenBudget: number;
  kpis: string[];
  permissions: string[];
  status?: 'active' | 'paused' | 'inactive';
}

interface AgentFormProps {
  agent?: Agent | null;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────

const DEPARTMENTS = [
  { id: 'executivo', label: 'Executivo', icon: '👔' },
  { id: 'vendas', label: 'Vendas', icon: '💼' },
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'cs', label: 'Customer Success', icon: '🤝' },
  { id: 'financeiro', label: 'Financeiro', icon: '💰' },
  { id: 'operacoes', label: 'Operações', icon: '⚙️' },
  { id: 'juridico', label: 'Jurídico', icon: '⚖️' },
  { id: 'ti', label: 'Tecnologia', icon: '💻' },
  { id: 'rh', label: 'Recursos Humanos', icon: '👥' },
];

const AUTONOMY_LEVELS = [
  { 
    level: 0, 
    label: 'Aprovação Manual', 
    description: 'Todas as ações precisam de aprovação humana',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: Shield
  },
  { 
    level: 1, 
    label: 'Tarefas Simples', 
    description: 'Auto-executa tarefas simples, aprovação para complexas',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock
  },
  { 
    level: 2, 
    label: 'Regras Definidas', 
    description: 'Executa dentro de regras pré-definidas',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Zap
  },
  { 
    level: 3, 
    label: 'Autonomia Total', 
    description: 'Executa livremente, reporta resultados',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Brain
  },
];

const LLM_PROVIDERS = [
  { id: 'gemini', label: 'Gemini', free: true },
  { id: 'groq', label: 'Groq', free: true },
  { id: 'openrouter', label: 'OpenRouter', free: true },
  { id: 'ollama', label: 'Ollama (Local)', free: true },
  { id: 'mistral', label: 'Mistral', free: true },
  { id: 'deepseek', label: 'DeepSeek', free: true },
];

const COMMON_KPIS = [
  'Receita gerada',
  'Leads qualificados',
  'Taxa de conversão',
  'Tempo de resposta',
  'Satisfação do cliente',
  'Redução de custos',
  'Retenção de clientes',
  'Novos clientes',
  'Pipeline criado',
  'Propostas enviadas',
];

const COMMON_PERMISSIONS = [
  'Ler dados do CRM',
  'Enviar WhatsApp',
  'Enviar e-mail',
  'Criar tarefas',
  'Atualizar pipeline',
  'Gerar relatórios',
  'Agendar reuniões',
  'Fazer prospecção',
];

// ─── Main Component ──────────────────────────────────────────────

export const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave, onClose }) => {
  const [formData, setFormData] = useState<Agent>({
    name: '',
    role: '',
    department: 'vendas',
    mission: '',
    autonomyLevel: 3,
    heartbeatIntervalMinutes: 30,
    llmProviderPreference: 'gemini',
    monthlyTokenBudget: 1000000,
    kpis: [],
    permissions: [],
    ...agent,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.role.trim()) newErrors.role = 'Cargo é obrigatório';
    if (!formData.mission.trim()) newErrors.mission = 'Missão é obrigatória';
    if (formData.heartbeatIntervalMinutes < 5) newErrors.heartbeatIntervalMinutes = 'Mínimo 5 minutos';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(formData);
  };

  const toggleKPI = (kpi: string) => {
    setFormData(prev => ({
      ...prev,
      kpis: prev.kpis.includes(kpi)
        ? prev.kpis.filter(k => k !== kpi)
        : [...prev.kpis, kpi],
    }));
  };

  const togglePermission = (perm: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {agent ? 'Editar Agente' : 'Novo Agente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Name & Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: CEO Digital"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    errors.name ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cargo *
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Ex: Diretor Executivo"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    errors.role ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Departamento
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DEPARTMENTS.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, department: dept.id }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      formData.department === dept.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{dept.icon}</span>
                    <div className="text-sm font-medium text-slate-700 mt-1">{dept.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mission */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Missão *
              </label>
              <textarea
                value={formData.mission}
                onChange={(e) => setFormData(prev => ({ ...prev, mission: e.target.value }))}
                placeholder="Descreva o objetivo principal deste agente..."
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none ${
                  errors.mission ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.mission && <p className="text-xs text-red-600 mt-1">{errors.mission}</p>}
            </div>

            {/* Autonomy Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nível de Autonomia
              </label>
              <div className="grid grid-cols-2 gap-3">
                {AUTONOMY_LEVELS.map(level => {
                  const Icon = level.icon;
                  return (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, autonomyLevel: level.level as 0 | 1 | 2 | 3 }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.autonomyLevel === level.level
                          ? level.color
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={16} />
                        <span className="font-medium text-sm">{level.label}</span>
                      </div>
                      <p className="text-xs opacity-75">{level.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Heartbeat & LLM */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Intervalo de Heartbeat
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={formData.heartbeatIntervalMinutes}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      heartbeatIntervalMinutes: parseInt(e.target.value) || 30 
                    }))}
                    min={5}
                    max={1440}
                    className={`w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                      errors.heartbeatIntervalMinutes ? 'border-red-300' : 'border-slate-300'
                    }`}
                  />
                  <span className="text-sm text-slate-500">minutos</span>
                </div>
                {errors.heartbeatIntervalMinutes && (
                  <p className="text-xs text-red-600 mt-1">{errors.heartbeatIntervalMinutes}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Provedor LLM Preferido
                </label>
                <select
                  value={formData.llmProviderPreference}
                  onChange={(e) => setFormData(prev => ({ ...prev, llmProviderPreference: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {LLM_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label} {provider.free ? '(Grátis)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Token Budget */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Orçamento Mensal de Tokens
              </label>
              <input
                type="number"
                value={formData.monthlyTokenBudget}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  monthlyTokenBudget: parseInt(e.target.value) || 0 
                }))}
                min={0}
                step={100000}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                0 = sem limite. Recomendado: 1.000.000 tokens/mês
              </p>
            </div>

            {/* KPIs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                KPIs (Indicadores de Performance)
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_KPIS.map(kpi => (
                  <button
                    key={kpi}
                    type="button"
                    onClick={() => toggleKPI(kpi)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      formData.kpis.includes(kpi)
                        ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {kpi}
                  </button>
                ))}
              </div>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Permissões
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COMMON_PERMISSIONS.map(perm => (
                  <button
                    key={perm}
                    type="button"
                    onClick={() => togglePermission(perm)}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${
                      formData.permissions.includes(perm)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        formData.permissions.includes(perm)
                          ? 'bg-green-500 border-green-500'
                          : 'border-slate-300'
                      }`}>
                        {formData.permissions.includes(perm) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {perm}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                {agent ? 'Salvar Alterações' : 'Criar Agente'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
