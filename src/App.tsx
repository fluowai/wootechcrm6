import React, { useState } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { CompaniesView } from './components/crm/CompaniesView';
import { ContactsView } from './components/contacts/ContactsView';
import { KanbanView } from './components/kanban/KanbanView';
import { ProspectingView } from './components/prospecting/ProspectingView';
import { WhatsAppView } from './components/whatsapp/WhatsAppView';
import { AutomationsView } from './components/automations/AutomationsView';
import { AIAssistantView } from './components/ai/AIAssistantView';
import { AgendaView } from './components/agenda/AgendaView';
import { TeamView } from './components/team/TeamView';
import { ReportsView } from './components/reports/ReportsView';
import { EnrichmentModal } from './components/enrichment/EnrichmentModal';
import { NewDealModal } from './components/modals/NewDealModal';
import { NewCompanyModal } from './components/modals/NewCompanyModal';
import { NewContactModal } from './components/modals/NewContactModal';

import {
  INITIAL_STAGES,
  INITIAL_SALES_REPS,
  INITIAL_COMPANIES,
  INITIAL_CONTACTS,
  INITIAL_DEALS,
  INITIAL_TASKS,
  INITIAL_WHATSAPP_SESSIONS,
  INITIAL_WHATSAPP_CHATS,
  INITIAL_MESSAGES,
  INITIAL_QUICK_REPLIES,
  INITIAL_AUTOMATIONS
} from './data/mockData';

