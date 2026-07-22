import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import { Company } from '../../types';
import { EmailInputWithValidation } from '../common/EmailInputWithValidation';

interface NewCompanyModalProps {
  onClose: () => void;
  onCreateCompany: (company: Company) => void;
}

export const NewCompanyModal: React.FC<NewCompanyModalProps> = ({
  onClose,
  onCreateCompany,
}) => {
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cidade, setCidade] = useState('Curitiba');
  const [estado, setEstado] = useState('PR');
  const [telefone, setTelefone] = useState('(41) 3300-1122');
  const [email, setEmail] = useState('contato@empresa.com.br');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeFantasia.trim()) return;

    const newCompany: Company = {
      id: `comp-${Date.now()}`,
      razaoSocial: razaoSocial || nomeFantasia.toUpperCase() + ' LTDA',
      nomeFantasia,
      cnpj: cnpj || '11.222.333/0001-44',
      situacao: 'ATIVA',
      cnaePrincipal: { code: '6201-5/01', text: 'Desenvolvimento de programas de computador sob encomenda' },
      capitalSocial: 500000,
      fundacao: '2020-01-15',
      porte: 'EPP',
      naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
      endereco: {
        logradouro: 'Av. das Nações',
        numero: '500',
        bairro: 'Centro',
        cidade,
        estado,
        cep: '80000-000'
      },
      website: `https://www.${nomeFantasia.toLowerCase().replace(/\s+/g, '')}.com.br`,
      telefones: [telefone],
      emails: [email],
      tags: ['Manual', 'Prospecção'],
      enriched: false,
      scoreComercial: 80,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreateCompany(newCompany);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">Cadastrar Nova Empresa B2B</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Nome Fantasia</label>
            <input
              type="text"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              placeholder="Ex: Grupo Vanguarda"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Razão Social</label>
            <input
              type="text"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              placeholder="Ex: VANGUARDA SERVICOS LTDA"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">CNPJ</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <EmailInputWithValidation
            value={email}
            onChange={(val) => setEmail(val)}
            label="E-mail de Contato Principal"
            placeholder="contato@empresa.com.br"
            required
            id="company-email-modal"
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Estado (UF)</label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
            >
              Cadastrar Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
