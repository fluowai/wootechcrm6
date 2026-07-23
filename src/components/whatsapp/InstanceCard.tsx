import React from 'react';
import {
  Wifi,
  WifiOff,
  Loader2,
  QrCode,
  RotateCcw,
  Unplug,
  Trash2,
  Link2,
  Phone,
} from 'lucide-react';
import type { WhatsAppInstance } from '../../types';

const STATUS_CONFIG = {
  connected: {
    color: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    label: 'Conectado',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    icon: Wifi,
  },
  disconnected: {
    color: 'bg-slate-400',
    ring: 'ring-slate-200',
    label: 'Desconectado',
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-50',
    icon: WifiOff,
  },
  connecting: {
    color: 'bg-amber-400',
    ring: 'ring-amber-200',
    label: 'Conectando...',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    icon: Loader2,
  },
  qr_pending: {
    color: 'bg-blue-500',
    ring: 'ring-blue-200',
    label: 'Aguardando QR',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    icon: QrCode,
  },
  logged_out: {
    color: 'bg-red-400',
    ring: 'ring-red-200',
    label: 'Deslogado',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    icon: WifiOff,
  },
};

interface InstanceCardProps {
  instance: WhatsAppInstance;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onReconnect: (id: string) => void;
  onDelete: (id: string) => void;
  onShowQR: (instance: WhatsAppInstance) => void;
  onOpenLinks: (instance: WhatsAppInstance) => void;
  isAction?: boolean;
}

export const InstanceCard: React.FC<InstanceCardProps> = ({
  instance,
  onConnect,
  onDisconnect,
  onReconnect,
  onDelete,
  onShowQR,
  onOpenLinks,
  isAction,
}) => {
  const config = STATUS_CONFIG[instance.status] || STATUS_CONFIG.disconnected;
  const StatusIcon = config.icon;
  const isConnecting = instance.status === 'connecting';
  const isConnected = instance.status === 'connected';
  const needsQR = instance.status === 'qr_pending';

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 transition-all hover:shadow-md ${
      isConnected ? 'border-l-4 border-l-emerald-500' :
      needsQR ? 'border-l-4 border-l-blue-500' :
      instance.status === 'logged_out' ? 'border-l-4 border-l-red-400' : ''
    }`}>
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status + Info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full ${config.bgColor} ring-2 ${config.ring} flex items-center justify-center shrink-0`}>
            <StatusIcon
              size={18}
              className={`${config.textColor} ${isConnecting ? 'animate-spin' : ''}`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 truncate">{instance.name}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.bgColor} ${config.textColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
                {config.label}
              </span>
            </div>
            {instance.description && (
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">{instance.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5">
              {instance.phoneNumber && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                  <Phone size={10} />
                  +{instance.phoneNumber}
                </span>
              )}
              {instance.lastConnectedAt && (
                <span className="text-[10px] text-slate-400">
                  Última conexão: {new Date(instance.lastConnectedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {needsQR && (
            <button
              onClick={() => onShowQR(instance)}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-700 transition-all shadow-sm"
              title="Mostrar QR Code"
            >
              <QrCode size={13} />
              QR Code
            </button>
          )}

          {instance.status === 'disconnected' && (
            <button
              onClick={() => onConnect(instance.id)}
              disabled={isConnecting}
              className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-sm"
            >
              <Wifi size={13} />
              Conectar
            </button>
          )}

          {isConnected && (
            <button
              onClick={() => onReconnect(instance.id)}
              className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all"
              title="Reconectar"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {(isConnected || instance.status === 'connecting') && (
            <button
              onClick={() => onDisconnect(instance.id)}
              className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all"
              title="Desconectar"
            >
              <Unplug size={13} />
            </button>
          )}

          <button
            onClick={() => onOpenLinks(instance)}
            className="flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all"
            title="Vínculos com serviços"
          >
            <Link2 size={13} />
          </button>

          <button
            onClick={() => {
              if (confirm(`Remover instância "${instance.name}"? Todos os dados serão apagados.`)) {
                onDelete(instance.id);
              }
            }}
            className="flex items-center gap-1 bg-red-50 text-red-400 px-2 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-100 hover:text-red-600 transition-all"
            title="Excluir"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
