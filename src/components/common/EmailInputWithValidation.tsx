import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, HelpCircle, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { validateEmail, EmailValidationResult } from '../../utils/emailValidation';

interface EmailInputWithValidationProps {
  value: string;
  onChange: (value: string, validationResult: EmailValidationResult) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showDetailedScore?: boolean;
  id?: string;
}

export const EmailInputWithValidation: React.FC<EmailInputWithValidationProps> = ({
  value,
  onChange,
  label = 'E-mail Comercial',
  placeholder = 'exemplo@empresa.com.br',
  required = false,
  className = '',
  showDetailedScore = true,
  id = 'email-input-validation'
}) => {
  const [result, setResult] = useState<EmailValidationResult>(() => validateEmail(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const res = validateEmail(value);
    setResult(res);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const res = validateEmail(val);
    setResult(res);
    onChange(val, res);
  };

  const handleApplySuggestion = () => {
    if (result.suggestion) {
      const res = validateEmail(result.suggestion);
      setResult(res);
      onChange(result.suggestion, res);
    }
  };

  const getBorderColor = () => {
    if (!touched && !value) return 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20';
    if (!value && required) return 'border-amber-300 bg-amber-50/30';
    if (result.isValid) return 'border-emerald-500/60 focus:border-emerald-600 focus:ring-emerald-500/20';
    if (result.status === 'typo_suggested') return 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/20';
    return 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20';
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>
          {value && touched && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                result.isValid
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : result.status === 'typo_suggested'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {result.isValid && <ShieldCheck size={10} />}
              {result.status === 'typo_suggested' && <Sparkles size={10} />}
              {!result.isValid && result.status !== 'typo_suggested' && <AlertCircle size={10} />}
              {result.isValid ? `Qualidade: ${result.qualityScore}%` : result.status.toUpperCase()}
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <input
          id={id}
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={placeholder}
          required={required}
          className={`w-full bg-slate-50 text-slate-900 text-xs rounded-lg p-2.5 pr-9 font-medium border transition-all focus:outline-none focus:ring-2 ${getBorderColor()}`}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
          {value && (
            <>
              {result.isValid && (
                <CheckCircle2 className="text-emerald-500" size={16} />
              )}
              {result.status === 'typo_suggested' && (
                <AlertTriangle className="text-amber-500" size={16} />
              )}
              {!result.isValid && result.status !== 'typo_suggested' && (
                <AlertCircle className="text-rose-500" size={16} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Validation Message & Suggestions */}
      {value && (touched || !result.isValid) && (
        <div className="text-[11px] space-y-1 pt-0.5">
          {result.status === 'typo_suggested' && result.suggestion && (
            <div className="flex items-center justify-between gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600 shrink-0" />
                <span>
                  Você quis dizer <strong className="font-bold underline">{result.suggestion}</strong>?
                </span>
              </div>
              <button
                type="button"
                onClick={handleApplySuggestion}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded text-[10px] shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                Corrigir E-mail
              </button>
            </div>
          )}

          {!result.isValid && result.status !== 'typo_suggested' && (
            <div className="flex items-center gap-1 text-rose-600 font-medium">
              <AlertCircle size={12} className="shrink-0" />
              <span>{result.message}</span>
            </div>
          )}

          {result.isValid && showDetailedScore && (
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span className="text-emerald-700 font-medium">{result.message}</span>
                {result.isRoleAccount && (
                  <span className="bg-slate-200 text-slate-700 px-1 rounded text-[9px] font-semibold">
                    Conta de Departamento
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
