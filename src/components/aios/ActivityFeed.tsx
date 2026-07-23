import React, { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  RefreshCw,
  Loader2,
  Brain,
  Target,
  Lightbulb,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  ChevronDown
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  actionType: 'analysis' | 'suggestion' | 'execution' | 'delegation' | 'alert' | 'heartbeat' | 'goal_check' | 'llm_call';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  llmProvider?: string;
  tokensUsed?: number;
  createdAt: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  onRefresh?: () => void;
  loading?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────

const ACTION_TYPES = [
  { id: 'all', label: 'Todos', icon: Activity },
  { id: 'analysis', label: 'Análises', icon: Brain },
  { id: 'suggestion', label: 'Sugestões', icon: Lightbulb },
  { id: 'execution', label: 'Execuções', icon: Zap },
  { id: 'delegation', label: 'Delegações', icon: MessageSquare },
  { id: 'alert', label: 'Alertas', icon: AlertCircle },
  { id: 'heartbeat', label: 'Heartbeats', icon: Clock },
  { id: 'goal_check', label: 'Metas', icon: Target },
];

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pendente', icon: Clock },
  in_progress: { color: 'bg-blue-100 text-blue-700', label: 'Em andamento', icon: Loader2 },
  completed: { color: 'bg-green-100 text-green-700', label: 'Concluído', icon: CheckCircle },
  failed: { color: 'bg-red-100 text-red-700', label: 'Falhou', icon: AlertCircle },
};

const ACTION_TYPE_CONFIG = {
  analysis: { color: 'bg-purple-100 text-purple-700', icon: Brain },
  suggestion: { color: 'bg-amber-100 text-amber-700', icon: Lightbulb },
  execution: { color: 'bg-green-100 text-green-700', icon: Zap },
  delegation: { color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  alert: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
  heartbeat: { color: 'bg-slate-100 text-slate-700', icon: Clock },
  goal_check: { color: 'bg-indigo-100 text-indigo-700', icon: Target },
  llm_call: { color: 'bg-cyan-100 text-cyan-700', icon: Brain },
};

// ─── Main Component ──────────────────────────────────────────────

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  activities, 
  onRefresh, 
  loading = false 
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.actionType === filter);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-900">Feed de Atividades</h3>
          <span className="text-xs text-slate-500">({filteredActivities.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Filter size={16} />
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            {ACTION_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setFilter(type.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === type.id
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={12} />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity List */}
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Activity size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">Nenhuma atividade encontrada</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="mt-2 text-indigo-600 text-sm hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filteredActivities.map(activity => {
            const statusConfig = STATUS_CONFIG[activity.status];
            const actionConfig = ACTION_TYPE_CONFIG[activity.actionType];
            const StatusIcon = statusConfig.icon;
            const ActionIcon = actionConfig.icon;

            return (
              <div key={activity.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Action Type Icon */}
                  <div className={`mt-0.5 p-2 rounded-lg ${actionConfig.color}`}>
                    <ActionIcon size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900 text-sm">
                        {activity.agentName}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">
                        {formatTime(activity.createdAt)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-700 mb-1">{activity.title}</p>
                    
                    {activity.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {activity.description}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      
                      {activity.llmProvider && (
                        <span className="text-xs text-slate-500">
                          via {activity.llmProvider}
                        </span>
                      )}
                      
                      {activity.tokensUsed && activity.tokensUsed > 0 && (
                        <span className="text-xs text-slate-500">
                          {new Intl.NumberFormat('pt-BR').format(activity.tokensUsed)} tokens
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
