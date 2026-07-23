import React, { useState } from 'react';
import {
  Building2,
  Users,
  Target,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Briefcase,
  Globe,
  DollarSign,
  Megaphone
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────

interface CompanyProfile {
  industry: string;
  companySize: string;
  monthlyRevenue: string;
  productsServices: string;
  salesChannels: string[];
  primaryGoal: string;
}

interface OnboardingProps {
  onComplete: (profile: CompanyProfile) => void;
  onSkip: () => void;
}

// ─── Industry Templates ──────────────────────────────────────────

const INDUSTRIES = [
  { id: 'b2b_saas', label: 'B2B SaaS', icon: '💻', agents: ['SDR', 'Closer', 'CS', 'Marketing', 'Product'] },
  { id: 'ecommerce', label: 'E-commerce', icon: '🛒', agents: ['SDR', 'Closer', 'CS', 'Marketing', 'Logística'] },
  { id: 'advocacia', label: 'Advocacia', icon: '⚖️', agents: ['Jurídico', 'CS', 'Marketing', 'Financeiro'] },
  { id: 'saude', label: 'Saúde', icon: '🏥', agents: ['Atendimento', 'CS', 'Marketing', 'Financeiro'] },
  { id: 'educacao', label: 'Educação', icon: '📚', agents: ['SDR', 'Closer', 'CS', 'Marketing'] },
  { id: 'consultoria', label: 'Consultoria', icon: '📊', agents: ['SDR', 'Closer', 'CS', 'Marketing', 'Financeiro'] },
  { id: 'industria', label: 'Indústria', icon: '🏭', agents: ['Vendas', 'CS', 'Marketing', 'Logística'] },
  { id: 'servicos', label: 'Serviços', icon: '🔧', agents: ['SDR', 'Closer', 'CS', 'Marketing'] },
  { id: 'imobiliaria', label: 'Imobiliário', icon: '🏠', agents: ['SDR', 'Closer', 'CS', 'Marketing'] },
  { id: 'financeiro', label: 'Financeiro', icon: '💰', agents: ['SDR', 'Closer', 'CS', 'Compliance'] },
  { id: 'alimentacao', label: 'Alimentação', icon: '🍔', agents: ['SDR', 'Closer', 'CS', 'Marketing'] },
  { id: 'outro', label: 'Outro', icon: '📌', agents: ['SDR', 'Closer', 'CS', 'Marketing'] },
];

const COMPANY_SIZES = [
  { id: 'solo', label: 'Solo (1 pessoa)' },
  { id: 'micro', label: 'Micro (2-9 pessoas)' },
  { id: 'pequena', label: 'Pequena (10-49 pessoas)' },
  { id: 'media', label: 'Média (50-249 pessoas)' },
  { id: 'grande', label: 'Grande (250+ pessoas)' },
];

const SALES_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'E-mail' },
  { id: 'telefone', label: 'Telefone' },
  { id: 'site', label: 'Site/Landing Page' },
  { id: 'redes_sociais', label: 'Redes Sociais' },
  { id: 'indicacao', label: 'Indicação' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'outbound', label: 'Outbound' },
];

const PRIMARY_GOALS = [
  { id: 'aumentar_vendas', label: 'Aumentar vendas' },
  { id: 'automatizar_processos', label: 'Automatizar processos' },
  { id: 'melhorar_atendimento', label: 'Melhorar atendimento' },
  { id: 'reduzir_custos', label: 'Reduzir custos' },
  { id: 'escalar_operacao', label: 'Escalar operação' },
  { id: 'melhorar_retorno', label: 'Melhorar ROI' },
];

// ─── Main Component ──────────────────────────────────────────────

