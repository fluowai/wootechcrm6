import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { Contact } from '../../types';

interface ContactsViewProps {
  contacts: Contact[];
  onOpenNewContactModal: () => void;
  onOpenWhatsAppChat: (phone: string, name: string) => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  onOpenNewContactModal,
  onOpenWhatsAppChat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyDecisors, setOnlyDecisors] = useState(false);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (onlyDecisors) return matchesSearch && c.isDecisionMaker;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <span>Contatos & Decisores Mapeados</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mapeamento de executivos, sócios, diretores e compradores nas empresas prospectadas.
          </p>
        </div>

        <button
          onClick={onOpenNewContactModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
        >
          <Plus size={15} />
          <span>Novo Contato</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nome, Cargo ou Empresa..."
            className="w-full bg-slate-50 text-slate-800 text-xs rounded-lg pl-9 pr-3 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
            <input
              type="checkbox"
              checked={onlyDecisors}
              onChange={(e) => setOnlyDecisors(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Apenas Decisores (Sócios / Diretores)</span>
          </label>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Nome & Cargo</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Contato Direct</th>
                <th className="p-4">Decisor?</th>
                <th className="p-4">Tags</th>
                <th className="p-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{contact.name}</div>
                    <div className="text-[11px] text-blue-700 font-medium">{contact.role} • {contact.department}</div>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      <span>{contact.companyName}</span>
                    </div>
                  </td>

                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                      <MessageSquare size={13} />
                      <span>{contact.whatsApp}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                      <Mail size={13} />
                      <span>{contact.email}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    {contact.isDecisionMaker ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 size={12} />
                        Decisor
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                        Operacional
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => onOpenWhatsAppChat(contact.whatsApp, contact.name)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition-all"
                    >
                      <MessageSquare size={14} />
                      <span>WhatsApp</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
