import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RotateCcw,
  Loader2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { InstanceCard } from './InstanceCard';
import { QrCodeModal } from './QrCodeModal';
import { LinkModal } from './LinkModal';
import * as waApi from '../../lib/whatsapp-api';
import type { WhatsAppInstance, WhatsAppInstanceLink } from '../../types';

export const InstanceList: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstanceDesc, setNewInstanceDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // QR Modal
  const [qrInstance, setQrInstance] = useState<WhatsAppInstance | null>(null);

  // Link Modal
  const [linkInstance, setLinkInstance] = useState<WhatsAppInstance | null>(null);
  const [links, setLinks] = useState<WhatsAppInstanceLink[]>([]);

  // Action loading states
  const [actionIds, setActionIds] = useState<Set<string>>(new Set());
  const [reconnectingAll, setReconnectingAll] = useState(false);

  // ─── Fetch ──────────────────────────────────────────────────────

  const fetchInstances = useCallback(async () => {
    try {
      const data = await waApi.listInstances();
      setInstances(data);
    } catch (err) {
      console.error('[InstanceList] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 15000);
    return () => clearInterval(interval);
  }, [fetchInstances]);

  // ─── Actions ────────────────────────────────────────────────────

  const markAction = (id: string, on: boolean) => {
    setActionIds(prev => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newInstanceName.trim()) return;
    setCreating(true);
    try {
      await waApi.createInstance({ name: newInstanceName.trim(), description: newInstanceDesc.trim() || undefined });
      setNewInstanceName('');
      setNewInstanceDesc('');
      setShowCreateModal(false);
      await fetchInstances();
    } catch (err: any) {
      alert(`Erro ao criar instância: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async (id: string) => {
    markAction(id, true);
    try {
      await waApi.connectInstance(id);
      await fetchInstances();
    } catch (err: any) {
      alert(`Erro ao conectar: ${err.message}`);
    } finally {
      markAction(id, false);
    }
  };

  const handleDisconnect = async (id: string) => {
    markAction(id, true);
    try {
      await waApi.disconnectInstance(id);
      await fetchInstances();
    } catch (err: any) {
      alert(`Erro ao desconectar: ${err.message}`);
    } finally {
      markAction(id, false);
    }
  };

  const handleReconnect = async (id: string) => {
    markAction(id, true);
    try {
      await waApi.reconnectInstance(id);
      await fetchInstances();
    } catch (err: any) {
      alert(`Erro ao reconectar: ${err.message}`);
    } finally {
      markAction(id, false);
    }
  };

  const handleReconnectAll = async () => {
    setReconnectingAll(true);
    try {
      await waApi.reconnectAll();
      setTimeout(fetchInstances, 2000);
    } catch (err: any) {
      alert(`Erro ao reconectar todas: ${err.message}`);
    } finally {
      setReconnectingAll(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await waApi.deleteInstance(id);
      await fetchInstances();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  const handleOpenQR = (instance: WhatsAppInstance) => {
    setQrInstance(instance);
  };

  const handleOpenLinks = async (instance: WhatsAppInstance) => {
    setLinkInstance(instance);
    try {
      const data = await waApi.getLinks(instance.id);
      setLinks(data);
    } catch {
      setLinks([]);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────────

  const connected = instances.filter(i => i.status === 'connected').length;
  const disconnected = instances.filter(i => i.status === 'disconnected').length;

  // ─── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Wifi size={12} className="text-emerald-500" />
              <strong>{connected}</strong> conectada{connected !== 1 ? 's' : ''}
            </span>
            <span className="text-slate-300">|</span>
            <span className="inline-flex items-center gap-1">
              <WifiOff size={12} className="text-slate-400" />
              <strong>{disconnected}</strong> desconectada{disconnected !== 1 ? 's' : ''}
            </span>
          </div>

          {instances.length > 0 && (
            <button
              onClick={handleReconnectAll}
              disabled={reconnectingAll}
              className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
            >
              {reconnectingAll ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RotateCcw size={13} />
              )}
              Reconectar Todas
            </button>
          )}
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-emerald-700 transition-all"
        >
          <Plus size={14} />
          Nova Instância
        </button>
      </div>

      {/* Instance Cards */}
      {instances.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Wifi size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-400">Nenhuma instância WhatsApp</p>
          <p className="text-xs text-slate-400 mt-1">Crie uma nova instância para começar.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all"
          >
            <Plus size={14} />
            Criar Primeira Instância
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {instances.map(instance => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onReconnect={handleReconnect}
              onDelete={handleDelete}
              onShowQR={handleOpenQR}
              onOpenLinks={handleOpenLinks}
              isAction={actionIds.has(instance.id)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Nova Instância WhatsApp</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nome *</label>
                <input
                  type="text"
                  value={newInstanceName}
                  onChange={e => setNewInstanceName(e.target.value)}
                  placeholder="Ex: Comercial SP"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Descrição</label>
                <input
                  type="text"
                  value={newInstanceDesc}
                  onChange={e => setNewInstanceDesc(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newInstanceName.trim() || creating}
                className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrInstance && (
        <QrCodeModal
          instance={qrInstance}
          onClose={() => setQrInstance(null)}
          onConnected={() => {
            setQrInstance(null);
            fetchInstances();
          }}
        />
      )}

      {/* Link Modal */}
      {linkInstance && (
        <LinkModal
          instance={linkInstance}
          initialLinks={links}
          onClose={() => {
            setLinkInstance(null);
            setLinks([]);
          }}
          onUpdated={async () => {
            if (linkInstance) {
              const data = await waApi.getLinks(linkInstance.id);
              setLinks(data);
            }
          }}
        />
      )}
    </div>
  );
};
