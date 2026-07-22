import React, { useState } from 'react';
import { X, UserPlus, Building2, CheckCircle2 } from 'lucide-react';
import { Contact, Company } from '../../types';
import { EmailInputWithValidation } from '../common/EmailInputWithValidation';

interface NewContactModalProps {
  companies: Company[];
  onClose: () => void;
  onCreateContact: (contact: Contact) => void;
}

export const NewContactModal: React.FC<NewContactModalProps> = ({
  companies,
  onClose,
  onCreateContact,
}) => {
  const [name, setName] = useState('');
  const [companyId, setCompanyId] = useState(companies[0]?.id || '');
  const [role, setRole] = useState('Gerente Comercial');
  const [department, setDepartment] = useState('Vendas');
  const [whatsApp, setWhatsApp] = useState('(11) 99887-1122');
  const [email, setEmail] = useState('contato@empresa.com.br');
  const [isDecisionMaker, setIsDecisionMaker] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const comp = companies.find((c) => c.id === companyId);
    const newContact: Contact = {
      id: `cnt-${Date.now()}`,
      companyId: companyId || 'comp-1',
      companyName: comp ? comp.nomeFantasia : 'Empresa B2B',
      name,
      role,
      department,
      whatsApp,
      email,
      tags: ['Manual', isDecisionMaker ? 'Decisor' : 'Influenciador'],
      isDecisionMaker
    };

    onCreateContact(newContact);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="text-blue-600" size={18} />
            <span>Cadastrar Novo Contato & Decisor</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Renata Albuquerque"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Empresa Vínculo</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia} ({c.cidade} - {c.estado})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cargo</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Diretor de Operações"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Departamento</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Diretoria / Compras"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">WhatsApp / Telefone Direct</label>
            <input
              type="text"
              value={whatsApp}
              onChange={(e) => setWhatsApp(e.target.value)}
              placeholder="(11) 99999-8888"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-emerald-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <EmailInputWithValidation
            value={email}
            onChange={(val) => setEmail(val)}
            label="E-mail Comercial do Contato"
            placeholder="contato@empresa.com.br"
            required
            id="contact-email-modal"
          />

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              id="isDecisorCheck"
              checked={isDecisionMaker}
              onChange={(e) => setIsDecisionMaker(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <label htmlFor="isDecisorCheck" className="font-bold text-slate-800 text-xs cursor-pointer">
              Decisor Final / Sócio / Diretor de Compras
            </label>
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
              Salvar Contato
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
