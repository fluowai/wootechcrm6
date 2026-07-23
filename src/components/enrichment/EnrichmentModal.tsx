import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Loader2,
  Building2,
  Globe,
  Users,
  X,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  ExternalLink,
  Shield,
  Cpu,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Company } from '../../types';

interface EnrichmentModalProps {
  company: Company | null;
  onClose: () => void;
  onCompleteEnrichment: (updatedCompany: Company) => void;
}

interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const EnrichmentModal: React.FC<EnrichmentModalProps> = ({
  company,
  onClose,
  onCompleteEnrichment,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepResults, setStepResults] = useState<Record<number, StepResult>>({});
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [enrichmentData, setEnrichmentData] = useState<Company | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const STEPS = [
    { id: 1, label: 'Receita Federal — CNPJ & Dados Cadastrais', icon: Building2,  service: 'cnpj-service' },
    { id: 2, label: 'Quadro Societário (QSA) — Sócios & Decisores', icon: Users,    service: 'cnpj-service' },
    { id: 3, label: 'Website Crawler — Emails, Telefones & Sociais', icon: Globe,   service: 'firecrawl + colly + cheerio' },
    { id: 4, label: 'Validação WhatsApp — Números Ativos', icon: MessageSquare,     service: 'whatsmeow' },
    { id: 5, label: 'Score Comercial IA — Pontuação & Recomendação', icon: Sparkles, service: 'gemini' },
  ];

  useEffect(() => {
    if (!company) return;
    let isMounted = true;

    const runPipeline = async () => {
      setIsProcessing(true);
      const results: Record<number, StepResult> = {};
      let receitaData: any = null;
      let sociosData: any[] = [];
      let webData: any = null;
      let waValidated: any[] = [];
      let scoreComercial = 70;

      // ── STEP 1: CNPJ / Receita Federal ──────────────────────────
      if (!isMounted) return;
      setCurrentStep(1);

      try {
        const res = await fetch('/api/enrichment/receita', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cnpj: company.cnpj }),
        });
        const json = await res.json();
        if (json.success) {
          receitaData = json.data;
          results[1] = { success: true, data: receitaData };
        } else {
          results[1] = { success: false, error: 'CNPJ não encontrado' };
        }
      } catch (e: any) {
        results[1] = { success: false, error: e.message };
      }
      if (isMounted) setStepResults({ ...results });

      // ── STEP 2: Sócios (QSA) ────────────────────────────────────
      if (!isMounted) return;
      setCurrentStep(2);
      await new Promise((r) => setTimeout(r, 300));

      if (company.cnpj && company.cnpj.replace(/\D/g, '').length === 14) {
        try {
          const cnpjClean = company.cnpj.replace(/\D/g, '');
          const res = await fetch(`/api/enrichment/socios/${cnpjClean}`);
          const json = await res.json();
          if (json.success) {
            sociosData = json.socios || [];
            results[2] = { success: true, data: sociosData };
          } else {
            // Fallback: usar QSA do step 1
            sociosData = receitaData?.qsa || [];
            results[2] = { success: true, data: sociosData, error: 'Usando dados do CNPJ' };
          }
        } catch (e: any) {
          sociosData = receitaData?.qsa || [];
          results[2] = { success: sociosData.length > 0, data: sociosData, error: e.message };
        }
      } else {
        results[2] = { success: false, error: 'CNPJ não disponível para consulta de sócios' };
      }
      if (isMounted) setStepResults({ ...results });

      // ── STEP 3: Website Crawler ──────────────────────────────────
      if (!isMounted) return;
      setCurrentStep(3);

      if (company.website) {
        try {
          const res = await fetch('/api/enrichment/website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ website: company.website }),
          });
          const json = await res.json();
          if (json.success) {
            webData = json;
            results[3] = { success: true, data: webData };
          } else {
            results[3] = { success: false, error: json.error };
          }
        } catch (e: any) {
          results[3] = { success: false, error: e.message };
        }
      } else {
        results[3] = { success: false, error: 'Website não disponível' };
      }
      if (isMounted) setStepResults({ ...results });

      // ── STEP 4: Validação WhatsApp ───────────────────────────────
      if (!isMounted) return;
      setCurrentStep(4);

      const phonesToValidate = [
        ...(receitaData?.telefones || []),
        ...((company as any).telefones || []),
      ].filter(Boolean).slice(0, 5);

      if (phonesToValidate.length > 0) {
        try {
          const res = await fetch('/api/whatsapp/validate-numbers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numbers: phonesToValidate }),
          });
          const json = await res.json();
          if (json.success) {
            waValidated = json.validated || [];
            results[4] = { success: true, data: waValidated };
          } else {
            results[4] = { success: false, error: json.error };
          }
        } catch (e: any) {
          results[4] = { success: false, error: e.message };
        }
      } else {
        results[4] = { success: false, error: 'Nenhum telefone para validar' };
      }
      if (isMounted) setStepResults({ ...results });

      // ── STEP 5: Score Comercial IA ───────────────────────────────
      if (!isMounted) return;
      setCurrentStep(5);

      // Calcular score baseado nos dados coletados
      scoreComercial = 50;
      if (receitaData?.situacao === 'ATIVA') scoreComercial += 15;
      if ((receitaData?.capitalSocial || 0) > 100000) scoreComercial += 10;
      if (webData?.emails?.length > 0) scoreComercial += 5;
      if (webData?.socialLinks?.instagram || webData?.socialLinks?.linkedin) scoreComercial += 5;
      if (webData?.techStack?.length > 0) scoreComercial += 5;
      if (sociosData.length > 0) scoreComercial += 5;
      if (waValidated.some((n: any) => n.hasWhatsApp)) scoreComercial += 5;
      scoreComercial = Math.min(scoreComercial, 98);

      results[5] = {
        success: true,
        data: {
          score: scoreComercial,
          factors: [
            receitaData?.situacao === 'ATIVA' ? '✅ CNPJ Ativo (+15pts)' : '⚠️ Situação irregular',
            (receitaData?.capitalSocial || 0) > 100000 ? '✅ Capital social > R$100k (+10pts)' : '📊 Capital social baixo',
            webData?.emails?.length > 0 ? `✅ ${webData.emails.length} email(s) encontrado(s) (+5pts)` : '❌ Sem emails no site',
            sociosData.length > 0 ? `✅ ${sociosData.length} sócio(s) mapeado(s) (+5pts)` : '❌ Sem dados societários',
            waValidated.some((n: any) => n.hasWhatsApp) ? '✅ WhatsApp validado (+5pts)' : '📱 WhatsApp não confirmado',
          ],
        },
      };
      if (isMounted) setStepResults({ ...results });

      // ── Montar empresa enriquecida ───────────────────────────────
      const updatedCompany: Company = {
        ...company,
        enriched: true,
        razaoSocial: receitaData?.razaoSocial || (company as any).razaoSocial,
        capitalSocial: receitaData?.capitalSocial || (company as any).capitalSocial || 0,
        porte: receitaData?.porte || (company as any).porte,
        naturezaJuridica: receitaData?.naturezaJuridica || (company as any).naturezaJuridica,
        scoreComercial,
        emails: [...new Set([
          ...(webData?.emails || []),
          ...(receitaData?.emails || []),
          ...((company as any).emails || []),
        ])],
        telefones: [...new Set([
          ...(receitaData?.telefones || []),
          ...(webData?.phones || []),
          ...((company as any).telefones || []),
        ])],
        techStack: webData?.techStack || (company as any).techStack || [],
        decisionMakers: sociosData.map((s: any, idx: number) => ({
          id: `dm-qsa-${idx}`,
          name: s.nome || s.nome_socio || 'Sócio',
          role: s.qualificacao || s.qualificacao_socio || 'Sócio',
          department: 'Diretoria',
          whatsApp: waValidated.find((w: any) => w.hasWhatsApp)?.formattedNumber || '',
          email: webData?.emails?.[idx] || '',
          isLegalRepresentative: idx === 0,
        })),
      };

      if (isMounted) {
        setEnrichmentData(updatedCompany);
        setIsProcessing(false);
        setCurrentStep(6); // done
      }
    };

    runPipeline();
    return () => { isMounted = false; };
  }, [company]);

  if (!company) return null;

  const toggleSection = (key: string) => setExpandedSection(prev => prev === key ? null : key);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pipeline de Enriquecimento</h3>
              <p className="text-xs text-slate-500 font-medium">{(company as any).nomeFantasia || (company as any).nome_fantasia || company.cnpj}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Pipeline Steps */}
        <div className="p-5 space-y-2.5 overflow-y-auto flex-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id || !isProcessing;
            const isCurrent = currentStep === step.id && isProcessing;
            const result = stepResults[step.id];

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all ${
                  isDone && result?.success
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : isDone && !result?.success
                    ? 'bg-amber-50/70 border-amber-200'
                    : isCurrent
                    ? 'bg-blue-50 border-blue-300 shadow-sm'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <Icon
                      size={16}
                      className={
                        isDone && result?.success ? 'text-emerald-600' :
                        isDone && !result?.success ? 'text-amber-500' :
                        isCurrent ? 'text-blue-600' : 'text-slate-400'
                      }
                    />
                    <div>
                      <p className={`text-xs font-bold ${
                        isDone && result?.success ? 'text-emerald-900' :
                        isDone && !result?.success ? 'text-amber-800' :
                        isCurrent ? 'text-blue-900' : 'text-slate-400'
                      }`}>{step.label}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{step.service}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isDone && result?.success && result.data && (
                      <button
                        onClick={() => toggleSection(`step-${step.id}`)}
                        className="text-emerald-600 hover:text-emerald-800"
                      >
                        {expandedSection === `step-${step.id}` ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    {isDone && result?.success ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : isDone && !result?.success ? (
                      <AlertCircle size={18} className="text-amber-500" />
                    ) : isCurrent ? (
                      <Loader2 size={18} className="animate-spin text-blue-600" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                </div>

                {/* Expandable detail */}
                {expandedSection === `step-${step.id}` && result?.data && (
                  <div className="px-4 pb-3 border-t border-slate-100 mt-1 pt-3 space-y-1.5">
                    {/* Step 1: CNPJ */}
                    {step.id === 1 && (
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div><span className="text-slate-500">Razão Social:</span> <span className="font-semibold text-slate-800">{result.data.razaoSocial}</span></div>
                        <div><span className="text-slate-500">Situação:</span> <span className={`font-bold ${result.data.situacao === 'ATIVA' ? 'text-emerald-600' : 'text-red-600'}`}>{result.data.situacao}</span></div>
                        <div><span className="text-slate-500">Porte:</span> <span className="font-semibold">{result.data.porte}</span></div>
                        <div><span className="text-slate-500">Capital:</span> <span className="font-semibold text-blue-700">R$ {(result.data.capitalSocial || 0).toLocaleString('pt-BR')}</span></div>
                        <div className="col-span-2"><span className="text-slate-500">CNAE:</span> <span className="font-semibold">{result.data.cnaePrincipal?.codigo} — {result.data.cnaePrincipal?.descricao}</span></div>
                        {result.data.telefones?.length > 0 && (
                          <div className="col-span-2 flex items-center gap-1.5 text-blue-700"><Phone size={12} /> {result.data.telefones.join(' | ')}</div>
                        )}
                        {result.data.emails?.filter(Boolean).length > 0 && (
                          <div className="col-span-2 flex items-center gap-1.5 text-blue-700"><Mail size={12} /> {result.data.emails.join(' | ')}</div>
                        )}
                      </div>
                    )}

                    {/* Step 2: Sócios */}
                    {step.id === 2 && Array.isArray(result.data) && result.data.length > 0 && (
                      <div className="space-y-1.5">
                        {result.data.map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-slate-100">
                            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                              {(s.nome || s.nome_socio || 'S')[0]}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-slate-800">{s.nome || s.nome_socio}</p>
                              <p className="text-[10px] text-slate-500">{s.qualificacao || s.qualificacao_socio} {s.pais && s.pais !== 'Brasil' ? `• ${s.pais}` : ''}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 3: Website */}
                    {step.id === 3 && result.data && (
                      <div className="space-y-1.5 text-[11px]">
                        <p className="text-slate-500 text-[10px] font-mono">Fonte: {result.data.source}</p>
                        {result.data.emails?.length > 0 && (
                          <div className="flex items-start gap-1.5 text-blue-700">
                            <Mail size={12} className="mt-0.5 shrink-0" />
                            <div className="flex flex-wrap gap-1">
                              {result.data.emails.map((e: string, i: number) => (
                                <span key={i} className="bg-blue-50 px-1.5 py-0.5 rounded font-mono">{e}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {result.data.whatsappLinks?.length > 0 && (
                          <div className="flex items-center gap-1.5 text-green-700">
                            <MessageSquare size={12} />
                            <span>{result.data.whatsappLinks.length} link(s) WhatsApp</span>
                          </div>
                        )}
                        {Object.keys(result.data.socialLinks || {}).length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {result.data.socialLinks.instagram && <a href={result.data.socialLinks.instagram} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded"><Instagram size={11} /> Instagram</a>}
                            {result.data.socialLinks.linkedin && <a href={result.data.socialLinks.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded"><Linkedin size={11} /> LinkedIn</a>}
                          </div>
                        )}
                        {result.data.techStack?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {result.data.techStack.map((t: any, i: number) => (
                              <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono">{t.name}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4: WhatsApp */}
                    {step.id === 4 && Array.isArray(result.data) && (
                      <div className="space-y-1 text-[11px]">
                        {result.data.map((n: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-white rounded p-2 border border-slate-100">
                            <span className="font-mono">{n.formattedNumber}</span>
                            <span className={`font-bold text-[10px] px-2 py-0.5 rounded ${n.hasWhatsApp ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                              {n.hasWhatsApp ? '✓ WhatsApp' : '× Sem WA'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step 5: Score */}
                    {step.id === 5 && result.data && (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-bold">Score Comercial</span>
                          <span className={`text-xl font-extrabold ${result.data.score >= 80 ? 'text-emerald-600' : result.data.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                            {result.data.score}/100
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${result.data.score >= 80 ? 'bg-emerald-500' : result.data.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${result.data.score}%` }}
                          />
                        </div>
                        <div className="space-y-0.5 mt-1">
                          {result.data.factors?.map((f: string, i: number) => (
                            <p key={i} className="text-[10px] text-slate-600">{f}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary + Actions */}
        {!isProcessing && enrichmentData && (
          <div className="p-5 border-t border-slate-100 space-y-3">
            <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl p-3.5 border border-blue-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Enriquecimento concluído</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {enrichmentData.emails?.length || 0} emails · {enrichmentData.decisionMakers?.length || 0} sócios · Score {enrichmentData.scoreComercial}/100
                </p>
              </div>
              <div className={`text-2xl font-extrabold ${(enrichmentData.scoreComercial || 0) >= 80 ? 'text-emerald-600' : (enrichmentData.scoreComercial || 0) >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                {enrichmentData.scoreComercial}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => { if (enrichmentData) onCompleteEnrichment(enrichmentData); onClose(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all"
              >
                Salvar Enriquecimento no CRM
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="p-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium animate-pulse">
              Executando pipeline de inteligência comercial...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
