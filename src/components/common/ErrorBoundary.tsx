import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={32} className="text-rose-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Algo deu errado</h2>
        <p className="text-sm text-slate-500 mb-6">
          Ocorreu um erro inesperado. Por favor, tente novamente.
        </p>
        <div className="bg-slate-50 rounded-xl p-3 mb-6 text-left">
          <p className="text-xs font-mono text-slate-600 break-all">
            {error.message}
          </p>
        </div>
        <button
          onClick={onReset}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 mx-auto"
        >
          <RefreshCw size={16} />
          <span>Tentar Novamente</span>
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const handleReset = useCallback(() => {
    setError(null);
    setResetKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      event.preventDefault();
      setError(event.error instanceof Error ? event.error : new Error(String(event.error)));
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, []);

  if (error) {
    if (fallback) return fallback;
    return <DefaultFallback error={error} onReset={handleReset} />;
  }

  return <ErrorCatcher onError={setError} resetKey={resetKey}>{children}</ErrorCatcher>;
}

function ErrorCatcher({ children, onError, resetKey }: { children: ReactNode; onError: (error: Error) => void; resetKey?: number }) {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      onError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, [onError]);

  return <>{children}</>;
}
