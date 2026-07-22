import React, { useState } from 'react';
import { X, UserCheck, ShieldCheck, Mail, DollarSign, Award } from 'lucide-react';
import { SalesRep, CommissionStructure, SalesGoalTarget } from '../../types';
import { EmailInputWithValidation } from '../common/EmailInputWithValidation';
import { EmailValidationResult } from '../../utils/emailValidation';

interface EditRepModalProps {
  rep?: SalesRep | null;
  structures: CommissionStructure[];
  onClose: () => void;
  onSaveRep: (rep: SalesRep) => void;
}

export const EditRepModal: React.FC<EditRepModalProps> = ({
  rep,
  structures,
  onClose,
  onSaveRep,
}) => {
  const [name, setName] = useState(rep?.name || '');
  const [email, setEmail] = useState(rep?.email || '');
  const [role, setRole] = useState<'admin' | 'sdr' | 'bdr' | 'closer' | 'manager'>(rep?.role || 'closer');
  const [goalValue, setGoalValue] = useState(rep?.goalValue || 180000);
  const [commissionRate, setCommissionRate] = useState(rep?.commissionRate || 5);
  const [commissionStructureId, setCommissionStructureId] = useState(
    rep?.commissionStructureId || structures[0]?.id || 'struct-tiered-accelerator'
  );
  const [emailValid, setEmailValid] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedRep: SalesRep = {
      id: rep?.id || `rep-${Date.now()}`,
      name,
      email,
      role,
      avatar:
        rep?.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
      goalValue: Number(goalValue),
      closedValue: rep?.closedValue || 0,
      closedDealsCount: rep?.closedDealsCount || 0,
      commissionRate: Number(commissionRate),
      commissionStructureId,
      activeDealsCount: rep?.activeDealsCount || 5,
      conversionRate: rep?.conversionRate || 30.0
    };

    onSaveRep(savedRep);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="text-blue-600" size={18} />
            <span>{rep ? 'Editar Membro Comercial' : 'Adicionar Novo Vendedor'}</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Andrade"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              required
            />
          </div>

          {/* Email with real-time validation */}
          <EmailInputWithValidation
            value={email}
            onChange={(val, res) => {
              setEmail(val);
              setEmailValid(res.isValid);
            }}
            label="E-mail Corporativo do Vendedor"
            placeholder="vendedor@empresa.com.br"
            required
            id="rep-email-modal"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Papel Comercial (RBAC)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none uppercase"
              >
                <option value="sdr">SDR (Pré-vendas)</option>
                <option value="bdr">BDR (Prospecção Outbound)</option>
                <option value="closer">Closer (Fechamento)</option>
                <option value="manager">Gerente Comercial</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Meta de Receita (R$)</label>
              <input
                type="number"
                step="5000"
                value={goalValue}
                onChange={(e) => setGoalValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Plano de Comissão Atribuído</label>
            <select
              value={commissionStructureId}
              onChange={(e) => setCommissionStructureId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.baseRate}% Base)
                </option>
              ))}
            </select>
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
            >
              Salvar Vendedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
