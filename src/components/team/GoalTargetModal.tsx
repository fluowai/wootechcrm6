import React, { useState } from 'react';
import { X, Target, DollarSign, Award, Calendar, Users, Briefcase } from 'lucide-react';
import { SalesGoalTarget, SalesRep, CommissionStructure } from '../../types';

interface GoalTargetModalProps {
  reps: SalesRep[];
  structures: CommissionStructure[];
  existingGoal?: SalesGoalTarget | null;
  onClose: () => void;
  onSaveGoal: (goal: SalesGoalTarget) => void;
}

export const GoalTargetModal: React.FC<GoalTargetModalProps> = ({
  reps,
  structures,
  existingGoal,
  onClose,
  onSaveGoal,
}) => {
  const [type, setType] = useState<'individual' | 'team'>(existingGoal?.type || 'individual');
  const [assigneeId, setAssigneeId] = useState(existingGoal?.assigneeId || reps[0]?.id || 'rep-1');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'annual'>(existingGoal?.period || 'monthly');
  const [periodName, setPeriodName] = useState(existingGoal?.periodName || 'Julho 2026');
  const [revenueTarget, setRevenueTarget] = useState(existingGoal?.revenueTarget || 180000);
  const [closedDealsTarget, setClosedDealsTarget] = useState(existingGoal?.closedDealsTarget || 6);
  const [qualifiedLeadsTarget, setQualifiedLeadsTarget] = useState(existingGoal?.qualifiedLeadsTarget || 30);
  const [commissionStructureId, setCommissionStructureId] = useState(
    existingGoal?.commissionStructureId || structures[0]?.id || 'struct-tiered-accelerator'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let assigneeName = 'Time de Vendas';
    if (type === 'individual') {
      const rep = reps.find(r => r.id === assigneeId);
      assigneeName = rep ? rep.name : 'Vendedor';
    } else {
      assigneeName = assigneeId === 'team_closers' ? 'Time de Closers & Enterprise' : 'Time de SDRs Prospecção';
    }

    const goalToSave: SalesGoalTarget = {
      id: existingGoal?.id || `goal-${Date.now()}`,
      assigneeId: type === 'team' ? assigneeId : assigneeId,
      assigneeName,
      type,
      period,
      periodName,
      revenueTarget: Number(revenueTarget),
      closedDealsTarget: Number(closedDealsTarget),
      qualifiedLeadsTarget: Number(qualifiedLeadsTarget),
      commissionStructureId,
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      status: 'active'
    };

    onSaveGoal(goalToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Target className="text-blue-600" size={20} />
            <span>{existingGoal ? 'Editar Meta Comercial' : 'Configurar Nova Meta de Vendas'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Target Type Selector */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nível da Meta</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('individual');
                  setAssigneeId(reps[0]?.id || 'rep-1');
                }}
                className={`p-2.5 rounded-lg font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                  type === 'individual'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users size={14} />
                <span>Individual (Vendedor)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('team');
                  setAssigneeId('team_closers');
                }}
                className={`p-2.5 rounded-lg font-bold border text-center transition-all flex items-center justify-center gap-1.5 ${
                  type === 'team'
                    ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Briefcase size={14} />
                <span>Equipe / Time</span>
              </button>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              {type === 'individual' ? 'Vendedor Responsável' : 'Equipe Vínculo'}
            </label>
            {type === 'individual' ? (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.role.toUpperCase()}) - Atual R$ {r.closedValue.toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="team_closers">Time de Closers & Enterprise</option>
                <option value="team_sdr">Time de SDRs Prospecção</option>
                <option value="team_b2b_matriz">Equipe Geral Comercial Matriz</option>
              </select>
            )}
          </div>

          {/* Period & Period Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Periodicidade</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral (Q1-Q4)</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nome do Período</label>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="Ex: Julho 2026, Q3 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Revenue Target & Closed Deals Target */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1">
                <DollarSign size={14} className="text-emerald-600" />
                <span>Meta de Receita (R$)</span>
              </label>
              <input
                type="number"
                step="1000"
                value={revenueTarget}
                onChange={(e) => setRevenueTarget(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1">
                <Award size={14} className="text-indigo-600" />
                <span>Meta Contratos (Qtd)</span>
              </label>
              <input
                type="number"
                value={closedDealsTarget}
                onChange={(e) => setClosedDealsTarget(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Commission Structure Association */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Award size={14} className="text-amber-600" />
              <span>Plano de Comissão Vinculado</span>
            </label>
            <select
              value={commissionStructureId}
              onChange={(e) => setCommissionStructureId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type.replace('_', ' ').toUpperCase()} - Base {s.baseRate}%)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Define as regras de cálculo, aceleradores por faixa e bônus por ticket médio para esta meta.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
            >
              Salvar Meta Comercial
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
