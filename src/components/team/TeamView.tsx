import React, { useState } from 'react';
import {
  Users,
  Award,
  Target,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Plus,
  Calculator,
  Mail,
  Edit,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ChevronRight
} from 'lucide-react';
import { SalesRep, Deal, SalesGoalTarget, CommissionStructure } from '../../types';
import {
  DEFAULT_COMMISSION_STRUCTURES,
  DEFAULT_GOAL_TARGETS,
  calculateCommissionPayout
} from '../../utils/commissionCalculator';
import { validateEmail } from '../../utils/emailValidation';
import { GoalTargetModal } from './GoalTargetModal';
import { CommissionStructureModal } from './CommissionStructureModal';
import { CommissionSimulatorModal } from './CommissionSimulatorModal';
import { EmailValidatorTool } from './EmailValidatorTool';
import { EditRepModal } from './EditRepModal';

interface TeamViewProps {
  reps: SalesRep[];
  deals?: Deal[];
  onUpdateReps?: (updatedReps: SalesRep[]) => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ reps: initialReps, deals = [], onUpdateReps }) => {
  const [reps, setReps] = useState<SalesRep[]>(initialReps);
  const [goals, setGoals] = useState<SalesGoalTarget[]>(DEFAULT_GOAL_TARGETS);
  const [structures, setStructures] = useState<CommissionStructure[]>(DEFAULT_COMMISSION_STRUCTURES);

  const [activeSubTab, setActiveSubTab] = useState<'reps' | 'goals' | 'structures' | 'simulator' | 'email_tool'>('reps');

  // Modals
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SalesGoalTarget | null>(null);

  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState<CommissionStructure | null>(null);

  const [showSimulator, setShowSimulator] = useState(false);

  const [showEditRepModal, setShowEditRepModal] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);

  const handleSaveGoal = (savedGoal: SalesGoalTarget) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === savedGoal.id);
      if (exists) return prev.map((g) => (g.id === savedGoal.id ? savedGoal : g));
      return [savedGoal, ...prev];
    });
  };

  const handleSaveStructure = (savedStruct: CommissionStructure) => {
    setStructures((prev) => {
      const exists = prev.some((s) => s.id === savedStruct.id);
      if (exists) return prev.map((s) => (s.id === savedStruct.id ? savedStruct : s));
      return [savedStruct, ...prev];
    });
  };

  const handleSaveRep = (savedRep: SalesRep) => {
    setReps((prev) => {
      const exists = prev.some((r) => r.id === savedRep.id);
      const updated = exists ? prev.map((r) => (r.id === savedRep.id ? savedRep : r)) : [savedRep, ...prev];
      if (onUpdateReps) onUpdateReps(updated);
      return updated;
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-blue-600" />
            <span>Gestão Comercial, Metas & Estrutura de Comissões</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Definição de metas individuais e por equipe, aceleradores progressivos de comissão e validação de e-mails corporativos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSimulator(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Calculator size={16} />
            <span>Simulador de Comissão</span>
          </button>

          <button
            onClick={() => {
              setEditingRep(null);
              setShowEditRepModal(true);
            }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <Plus size={16} />
            <span>Adicionar Vendedor</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('reps')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeSubTab === 'reps'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users size={16} />
          <span>Equipe & Performance</span>
          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {reps.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('goals')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeSubTab === 'goals'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Target size={16} />
          <span>Metas & Quotas</span>
          <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {goals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('structures')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeSubTab === 'structures'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award size={16} />
          <span>Estruturas de Comissão</span>
          <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            {structures.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('email_tool')}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-all ${
            activeSubTab === 'email_tool'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Mail size={16} />
          <span>Validador de E-mails</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-black">
            Novo
          </span>
        </button>
      </div>

      {/* TAB 1: Sales Reps & Performance */}
      {activeSubTab === 'reps' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reps.map((rep) => {
            const payout = calculateCommissionPayout(rep, undefined, deals, structures, goals);
            const emailRes = validateEmail(rep.email);

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-4 relative flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with Avatar, Name, Role & Email Validation */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={rep.avatar}
                        alt={rep.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-100 shadow-sm"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{rep.name}</h3>
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase mt-0.5 inline-block">
                          {rep.role}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setEditingRep(rep);
                        setShowEditRepModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="Editar Vendedor"
                    >
                      <Edit size={16} />
                    </button>
                  </div>

                  {/* Email & Email Health Badge */}
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="truncate text-slate-600 font-medium max-w-[170px]" title={rep.email}>
                      {rep.email}
                    </div>
                    {emailRes.isValid ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 border border-emerald-200">
                        <CheckCircle2 size={10} />
                        Válido
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 border border-rose-200">
                        <AlertCircle size={10} />
                        Atenção
                      </span>
                    )}
                  </div>

                  {/* Monthly Goal Progress Bar */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs mt-3">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>Meta de Receita</span>
                      <span className="font-bold text-slate-900">{payout.revenueAchievementPct}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          payout.revenueAchievementPct >= 100
                            ? 'bg-emerald-500'
                            : payout.revenueAchievementPct >= 80
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, payout.revenueAchievementPct)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Fechado: R$ {payout.actualClosedRevenue.toLocaleString('pt-BR')}</span>
                      <span>Meta: R$ {payout.revenueTarget.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Commission Tier Badge */}
                  {payout.appliedTier && (
                    <div className="mt-2 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center gap-1.5">
                      <Sparkles size={12} className="text-amber-600 shrink-0" />
                      <span className="truncate">Faixa: {payout.appliedTier.label} ({payout.effectiveRate}%)</span>
                    </div>
                  )}
                </div>

                {/* Commission Summary Footer */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100 mt-2">
                  <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <span className="text-[10px] text-emerald-800 block font-medium">Comissão Calculada</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      R$ {payout.totalCommissionPayout.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <span className="text-[10px] text-slate-500 block font-medium">Contratos Ganhos</span>
                    <span className="font-extrabold text-slate-800 text-sm">{payout.closedDealsCount}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Sales Goals & Quotas */}
      {activeSubTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Target size={18} className="text-blue-600" />
                <span>Metas Comerciais Ativas (Individuais e por Equipe)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhe e configure as metas de receita, contratos fechados e prospecção por período.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingGoal(null);
                setShowGoalModal(true);
              }}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
            >
              <Plus size={16} />
              <span>Criar Nova Meta</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const rep = reps.find((r) => r.id === goal.assigneeId);
              const closedRevenue = rep ? rep.closedValue : 1420000;
              const closedDeals = rep ? rep.closedDealsCount || 5 : 52;
              const pctRevenue = Math.min(100, Math.round((closedRevenue / goal.revenueTarget) * 100));
              const pctDeals = Math.min(100, Math.round((closedDeals / goal.closedDealsTarget) * 100));
              const struct = structures.find((s) => s.id === goal.commissionStructureId);

              return (
                <div
                  key={goal.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 uppercase">
                        {goal.periodName} ({goal.type === 'team' ? 'EQUIPE' : 'INDIVIDUAL'})
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{goal.assigneeName}</h4>
                    </div>

                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setShowGoalModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                  </div>

                  {/* Revenue Target Progress */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">Alvo de Receita</span>
                      <span className="font-bold text-slate-900">{pctRevenue}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${pctRevenue}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 font-medium">
                      <span>Realizado: R$ {closedRevenue.toLocaleString('pt-BR')}</span>
                      <span>Meta: R$ {goal.revenueTarget.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  {/* Deals Count Target Progress */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-600">Alvo de Contratos Fechados</span>
                      <span className="font-bold text-slate-900">{pctDeals}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all"
                        style={{ width: `${pctDeals}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 pt-0.5 font-medium">
                      <span>Realizado: {closedDeals} contratos</span>
                      <span>Meta: {goal.closedDealsTarget} contratos</span>
                    </div>
                  </div>

                  {/* Commission Structure Association */}
                  <div className="text-[11px] text-slate-600 bg-amber-50/60 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between">
                    <span className="font-semibold text-amber-900">Plano de Comissão:</span>
                    <span className="font-bold text-amber-800">{struct ? struct.name : 'Padrão'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Commission Structures Configurator */}
      {activeSubTab === 'structures' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Award size={18} className="text-amber-600" />
                <span>Planos de Comissão & Regras de Aceleradores</span>
              </h3>
              <p className="text-xs text-slate-500">
                Configure comissões lineares, aceleradores por atingimento de meta e bônus por ticket médio.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingStructure(null);
                setShowStructureModal(true);
              }}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all"
            >
              <Plus size={16} />
              <span>Criar Estrutura</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {structures.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                        {s.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{s.name}</h4>
                    </div>

                    <button
                      onClick={() => {
                        setEditingStructure(s);
                        setShowStructureModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"
                    >
                      <Edit size={16} />
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">{s.description}</p>

                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Taxa Base</span>
                      <span className="font-bold text-slate-900 text-sm">{s.baseRate}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">Ticket High-Ticket</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        R$ {(s.minDealValueForBonus || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Tiers List */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">Faixas e Aceleradores:</span>
                    {s.tiers.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <span className="font-medium text-slate-700">{t.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700">{t.commissionRate}%</span>
                          {t.tierBonusAmount > 0 && (
                            <span className="font-bold text-indigo-700 text-[10px] bg-indigo-50 px-1.5 rounded border border-indigo-100">
                              +R$ {t.tierBonusAmount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Recompensas de Milestones</span>
                  <span className="font-bold text-slate-700">Configurado</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Email Validation Tool */}
      {activeSubTab === 'email_tool' && <EmailValidatorTool />}

      {/* Modals */}
      {showGoalModal && (
        <GoalTargetModal
          reps={reps}
          structures={structures}
          existingGoal={editingGoal}
          onClose={() => {
            setShowGoalModal(false);
            setEditingGoal(null);
          }}
          onSaveGoal={handleSaveGoal}
        />
      )}

      {showStructureModal && (
        <CommissionStructureModal
          existingStructure={editingStructure}
          onClose={() => {
            setShowStructureModal(false);
            setEditingStructure(null);
          }}
          onSaveStructure={handleSaveStructure}
        />
      )}

      {showSimulator && (
        <CommissionSimulatorModal
          reps={reps}
          structures={structures}
          goals={goals}
          onClose={() => setShowSimulator(false)}
        />
      )}

      {showEditRepModal && (
        <EditRepModal
          rep={editingRep}
          structures={structures}
          onClose={() => {
            setShowEditRepModal(false);
            setEditingRep(null);
          }}
          onSaveRep={handleSaveRep}
        />
      )}
    </div>
  );
};
