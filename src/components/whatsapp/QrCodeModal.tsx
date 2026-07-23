import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, RefreshCw, CheckCheck } from 'lucide-react';
import * as waApi from '../../lib/whatsapp-api';
import type { WhatsAppInstance } from '../../types';

interface QrCodeModalProps {
  instance: WhatsAppInstance;
  onClose: () => void;
  onConnected: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  instance,
  onClose,
  onConnected,
}) => {
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [status, setStatus] = useState(instance.status);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const fetchQr = useCallback(async () => {
    if (closedRef.current) return;
    try {
      const data = await waApi.getQR(instance.id);
      if (closedRef.current) return;

      if (data.status === 'connected') {
        cleanup();
        onConnected();
        return;
      }

      if (data.qr) {
        setQrSvg(data.qr);
        setLastUpdate(new Date());
        setError(null);
        setStatus(data.status);
      }
    } catch (err: any) {
      if (!closedRef.current) {
        setError(err.message || 'Falha ao obter QR code');
      }
    }
  }, [instance.id, cleanup, onConnected]);

  useEffect(() => {
    closedRef.current = false;

    // Immediate fetch
    fetchQr();

    // Poll every 5 seconds
    pollingRef.current = setInterval(fetchQr, 5000);

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      cleanup();
      if (!closedRef.current) {
        setError('QR Code expirado. Feche e reconecte.');
      }
    }, 120000);

    return () => {
      closedRef.current = true;
      cleanup();
    };
  }, [fetchQr, cleanup]);

  const handleClose = () => {
    closedRef.current = true;
    cleanup();
    onClose();
  };

  const handleRefresh = () => {
    setError(null);
    fetchQr();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">QR Code</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{instance.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
          >
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        {/* QR Display */}
        <div className="p-6 flex flex-col items-center">
          {status === 'connected' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <CheckCheck size={28} className="text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-slate-900">Conectado!</p>
              <p className="text-xs text-slate-400 mt-1">WhatsApp conectado com sucesso.</p>
            </div>
          ) : qrSvg ? (
            <div className="relative">
              <div
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                style={{ maxWidth: 256, maxHeight: 256 }}
              />
              {lastUpdate && (
                <p className="text-[9px] text-slate-400 text-center mt-2">
                  Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
                </p>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-xs text-red-500 font-medium">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-3 inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-all"
              >
                <RefreshCw size={12} />
                Tentar Novamente
              </button>
            </div>
          ) : (
            <div className="py-12">
              <Loader2 size={28} className="animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-400 mt-3">Obtendo QR Code...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            Abra o WhatsApp no seu celular → Configurações → Dispositivos conectados → Conectar dispositivo.
            Escaneie o QR code acima.
          </p>
        </div>
      </div>
    </div>
  );
};
