import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  PhoneCall,
  Mail,
  MessageSquare,
  ShieldAlert,
  Building2,
  Send,
  Loader2,
  Copy,
  Check,
  Award
} from 'lucide-react';
import { AICommercialRequest, AICommercialResponse } from '../../types';

export const AIAssistantView: React.FC = () => {
  const [activeTool, setActiveTool] = useState<'script' | 'email' | 'whatsapp' | 'objection' | 'summary' | 'score'>('script');
  
  const [companyName, setCompanyName] = useState('TechLog Soluções Brasil');
  const [contactRole, setContactRole] = useState('Sócio-Diretor / COO');
  const [niche, setNiche] = useState('Logística & Transporte B2B');
  const [objectionText, setObjectionText] = useState('Já temos outro sistema interno e não pretendemos mudar agora.');
  const [dealValue, setDealValue] = useState(48000);

  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setAiResponse(null);

    const reqBody: AICommercialRequest = {
      type: activeTool,
      companyName,
      contactRole,
      niche,
      dealValue,
      objectionText
    };

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setAiResponse(data.result);
      } else if (data.fallback) {
        setAiResponse(data.fallback);
      }
    } catch (err: any) {
      console.error('Erro na IA Comercial:', err);
      setAiResponse('Ocorreu um erro ao conectar à inteligência Gemini. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!aiResponse) return;
    navigator.clipboard.writeText(aiResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 p-6 rounded-2xl text-white shadow-lg space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold border border-white/20">
          <Sparkles size={14} className="text-amber-300" />
          <span>Motor Inteligente Gemini 3.6 Flash</span>
        </div>
        <h2 className="text-xl font-bold tracking-tight">Assistente Executivo de IA Comercial</h2>
        <p className="text-xs text-purple-100 max-w-2xl">
          Gere abordagens de prospecção fria, scripts telefônicos, e-mails de alta conversão, contorno de objeções e score comercial instantâneo.
        </p>
      </div>

      {/* Tool Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        {[
          { id: 'script', label: 'Script Cold Call', icon: PhoneCall },
          { id: 'email', label: 'Cold Email', icon: Mail },
          { id: 'whatsapp', label: 'WhatsApp Pitch', icon: MessageSquare },
          { id: 'objection', label: 'Contornar Objeção', icon: ShieldAlert },
          { id: 'summary', label: 'Resumo da Oportunidade', icon: Building2 },
          { id: 'score', label: 'Score Comercial', icon: Award }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTool(t.id as any)}
              className={`p-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Parameters + Output Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-blue-700">
            Parâmetros do Lead B2B
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Nome da Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Cargo do Interlocutor</label>
              <input
                type="text"
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nicho de Atuação / Setor</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            {activeTool === 'objection' && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Objeção dita pelo Cliente</label>
                <textarea
                  value={objectionText}
                  onChange={(e) => setObjectionText(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            )}

            {activeTool === 'score' && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Valor do Contrato (R$)</label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{loading ? 'Gerando com Gemini...' : 'Gerar Inteligência Comercial'}</span>
            </button>
          </div>
        </div>

        {/* Right Output */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
                Resultado Gerado pela IA
              </h3>
              {aiResponse && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                </button>
              )}
            </div>

            <div className="pt-3">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
                  <Loader2 size={24} className="animate-spin text-blue-600" />
                  <p className="text-xs font-medium">Analisando padrão B2B e criando resposta com Gemini 3.6...</p>
                </div>
              ) : aiResponse ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {aiResponse}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs font-medium">
                  Clique em &quot;Gerar Inteligência Comercial&quot; para sintetizar o texto.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
