import React, { useState } from 'react';
import {
  Lightbulb,
  Check,
  X,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Filter
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface Suggestion {
  id: string;
  agentId: string;
  agentName: string;
  category: 'pipeline' | 'hiring' | 'marketing' | 'pricing' | 'retention' | 'operations' | 'custom';
  title: string;
  description: string;
  impactEstimate: 'high' | 'medium' | 'low';
  data: Record<string, unknown>;
  status: 'new' | 'viewed' | 'accepted' | 'dismissed' | 'implemented';
  createdAt: string;
}

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
  onImplement?: (id: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'pipeline', label: 'Pipeline', icon: '📊' },
  { id: 'hiring', label: 'Contratação', icon: '👥' },
  { id: 'marketing', label: 'Marketing', icon: '📢' },
  { id: 'pricing', label: 'Preço', icon: '💰' },
  { id: 'retention', label: 'Retenção', icon: '🔄' },
  { id: 'operations', label: 'Operações', icon: '⚙️' },
  { id: 'custom', label: 'Personalizado', icon: '📌' },
];

const IMPACT_CONFIG = {
  high: { color: 'bg-red-100 text-red-700', label: 'Alto Impacto', icon: TrendingUp },
  medium: { color: 'bg-orange-100 text-orange-700', label: 'Médio Impacto', icon: Minus },
  low: { color: 'bg-yellow-100 text-yellow-700', label: 'Baixo Impacto', icon: TrendingDown },
};

const STATUS_CONFIG = {
  new: { color: 'bg-blue-100 text-blue-700', label: 'Nova' },
  viewed: { color: 'bg-slate-100 text-slate-700', label: 'Visualizada' },
  accepted: { color: 'bg-green-100 text-green-700', label: 'Aceita' },
  dismissed: { color: 'bg-red-100 text-red-700', label: 'Dispensada' },
  implemented: { color: 'bg-purple-100 text-purple-700', label: 'Implementada' },
};

// ─── Main Component ──────────────────────────────────────────────

export const SuggestionsPanel: React.FC<SuggestionsPanelProps> = ({
  suggestions,
  onAccept,
  onDismiss,
  onImplement,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredSuggestions = filter === 'all'
    ? suggestions
    : suggestions.filter(s => s.category === filter);

  const handleAction = async (id: string, action: () => void) => {
    setLoadingId(id);
    await new Promise(resolve => setTimeout(resolve, 300));
    action();
    setLoadingId(null);
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-amber-500" />
          <h3 className="font-semibold text-slate-900">Sugestões dos Agentes</h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
            {suggestions.filter(s => s.status === 'new').length} novas
          </span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-4 py-3 border-b border-slate-100 overflow-x-auto">
        <div className="flex gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                filter === cat.id
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {filteredSuggestions.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Lightbulb size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">Nenhuma sugestão encontrada</p>
          </div>
        ) : (
          filteredSuggestions.map(suggestion => {
            const impactConfig = IMPACT_CONFIG[suggestion.impactEstimate];
            const statusConfig = STATUS_CONFIG[suggestion.status];
            const ImpactIcon = impactConfig.icon;
            const categoryInfo = getCategoryInfo(suggestion.category);
            const isLoading = loadingId === suggestion.id;

            return (
              <div
                key={suggestion.id}
                className={`px-4 py-4 hover:bg-slate-50 transition-colors ${
                  suggestion.status === 'new' ? 'bg-amber-50/30' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryInfo.icon}</span>
                    <div>
                      <h4 className="font-medium text-slate-900 text-sm">{suggestion.title}</h4>
                      <p className="text-xs text-slate-500">
                        {suggestion.agentName} • {new Date(suggestion.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${impactConfig.color}`}>
                      <ImpactIcon size={10} className="inline mr-1" />
                      {impactConfig.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>

                {/* Data Preview */}
                {suggestion.data && Object.keys(suggestion.data).length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <pre className="text-xs text-slate-600 overflow-x-auto">
                      {JSON.stringify(suggestion.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                {suggestion.status === 'new' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAction(suggestion.id, () => onAccept(suggestion.id))}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Check size={12} />
                      )}
                      Aceitar
                    </button>
                    
                    <button
                      onClick={() => handleAction(suggestion.id, () => onDismiss(suggestion.id))}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-300 transition-colors disabled:opacity-50"
                    >
                      <X size={12} />
                      Dispensar
                    </button>

                    {onImplement && (
                      <button
                        onClick={() => handleAction(suggestion.id, () => onImplement(suggestion.id))}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        <ExternalLink size={12} />
                        Implementar
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
