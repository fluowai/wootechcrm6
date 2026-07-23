import React, { useState } from 'react';
import {
  X,
  Save,
  Loader2,
  Target,
  Calendar,
  Users,
  TrendingUp
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface Goal {
  id?: string;
  title: string;
  description: string;
  category: 'revenue' | 'growth' | 'retention' | 'efficiency' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline: string;
  assignedAgentId: string;
}

interface GoalFormProps {
  goal?: Goal | null;
  agents: Array<{ id: string; name: string; role: string }>;
  onSave: (goal: Goal) => void;
  onClose: () => void;
}

// ─── Constants ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'revenue', label: 'Receita', icon: '💰', color: 'bg-green-100 text-green-700' },
  { id: 'growth', label: 'Crescimento', icon: '📈', color: 'bg-blue-100 text-blue-700' },
  { id: 'retention', label: 'Retenção', icon: '🔄', color: 'bg-orange-100 text-orange-700' },
  { id: 'efficiency', label: 'Eficiência', icon: '⚡', color: 'bg-purple-100 text-purple-700' },
  { id: 'custom', label: 'Personalizado', icon: '🎯', color: 'bg-slate-100 text-slate-700' },
];

const PRIORITIES = [
  { id: 'low', label: 'Baixa', color: 'bg-slate-100 text-slate-700' },
  { id: 'medium', label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  { id: 'critical', label: 'Crítica', color: 'bg-red-100 text-red-700' },
];

const UNITS = [
  { id: 'BRL', label: 'R$ (Reais)' },
  { id: 'leads', label: 'Leads' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'percent', label: 'Percentual (%)' },
  { id: 'horas', label: 'Horas' },
  { id: 'dias', label: 'Dias' },
];

// ─── Main Component ──────────────────────────────────────────────

export const GoalForm: React.FC<GoalFormProps> = ({ goal, agents, onSave, onClose }) => {
  const [formData, setFormData] = useState<Goal>({
    title: '',
    description: '',
    category: 'revenue',
    targetValue: 0,
    currentValue: 0,
    unit: 'BRL',
    priority: 'high',
    deadline: '',
    assignedAgentId: '',
    ...goal,
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) newErrors.title = 'Título é obrigatório';
    if (!formData.description.trim()) newErrors.description = 'Descrição é obrigatória';
    if (formData.targetValue <= 0) newErrors.targetValue = 'Meta deve ser maior que 0';
    if (!formData.deadline) newErrors.deadline = 'Prazo é obrigatório';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            {goal ? 'Editar Meta' : 'Nova Meta'}
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
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Título da Meta *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Aumentar receita em 30%"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                  errors.title ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Descrição *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descreva o objetivo e como será medido..."
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none ${
                  errors.description ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Categoria
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat.id as Goal['category'] }))}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      formData.category === cat.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div className="text-sm font-medium text-slate-700 mt-1">{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Value & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Alvo *
                </label>
                <input
                  type="number"
                  value={formData.targetValue || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetValue: parseFloat(e.target.value) || 0 }))}
                  min={0}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    errors.targetValue ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.targetValue && <p className="text-xs text-red-600 mt-1">{errors.targetValue}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unidade
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  {UNITS.map(unit => (
                    <option key={unit.id} value={unit.id}>{unit.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority & Deadline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p.id as Goal['priority'] }))}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                        formData.priority === p.id
                          ? p.color
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prazo *
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
                    errors.deadline ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.deadline && <p className="text-xs text-red-600 mt-1">{errors.deadline}</p>}
              </div>
            </div>

            {/* Assigned Agent */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Agente Responsável
              </label>
              <select
                value={formData.assignedAgentId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedAgentId: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Nenhum agente específico</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} — {agent.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Value (only for editing) */}
            {goal && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Valor Atual
                </label>
                <input
                  type="number"
                  value={formData.currentValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentValue: parseFloat(e.target.value) || 0 }))}
                  min={0}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
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
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={16} />
                {goal ? 'Salvar Alterações' : 'Criar Meta'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
