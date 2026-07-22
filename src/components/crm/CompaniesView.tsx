import React, { useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Filter,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Globe,
  Instagram,
  Linkedin,
  CheckCircle2,
  ChevronRight,
  X,
  Users,
  ShieldCheck,
  Code
} from 'lucide-react';
import { Company, DecisionMaker } from '../../types';

interface CompaniesViewProps {
  companies: Company[];
  onOpenEnrichmentModal: (company: Company) => void;
  onOpenNewCompanyModal: () => void;
  onSelectCompany: (company: Company) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  companies,
  onOpenEnrichmentModal,
  onOpenNewCompanyModal,
  onSelectCompany,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState<Company | null>(null);

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.nomeFantasia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.cnpj.includes(searchTerm) ||
      c.endereco.cidade.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterTag === 'enriched') return matchesSearch && c.enriched;
    if (filterTag === 'high_score') return matchesSearch && (c.scoreComercial || 0) >= 85;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={20} className="text-blue-600" />
            <span>Gestão de Empresas & Clientes B2B</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro completo de organizações, CNPJs, enriquecimento público e tomada de decisão.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={onOpenNewCompanyModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Cadastrar Empresa</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome, Razão Social, CNPJ ou Cidade..."
            className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTag('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterTag === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({companies.length})
          </button>
          <button
            onClick={() => setFilterTag('enriched')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filterTag === 'enriched'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck size={13} />
            <span>CNPJ Enriquecido</span>
          </button>
          <button
            onClick={() => setFilterTag('high_score')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filterTag === 'high_score'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Alta Prioridade (Score &gt; 85)</span>
          </button>
        </div>
      </div>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCompanies.map((company) => (
          <div
            key={company.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Header Info */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1">
                    {company.nomeFantasia}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium line-clamp-1 mt-0.5">
                    {company.razaoSocial}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                    company.situacao === 'ATIVA'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {company.situacao}
                </span>
              </div>

              {/* CNPJ & Address */}
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between font-mono font-medium text-[11px]">
                  <span>CNPJ: {company.cnpj}</span>
                  <span className="font-sans font-bold text-blue-600">Porte: {company.porte}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {company.endereco.cidade} - {company.endereco.estado} ({company.endereco.bairro})
                  </span>
                </div>
              </div>

              {/* CNAE */}
              <p className="text-[11px] text-slate-600 line-clamp-2">
                <span className="font-semibold text-slate-800">CNAE:</span> {company.cnaePrincipal.text}
              </p>

              {/* Tags & Tech Badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {company.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
              <button
                onClick={() => onOpenEnrichmentModal(company)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded transition-colors"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>{company.enriched ? 'Re-Enriquecer' : 'Enriquecer Dados'}</span>
              </button>

              <button
                onClick={() => setSelectedCompanyDetail(company)}
                className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded transition-colors"
              >
                <span>Detalhes</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Drawer Modal */}
      {selectedCompanyDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCompanyDetail.nomeFantasia}
                    </h3>
                    {selectedCompanyDetail.enriched && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        Verificado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {selectedCompanyDetail.razaoSocial}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCompanyDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Receita Federal Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-700">
                  Dados Fiscais & Receita Federal
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">CNPJ</span>
                    <span className="font-mono font-bold text-slate-800">{selectedCompanyDetail.cnpj}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">Capital Social</span>
                    <span className="font-bold text-slate-800">
                      R$ {selectedCompanyDetail.capitalSocial.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">Data de Fundação</span>
                    <span className="font-bold text-slate-800">{selectedCompanyDetail.fundacao}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">Natureza Jurídica</span>
                    <span className="font-bold text-slate-800">{selectedCompanyDetail.naturezaJuridica}</span>
                  </div>
                </div>
              </div>

              {/* Endereço & Contatos */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                  Localização & Telefones
                </h4>
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className="text-blue-600 shrink-0" />
                    <span>
                      {selectedCompanyDetail.endereco.logradouro}, {selectedCompanyDetail.endereco.numero} - {selectedCompanyDetail.endereco.bairro}, {selectedCompanyDetail.endereco.cidade}/{selectedCompanyDetail.endereco.estado} - CEP {selectedCompanyDetail.endereco.cep}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={15} className="text-blue-600 shrink-0" />
                    <span>{selectedCompanyDetail.telefones.join(' • ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-blue-600 shrink-0" />
                    <span>{selectedCompanyDetail.emails.join(' • ')}</span>
                  </div>
                  {selectedCompanyDetail.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={15} className="text-blue-600 shrink-0" />
                      <a
                        href={selectedCompanyDetail.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {selectedCompanyDetail.website} <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Quadro Societário & Decisores */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-600" />
                  <span>Quadro Societário & Decisores Mapeados</span>
                </h4>
                <div className="space-y-2">
                  {(selectedCompanyDetail.decisionMakers || []).map((dec) => (
                    <div
                      key={dec.id}
                      className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{dec.name}</p>
                        <p className="text-[11px] text-blue-700 font-medium">{dec.role}</p>
                      </div>
                      <div className="text-right">
                        {dec.whatsApp && (
                          <span className="text-[11px] font-bold text-emerald-700 block">
                            WhatsApp: {dec.whatsApp}
                          </span>
                        )}
                        {dec.email && (
                          <span className="text-[10px] text-slate-500 block">{dec.email}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech Stack Identificada */}
              {selectedCompanyDetail.techStack && selectedCompanyDetail.techStack.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Code size={14} className="text-blue-600" />
                    <span>Tecnologias Detectadas no Site</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCompanyDetail.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 text-slate-800 font-semibold px-2.5 py-1 rounded-md border border-slate-200"
                      >
                        ⚡ {tech.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-center gap-3">
              <button
                onClick={() => {
                  onOpenEnrichmentModal(selectedCompanyDetail);
                  setSelectedCompanyDetail(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-all text-center"
              >
                Executar Enriquecimento Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
