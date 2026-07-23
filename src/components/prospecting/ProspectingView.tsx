import React, { useState, useRef, useEffect } from 'react';
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
  Loader2,
  Download,
  Activity,
  Zap,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  RefreshCw,
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
    categoria: 'Dentistas',
    palavraChave: 'Odontologia',
    raioKm: 15,
  });
  const [depth, setDepth] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProspectingResultItem[]>([]);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [dataSource, setDataSource] = useState<string>('');
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll do job assíncrono BullMQ
  const pollJob = async (id: string) => {
    try {
      const res = await fetch(`/api/scrape/jobs/${id}`);
      const data = await res.json();
      if (data.success) {
        setJobStatus(data.state || '');
        setJobProgress(typeof data.progress === 'number' ? data.progress : 0);

        if (data.state === 'completed' || data.state === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          setLoading(false);
        }
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setJobId(null);
    setJobStatus('searching');
    setJobProgress(0);
    setDataSource('');

    try {
      const res = await fetch('/api/prospecting/gmb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, depth }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setResults(data.results);
        setDataSource(data.source || '');
        setJobStatus('done');
      }
    } catch (err) {
      console.error('Erro na prospecção GMB:', err);
      setJobStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Scraping assíncrono via BullMQ (para buscas grandes)
  const handleAsyncScrape = async () => {
    setLoading(true);
    setJobStatus('queued');
    setJobProgress(0);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: `${params.categoria} ${params.palavraChave}`, location: `${params.cidade} ${params.estado}`, depth }),
      });
      const data = await res.json();
      if (data.success && data.jobId) {
        setJobId(data.jobId);
        setJobStatus('active');
        // Poll a cada 3s
        pollRef.current = setInterval(() => pollJob(data.jobId), 3000);
      }
    } catch {
      setLoading(false);
      setJobStatus('error');
    }
  };

  const handleImport = (item: ProspectingResultItem, autoEnrich: boolean) => {
    onImportCompany(item, autoEnrich);
    setImportedIds((prev) => [...prev, item.googlePlaceId]);
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Nome', 'Categoria', 'Telefone', 'Website', 'Endereço', 'Cidade', 'Estado', 'Rating', 'Reviews', 'Fonte'];
    const rows = results.map(r => [
      r.nomeEmpresa,
      r.categoria,
      r.telefone,
      r.website,
      r.endereco,
      r.cidade,
      r.estado,
      r.rating,
      r.reviewsCount,
      r.source || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${params.cidade}-${params.categoria}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sourceLabel: Record<string, { label: string; color: string }> = {
    gosom:         { label: '⚡ Google Maps (Gosom)', color: 'bg-green-100 text-green-700 border-green-200' },
    openstreetmap: { label: '🗺️ OpenStreetMap', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    fallback:      { label: '🔄 Fallback', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  };

  const jobStatusLabel: Record<string, { label: string; color: string }> = {
    queued:    { label: 'Na fila...', color: 'text-slate-500' },
    active:    { label: 'Scraping em andamento...', color: 'text-blue-600' },
    completed: { label: 'Concluído!', color: 'text-emerald-600' },
    failed:    { label: 'Falhou', color: 'text-red-500' },
    done:      { label: 'Concluído!', color: 'text-emerald-600' },
    searching: { label: 'Buscando...', color: 'text-blue-600' },
    error:     { label: 'Erro na busca', color: 'text-red-500' },
  };

  return (
    <div className="space-y-6 pb-12">

      {/* Search Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Search size={20} className="text-blue-600" />
              Motor de Prospecção — Google Maps (Gosom)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Extrai empresas reais do Google Maps com telefone, site, avaliações e localização.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {results.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg text-xs border border-emerald-200 transition-colors"
              >
                <Download size={13} /> CSV ({results.length})
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Cidade</label>
            <input
              type="text"
              value={params.cidade}
              onChange={(e) => setParams({ ...params, cidade: e.target.value })}
              placeholder="Ex: Curitiba"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">UF</label>
            <input
              type="text"
              value={params.estado}
              onChange={(e) => setParams({ ...params, estado: e.target.value })}
              placeholder="Ex: PR"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Categoria</label>
            <input
              type="text"
              value={params.categoria}
              onChange={(e) => setParams({ ...params, categoria: e.target.value })}
              placeholder="Ex: Dentistas, Imobiliárias"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Palavra-Chave</label>
            <input
              type="text"
              value={params.palavraChave}
              onChange={(e) => setParams({ ...params, palavraChave: e.target.value })}
              placeholder="Ex: Odontologia"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Profundidade</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value={1}>1 — Rápido (~20)</option>
              <option value={2}>2 — Médio (~50)</option>
              <option value={3}>3 — Completo (~100)</option>
            </select>
          </div>

          <div className="flex items-end gap-1.5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              <span>{loading ? 'Buscando...' : 'Buscar'}</span>
            </button>
            <button
              type="button"
              onClick={handleAsyncScrape}
              disabled={loading}
              title="Scraping assíncrono via BullMQ (para buscas grandes)"
              className="bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-bold py-2 px-2.5 rounded-lg text-xs shadow-sm transition-all flex items-center justify-center"
            >
              <Zap size={14} />
            </button>
          </div>
        </form>

        {/* Job status bar */}
        {(loading || jobStatus) && (
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            {loading && <Loader2 size={14} className="animate-spin text-blue-600 shrink-0" />}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${jobStatusLabel[jobStatus]?.color || 'text-slate-600'}`}>
                  {jobStatusLabel[jobStatus]?.label || jobStatus}
                </span>
                {jobId && <span className="text-[10px] font-mono text-slate-400">Job: {jobId.substring(0, 8)}...</span>}
                {dataSource && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sourceLabel[dataSource]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {sourceLabel[dataSource]?.label || dataSource}
                  </span>
                )}
              </div>
              {jobProgress > 0 && (
                <div className="w-full bg-slate-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${jobProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={16} className="text-blue-600" />
              {results.length} Empresas Encontradas
              {dataSource && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sourceLabel[dataSource]?.color || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {sourceLabel[dataSource]?.label || dataSource}
                </span>
              )}
            </h3>
            <span className="text-xs text-slate-400 font-medium">
              Clique em "Importar + Enriquecer" para iniciar o pipeline IA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((item) => {
              const isImported = importedIds.includes(item.googlePlaceId) || item.alreadyInCRM;

              return (
                <div
                  key={item.googlePlaceId}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {item.categoria}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                          {item.nomeEmpresa}
                        </h4>
                      </div>
                      {(item as any).source && (
                        <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                          {(item as any).source}
                        </span>
                      )}
                    </div>

                    {item.rating > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center text-amber-500 font-bold gap-1">
                          <Star size={13} className="fill-amber-400" />
                          <span>{item.rating}</span>
                        </div>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-medium">{item.reviewsCount} reviews</span>
                      </div>
                    )}

                    <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                      {item.endereco && (
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate">{item.endereco}</span>
                        </div>
                      )}
                      {item.telefone && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span>{item.telefone}</span>
                        </div>
                      )}
                      {item.website && (
                        <div className="flex items-center gap-1.5 text-blue-600 font-semibold truncate">
                          <Globe size={12} className="shrink-0" />
                          <a href={item.website} target="_blank" rel="noreferrer" className="hover:underline truncate flex items-center gap-1">
                            {item.website.replace(/https?:\/\/(www\.)?/, '')}
                            <ExternalLink size={10} className="shrink-0" />
                          </a>
                        </div>
                      )}
                      {item.horarioFuncionamento && (
                        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.horarioFuncionamento}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                    {isImported ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 w-full justify-center">
                        <CheckCircle2 size={13} />
                        Importado para o CRM
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleImport(item, false)}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-1.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                        >
                          <Plus size={13} />
                          Importar
                        </button>
                        <button
                          onClick={() => handleImport(item, true)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-all shadow-sm flex items-center justify-center gap-1"
                        >
                          <Sparkles size={12} className="text-amber-300" />
                          Importar + Enriquecer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && results.length === 0 && !jobStatus && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Search size={40} strokeWidth={1} />
          <p className="text-sm font-semibold">Busque empresas pelo Google Maps</p>
          <p className="text-xs text-center max-w-sm">
            Use o formulário acima para pesquisar por categoria e localidade.<br />
            Resultados extraídos via <strong>Gosom</strong> (Google Maps Scraper open source).
          </p>
        </div>
      )}
    </div>
  );
};
