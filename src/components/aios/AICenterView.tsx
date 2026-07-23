import React, { useState, useEffect } from 'react';
import {
  Brain,
  Users,
  Target,
  Activity,
  Lightbulb,
  MessageSquare,
  BarChart3,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  Zap,
  Plus,
  Settings
} from 'lucide-react';

import { OnboardingView } from './OnboardingView';
import { AgentForm } from './AgentForm';
import { GoalForm } from './GoalForm';
import { ActivityFeed } from './ActivityFeed';
import { SuggestionsPanel } from './SuggestionsPanel';
import { InsightsView } from './InsightsView';
import { LLMSettings } from './LLMSettings';
import { AIChat } from './AIChat';

// ─── Types ───────────────────────────────────────────────────────

interface Agent {
  id: string;
  name: string;
  role: string;
  department: string;
  mission: string;
  autonomyLevel: 0 | 1 | 2 | 3;
  heartbeatIntervalMinutes: number;
  llmProviderPreference: string;
  monthlyTokenBudget: number;
  tokensUsedThisMonth: number;
  kpis: string[];
  permissions: string[];
  status: 'active' | 'paused' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'revenue' | 'growth' | 'retention' | 'efficiency' | 'custom';
  targetValue: number;
  currentValue: number;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'achieved' | 'abandoned' | 'paused';
  deadline: string;
  assignedAgentId: string;
  createdAt: string;
  updatedAt: string;
}

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

interface CompanyProfile {
  industry: string;
  companySize: string;
  monthlyRevenue: string;
  productsServices: string;
  salesChannels: string[];
  primaryGoal: string;
}

type Tab = 'overview' | 'agents' | 'goals' | 'activities' | 'suggestions' | 'insights' | 'conversations' | 'settings';

// ─── Main Component ──────────────────────────────────────────────

