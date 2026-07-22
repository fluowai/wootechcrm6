import React from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-600" />
            <span>Relatórios Comerciais & Inteligência (BI)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Análise de conversão por etapa, tempo de permanência no funil, cumprimento de SLA e origem dos leads.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Origem dos Leads */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Origem dos Leads B2B</h3>
          <div className="space-y-3 text-xs">
            {[
              { source: 'Prospecção Google Meu Negócio', pct: 55, count: 88, color: 'bg-blue-600' },
              { source: 'Enriquecimento CNPJ e Outbound', pct: 25, count: 40, color: 'bg-indigo-600' },
              { source: 'Indicação / Parceiros', pct: 12, count: 19, color: 'bg-emerald-600' },
              { source: 'Inbound Website / Instagram', pct: 8, count: 13, color: 'bg-amber-500' }
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-700">
                  <span>{item.source}</span>
                  <span className="font-bold text-slate-900">{item.count} leads ({item.pct}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cumprimento de SLA de Atendimento */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Cumprimento de SLA por Etapa</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-emerald-900 block">Primeiro Contato &lt; 24h</span>
                <span className="text-[11px] text-emerald-700">94% dos leads contatados no prazo</span>
              </div>
              <CheckCircle2 size={20} className="text-emerald-600" />
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-900 block">Proposta Enviada &lt; 48h</span>
                <span className="text-[11px] text-amber-700">78% no prazo (Atenção para gargalo)</span>
              </div>
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
