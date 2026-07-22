import React from 'react';
import { Search, Plus, Bell, MessageSquare, ShieldCheck } from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface HeaderProps {
  collapsed: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewDealModal: () => void;
  onOpenProspectingModal: () => void;
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  unreadCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  collapsed,
  setActiveTab,
  onOpenNewDealModal,
  onOpenProspectingModal,
  globalSearchQuery,
  setGlobalSearchQuery,
  unreadCount
}) => {
  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-slate-200 z-20 flex items-center justify-between px-6 transition-all duration-300 ${
        collapsed ? 'left-16' : 'left-64'
      }`}
    >
      {/* Global Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            placeholder="Buscar empresa, CNPJ, contato ou oportunidade..."
            className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Quick Actions & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick New Lead Button */}
        <button
          onClick={onOpenProspectingModal}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
        >
          <Search size={14} className="text-blue-600" />
          <span>Prospecção GMB</span>
        </button>

        <button
          onClick={onOpenNewDealModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/20 transition-all"
        >
          <Plus size={15} />
          <span>Nova Oportunidade</span>
        </button>

        {/* WhatsApp Quick Inbox Jump */}
        <button
          onClick={() => setActiveTab('whatsapp')}
          className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          title="Abrir WhatsApp Inbox"
        >
          <MessageSquare size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-blue-600" />
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
            alt="Carlos Andrade"
            className="w-8 h-8 rounded-full border border-slate-200 object-cover"
          />
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">Carlos Andrade</p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Closer Senior</p>
          </div>
        </div>
      </div>
    </header>
  );
};
