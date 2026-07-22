import React, { useState } from 'react';
import {
  Plus,
  DollarSign,
  Clock,
  AlertCircle,
  Sparkles,
  MessageSquare,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  XCircle,
  Building2,
  User,
  Bot
} from 'lucide-react';
import { Stage, Deal, SalesRep, LeadStageId } from '../../types';

interface KanbanViewProps {
  stages: Stage[];
  deals: Deal[];
  reps: SalesRep[];
  onMoveDeal: (dealId: string, newStageId: LeadStageId, winReason?: string, lossReason?: string) => void;
  onOpenNewDealModal: () => void;
  onOpenWhatsAppChat: (phone: string, name: string) => void;
  onGenerateAIPitch: (deal: Deal) => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  stages,
  deals,
  reps,
  onMoveDeal,
  onOpenNewDealModal,
  onOpenWhatsAppChat,
  onGenerateAIPitch,
}) => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [winLossModal, setWinLossModal] = useState<{ dealId: string; targetStage: 'won' | 'lost' } | null>(null);
  const [reasonText, setReasonText] = useState('');

  const getRepAvatar = (repId: string) => {
    const rep = reps.find((r) => r.id === repId);
    return rep ? rep.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120';
  };

  const handleStageMoveClick = (deal: Deal, targetStageId: LeadStageId) => {
    if (targetStageId === 'won' || targetStageId === 'lost') {
      setWinLossModal({ dealId: deal.id, targetStage: targetStageId });
      setReasonText('');
    } else {
      onMoveDeal(deal.id, targetStageId);
    }
  };

  const handleConfirmWinLoss = () => {
    if (!winLossModal) return;
    if (winLossModal.targetStage === 'won') {
      onMoveDeal(winLossModal.dealId, 'won', reasonText || 'Preço e escopo adequados');
    } else {
      onMoveDeal(winLossModal.dealId, 'lost', undefined, reasonText || 'Sem orçamento ou concorrente');
    }
    setWinLossModal(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pipeline Comercial & Funil de Negócios</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestão visual por etapas Kanban, SLA de atendimento, probabilidades e previsão de fechamento.
          </p>
        </div>

        <button
          onClick={onOpenNewDealModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Nova Oportunidade</span>
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[600px]">
        {stages.map((stage) => {
          const stageDeals = deals.filter((d) => d.stageId === stage.id);
          const stageTotalValue = stageDeals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div
              key={stage.id}
              className="w-80 shrink-0 bg-slate-100/70 rounded-xl border border-slate-200/80 p-3.5 flex flex-col max-h-[750px]"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${stage.color}`}>
                    {stage.name}
                  </span>
                  <span className="text-xs font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-slate-800">
                  R$ {stageTotalValue.toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Deal Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all space-y-3 group"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded uppercase tracking-wider">
                          {deal.companyName}
                        </span>
                        <h4
                          onClick={() => setSelectedDeal(deal)}
                          className="font-bold text-slate-900 text-xs mt-1 leading-snug cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
                        >
                          {deal.title}
                        </h4>
                      </div>
                    </div>

                    {/* Value & Probability */}
                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">Valor</span>
                        <span className="font-extrabold text-slate-900">
                          R$ {deal.value.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">Probabilidade</span>
                        <span className="font-bold text-emerald-600">{deal.probability}%</span>
                      </div>
                    </div>

                    {/* Time & SLA Alert */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="text-slate-400" />
                        {deal.timeInStageDays}d na etapa
                      </span>
                      {deal.timeInStageDays > 3 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                          <AlertCircle size={11} /> SLA Atencao
                        </span>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenWhatsAppChat(deal.contactWhatsApp, deal.contactName)}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                          title="Conversar no WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>

                        <button
                          onClick={() => onGenerateAIPitch(deal)}
                          className="p-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                          title="Gerar Pitch / Script IA Comercial"
                        >
                          <Bot size={14} />
                        </button>
                      </div>

                      {/* Rep Avatar & Stage Move dropdown buttons */}
                      <div className="flex items-center gap-1">
                        {stage.id !== 'won' && stage.id !== 'lost' && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => {
                                const currentIndex = stages.findIndex((s) => s.id === stage.id);
                                if (currentIndex < stages.length - 1) {
                                  handleStageMoveClick(deal, stages[currentIndex + 1].id);
                                }
                              }}
                              className="p-1 rounded hover:bg-slate-100 text-slate-600 font-bold text-xs"
                              title="Avançar Etapa"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        )}
                        <img
                          src={getRepAvatar(deal.assignedTo)}
                          alt="Vendedor"
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Win/Loss Reason Modal */}
      {winLossModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {winLossModal.targetStage === 'won' ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Registrar Negócio Fechado (Ganho)</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-rose-600" />
                    <span>Registrar Motivo de Perda</span>
                  </>
                )}
              </h3>
              <button onClick={() => setWinLossModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                {winLossModal.targetStage === 'won'
                  ? 'Qual foi o principal fator de sucesso na venda?'
                  : 'Qual foi o principal motivo de perda do lead?'}
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder={
                  winLossModal.targetStage === 'won'
                    ? 'Ex: Demonstração de ROI de enriquecimento e integração Whatsmeow'
                    : 'Ex: Preço acima do orçamento ou escolha por concorrente'
                }
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setWinLossModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmWinLoss}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm ${
                  winLossModal.targetStage === 'won'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Salvar Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
