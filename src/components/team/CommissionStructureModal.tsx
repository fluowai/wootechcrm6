import React, { useState } from 'react';
import { X, Award, Plus, Trash2, Layers, DollarSign, TrendingUp } from 'lucide-react';
import { CommissionStructure, CommissionTier } from '../../types';

interface CommissionStructureModalProps {
  existingStructure?: CommissionStructure | null;
  onClose: () => void;
  onSaveStructure: (structure: CommissionStructure) => void;
}

export const CommissionStructureModal: React.FC<CommissionStructureModalProps> = ({
  existingStructure,
  onClose,
  onSaveStructure,
}) => {
  const [name, setName] = useState(existingStructure?.name || 'Acelerador de Alta Performance');
  const [description, setDescription] = useState(
    existingStructure?.description || 'Plano com comissão escalar e bônus para superação de metas de vendas.'
  );
  const [type, setType] = useState<'flat_rate' | 'tiered_acceleration' | 'deal_size_bonus' | 'hybrid'>(
    existingStructure?.type || 'tiered_acceleration'
  );
  const [baseRate, setBaseRate] = useState(existingStructure?.baseRate || 5);
  const [minDealValueForBonus, setMinDealValueForBonus] = useState(existingStructure?.minDealValueForBonus || 40000);
  const [dealBonusRate, setDealBonusRate] = useState(existingStructure?.dealBonusRate || 1.5);
  const [dealCountMilestone, setDealCountMilestone] = useState(existingStructure?.dealCountMilestone || 5);
  const [dealCountBonusAmount, setDealCountBonusAmount] = useState(existingStructure?.dealCountBonusAmount || 1000);

  const [tiers, setTiers] = useState<CommissionTier[]>(
    existingStructure?.tiers || [
      { id: 't1', minAchievementPct: 0, maxAchievementPct: 79.9, commissionRate: 3.5, tierBonusAmount: 0, label: 'Base (< 80%)' },
      { id: 't2', minAchievementPct: 80, maxAchievementPct: 99.9, commissionRate: 5.0, tierBonusAmount: 250, label: 'Nível Prata (80%-99%)' },
      { id: 't3', minAchievementPct: 100, maxAchievementPct: 119.9, commissionRate: 7.5, tierBonusAmount: 1000, label: 'Meta Batida (100%-119%)' },
      { id: 't4', minAchievementPct: 120, maxAchievementPct: 999, commissionRate: 10.0, tierBonusAmount: 2500, label: 'Super Acelerador (≥ 120%)' },
    ]
  );

  const handleAddTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMin = lastTier ? lastTier.minAchievementPct + 20 : 100;
    const newTier: CommissionTier = {
      id: `t-${Date.now()}`,
      minAchievementPct: newMin,
      maxAchievementPct: 999,
      commissionRate: (lastTier ? lastTier.commissionRate : baseRate) + 2,
      tierBonusAmount: 500,
      label: `Faixa Acelerada (≥ ${newMin}%)`
    };
    setTiers([...tiers, newTier]);
  };

  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter(t => t.id !== id));
  };

  const handleUpdateTier = (id: string, field: keyof CommissionTier, value: any) => {
    setTiers(tiers.map(t => (t.id === id ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const structureToSave: CommissionStructure = {
      id: existingStructure?.id || `struct-${Date.now()}`,
      name,
      description,
      type,
      baseRate: Number(baseRate),
      tiers,
      minDealValueForBonus: Number(minDealValueForBonus),
      dealBonusRate: Number(dealBonusRate),
      dealCountMilestone: Number(dealCountMilestone),
      dealCountBonusAmount: Number(dealCountBonusAmount)
    };

    onSaveStructure(structureToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Award className="text-amber-600" size={20} />
            <span>{existingStructure ? 'Editar Estrutura de Comissão' : 'Criar Nova Estrutura de Comissão'}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nome da Estrutura</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Acelerador Enterprise Q3"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tipo de Regra de Comissão</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="tiered_acceleration">Acelerador por Faixas (% Meta)</option>
                <option value="flat_rate">Taxa Fixa Linear (%)</option>
                <option value="deal_size_bonus">Bônus por Ticket Alto (High Ticket)</option>
                <option value="hybrid">Híbrido (Faixas + Marcos de Contratos)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Descrição Comercial</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explicativo do plano de comissionamento"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          {/* Base Rate & Milestones */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-slate-800 block mb-1">Comissão Base (%)</label>
              <input
                type="number"
                step="0.5"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Ticket Mín. p/ Bônus (R$)</label>
              <input
                type="number"
                step="5000"
                value={minDealValueForBonus}
                onChange={(e) => setMinDealValueForBonus(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1">Bônus High Ticket (%)</label>
              <input
                type="number"
                step="0.5"
                value={dealBonusRate}
                onChange={(e) => setDealBonusRate(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Tiers Configuration */}
          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                <span>Faixas de Acelerador por Atingimento de Meta (%)</span>
              </span>
              <button
                type="button"
                onClick={handleAddTier}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200"
              >
                <Plus size={12} />
                <span>Adicionar Faixa</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {tiers.map((tier, idx) => (
                <div
                  key={tier.id}
                  className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200"
                >
                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 font-semibold block">Rótulo da Faixa</label>
                    <input
                      type="text"
                      value={tier.label}
                      onChange={(e) => handleUpdateTier(tier.id, 'label', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 font-semibold text-slate-900 text-[11px]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-500 font-semibold block">% Mín Meta</label>
                    <input
                      type="number"
                      value={tier.minAchievementPct}
                      onChange={(e) => handleUpdateTier(tier.id, 'minAchievementPct', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-[11px]"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 font-semibold block">Taxa Comissão (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={tier.commissionRate}
                      onChange={(e) => handleUpdateTier(tier.id, 'commissionRate', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-emerald-700 text-[11px]"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-[10px] text-slate-500 font-semibold block">Bônus Fixo (R$)</label>
                    <input
                      type="number"
                      step="100"
                      value={tier.tierBonusAmount}
                      onChange={(e) => handleUpdateTier(tier.id, 'tierBonusAmount', Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-indigo-700 text-[11px]"
                    />
                  </div>

                  <div className="col-span-1 text-right pt-3">
                    <button
                      type="button"
                      onClick={() => handleRemoveTier(tier.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
            >
              Salvar Estrutura de Comissão
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