import { Company, Deal, SalesRep, TaskActivity, ProspectingResultItem, LeadStageId, WhatsAppMessage, AutomationFlow } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Hydrated State
  const [stages] = useState(INITIAL_STAGES);
  const [reps, setReps] = useState<SalesRep[]>(INITIAL_SALES_REPS);
  const [companies, setCompanies] = useState<Company[]>(INITIAL_COMPANIES);
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [deals, setDeals] = useState<Deal[]>(INITIAL_DEALS);
  const [tasks, setTasks] = useState<TaskActivity[]>(INITIAL_TASKS);
  const [waSessions] = useState(INITIAL_WHATSAPP_SESSIONS);
  const [waChats, setWaChats] = useState(INITIAL_WHATSAPP_CHATS);
  const [waMessages, setWaMessages] = useState<Record<string, WhatsAppMessage[]>>(INITIAL_MESSAGES);
  const [quickReplies] = useState(INITIAL_QUICK_REPLIES);
  const [automations, setAutomations] = useState<AutomationFlow[]>(INITIAL_AUTOMATIONS);

  // Modals
  const [enrichmentCompany, setEnrichmentCompany] = useState<Company | null>(null);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);

  // Handlers
  const handleMoveDeal = (dealId: string, newStageId: LeadStageId, winReason?: string, lossReason?: string) => {
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id === dealId) {
          return {
            ...d,
            stageId: newStageId,
            winReason: winReason || d.winReason,
            lossReason: lossReason || d.lossReason,
            updatedAt: new Date().toISOString(),
            history: [
              ...d.history,
              {
                id: `h-${Date.now()}`,
                type: 'stage_changed',
                title: 'Mudança de Etapa',
                description: `Avançado para a etapa ${newStageId.toUpperCase()}`,
                author: 'Carlos Andrade',
                createdAt: new Date().toISOString()
              }
            ]
          };
        }
        return d;
      })
    );
  };

  const handleImportProspectingCompany = (item: ProspectingResultItem, autoEnrich: boolean) => {
    const newCompany: Company = {
      id: `comp-gmb-${Date.now()}`,
      razaoSocial: item.nomeEmpresa + ' LTDA',
      nomeFantasia: item.nomeEmpresa,
      cnpj: '11.222.333/0001-99',
      situacao: 'ATIVA',
      cnaePrincipal: { code: '6201-5/01', text: item.categoria },
      capitalSocial: 650000,
      fundacao: '2020-04-10',
      porte: 'EPP',
      naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
      endereco: {
        logradouro: item.endereco,
        numero: '100',
        bairro: 'Centro',
        cidade: item.cidade,
        estado: item.estado,
        cep: '80000-000',
        lat: item.lat,
        lng: item.lng
      },
      website: item.website,
      telefones: [item.telefone],
      emails: [`contato@${item.nomeEmpresa.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.br`],
      observacoes: 'Lead importado via Prospecção Google Meu Negócio.',
      tags: ['Google Meu Negócio', 'Prospecção Ativa', item.categoria],
      enriched: autoEnrich,
      scoreComercial: 88,
      ratingGMB: item.rating,
      reviewsCountGMB: item.reviewsCount,
      placeIdGMB: item.googlePlaceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setCompanies((prev) => [newCompany, ...prev]);

    // Also auto create opportunity in Prospecting stage
    const newDeal: Deal = {
      id: `deal-gmb-${Date.now()}`,
      companyId: newCompany.id,
      companyName: newCompany.nomeFantasia,
      title: `Contrato Prospecção GMB - ${newCompany.nomeFantasia}`,
      value: 24000,
      probability: 40,
      expectedRevenue: 9600,
      stageId: 'prospecting',
      assignedTo: 'rep-1',
      contactName: 'Decisor ' + newCompany.nomeFantasia,
      contactWhatsApp: item.telefone,
      contactEmail: newCompany.emails[0],
      timeInStageDays: 1,
      priority: 'high',
      tags: ['Prospecção GMB'],
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDeals((prev) => [newDeal, ...prev]);

    if (autoEnrich) {
      setEnrichmentCompany(newCompany);
    }
  };

  const handleCompleteEnrichment = (updatedCompany: Company) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c))
    );
  };

  const handleSendWhatsAppMessage = (chatId: string, content: string) => {
    const newMsg: WhatsAppMessage = {
      id: `m-${Date.now()}`,
      chatId,
      sender: 'user',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    setWaMessages((prev) => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg]
    }));

    setWaChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: content,
              lastMessageTimestamp: 'Agora',
              unreadCount: 0
            }
          : chat
      )
    );
  };

  const handleToggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
          : t
      )
    );
  };

  const handleOpenWhatsAppChat = (phone: string, name: string) => {
    setActiveTab('whatsapp');
  };

  const totalUnreadWhatsApp = waChats.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-blue-100">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        unreadWhatsApp={totalUnreadWhatsApp}
      />

      {/* Top Header */}
      <Header
        collapsed={sidebarCollapsed}
        setActiveTab={setActiveTab}
        onOpenNewDealModal={() => setShowNewDealModal(true)}
        onOpenProspectingModal={() => setActiveTab('prospecting')}
        globalSearchQuery={globalSearchQuery}
        setGlobalSearchQuery={setGlobalSearchQuery}
        unreadCount={totalUnreadWhatsApp}
      />

      {/* Main View Area */}
      <main
        className={`pt-20 px-6 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        {activeTab === 'dashboard' && (
          <DashboardView
            deals={deals}
            tasks={tasks}
            reps={reps}
            companies={companies}
            onNavigateToKanban={() => setActiveTab('kanban')}
            onNavigateToProspecting={() => setActiveTab('prospecting')}
            onNavigateToWhatsApp={() => setActiveTab('whatsapp')}
          />
        )}

        {activeTab === 'companies' && (
          <CompaniesView
            companies={companies}
            onOpenEnrichmentModal={(comp) => setEnrichmentCompany(comp)}
            onOpenNewCompanyModal={() => setShowNewCompanyModal(true)}
            onSelectCompany={() => {}}
          />
        )}

        {activeTab === 'contacts' && (
          <ContactsView
            contacts={contacts}
            onOpenNewContactModal={() => setShowNewContactModal(true)}
            onOpenWhatsAppChat={handleOpenWhatsAppChat}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanView
            stages={stages}
            deals={deals}
            reps={reps}
            onMoveDeal={handleMoveDeal}
            onOpenNewDealModal={() => setShowNewDealModal(true)}
            onOpenWhatsAppChat={handleOpenWhatsAppChat}
            onGenerateAIPitch={() => setActiveTab('ai_assistant')}
          />
        )}

        {activeTab === 'prospecting' && (
          <ProspectingView
            onImportCompany={handleImportProspectingCompany}
            existingCompanies={companies}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppView
            sessions={waSessions}
            chats={waChats}
            messages={waMessages}
            quickReplies={quickReplies}
            onSendMessage={handleSendWhatsAppMessage}
          />
        )}

        {activeTab === 'automations' && (
          <AutomationsView
            automations={automations}
            onToggleAutomation={handleToggleAutomation}
            onCreateAutomation={(newFlow) => setAutomations((prev) => [newFlow, ...prev])}
          />
        )}

        {activeTab === 'ai_assistant' && <AIAssistantView />}

        {activeTab === 'agenda' && (
          <AgendaView
            tasks={tasks}
            onToggleTaskStatus={handleToggleTask}
            onCreateTask={(task) => setTasks((prev) => [task, ...prev])}
          />
        )}

        {activeTab === 'team' && (
          <TeamView
            reps={reps}
            deals={deals}
            onUpdateReps={(updated) => setReps(updated)}
          />
        )}

        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Global Modals */}
      {enrichmentCompany && (
        <EnrichmentModal
          company={enrichmentCompany}
          onClose={() => setEnrichmentCompany(null)}
          onCompleteEnrichment={handleCompleteEnrichment}
        />
      )}

      {showNewDealModal && (
        <NewDealModal
          companies={companies}
          reps={reps}
          onClose={() => setShowNewDealModal(false)}
          onCreateDeal={(deal) => setDeals((prev) => [deal, ...prev])}
        />
      )}

      {showNewCompanyModal && (
        <NewCompanyModal
          onClose={() => setShowNewCompanyModal(false)}
          onCreateCompany={(comp) => setCompanies((prev) => [comp, ...prev])}
        />
      )}

      {showNewContactModal && (
        <NewContactModal
          companies={companies}
          onClose={() => setShowNewContactModal(false)}
          onCreateContact={(cnt) => setContacts((prev) => [cnt, ...prev])}
        />
      )}
    </div>
  );
}