export const AICenterView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Modal states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // ─── Data Fetching ───────────────────────────────────────────

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [agentsRes, goalsRes, activitiesRes, suggestionsRes] = await Promise.allSettled([
        fetch('/api/ai-os/agents'),
        fetch('/api/ai-os/goals'),
        fetch('/api/ai-os/activities?limit=50'),
        fetch('/api/ai-os/suggestions?status=new'),
      ]);

      if (agentsRes.status === 'fulfilled') {
        const data = await agentsRes.value.json();
        setAgents(data.agents || []);
      }

      if (goalsRes.status === 'fulfilled') {
        const data = await goalsRes.value.json();
        setGoals(data.goals || []);
      }

      if (activitiesRes.status === 'fulfilled') {
        const data = await activitiesRes.value.json();
        setActivities(data.activities || []);
      }

      if (suggestionsRes.status === 'fulfilled') {
        const data = await suggestionsRes.value.json();
        setSuggestions(data.suggestions || []);
      }

      // Check if onboarding is completed
      const profileRes = await fetch('/api/ai-os/profile');
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCompanyProfile(data.profile);
      }
    } catch (err) {
      setError('Erro ao carregar dados do AI-BOS');
      console.error('AI-BOS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── Handlers ────────────────────────────────────────────────

  const handleOnboardingComplete = async (profile: CompanyProfile) => {
    try {
      // Save profile
      await fetch('/api/ai-os/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      setCompanyProfile(profile);
      setShowOnboarding(false);

      // Auto-generate agents using LLM
      setLoading(true);
      try {
        const genRes = await fetch('/api/ai-os/generate-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile }),
        });
        const genData = await genRes.json();
        if (genData.success) {
          console.log(`[AI-BOS] Generated ${genData.agents.length} agents via ${genData.llmProvider}`);
        }
      } catch (genErr) {
        console.error('[AI-BOS] Agent generation failed:', genErr);
      }

      fetchData();
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  const handleSaveAgent = async (agentData: Agent) => {
    try {
      const url = editingAgent ? `/api/ai-os/agents/${editingAgent.id}` : '/api/ai-os/agents';
      const method = editingAgent ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData),
      });
      
      setShowAgentForm(false);
      setEditingAgent(null);
      fetchData();
    } catch (err) {
      console.error('Error saving agent:', err);
    }
  };

  const handleSaveGoal = async (goalData: Goal) => {
    try {
      const url = editingGoal ? `/api/ai-os/goals/${editingGoal.id}` : '/api/ai-os/goals';
      const method = editingGoal ? 'PATCH' : 'POST';
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalData),
      });
      
      setShowGoalForm(false);
      setEditingGoal(null);
      fetchData();
    } catch (err) {
      console.error('Error saving goal:', err);
    }
  };

  const handleAcceptSuggestion = async (id: string) => {
    try {
      await fetch(`/api/ai-os/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });
      fetchData();
    } catch (err) {
      console.error('Error accepting suggestion:', err);
    }
  };

  const handleDismissSuggestion = async (id: string) => {
    try {
      await fetch(`/api/ai-os/suggestions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      fetchData();
    } catch (err) {
      console.error('Error dismissing suggestion:', err);
    }
  };

  const handleToggleAgentStatus = async (agentId: string, newStatus: 'active' | 'paused') => {
    try {
      await fetch(`/api/ai-os/agents/${agentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchData();
    } catch (err) {
      console.error('Error toggling agent status:', err);
    }
  };

  // ─── Stats Calculation ──────────────────────────────────────

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const pausedAgents = agents.filter(a => a.status === 'paused').length;
  const activeGoals = goals.filter(g => g.status === 'active').length;
  const completedGoals = goals.filter(g => g.status === 'achieved').length;
  const totalTokensUsed = agents.reduce((sum, a) => sum + (a.tokensUsedThisMonth || 0), 0);
  const pendingSuggestions = suggestions.filter(s => s.status === 'new').length;

  // ─── Tab Configuration ──────────────────────────────────────

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType; badge?: number }> = [
    { id: 'overview', label: 'Visão Geral', icon: Brain },
    { id: 'agents', label: 'Agentes', icon: Users, badge: agents.length },
    { id: 'goals', label: 'Metas', icon: Target, badge: activeGoals },
    { id: 'activities', label: 'Atividades', icon: Activity },
    { id: 'suggestions', label: 'Sugestões', icon: Lightbulb, badge: pendingSuggestions },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'conversations', label: 'Conversas', icon: MessageSquare },
    { id: 'settings', label: 'Config LLM', icon: Settings },
  ];

  // ─── Show Onboarding ────────────────────────────────────────

  if (showOnboarding || (!loading && !companyProfile && agents.length === 0)) {
    return (
      <OnboardingView
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 p-6 rounded-2xl text-white shadow-lg space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/20">
          <Brain size={14} className="text-amber-300" />
          <span>AI Business Operating System</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Centro de Comando AI</h2>
        <p className="text-xs text-purple-100 max-w-2xl">
          Gerencie agentes autônomos, metas estratégicas e inteligência do seu negócio.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Users size={14} />
            Agentes Ativos
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeAgents}
            <span className="text-sm font-normal text-slate-500 ml-1">/ {agents.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Target size={14} />
            Metas Ativas
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {activeGoals}
            <span className="text-sm font-normal text-slate-500 ml-1">/ {goals.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Lightbulb size={14} />
            Sugestões Pendentes
          </div>
          <div className="text-2xl font-bold text-amber-600">{pendingSuggestions}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Zap size={14} />
            Tokens Usados
          </div>
          <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-BR').format(totalTokensUsed)}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Activity size={14} />
            Metas Concluídas
          </div>
          <div className="text-2xl font-bold text-green-600">{completedGoals}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 bg-indigo-200 text-indigo-800 rounded-full text-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
          <span className="ml-2 text-slate-600">Carregando AI-BOS...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-600" />
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={fetchData}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}

      {/* Tab Content */}
      {!loading && !error && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">WOO — CEO AI</h3>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Reconfigurar Empresa
                </button>
              </div>
              <AIChat companyProfile={companyProfile} agents={agents} />
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Agentes</h3>
                <button
                  onClick={() => { setEditingAgent(null); setShowAgentForm(true); }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Novo Agente
                </button>
              </div>

              {agents.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-2">Nenhum agente configurado</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Crie seu primeiro agente autônomo para começar
                  </p>
                  <button
                    onClick={() => { setEditingAgent(null); setShowAgentForm(true); }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >
                    Criar Primeiro Agente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-slate-900">{agent.name}</h4>
                          <p className="text-xs text-slate-500">{agent.role}</p>
                        </div>
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          agent.status === 'active' ? 'bg-green-100 text-green-700' :
                          agent.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {agent.status === 'active' ? 'Ativo' :
                           agent.status === 'paused' ? 'Pausado' : 'Inativo'}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-2">{agent.mission}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                        <span>Autonomia: Nível {agent.autonomyLevel}</span>
                        <span>{new Intl.NumberFormat('pt-BR').format(agent.tokensUsedThisMonth || 0)} tokens</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditingAgent(agent); setShowAgentForm(true); }}
                          className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleAgentStatus(agent.id, agent.status === 'active' ? 'paused' : 'active')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            agent.status === 'active'
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {agent.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Metas Estratégicas</h3>
                <button
                  onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nova Meta
                </button>
              </div>

              {goals.length === 0 ? (
                <div className="text-center py-12">
                  <Target size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-2">Nenhuma meta definida</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Defina metas estratégicas para guiar os agentes
                  </p>
                  <button
                    onClick={() => { setEditingGoal(null); setShowGoalForm(true); }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Criar Primeira Meta
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.map((goal) => {
                    const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
                    return (
                      <div
                        key={goal.id}
                        className="p-4 border border-slate-200 rounded-xl"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-slate-900">{goal.title}</h4>
                            <p className="text-xs text-slate-500">{goal.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              goal.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              goal.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {goal.priority}
                            </span>
                            <button
                              onClick={() => { setEditingGoal(goal); setShowGoalForm(true); }}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <Settings size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                            <span>{new Intl.NumberFormat('pt-BR').format(goal.currentValue)} / {new Intl.NumberFormat('pt-BR').format(goal.targetValue)} {goal.unit}</span>
                            <span>{Math.round(progress)}%</span>
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
                        </div>
                        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                          <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                          <span className={`px-2 py-0.5 rounded ${
                            goal.status === 'active' ? 'bg-green-100 text-green-700' :
                            goal.status === 'achieved' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {goal.status === 'active' ? 'Ativa' :
                             goal.status === 'achieved' ? 'Concluída' : goal.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <ActivityFeed 
              activities={activities} 
              onRefresh={fetchData}
              loading={loading}
            />
          )}

          {activeTab === 'suggestions' && (
            <SuggestionsPanel
              suggestions={suggestions}
              onAccept={handleAcceptSuggestion}
              onDismiss={handleDismissSuggestion}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsView onRefresh={fetchData} loading={loading} />
          )}

          {activeTab === 'conversations' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Conversas entre Agentes</h3>
              <div className="text-center py-12">
                <MessageSquare size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-2">Nenhuma conversa ativa</p>
                <p className="text-xs text-slate-400">
                  Quando agentes precisarem colaborar, as conversas aparecerão aqui
                </p>
              </div>
            </div>
          )}

          {activeTab === 'settings' && <LLMSettings />}
        </div>
      )}

      {/* Modals */}
      {showAgentForm && (
        <AgentForm
          agent={editingAgent}
          onSave={handleSaveAgent}
          onClose={() => { setShowAgentForm(false); setEditingAgent(null); }}
        />
      )}

      {showGoalForm && (
        <GoalForm
          goal={editingGoal}
          agents={agents.map(a => ({ id: a.id, name: a.name, role: a.role }))}
          onSave={handleSaveGoal}
          onClose={() => { setShowGoalForm(false); setEditingGoal(null); }}
        />
      )}
    </div>
  );
};
