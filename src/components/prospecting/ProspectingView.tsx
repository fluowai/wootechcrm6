import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Building2,
  Phone,
  Globe,
  Star,
  Sparkles,
  Plus,
  CheckCircle2,
  Filter,
  Loader2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ProspectingQueryParams, ProspectingResultItem, Company } from '../../types';

interface ProspectingViewProps {
  onImportCompany: (item: ProspectingResultItem, autoEnrich: boolean) => void;
  existingCompanies: Company[];
}

export const ProspectingView: React.FC<ProspectingViewProps> = ({
  onImportCompany,
  existingCompanies,
}) => {
  const [params, setParams] = useState<ProspectingQueryParams>({
    cidade: 'Curitiba',
    estado: 'PR',
    categoria: 'Dentistas & Clínicas',
    palavraChave: 'Odontologia Especializada',
    raioKm: 15,
  });

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProspectingResultItem[]>([
    {
      googlePlaceId: 'ChIJ_dentistas_curitiba_1',
      nomeEmpresa: 'CLÍNICA DENTÁRIA ARTESANAL CURITIBA',
      categoria: 'Clínica Odontológica',
      telefone: '(41) 99881-2233',
      website: 'https://www.artesanalodontocuritiba.com.br',
      endereco: 'Rua XV de Novembro, 850, Centro, Curitiba - PR',
      cidade: 'Curitiba',
      estado: 'PR',
      lat: -25.4372,
      lng: -49.2700,
      rating: 4.9,
      reviewsCount: 240,
      photos: ['https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=300'],
      horarioFuncionamento: 'Aberto agora: 08:00 - 19:00',
      alreadyInCRM: false,
    },
    {
      googlePlaceId: 'ChIJ_imobiliarias_florianopolis_2',
      nomeEmpresa: 'IMOBILIÁRIA VANGUARDA LITORAL',
      categoria: 'Imobiliária & Corretores',
      telefone: '(48) 3322-9900',
      website: 'https://www.vanguardalitoral.com.br',
      endereco: 'Av. Beira Mar Norte, 1200, Agronômica, Florianópolis - SC',
      cidade: 'Florianópolis',
      estado: 'SC',
      lat: -27.5948,
      lng: -48.5482,
      rating: 4.8,
      reviewsCount: 185,
      photos: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=300'],
      alreadyInCRM: false,
    },
    {
      googlePlaceId: 'ChIJ_advocacia_recife_3',
      nomeEmpresa: 'SILVEIRA & CONSULTORIA JURÍDICA',
      categoria: 'Escritório de Advocacia',
      telefone: '(81) 3131-7700',
      website: 'https://www.silveiraadvocacia.com.br',
      endereco: 'Av. Agamenon Magalhães, 4300, Recife - PE',
      cidade: 'Recife',
      estado: 'PE',
      lat: -8.0476,
      lng: -34.8941,
      rating: 4.7,
      reviewsCount: 92,
      photos: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=300'],
      alreadyInCRM: true,
    }
  ]);

  const [importedIds, setImportedIds] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/prospecting/gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Erro na prospecção GMB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (item: ProspectingResultItem, autoEnrich: boolean) => {
    onImportCompany(item, autoEnrich);
    setImportedIds((prev) => [...prev, item.googlePlaceId]);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Bar Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Search size={20} className="text-blue-600" />
            <span>Motor de Prospecção Google Meu Negócio</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Localize e extraia empresas ativas por região, categoria e avaliação no Google Places B2B.
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Cidade</label>
            <input
              type="text"
              value={params.cidade}
              onChange={(e) => setParams({ ...params, cidade: e.target.value })}
              placeholder="Ex: Curitiba, Florianópolis"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Estado (UF)</label>
            <input
              type="text"
              value={params.estado}
              onChange={(e) => setParams({ ...params, estado: e.target.value })}
              placeholder="Ex: PR, SC, SP"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Categoria B2B</label>
            <input
              type="text"
              value={params.categoria}
              onChange={(e) => setParams({ ...params, categoria: e.target.value })}
              placeholder="Ex: Imobiliárias, Dentistas, Logística"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Palavra-Chave</label>
            <input
              type="text"
              value={params.palavraChave}
              onChange={(e) => setParams({ ...params, palavraChave: e.target.value })}
              placeholder="Ex: Advocacia, Consultoria"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={15} />}
              <span>{loading ? 'Pesquisando GMB...' : 'Buscar Empresas'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900">
          Empresas Encontradas ({results.length})
        </h3>
        <span className="text-xs text-slate-500 font-medium">
          Clique para importar e iniciar o pipeline de enriquecimento de CNPJ
        </span>
      </div>

      {/* Prospecting Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item) => {
          const isImported = importedIds.includes(item.googlePlaceId) || item.alreadyInCRM;

          return (
            <div
              key={item.googlePlaceId}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Photo & Category */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {item.categoria}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                      {item.nomeEmpresa}
                    </h4>
                  </div>
                </div>

                {/* Rating & Reviews */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center text-amber-500 font-bold gap-1">
                    <Star size={14} className="fill-amber-400" />
                    <span>{item.rating}</span>
                  </div>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-medium">
                    {item.reviewsCount} avaliações no Google
                  </span>
                </div>

                {/* Details */}
                <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{item.endereco}</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                    <Phone size={13} className="text-slate-400 shrink-0" />
                    <span>{item.telefone}</span>
                  </div>
                  {item.website && (
                    <div className="flex items-center gap-1.5 text-blue-600 font-semibold truncate">
                      <Globe size={13} className="shrink-0" />
                      <a href={item.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                        {item.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Buttons */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                {isImported ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-full justify-center">
                    <CheckCircle2 size={14} />
                    <span>Já Importado para o CRM</span>
                  </span>
                ) : (
                  <>
                    <button
                      onClick={() => handleImport(item, false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-1.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Importar</span>
                    </button>

                    <button
                      onClick={() => handleImport(item, true)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <Sparkles size={13} className="text-amber-300" />
                      <span>Importar + Enriquecer</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
