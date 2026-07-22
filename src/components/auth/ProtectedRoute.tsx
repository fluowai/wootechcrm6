import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginView } from './LoginView';
import { SignUpView } from './SignUpView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

type AuthView = 'login' | 'signup' | 'forgot-password';

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = React.useState<AuthView>('login');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Carregando Wootech CRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    switch (authView) {
      case 'signup':
        return <SignUpView onSwitchToLogin={() => setAuthView('login')} />;
      case 'forgot-password':
        return <ForgotPasswordView onBackToLogin={() => setAuthView('login')} />;
      default:
        return (
          <LoginView
            onSwitchToSignUp={() => setAuthView('signup')}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
  }

  return <>{children}</>;
};
