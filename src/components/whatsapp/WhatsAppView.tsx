import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { InstanceList } from './InstanceList';
import { MessagesView } from './MessagesView';
import * as waApi from '../../lib/whatsapp-api';
import type { WhatsAppInstance } from '../../types';

type TabId = 'instances' | 'messages' | 'validator';

const TABS: { id: TabId; label: string }[] = [
  { id: 'instances', label: 'Instâncias' },
  { id: 'messages', label: 'Mensagens' },
  { id: 'validator', label: 'Validador' },
];

export const WhatsAppView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('instances');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);

  // Validator
  const [numbersToValidate, setNumbersToValidate] = useState('5511999999999');

  // ─── Load instances ────────────────────────────────────────────

  const fetchInstances = useCallback(async () => {
    try {
      const data = await waApi.listInstances();
      setInstances(data);
      if (!selectedInstanceId && data.length > 0) {
        setSelectedInstanceId(data[0].id);
      }
    } catch (err) {
      console.error('[WhatsAppView] fetch instances error:', err);
    }
  }, [selectedInstanceId]);

  useEffect(() => {
    fetchInstances();
  }, []);

  // ─── Derived ───────────────────────────────────────────────────

  const selectedInstance = instances.find(i => i.id === selectedInstanceId);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={20} className="text-emerald-600" />
            WhatsApp Multi-Instance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie instâncias, converse em tempo real e vincule serviços.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Instances */}
      {activeTab === 'instances' && <InstanceList />}

      {/* Tab: Messages */}
      {activeTab === 'messages' && (
        <>
          {/* Instance selector */}
          {instances.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-500">Instância:</span>
              <select
                value={selectedInstanceId || ''}
                onChange={e => setSelectedInstanceId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none"
              >
                {instances.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name} {i.status === 'connected' ? '🟢' : '⚫'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedInstance ? (
            <MessagesView
              key={selectedInstance.id}
              instance={selectedInstance}
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-[650px] flex items-center justify-center">
              <div className="text-center">
                <MessageSquare size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-xs text-slate-400 font-medium">Nenhuma instância selecionada.</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Crie ou selecione uma instância na aba "Instâncias".
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Tab: Validator */}
      {activeTab === 'validator' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Validador de Números</h3>
          </div>
          <p className="text-xs text-slate-500">
            Valide e formate números. Números que não existirem no Whatsmeow serão ignorados.
          </p>
          <textarea
            value={numbersToValidate}
            onChange={e => setNumbersToValidate(e.target.value)}
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs focus:outline-none"
          />
        </div>
      )}
    </div>
  );
};
