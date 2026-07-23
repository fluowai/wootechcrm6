import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Kanban,
  Search,
  MessageSquare,
  Zap,
  Brain,
  Calendar,
  UserCheck,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'companies'
  | 'contacts'
  | 'kanban'
  | 'prospecting'
  | 'whatsapp'
  | 'automations'
  | 'ai_center'
  | 'agenda'
  | 'team'
  | 'reports';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  unreadWhatsApp: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  unreadWhatsApp,
}) => {
  const menuItems: { id: ActiveTab; label: string; icon: React.ComponentType<any>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kanban', label: 'Pipeline (Kanban)', icon: Kanban },
    { id: 'companies', label: 'CRM Empresas', icon: Building2 },
    { id: 'contacts', label: 'Contatos & Decisores', icon: Users },
    { id: 'prospecting', label: 'Prospecção GMB', icon: Search },
    { id: 'whatsapp', label: 'WhatsApp Inbox', icon: MessageSquare, badge: unreadWhatsApp },
    { id: 'automations', label: 'Automações (n8n)', icon: Zap },
    { id: 'ai_center', label: 'AI Center', icon: Brain },
    { id: 'agenda', label: 'Agenda & Tarefas', icon: Calendar },
    { id: 'team', label: 'Equipe & Metas', icon: UserCheck },
    { id: 'reports', label: 'Relatórios & BI', icon: BarChart3 },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-30 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-blue-500/30">
              W
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-none flex items-center gap-1.5">
                Wootech <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-200">CRM</span>
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Inteligência Comercial B2B</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            W
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              {!collapsed && <span className="truncate flex-1 text-left">{item.label}</span>}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white text-blue-600' : 'bg-emerald-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Status Box */}
      <div className="p-3 border-t border-slate-200">
        {!collapsed ? (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Whatsmeow Engine
              </span>
              <ShieldCheck size={14} className="text-emerald-600" />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-1.5 font-medium">
              <span className="flex items-center gap-1">
                <Cpu size={12} className="text-blue-600" /> IA Gemini 3.6
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">Ativa</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Whatsmeow On-Premise Ativo" />
          </div>
        )}
      </div>
    </aside>
  );
};
