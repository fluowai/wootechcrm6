import React from 'react';
import {
  DollarSign,
  TrendingUp,
  Target,
  Users,
  Award,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Deal, TaskActivity, SalesRep, Company } from '../../types';

interface DashboardViewProps {
  deals: Deal[];
  tasks: TaskActivity[];
  reps: SalesRep[];
  companies: Company[];
  onNavigateToKanban: () => void;
  onNavigateToProspecting: () => void;
  onNavigateToWhatsApp: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  deals,
  tasks,
  reps,
  companies,
  onNavigateToKanban,
  onNavigateToProspecting,
  onNavigateToWhatsApp,
}) => {
  // Metric Calculations
  const wonDeals = deals.filter((d) => d.stageId === 'won');
  const activeDeals = deals.filter((d) => d.stageId !== 'won' && d.stageId !== 'lost');
  
  const totalWonRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const totalForecastedRevenue = activeDeals.reduce((sum, d) => sum + d.expectedRevenue, 0);
  const avgTicket = deals.length > 0 ? deals.reduce((sum, d) => sum + d.value, 0) / deals.length : 0;
  const conversionRate = deals.length > 0 ? ((wonDeals.length / deals.length) * 100).toFixed(1) : '0';

  const pendingTodayTasks = tasks.filter((t) => t.status === 'pending');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome Callout */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-sky-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold text-blue-100 border border-white/20 mb-2">
            <Sparkles size={13} className="text-amber-300" />
            <span>Motor de Inteligência Wootech Ativo</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Painel Comercial Executivo B2B</h2>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xl">
            Acompanhe o desempenho das suas equipes comerciais, prospecções ativas no GMB, enriquecimento automatizado e conversões em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-stretch md:self-auto">
          <button
            onClick={onNavigateToProspecting}
            className="flex-1 md:flex-initial bg-white hover:bg-slate-50 text-blue-700 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Search size={15} />
            <span>Prospecção Rápida GMB</span>
          </button>
          <button
            onClick={onNavigateToKanban}
            className="flex-1 md:flex-initial bg-blue-500/30 hover:bg-blue-500/40 text-white px-4 py-2.5 rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center justify-center gap-2"
          >
            <TrendingUp size={15} />
            <span>Ver Pipeline Kanban</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Fechada */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Receita Fechada (Mês)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              R$ {totalWonRevenue.toLocaleString('pt-BR')}
            </span>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <ArrowUpRight size={12} className="mr-0.5" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Meta mensal: R$ 180.000 (82% atingido)</p>
        </div>

        {/* Receita Ponderada Prevista */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Previsão de Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              R$ {totalForecastedRevenue.toLocaleString('pt-BR')}
            </span>
            <span className="inline-flex items-center text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
              Ponderado por Probabilidade
            </span>
          </div>
          <p className="text-[11px] text-slate-500">{activeDeals.length} oportunidades ativas no funil</p>
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Taxa de Conversão</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Target size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{conversionRate}%</span>
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              <ArrowUpRight size={12} className="mr-0.5" /> +2.8%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Benchmark do setor B2B: 22%</p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ticket Médio B2B</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Award size={18} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              R$ {Math.round(avgTicket).toLocaleString('pt-BR')}
            </span>
            <span className="inline-flex items-center text-[11px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
              Contratos Corporativos
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Com base em {deals.length} oportunidades criadas</p>
        </div>
      </div>

      {/* Main Grid: Funil + Vendedores Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Conversion Stages Visualizer */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Distribuição do Funil Comercial</h3>
              <p className="text-xs text-slate-500 mt-0.5">Visão do valor acumulado em cada estágio</p>
            </div>
            <button
              onClick={onNavigateToKanban}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Abrir Kanban &rarr;
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: '1. Prospecção GMB', count: 12, value: 145000, color: 'bg-slate-400', pct: 90 },
              { label: '2. Primeiro Contato', count: 8, value: 98000, color: 'bg-blue-500', pct: 75 },
              { label: '3. Reunião Agendada', count: 6, value: 185000, color: 'bg-indigo-500', pct: 60 },
              { label: '4. Proposta Enviada', count: 5, value: 112000, color: 'bg-amber-500', pct: 45 },
              { label: '5. Em Negociação', count: 4, value: 173000, color: 'bg-sky-500', pct: 30 },
              { label: '6. Fechado (Ganho)', count: wonDeals.length, value: totalWonRevenue, color: 'bg-emerald-500', pct: 100 }
            ].map((stage, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>{stage.label} ({stage.count} leads)</span>
                  <span className="font-bold text-slate-900">R$ {stage.value.toLocaleString('pt-BR')}</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking dos Vendedores Leaderboard */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Ranking da Equipe Comercial</h3>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Mês Atual</span>
          </div>

          <div className="divide-y divide-slate-100">
            {reps.map((rep, idx) => {
              const pctGoal = Math.min(100, Math.round((rep.closedValue / rep.goalValue) * 100));
              return (
                <div key={rep.id} className="py-3 flex items-center gap-3">
                  <div className="font-extrabold text-xs text-slate-400 w-4 text-center">
                    #{idx + 1}
                  </div>
                  <img
                    src={rep.avatar}
                    alt={rep.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate">{rep.name}</p>
                      <span className="text-xs font-bold text-emerald-600">R$ {rep.closedValue.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                      <span className="capitalize">{rep.role} • {rep.activeDealsCount} negócios</span>
                      <span className="font-semibold">{pctGoal}% da meta</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${pctGoal}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Today's Tasks + Recent Enriched Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Atividades e Follow-ups de Hoje */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Follow-ups e Reuniões de Hoje</h3>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
              {pendingTodayTasks.length} Pendentes
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingTodayTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 transition-colors flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded">
                      {task.type}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{task.title}</span>
                  </div>
                  {task.notes && <p className="text-[11px] text-slate-600 font-medium">{task.notes}</p>}
                </div>
                <button className="text-slate-400 hover:text-emerald-600 p-1" title="Marcar como Concluída">
                  <CheckCircle2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Empresas Enriquecidas Recentemente */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Base Comercial de Empresas</h3>
            </div>
            <button
              onClick={onNavigateToProspecting}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Procurar Mais Empresas &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {companies.slice(0, 3).map((comp) => (
              <div
                key={comp.id}
                className="p-3 rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{comp.nomeFantasia}</h4>
                    {comp.enriched && (
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                        CNPJ Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {comp.cnaePrincipal.text} • {comp.endereco.cidade}/{comp.endereco.estado}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-600">Score IA: {comp.scoreComercial}/100</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">GMB: ⭐ {comp.ratingGMB}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
