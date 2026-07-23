import React, { useState, useEffect } from 'react';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { CompaniesView } from './components/crm/CompaniesView';
import { ContactsView } from './components/contacts/ContactsView';
import { KanbanView } from './components/kanban/KanbanView';
import { ProspectingView } from './components/prospecting/ProspectingView';
import { WhatsAppView } from './components/whatsapp/WhatsAppView';
import { AutomationsView } from './components/automations/AutomationsView';
import { AICenterView } from './components/aios/AICenterView';
import { AgendaView } from './components/agenda/AgendaView';
import { TeamView } from './components/team/TeamView';
import { ReportsView } from './components/reports/ReportsView';
import { EnrichmentModal } from './components/enrichment/EnrichmentModal';
import { NewDealModal } from './components/modals/NewDealModal';
import { NewCompanyModal } from './components/modals/NewCompanyModal';
import { NewContactModal } from './components/modals/NewContactModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { supabase } from './lib/supabase';

import {
  INITIAL_STAGES,
  INITIAL_SALES_REPS,
  INITIAL_AUTOMATIONS
} from './data/mockData';

import { Company, Deal, SalesRep, TaskActivity, ProspectingResultItem, LeadStageId, AutomationFlow } from './types';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ErrorBoundary>
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        </ErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  );
}

function AppContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Hydrated State from Supabase
  const [stages] = useState(INITIAL_STAGES); // Keep stages static for now
  const [reps, setReps] = useState<SalesRep[]>(INITIAL_SALES_REPS);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<TaskActivity[]>([]);
  const [automations, setAutomations] = useState<AutomationFlow[]>(INITIAL_AUTOMATIONS);

  // Modals
  const [enrichmentCompany, setEnrichmentCompany] = useState<Company | null>(null);
  const [showNewDealModal, setShowNewDealModal] = useState(false);
  const [showNewCompanyModal, setShowNewCompanyModal] = useState(false);
  const [showNewContactModal, setShowNewContactModal] = useState(false);

  // Load Data on Mount
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const [compRes, dealRes, contRes, taskRes] = await Promise.all([
        supabase.from('companies').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('contacts').select('*').order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').order('created_at', { ascending: false })
      ]);

      if (compRes.data) {
        const mappedCompanies = compRes.data.map(c => ({
          ...c,
          nomeFantasia: c.nome_fantasia,
          razaoSocial: c.razao_social,
          scoreComercial: c.score_comercial,
          ratingGMB: c.rating_gmb,
          reviewsCountGMB: c.reviews_count_gmb,
          placeIdGMB: c.place_id_gmb,
          cnaePrincipal: { code: c.cnae_code, text: c.cnae_text },
        }));
        setCompanies(mappedCompanies as any);
      }
      if (dealRes.data) {
        // Map snake_case to camelCase for the UI if needed
        const mappedDeals = dealRes.data.map(d => ({
          ...d,
          companyId: d.company_id,
          companyName: d.company_name,
          stageId: d.stage_id,
          expectedRevenue: d.expected_revenue,
          contactName: d.contact_name,
          contactWhatsApp: d.contact_whatsapp,
          contactEmail: d.contact_email,
        }));
        setDeals(mappedDeals as any);
      }
      if (contRes.data) setContacts(contRes.data as any);
      if (taskRes.data) setTasks(taskRes.data as any);
    }
    loadData();
  }, [user]);

  // Handlers
  const handleMoveDeal = async (dealId: string, newStageId: LeadStageId, winReason?: string, lossReason?: string) => {
    // Optimistic UI Update
    setDeals((prev) =>
      prev.map((d) => d.id === dealId ? { ...d, stageId: newStageId, winReason, lossReason } : d)
    );
    
    // Supabase Update
    const { error } = await supabase.from('deals').update({
      stage_id: newStageId,
      win_reason: winReason,
      loss_reason: lossReason
    }).eq('id', dealId);

    if (error) toast({ title: 'Erro ao mover negócio', description: error.message, variant: 'destructive' });
  };

  const handleImportProspectingCompany = async (item: ProspectingResultItem, autoEnrich: boolean) => {
    if (!user) return;
    
    const dbCompany = {
      user_id: user.id,
      razao_social: item.nomeEmpresa + ' LTDA',
      nome_fantasia: item.nomeEmpresa,
      cnpj: `temp-${Date.now()}`,
      situacao: 'ATIVA',
      cnae_code: '0000-0/00',
      cnae_text: item.categoria,
      capital_social: 0,
      fundacao: new Date().toISOString().split('T')[0],
      porte: 'EPP',
      natureza_juridica: 'N/A',
      endereco: {
        logradouro: item.endereco,
        cidade: item.cidade,
        estado: item.estado,
        lat: item.lat,
        lng: item.lng
      },
      website: item.website,
      telefones: [item.telefone],
      emails: [`contato@temp.com`],
      observacoes: 'Lead importado via Prospecção Google Meu Negócio.',
      tags: ['Google Meu Negócio', item.categoria],
      enriched: autoEnrich,
      score_comercial: 80,
      rating_gmb: item.rating,
      reviews_count_gmb: item.reviewsCount,
      place_id_gmb: item.googlePlaceId,
    };

    const { data: insertedComp, error: errComp } = await supabase.from('companies').insert(dbCompany).select().single();

    if (errComp || !insertedComp) {
       toast({ title: 'Erro', description: errComp?.message, variant: 'destructive' });
       return;
    }

    // Convert to frontend model
    setCompanies(prev => [insertedComp as any, ...prev]);

    // Also auto create opportunity in Prospecting stage
    const dbDeal = {
      user_id: user.id,
      company_id: insertedComp.id,
      company_name: insertedComp.nome_fantasia,
      title: `Contrato Prospecção GMB - ${insertedComp.nome_fantasia}`,
      value: 0,
      probability: 20,
      expected_revenue: 0,
      stage_id: 'prospecting',
      assigned_to: 'rep-1',
      contact_whatsapp: item.telefone,
      priority: 'high',
      tags: ['Prospecção GMB'],
    };

    const { data: insertedDeal, error: errDeal } = await supabase.from('deals').insert(dbDeal).select().single();
    if (!errDeal && insertedDeal) {
      setDeals(prev => [{...insertedDeal, stageId: insertedDeal.stage_id, companyId: insertedDeal.company_id} as any, ...prev]);
    }

    toast({ title: 'Empresa importada', description: `${item.nomeEmpresa} salva no banco de dados.` });

    if (autoEnrich) {
      setEnrichmentCompany(insertedComp as any);
    }
  };

  const handleCompleteEnrichment = async (updatedCompany: Company) => {
    // Optimistic
    setCompanies((prev) => prev.map((c) => (c.id === updatedCompany.id ? updatedCompany : c)));
    
    // Update Supabase
    await supabase.from('companies').update({
       enriched: true,
       emails: updatedCompany.emails,
       telefones: updatedCompany.telefones,
       tech_stack: updatedCompany.techStack
    }).eq('id', updatedCompany.id);

    toast({ title: 'Enriquecimento concluído', description: `Dados salvos.` });
  };

  const handleToggleAutomation = (id: string) => {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a)));
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if(!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
  };

  const handleOpenWhatsAppChat = (phone: string, name: string) => {
    setActiveTab('whatsapp');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased selection:bg-blue-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        unreadWhatsApp={0}
      />

      <Header
        collapsed={sidebarCollapsed}
        setActiveTab={setActiveTab}
        onOpenNewDealModal={() => setShowNewDealModal(true)}
        onOpenProspectingModal={() => setActiveTab('prospecting')}
        globalSearchQuery={globalSearchQuery}
        setGlobalSearchQuery={setGlobalSearchQuery}
        unreadCount={0}
      />

      <main className={`pt-20 px-6 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
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
            onGenerateAIPitch={() => setActiveTab('ai_center')}
          />
        )}

        {activeTab === 'prospecting' && (
          <ProspectingView
            onImportCompany={handleImportProspectingCompany}
            existingCompanies={companies}
          />
        )}

        {activeTab === 'whatsapp' && <WhatsAppView />}

        {activeTab === 'automations' && (
          <AutomationsView
            automations={automations}
            onToggleAutomation={handleToggleAutomation}
            onCreateAutomation={(newFlow) => setAutomations((prev) => [newFlow, ...prev])}
          />
        )}

        {activeTab === 'ai_center' && <AICenterView />}

        {activeTab === 'agenda' && (
          <AgendaView
            tasks={tasks}
            onToggleTaskStatus={handleToggleTask}
            onCreateTask={(task) => setTasks((prev) => [task, ...prev])}
          />
        )}

        {activeTab === 'team' && <TeamView reps={reps} deals={deals} onUpdateReps={setReps} />}

        {activeTab === 'reports' && <ReportsView />}
      </main>

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
          onCreateCompany={async (comp) => {
             // Basic Supabase Insert
             if(user) {
                const {data} = await supabase.from('companies').insert({...comp, user_id: user.id}).select().single();
                if(data) setCompanies(prev => [data as any, ...prev]);
             }
          }}
        />
      )}

      {showNewContactModal && (
        <NewContactModal
          companies={companies}
          onClose={() => setShowNewContactModal(false)}
          onCreateContact={async (cnt) => {
             if(user) {
                const {data} = await supabase.from('contacts').insert({...cnt, user_id: user.id}).select().single();
                if(data) setContacts(prev => [data as any, ...prev]);
             }
          }}
        />
      )}
    </div>
  );
}
