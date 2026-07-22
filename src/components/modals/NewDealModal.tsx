import React, { useState } from 'react';
import { X, Plus, Building2, DollarSign } from 'lucide-react';
import { Deal, Company, SalesRep, LeadStageId } from '../../types';

interface NewDealModalProps {
  companies: Company[];
  reps: SalesRep[];
  onClose: () => void;
  onCreateDeal: (deal: Deal) => void;
}

export const NewDealModal: React.FC<NewDealModalProps> = ({
  companies,
  reps,
  onClose,
  onCreateDeal,
}) => {
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [value, setValue] = useState(25000);
  const [assignedTo, setAssignedTo] = useState(reps[0]?.id || 'rep-1');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const comp = companies.find((c) => c.id === companyId);
    const newDeal: Deal = {
      id: `deal-${Date.now()}`,
      companyId: companyId || 'comp-1',
      companyName: comp ? comp.nomeFantasia : 'Empresa B2B',
      title,
      value: Number(value),
      probability: 50,
      expectedRevenue: Number(value) * 0.5,
      stageId: 'prospecting',
      assignedTo,
      contactName: comp?.decisionMakers?.[0]?.name || 'Contato Principal',
      contactWhatsApp: comp?.telefones[0] || '(11) 99000-1122',
      contactEmail: comp?.emails[0] || 'comercial@empresa.com.br',
      timeInStageDays: 1,
      priority,
      tags: ['Inbound', 'Prioridade'],
      history: [
        {
          id: `h-${Date.now()}`,
          type: 'created',
          title: 'Oportunidade Criada',
          description: 'Nova oportunidade registrada no CRM',
          author: 'Carlos Andrade',
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateDeal(newDeal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">Nova Oportunidade Comercial</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Título do Negócio</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Licenciamento Wootech CRM 10 Licenças"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Empresa Vínculo</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia} ({c.cnpj})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Valor Previsto (R$)</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Vendedor Responsável</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.role})
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
            >
              Salvar Oportunidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