export const OnboardingView: React.FC<OnboardingProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile>({
    industry: '',
    companySize: '',
    monthlyRevenue: '',
    productsServices: '',
    salesChannels: [],
    primaryGoal: '',
  });

  const steps = [
    { title: 'Ramo de Atuação', description: 'Qual é o segmento da sua empresa?' },
    { title: 'Tamanho da Equipe', description: 'Quantas pessoas trabalham na empresa?' },
    { title: 'Faturamento Mensal', description: 'Qual é o faturamento mensal aproximado?' },
    { title: 'Produtos & Serviços', description: 'O que sua empresa oferece?' },
    { title: 'Canais de Venda', description: 'Quais canais você utiliza para vender?' },
    { title: 'Objetivo Principal', description: 'Qual é seu maior desafio hoje?' },
  ];

  const canProceed = () => {
    switch (step) {
      case 0: return profile.industry !== '';
      case 1: return profile.companySize !== '';
      case 2: return true; // Revenue is optional
      case 3: return profile.productsServices.trim().length > 0;
      case 4: return profile.salesChannels.length > 0;
      case 5: return profile.primaryGoal !== '';
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onComplete(profile);
  };

  const toggleChannel = (channelId: string) => {
    setProfile(prev => ({
      ...prev,
      salesChannels: prev.salesChannels.includes(channelId)
        ? prev.salesChannels.filter(c => c !== channelId)
        : [...prev.salesChannels, channelId],
    }));
  };

  const selectedIndustry = INDUSTRIES.find(i => i.id === profile.industry);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles size={16} />
            Configuração Inicial do AI-BOS
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Descreva sua Empresa
          </h1>
          <p className="text-slate-600">
            Vamos criar agentes autônomos personalizados para o seu negócio
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Passo {step + 1} de {steps.length}
            </span>
            <span className="text-sm text-slate-500">
              {Math.round(((step + 1) / steps.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((step + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">{steps[step].title}</h2>
            <p className="text-slate-600">{steps[step].description}</p>
          </div>

          {/* Step 0: Industry */}
          {step === 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {INDUSTRIES.map(industry => (
                <button
                  key={industry.id}
                  onClick={() => setProfile(prev => ({ ...prev, industry: industry.id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.industry === industry.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{industry.icon}</div>
                  <div className="font-medium text-slate-900 text-sm">{industry.label}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {industry.agents.length} agentes
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 1: Company Size */}
          {step === 1 && (
            <div className="space-y-3">
              {COMPANY_SIZES.map(size => (
                <button
                  key={size.id}
                  onClick={() => setProfile(prev => ({ ...prev, companySize: size.id }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    profile.companySize === size.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{size.label}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Revenue */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="relative">
                <DollarSign size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ex: 50000"
                  value={profile.monthlyRevenue}
                  onChange={(e) => setProfile(prev => ({ ...prev, monthlyRevenue: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="text-sm text-slate-500">
                Opcional — Ajuda a definir prioridades dos agentes
              </p>
            </div>
          )}

          {/* Step 3: Products & Services */}
          {step === 3 && (
            <div className="space-y-4">
              <textarea
                placeholder="Ex: Software de gestão para clínicas, consultoria em marketing digital, roupas fitness..."
                value={profile.productsServices}
                onChange={(e) => setProfile(prev => ({ ...prev, productsServices: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
              <p className="text-sm text-slate-500">
                Descreva brevemente o que sua empresa oferece
              </p>
            </div>
          )}

          {/* Step 4: Sales Channels */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {SALES_CHANNELS.map(channel => (
                <button
                  key={channel.id}
                  onClick={() => toggleChannel(channel.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    profile.salesChannels.includes(channel.id)
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      profile.salesChannels.includes(channel.id)
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-slate-300'
                    }`}>
                      {profile.salesChannels.includes(channel.id) && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900 text-sm">{channel.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Primary Goal */}
          {step === 5 && (
            <div className="space-y-3">
              {PRIMARY_GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => setProfile(prev => ({ ...prev, primaryGoal: goal.id }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    profile.primaryGoal === goal.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{goal.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={step === 0 ? onSkip : handleBack}
            className="px-6 py-3 text-slate-600 font-medium hover:text-slate-900 transition-colors"
          >
            {step === 0 ? 'Pular Configuração' : (
              <span className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Voltar
              </span>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
              canProceed() && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Criando Agentes...
              </>
            ) : step === steps.length - 1 ? (
              <>
                <Sparkles size={16} />
                Criar Meus Agentes
              </>
            ) : (
              <>
                Próximo
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {/* Agent Preview */}
        {selectedIndustry && (
          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">
              Agentes que serão criados:
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedIndustry.agents.map(agent => (
                <span
                  key={agent}
                  className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium"
                >
                  {agent}
                </span>
              ))}
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                + CEO (Orquestrador)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
