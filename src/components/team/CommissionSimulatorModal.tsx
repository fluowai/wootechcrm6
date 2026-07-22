import React, { useState } from 'react';
import { Calculator, DollarSign, Award, TrendingUp, Sparkles, X, ShieldCheck } from 'lucide-react';
import { SalesRep, CommissionStructure, SalesGoalTarget } from '../../types';
import { calculateCommissionPayout } from '../../utils/commissionCalculator';

interface CommissionSimulatorModalProps {
  reps: SalesRep[];
  structures: CommissionStructure[];
  goals: SalesGoalTarget[];
  onClose: () => void;
}

export const CommissionSimulatorModal: React.FC<CommissionSimulatorModalProps> = ({
  reps,
  structures,
  goals,
  onClose,
}) => {
  const [selectedRepId, setSelectedRepId] = useState(reps[0]?.id || 'rep-1');
  const [simulatedRevenue, setSimulatedRevenue] = useState(180000);
  const [simulatedDealsCount, setSimulatedDealsCount] = useState(6);
  const [selectedStructureId, setSelectedStructureId] = useState(structures[0]?.id || 'struct-tiered-accelerator');

  const selectedRep = reps.find(r => r.id === selectedRepId) || reps[0];
  const repWithCustomGoal: SalesRep = {
    ...selectedRep,
    closedValue: simulatedRevenue,
    closedDealsCount: simulatedDealsCount,
    commissionStructureId: selectedStructureId
  };

  const payoutResult = calculateCommissionPayout(
    repWithCustomGoal,
    simulatedRevenue,
    undefined,
    structures,
    goals
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Calculator className="text-emerald-600" size={20} />
            <span>Simulador de Comissões & Aceleradores</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Selecione o Vendedor</label>
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-900"
            >
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Plano de Comissão Teste</label>
            <select
              value={selectedStructureId}
              onChange={(e) => setSelectedStructureId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-900"
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.baseRate}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Receita Fechada Simulada (R$)</label>
            <input
              type="number"
              step="5000"
              value={simulatedRevenue}
              onChange={(e) => setSimulatedRevenue(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-emerald-700 text-sm"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Quantidade de Contratos Fechados</label>
            <input
              type="number"
              value={simulatedDealsCount}
              onChange={(e) => setSimulatedDealsCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-indigo-700 text-sm"
            />
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 space-y-4 shadow-lg border border-slate-700">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Comissão Total Paga (Estimada)
              </span>
              <div className="text-2xl font-black text-emerald-400">
                R$ {payoutResult.totalCommissionPayout.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Taxa Efetiva de Comissão
              </span>
              <span className="text-lg font-bold text-amber-300">
                {payoutResult.effectiveRate}%
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Comissão Base</span>
              <span className="font-bold text-slate-200">
                R$ {payoutResult.baseCommissionValue.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Bônus de Acelerador</span>
              <span className="font-bold text-amber-400">
                + R$ {payoutResult.tierBonusValue.toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <span className="text-slate-400 block">Atingimento da Meta</span>
              <span className="font-bold text-emerald-400">
                {payoutResult.revenueAchievementPct}% da Meta
              </span>
            </div>
          </div>

          {/* Tier unlocked badge */}
          {payoutResult.appliedTier && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-950/60 border border-emerald-500/30 rounded-lg text-emerald-200 text-xs font-semibold">
              <Sparkles size={16} className="text-emerald-400 shrink-0" />
              <span>
                Faixa Desbloqueada: <strong>{payoutResult.appliedTier.label}</strong> ({payoutResult.appliedTier.commissionRate}% + R$ {payoutResult.appliedTier.tierBonusAmount} bônus)
              </span>
            </div>
          )}

          {payoutResult.nextTierRevenueTarget && (
            <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-700/80 flex items-center justify-between">
              <span>Próximo Acelerador:</span>
              <span className="font-bold text-amber-300">
                Faltam R$ {(payoutResult.nextTierRevenueTarget - simulatedRevenue).toLocaleString('pt-BR')} para atingir {payoutResult.nextTierRate}% de comissão
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-lg text-xs shadow-sm transition-all"
          >
            Fechar Simulador
          </button>
        </div>
      </div>
    </div>
  );
};
