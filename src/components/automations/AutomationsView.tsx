import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Play,
  Settings2,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Bot,
  MessageSquare,
  Building2,
  Bell,
  Clock,
  Activity,
  Layers,
  X
} from 'lucide-react';
import { AutomationFlow, AutomationNode } from '../../types';

interface AutomationsViewProps {
  automations: AutomationFlow[];
  onToggleAutomation: (id: string) => void;
  onCreateAutomation: (flow: AutomationFlow) => void;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  onToggleAutomation,
  onCreateAutomation,
}) => {
  const [selectedFlow, setSelectedFlow] = useState<AutomationFlow>(automations[0]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');

  const handleCreateFlow = () => {
    if (!newFlowName.trim()) return;
    const newFlow: AutomationFlow = {
      id: `flow-${Date.now()}`,
      name: newFlowName,
      description: newFlowDesc || 'Fluxo de automação comercial customizado.',
      active: true,
      executionCount: 0,
      nodes: [
        { id: 'n-1', type: 'trigger', label: 'Novo Lead Inbound', sublabel: 'Disparado quando um lead entra no CRM', config: {}, position: { x: 50, y: 100 } },
        { id: 'n-2', type: 'action', label: 'Enviar WhatsApp de Boas-Vindas', sublabel: 'Mensagem automática via Whatsmeow', config: {}, position: { x: 320, y: 100 } }
      ],
      edges: [{ id: 'e-1', source: 'n-1', target: 'n-2' }]
    };

    onCreateAutomation(newFlow);
    setSelectedFlow(newFlow);
    setShowNewModal(false);
    setNewFlowName('');
    setNewFlowDesc('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Zap size={20} className="text-amber-500 fill-amber-400" />
            <span>Motor Próprio de Automações Visuais (n8n Style)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Crie fluxos automatizados sem n8n externo. Gatilhos de pipeline, ações de WhatsApp, inteligência IA e tarefas.
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Criar Novo Fluxo</span>
        </button>
      </div>

      {/* Main Grid: Flow Selector + Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Flow List */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-500">
            Fluxos Ativos ({automations.length})
          </h3>

          <div className="space-y-2">
            {automations.map((flow) => {
              const isSelected = flow.id === selectedFlow.id;
              return (
                <div
                  key={flow.id}
                  onClick={() => setSelectedFlow(flow)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{flow.name}</h4>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAutomation(flow.id);
                      }}
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        flow.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {flow.active ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{flow.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-medium border-t border-slate-100">
                    <span>{flow.executionCount} execuções</span>
                    <span>{flow.nodes.length} nós de ação</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Visual Workflow Builder Canvas */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl p-6 border border-slate-800 shadow-xl space-y-6 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
          {/* Canvas Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 text-white">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">{selectedFlow.name}</h3>
                <p className="text-[11px] text-slate-400">Editor de nós visuais de automação comercial</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md font-mono font-bold">
                ● Rodando
              </span>
            </div>
          </div>

          {/* Visual Node Flow Builder Diagram */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 py-8">
            {selectedFlow.nodes.map((node, idx) => (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <div className="bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-2xl p-4 w-52 shadow-2xl transition-all space-y-2 group relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {node.type}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h4 className="font-bold text-xs text-white leading-snug">{node.label}</h4>
                  <p className="text-[10px] text-slate-400">{node.sublabel}</p>
                </div>

                {/* Arrow Connector */}
                {idx < selectedFlow.nodes.length - 1 && (
                  <div className="text-slate-600 font-bold flex items-center justify-center">
                    <ArrowRight size={20} className="text-amber-400 animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Canvas Footer */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Última execução: {selectedFlow.lastRunAt || 'Hoje às 13:10'}</span>
            <span>Total de execuções com sucesso: 100%</span>
          </div>
        </div>
      </div>

      {/* New Flow Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">Novo Fluxo de Automação</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nome da Automação</label>
                <input
                  type="text"
                  value={newFlowName}
                  onChange={(e) => setNewFlowName(e.target.value)}
                  placeholder="Ex: Disparo WhatsApp em Leads Inbound"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descrição do Gatilho e Ação</label>
                <textarea
                  value={newFlowDesc}
                  onChange={(e) => setNewFlowDesc(e.target.value)}
                  placeholder="Ex: Quando um lead entra, envia mensagem de apresentação no WhatsApp."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFlow}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
              >
                Criar Automação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
