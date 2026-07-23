import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Target,
  Zap,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface AgentMetrics {
  agentId: string;
  agentName: string;
  role: string;
  tokensUsed: number;
  tasksCompleted: number;
  suggestionsMade: number;
  successRate: number;
  avgResponseTime: number;
}

interface GoalMetrics {
  goalId: string;
  title: string;
  category: string;
  progress: number;
  target: number;
  status: string;
}

interface InsightsData {
  agentMetrics: AgentMetrics[];
  goalMetrics: GoalMetrics[];
  totalTokensUsed: number;
  totalTasksCompleted: number;
  overallSuccessRate: number;
  topPerformingAgent: string;
  mostActiveCategory: string;
}

interface InsightsViewProps {
  data?: InsightsData;
  onRefresh?: () => void;
  loading?: boolean;
}

// ─── Main Component ──────────────────────────────────────────────

export const InsightsView: React.FC<InsightsViewProps> = ({
  data,
  onRefresh,
  loading = false,
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month');

  // Mock data if none provided
  const insights: InsightsData = data || {
    agentMetrics: [
      { agentId: '1', agentName: 'CEO Digital', role: 'Diretor Executivo', tokensUsed: 45000, tasksCompleted: 28, suggestionsMade: 12, successRate: 95, avgResponseTime: 2.3 },
      { agentId: '2', agentName: 'SDR Bot', role: 'SDR', tokensUsed: 32000, tasksCompleted: 45, suggestionsMade: 8, successRate: 88, avgResponseTime: 1.8 },
      { agentId: '3', agentName: 'Closer AI', role: 'Closer', tokensUsed: 28000, tasksCompleted: 18, suggestionsMade: 5, successRate: 92, avgResponseTime: 2.1 },
      { agentId: '4', agentName: 'CS Manager', role: 'Customer Success', tokensUsed: 15000, tasksCompleted: 32, suggestionsMade: 15, successRate: 97, avgResponseTime: 1.5 },
    ],
    goalMetrics: [
      { goalId: '1', title: 'Aumentar receita em 30%', category: 'revenue', progress: 75000, target: 100000, status: 'active' },
      { goalId: '2', title: 'Reduzir churn para 5%', category: 'retention', progress: 7, target: 5, status: 'active' },
      { goalId: '3', title: 'Gerar 200 leads/mês', category: 'growth', progress: 156, target: 200, status: 'active' },
    ],
    totalTokensUsed: 120000,
    totalTasksCompleted: 123,
    overallSuccessRate: 93,
    topPerformingAgent: 'CS Manager',
    mostActiveCategory: 'revenue',
  };

  const formatNumber = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Insights & Métricas</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['week', 'month', 'quarter'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {range === 'week' ? '7 dias' : range === 'month' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Zap size={14} />
            Tokens Utilizados
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatNumber(insights.totalTokensUsed)}
          </div>
          <div className="text-xs text-green-600 mt-1">↓ 12% vs mês anterior</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Target size={14} />
            Tarefas Concluídas
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatNumber(insights.totalTasksCompleted)}
          </div>
          <div className="text-xs text-green-600 mt-1">↑ 23% vs mês anterior</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <TrendingUp size={14} />
            Taxa de Sucesso
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {insights.overallSuccessRate}%
          </div>
          <div className="text-xs text-green-600 mt-1">↑ 5% vs mês anterior</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Users size={14} />
            Melhor Agente
          </div>
          <div className="text-lg font-bold text-slate-900 truncate">
            {insights.topPerformingAgent}
          </div>
          <div className="text-xs text-slate-500 mt-1">97% taxa de sucesso</div>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Performance dos Agentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Agente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tokens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tarefas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sugestões</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Sucesso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tempo Médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {insights.agentMetrics.map(agent => (
                <tr key={agent.agentId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{agent.agentName}</div>
                      <div className="text-xs text-slate-500">{agent.role}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {formatNumber(agent.tokensUsed)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {agent.tasksCompleted}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {agent.suggestionsMade}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            agent.successRate >= 90 ? 'bg-green-500' :
                            agent.successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${agent.successRate}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-700">{agent.successRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {agent.avgResponseTime}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Progresso das Metas</h3>
        <div className="space-y-4">
          {insights.goalMetrics.map(goal => {
            const progress = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
            return (
              <div key={goal.goalId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{goal.title}</span>
                  <span className="text-sm text-slate-500">
                    {formatNumber(goal.progress)} / {formatNumber(goal.target)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      progress >= 100 ? 'bg-green-500' :
                      progress >= 70 ? 'bg-blue-500' :
                      progress >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {Math.round(progress)}% concluído
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
