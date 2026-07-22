import React, { useState } from 'react';
import { Mail, CheckCircle2, AlertTriangle, AlertCircle, Sparkles, RefreshCw, Copy, Check, ShieldCheck, Download } from 'lucide-react';
import { validateEmail, EmailValidationResult } from '../../utils/emailValidation';

export const EmailValidatorTool: React.FC = () => {
  const [singleEmail, setSingleEmail] = useState('carlos.andrade@gmail.co');
  const [singleResult, setSingleResult] = useState<EmailValidationResult>(() => validateEmail('carlos.andrade@gmail.co'));
  const [copied, setCopied] = useState(false);

  // Batch tester state
  const [batchText, setBatchText] = useState(
    'marcos.silva@techlogbrasil.com.br\nrenata.albuquerque@gmail.co\ndrfernando@odontoprimefloripa.com.br\ncontato@tempmail.com\ninvalid-email-syntax\nhfonseca@vanguardaeng.com.br'
  );
  const [batchResults, setBatchResults] = useState<EmailValidationResult[]>([]);

  const handleSingleCheck = (val: string) => {
    setSingleEmail(val);
    setSingleResult(validateEmail(val));
  };

  const handleApplySingleSuggestion = () => {
    if (singleResult.suggestion) {
      handleSingleCheck(singleResult.suggestion);
    }
  };

  const handleRunBatchValidation = () => {
    const lines = batchText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const results = lines.map((email) => validateEmail(email));
    setBatchResults(results);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validCount = batchResults.filter((r) => r.isValid).length;
  const typoCount = batchResults.filter((r) => r.status === 'typo_suggested').length;
  const invalidCount = batchResults.filter((r) => !r.isValid && r.status !== 'typo_suggested').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="text-blue-600" size={20} />
            <span>Verificador & Validador de E-mails Comerciais</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Validação de sintaxe, saúde de domínio, detecção de e-mails descartáveis e correção automática de erros de digitação.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={12} />
            Sintaxe RFC 5322
          </span>
          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Sparkles size={12} />
            Auto-Correction Engine
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Email Verifier Card */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-blue-600" />
              <span>Teste de E-mail Individual</span>
            </h4>
            <span className="text-[10px] text-slate-400 font-medium">Análise em Tempo Real</span>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">E-mail para Validação</label>
            <div className="relative">
              <input
                type="email"
                value={singleEmail}
                onChange={(e) => handleSingleCheck(e.target.value)}
                placeholder="Insira o e-mail (ex: vendedor@empresa.com.br)"
                className="w-full bg-white text-slate-900 text-xs rounded-lg p-2.5 pr-9 font-medium border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {singleResult.isValid && <CheckCircle2 size={16} className="text-emerald-500" />}
                {singleResult.status === 'typo_suggested' && <AlertTriangle size={16} className="text-amber-500" />}
                {!singleResult.isValid && singleResult.status !== 'typo_suggested' && (
                  <AlertCircle size={16} className="text-rose-500" />
                )}
              </div>
            </div>
          </div>

          {/* Validation Result Box */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Resultado do Diagnóstico:</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  singleResult.isValid
                    ? 'bg-emerald-100 text-emerald-800'
                    : singleResult.status === 'typo_suggested'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {singleResult.status.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-slate-600">{singleResult.message}</p>

            {/* Typo Auto-Fix Banner */}
            {singleResult.status === 'typo_suggested' && singleResult.suggestion && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                  <Sparkles size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Sugestão: <strong className="underline">{singleResult.suggestion}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleApplySingleSuggestion}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded text-[10px] transition-all shrink-0"
                >
                  Aplicar Correção
                </button>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-slate-100 text-center">
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-400 block font-medium">Score Qualidade</span>
                <span className="font-bold text-slate-900 text-xs">{singleResult.qualityScore}%</span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-400 block font-medium">Domínio</span>
                <span className="font-bold text-slate-900 text-[11px] truncate block">
                  {singleResult.domain || 'N/A'}
                </span>
              </div>
              <div className="p-2 bg-slate-50 rounded">
                <span className="text-slate-400 block font-medium">Descartável?</span>
                <span className={`font-bold text-xs ${singleResult.isDisposable ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {singleResult.isDisposable ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Validation Section */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <Mail size={16} className="text-indigo-600" />
              <span>Validação em Lote (Múltiplos Leads / Vendedores)</span>
            </h4>
            <button
              onClick={handleRunBatchValidation}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw size={12} />
              <span>Analisar Lista</span>
            </button>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1">
              Cole os e-mails (um por linha):
            </label>
            <textarea
              rows={4}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full bg-white text-slate-900 text-xs rounded-lg p-2.5 font-mono border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {batchResults.length > 0 && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                  <span>{validCount} Válidos</span>
                </div>
                <div className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                  <span>{typoCount} Com Digitação</span>
                </div>
                <div className="p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg">
                  <span>{invalidCount} Inválidos</span>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {batchResults.map((res, i) => (
                  <div
                    key={i}
                    className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="truncate font-medium text-slate-800">
                      <span>{res.email}</span>
                      {res.suggestion && (
                        <span className="text-[10px] text-amber-700 font-bold block">
                          Did you mean: {res.suggestion}?
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        res.isValid
                          ? 'bg-emerald-100 text-emerald-800'
                          : res.status === 'typo_suggested'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
