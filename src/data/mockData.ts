import { Stage, Company, Contact, Deal, TaskActivity, SalesRep, WhatsAppSession, WhatsAppChat, WhatsAppMessage, QuickReply, AutomationFlow } from '../types';

export const INITIAL_STAGES: Stage[] = [
  { id: 'prospecting', name: 'Prospecção', color: 'bg-slate-100 text-slate-700 border-slate-300', order: 1, slaHours: 24 },
  { id: 'first_contact', name: 'Primeiro Contato', color: 'bg-blue-50 text-blue-700 border-blue-200', order: 2, slaHours: 48 },
  { id: 'meeting_scheduled', name: 'Reunião Agendada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', order: 3, slaHours: 72 },
  { id: 'proposal_sent', name: 'Proposta Enviada', color: 'bg-amber-50 text-amber-700 border-amber-200', order: 4, slaHours: 96 },
  { id: 'negotiation', name: 'Em Negociação', color: 'bg-sky-50 text-sky-700 border-sky-200', order: 5, slaHours: 120 },
  { id: 'won', name: 'Fechado (Ganho)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', order: 6, slaHours: 0 },
  { id: 'lost', name: 'Perdido', color: 'bg-rose-50 text-rose-700 border-rose-200', order: 7, slaHours: 0 },
];

export const INITIAL_SALES_REPS: SalesRep[] = [
  {
    id: 'rep-1',
    name: 'Carlos Andrade',
    email: 'carlos.andrade@wootech.com.br',
    role: 'closer',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    goalValue: 180000,
    closedValue: 142500,
    commissionRate: 5,
    activeDealsCount: 14,
    conversionRate: 32.4,
  },
  {
    id: 'rep-2',
    name: 'Fernanda Lima',
    email: 'fernanda.lima@wootech.com.br',
    role: 'sdr',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
    goalValue: 120000,
    closedValue: 98000,
    commissionRate: 4,
    activeDealsCount: 22,
    conversionRate: 28.1,
  },
  {
    id: 'rep-3',
    name: 'Roberto Mendes',
    email: 'roberto.mendes@wootech.com.br',
    role: 'bdr',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    goalValue: 150000,
    closedValue: 115000,
    commissionRate: 4.5,
    activeDealsCount: 18,
    conversionRate: 25.6,
  },
  {
    id: 'rep-4',
    name: 'Juliana Castro',
    email: 'juliana.castro@wootech.com.br',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    goalValue: 200000,
    closedValue: 189000,
    commissionRate: 6,
    activeDealsCount: 11,
    conversionRate: 41.2,
  },
];

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-1',
    razaoSocial: 'TECHLOG SOLUCOES EM LOGISTICA LTDA',
    nomeFantasia: 'TechLog Brasil',
    cnpj: '12.345.678/0001-90',
    situacao: 'ATIVA',
    cnaePrincipal: { code: '4930-2/02', text: 'Transporte rodoviário de carga, exceto produtos perigosos' },
    cnaesSecundarios: [
      { code: '5211-7/99', text: 'Depósitos de mercadorias para terceiros' },
      { code: '6201-5/01', text: 'Desenvolvimento de programas de computador sob encomenda' }
    ],
    capitalSocial: 1500000,
    fundacao: '2016-04-12',
    porte: 'EPP',
    naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
    endereco: {
      logradouro: 'Av. das Indústrias',
      numero: '1450',
      bairro: 'CIC',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '81000-000',
      lat: -25.4372,
      lng: -49.2700
    },
    website: 'https://www.techlogbrasil.com.br',
    instagram: '@techlogbrasil',
    linkedIn: 'linkedin.com/company/techlog-brasil',
    telefones: ['(41) 3344-8800', '(41) 99887-1122'],
    emails: ['contato@techlogbrasil.com.br', 'comercial@techlogbrasil.com.br'],
    observacoes: 'Empresa em expansão de frota, buscando automação comercial e integração de frota com CRM.',
    tags: ['Logística', 'Prospecção Ativa', 'Prioridade Alta', 'Curitiba'],
    enriched: true,
    scoreComercial: 92,
    ratingGMB: 4.8,
    reviewsCountGMB: 124,
    placeIdGMB: 'ChIJz9_xS9y335QR4x71aL2_9',
    techStack: [
      { name: 'Google Tag Manager', category: 'analytics' },
      { name: 'Meta Pixel', category: 'advertising' },
      { name: 'WordPress', category: 'cms' },
      { name: 'HubSpot Marketing', category: 'crm' }
    ],
    decisionMakers: [
      { id: 'dec-1', name: 'Marcos Vinicius Silva', role: 'Sócio-Diretor', department: 'Diretoria Executiva', whatsApp: '(41) 99887-1122', email: 'marcos.silva@techlogbrasil.com.br', linkedIn: 'linkedin.com/in/marcos-v-silva', isLegalRepresentative: true },
      { id: 'dec-2', name: 'Renata Albuquerque', role: 'Gerente Comercial', department: 'Vendas', whatsApp: '(41) 99123-4455', email: 'renata.albuquerque@techlogbrasil.com.br', isLegalRepresentative: false }
    ],
    createdAt: '2026-06-10T10:00:00Z',
    updatedAt: '2026-07-20T14:30:00Z'
  },
  {
    id: 'comp-2',
    razaoSocial: 'CLINICA ODONTOPRIME MEDICINA E ODONTOLOGIA LTDA',
    nomeFantasia: 'OdontoPrime Especialidades',
    cnpj: '98.765.432/0001-11',
    situacao: 'ATIVA',
    cnaePrincipal: { code: '8630-5/04', text: 'Atividade odontológica' },
    capitalSocial: 450000,
    fundacao: '2019-08-25',
    porte: 'ME',
    naturezaJuridica: '206-2 - Sociedade Empresária Limitada',
    endereco: {
      logradouro: 'Rua Bocaiúva',
      numero: '620',
      bairro: 'Centro',
      cidade: 'Florianópolis',
      estado: 'SC',
      cep: '88015-530',
      lat: -27.5948,
      lng: -48.5482
    },
    website: 'https://www.odontoprimefloripa.com.br',
    instagram: '@odontoprime.sc',
    telefones: ['(48) 3222-9911', '(48) 99112-3344'],
    emails: ['recepcao@odontoprimefloripa.com.br'],
    observacoes: 'Rede de 3 clínicas com alto volume de captação de pacientes via Instagram e WhatsApp.',
    tags: ['Saúde', 'GMB Alta Nota', 'Atendimento WhatsApp', 'Florianópolis'],
    enriched: true,
    scoreComercial: 85,
    ratingGMB: 4.9,
    reviewsCountGMB: 310,
    placeIdGMB: 'ChIJX99b87zScG0R9xL_1a2_0',
    techStack: [
      { name: 'Google Analytics 4', category: 'analytics' },
      { name: 'Meta Pixel', category: 'advertising' },
      { name: 'Elementor', category: 'cms' }
    ],
    decisionMakers: [
      { id: 'dec-3', name: 'Dr. Fernando Guimarães', role: 'Proprietário & Diretor Clínico', department: 'Diretoria', whatsApp: '(48) 99112-3344', email: 'drfernando@odontoprimefloripa.com.br', isLegalRepresentative: true }
    ],
    createdAt: '2026-06-15T11:20:00Z',
    updatedAt: '2026-07-21T09:15:00Z'
  },
  {
    id: 'comp-3',
    razaoSocial: 'CONSTRUTORA VANGUARDA ENGENHARIA E CONSTRUCAO S/A',
    nomeFantasia: 'Vanguarda Engenharia',
    cnpj: '45.112.890/0001-33',
    situacao: 'ATIVA',
    cnaePrincipal: { code: '4120-4/00', text: 'Construção de edifícios' },
    capitalSocial: 12000000,
    fundacao: '2010-02-18',
    porte: 'DEMAIS',
    naturezaJuridica: '205-4 - Sociedade Anônima Fechada',
    endereco: {
      logradouro: 'Av. Brigadeiro Faria Lima',
      numero: '2900',
      bairro: 'Itaim Bibi',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '01451-000',
      lat: -23.5823,
      lng: -46.6833
    },
    website: 'https://www.vanguardaeng.com.br',
    linkedIn: 'linkedin.com/company/vanguarda-engenharia',
    telefones: ['(11) 3090-4000', '(11) 98877-6655'],
    emails: ['comercial@vanguardaeng.com.br', 'suprimentos@vanguardaeng.com.br'],
    observacoes: 'Grande construtora corporativa. Lançamento de 2 novos empreendimentos comerciais.',
    tags: ['Construção Civil', 'Corporativo', 'São Paulo', 'Empresa de Grande Porte'],
    enriched: true,
    scoreComercial: 95,
    ratingGMB: 4.6,
    reviewsCountGMB: 88,
    placeIdGMB: 'ChIJy99_v8_SzpQR8811zX',
    techStack: [
      { name: 'Google Tag Manager', category: 'analytics' },
      { name: 'Salesforce', category: 'crm' },
      { name: 'Pardot', category: 'marketing' }
    ],
    decisionMakers: [
      { id: 'dec-4', name: 'Eng. Henrique Fonseca', role: 'Diretor de Operações (COO)', department: 'Operações', whatsApp: '(11) 98877-6655', email: 'hfonseca@vanguardaeng.com.br', isLegalRepresentative: true }
    ],
    createdAt: '2026-06-20T14:00:00Z',
    updatedAt: '2026-07-22T11:00:00Z'
  },
  {
    id: 'comp-4',
    razaoSocial: 'SILVEIRA E ADVOGADOS ASSOCIADOS CONSULTORIA JURIDICA',
    nomeFantasia: 'Silveira Advogados',
    cnpj: '33.445.556/0001-77',
    situacao: 'ATIVA',
    cnaePrincipal: { code: '6911-7/01', text: 'Serviços advocatícios' },
    capitalSocial: 800000,
    fundacao: '2014-11-05',
    porte: 'ME',
    naturezaJuridica: '223-2 - Sociedade Simples Pura',
    endereco: {
      logradouro: 'Av. Agamenon Magalhães',
      numero: '4300',
      bairro: 'Espinheiro',
      cidade: 'Recife',
      estado: 'PE',
      cep: '52020-000',
      lat: -8.0476,
      lng: -34.8941
    },
    website: 'https://www.silveiraadvocacia.com.br',
    telefones: ['(81) 3131-7700'],
    emails: ['atendimento@silveiraadvocacia.com.br'],
    observacoes: 'Boutique jurídica B2B focada em contencioso tributário e reorganização societária.',
    tags: ['Jurídico', 'Direito Tributário', 'Recife'],
    enriched: false,
    scoreComercial: 78,
    createdAt: '2026-07-01T16:00:00Z',
    updatedAt: '2026-07-01T16:00:00Z'
  }
];

export const INITIAL_CONTACTS: Contact[] = [
  {
    id: 'cnt-1',
    companyId: 'comp-1',
    companyName: 'TechLog Brasil',
    name: 'Marcos Vinicius Silva',
    role: 'Sócio-Diretor',
    department: 'Diretoria Executiva',
    whatsApp: '(41) 99887-1122',
    phone: '(41) 3344-8800',
    email: 'marcos.silva@techlogbrasil.com.br',
    linkedIn: 'linkedin.com/in/marcos-v-silva',
    birthday: '1982-05-14',
    observacoes: 'Decisor final para compras de software e tecnologia.',
    tags: ['Decisor', 'VIP', 'Sócio'],
    isDecisionMaker: true,
  },
  {
    id: 'cnt-2',
    companyId: 'comp-1',
    companyName: 'TechLog Brasil',
    name: 'Renata Albuquerque',
    role: 'Gerente Comercial',
    department: 'Vendas',
    whatsApp: '(41) 99123-4455',
    email: 'renata.albuquerque@techlogbrasil.com.br',
    observacoes: 'Validará o fluxo de automação comercial e relatórios de pipeline.',
    tags: ['Infuenciador', 'Vendas'],
    isDecisionMaker: false,
  },
  {
    id: 'cnt-3',
    companyId: 'comp-2',
    companyName: 'OdontoPrime Especialidades',
    name: 'Dr. Fernando Guimarães',
    role: 'Proprietário',
    department: 'Diretoria',
    whatsApp: '(48) 99112-3344',
    email: 'drfernando@odontoprimefloripa.com.br',
    birthday: '1979-11-20',
    observacoes: 'Interessado na integração nativa com WhatsApp e distribuição de leads.',
    tags: ['Decisor', 'Saúde'],
    isDecisionMaker: true,
  },
  {
    id: 'cnt-4',
    companyId: 'comp-3',
    companyName: 'Vanguarda Engenharia',
    name: 'Henrique Fonseca',
    role: 'COO',
    department: 'Operações',
    whatsApp: '(11) 98877-6655',
    email: 'hfonseca@vanguardaeng.com.br',
    linkedIn: 'linkedin.com/in/henriquefonseca-eng',
    observacoes: 'Apresentação de proposta agendada com diretores de compras.',
    tags: ['Decisor', 'Corporativo'],
    isDecisionMaker: true,
  },
];

export const INITIAL_DEALS: Deal[] = [
  {
    id: 'deal-101',
    companyId: 'comp-1',
    companyName: 'TechLog Brasil',
    title: 'Implementação Wootech CRM Enterprise + Whatsmeow Multi-User',
    value: 48000,
    probability: 80,
    expectedRevenue: 38400,
    stageId: 'negotiation',
    assignedTo: 'rep-1',
    contactName: 'Marcos Vinicius Silva',
    contactWhatsApp: '(41) 99887-1122',
    contactEmail: 'marcos.silva@techlogbrasil.com.br',
    timeInStageDays: 3,
    priority: 'high',
    tags: ['Enterprise', 'Whatsmeow', 'Automação'],
    history: [
      { id: 'h1', type: 'created', title: 'Oportunidade Criada', description: 'Oportunidade originada de prospecção ativa via GMB Curitiba', author: 'Carlos Andrade', createdAt: '2026-07-02T10:00:00Z' },
      { id: 'h2', type: 'stage_changed', title: 'Mudança de Etapa', description: 'Avançado de Reunião Agendada para Proposta Enviada', author: 'Carlos Andrade', createdAt: '2026-07-10T14:00:00Z' },
      { id: 'h3', type: 'whatsapp_sent', title: 'Proposta Enviada via WhatsApp', description: 'Enviado link da proposta comercial R$ 48.000 em 12x', author: 'Carlos Andrade', createdAt: '2026-07-15T16:20:00Z' }
    ],
    createdAt: '2026-07-02T10:00:00Z',
    updatedAt: '2026-07-22T08:30:00Z'
  },
  {
    id: 'deal-102',
    companyId: 'comp-2',
    companyName: 'OdontoPrime Especialidades',
    title: 'Plano Pro 5 Licenças + Enriquecimento Automático',
    value: 18500,
    probability: 60,
    expectedRevenue: 11100,
    stageId: 'proposal_sent',
    assignedTo: 'rep-2',
    contactName: 'Dr. Fernando Guimarães',
    contactWhatsApp: '(48) 99112-3344',
    contactEmail: 'drfernando@odontoprimefloripa.com.br',
    timeInStageDays: 2,
    priority: 'medium',
    tags: ['Prospecção Clínica', 'Recorrência'],
    history: [
      { id: 'h4', type: 'created', title: 'Inbound Lead', description: 'SDR Fernanda agendou demo após campanha de prospecção', author: 'Fernanda Lima', createdAt: '2026-07-08T11:00:00Z' }
    ],
    createdAt: '2026-07-08T11:00:00Z',
    updatedAt: '2026-07-21T15:00:00Z'
  },
  {
    id: 'deal-103',
    companyId: 'comp-3',
    companyName: 'Vanguarda Engenharia',
    title: 'Licenciamento Anual Wootech + Módulo Inteligência de Decisores',
    value: 125000,
    probability: 40,
    expectedRevenue: 50000,
    stageId: 'meeting_scheduled',
    assignedTo: 'rep-4',
    contactName: 'Henrique Fonseca',
    contactWhatsApp: '(11) 98877-6655',
    contactEmail: 'hfonseca@vanguardaeng.com.br',
    timeInStageDays: 1,
    priority: 'urgent',
    tags: ['Ticket Alto', 'São Paulo', 'SaaS On-Premise'],
    history: [
      { id: 'h5', type: 'created', title: 'Prospecção B2B', description: 'Qualificado pelo BDR Roberto Mendes', author: 'Roberto Mendes', createdAt: '2026-07-18T09:00:00Z' }
    ],
    createdAt: '2026-07-18T09:00:00Z',
    updatedAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'deal-104',
    companyId: 'comp-4',
    companyName: 'Silveira Advogados',
    title: 'Prospecção Ativa Jurídica e Disparo Válido WhatsApp',
    value: 12000,
    probability: 20,
    expectedRevenue: 2400,
    stageId: 'first_contact',
    assignedTo: 'rep-3',
    contactName: 'Dr. Silveira',
    contactWhatsApp: '(81) 3131-7700',
    contactEmail: 'atendimento@silveiraadvocacia.com.br',
    timeInStageDays: 5,
    priority: 'low',
    tags: ['Advocacia', 'Nordeste'],
    history: [],
    createdAt: '2026-07-15T14:00:00Z',
    updatedAt: '2026-07-17T11:00:00Z'
  }
];

export const INITIAL_TASKS: TaskActivity[] = [
  {
    id: 'task-1',
    dealId: 'deal-101',
    companyId: 'comp-1',
    title: 'Reunião de Fechamento de Contrato com Marcos',
    type: 'meeting',
    scheduledAt: '2026-07-23T14:00:00Z',
    status: 'pending',
    notes: 'Apresentar minuta do contrato e tirar dúvidas da equipe de TI sobre Whatsmeow.',
    assignedTo: 'rep-1'
  },
  {
    id: 'task-2',
    dealId: 'deal-102',
    companyId: 'comp-2',
    title: 'Follow-up de Proposta Comercial',
    type: 'followup',
    scheduledAt: '2026-07-22T16:30:00Z',
    status: 'pending',
    notes: 'Confirmar se o Dr. Fernando leu o escopo de enriquecimento de decisores.',
    assignedTo: 'rep-2'
  },
  {
    id: 'task-3',
    dealId: 'deal-103',
    companyId: 'comp-3',
    title: 'Apresentação Comercial Executiva para Diretoria',
    type: 'meeting',
    scheduledAt: '2026-07-24T10:00:00Z',
    status: 'pending',
    notes: 'Demonstrar simulador de busca no Google Meu Negócio e crawler de site.',
    assignedTo: 'rep-4'
  }
];

export const INITIAL_WHATSAPP_SESSIONS: WhatsAppSession[] = [
  {
    id: 'session-sp',
    name: 'Sessão Vendas Matriz SP',
    number: '+55 11 97711-2233',
    status: 'CONNECTED',
    unreadCount: 3,
    updatedAt: '2026-07-22T12:00:00Z'
  },
  {
    id: 'session-sdr',
    name: 'Sessão SDR Prospecção 01',
    number: '+55 41 98822-4455',
    status: 'CONNECTED',
    unreadCount: 1,
    updatedAt: '2026-07-22T11:30:00Z'
  }
];

export const INITIAL_WHATSAPP_CHATS: WhatsAppChat[] = [
  {
    id: 'chat-1',
    sessionId: 'session-sp',
    contactName: 'Marcos Vinicius (TechLog)',
    contactNumber: '+55 41 99887-1122',
    companyName: 'TechLog Brasil',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    lastMessage: 'Perfeito Carlos! Vamos analisar os termos da garantia de SLA e aviso.',
    lastMessageTimestamp: '12:42',
    unreadCount: 2,
    tags: ['Negociação', 'Cliente VIP'],
    assignedTo: 'rep-1',
    hasWhatsApp: true
  },
  {
    id: 'chat-2',
    sessionId: 'session-sp',
    contactName: 'Dr. Fernando (OdontoPrime)',
    contactNumber: '+55 48 99112-3344',
    companyName: 'OdontoPrime Especialidades',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120',
    lastMessage: 'Consegue me enviar o vídeo demonstrativo do motor de automação visual?',
    lastMessageTimestamp: '11:15',
    unreadCount: 1,
    tags: ['Proposta Enviada'],
    assignedTo: 'rep-2',
    hasWhatsApp: true
  },
  {
    id: 'chat-3',
    sessionId: 'session-sdr',
    contactName: 'Henrique Fonseca (Vanguarda)',
    contactNumber: '+55 11 98877-6655',
    companyName: 'Vanguarda Engenharia',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120',
    lastMessage: 'Confirmado nossa reunião para quinta às 10h com a diretoria.',
    lastMessageTimestamp: 'Ontem',
    unreadCount: 0,
    tags: ['Reunião Agendada'],
    assignedTo: 'rep-4',
    hasWhatsApp: true
  }
];

export const INITIAL_MESSAGES: Record<string, WhatsAppMessage[]> = {
  'chat-1': [
    { id: 'm1', chatId: 'chat-1', sender: 'user', content: 'Olá Marcos! Tudo bem? Segue a apresentação atualizada do Wootech CRM para a TechLog.', timestamp: '11:20', status: 'read' },
    { id: 'm2', chatId: 'chat-1', sender: 'lead', content: 'Olá Carlos, obrigado pelo envio! O módulo de enriquecimento de CNPJ funciona nativamente via BrasilAPI?', timestamp: '11:25', status: 'read' },
    { id: 'm3', chatId: 'chat-1', sender: 'user', content: 'Sim, exatamente! Além do CNPJ e Receita Federal, ele faz o crawl do site para identificar tecnologias, telefones e decisores.', timestamp: '11:28', status: 'read' },
    { id: 'm4', chatId: 'chat-1', sender: 'lead', content: 'Perfeito Carlos! Vamos analisar os termos da garantia de SLA e aviso.', timestamp: '12:42', status: 'read' }
  ],
  'chat-2': [
    { id: 'm5', chatId: 'chat-2', sender: 'user', content: 'Boa tarde Dr. Fernando! Passando para checar se teve oportunidade de rever a proposta comercial.', timestamp: '10:00', status: 'read' },
    { id: 'm6', chatId: 'chat-2', sender: 'lead', content: 'Consegue me enviar o vídeo demonstrativo do motor de automação visual?', timestamp: '11:15', status: 'read' }
  ]
};

export const INITIAL_QUICK_REPLIES: QuickReply[] = [
  { id: 'qr-1', shortcut: '/apresentacao', title: 'Link Apresentação Wootech', content: 'Olá! Segue o link para nossa apresentação executiva do Wootech CRM: https://wootech.com.br/demo-crm' },
  { id: 'qr-2', shortcut: '/agendar', title: 'Link de Agendamento', content: 'Para escolher o melhor horário na agenda do nosso especialista, acesse: https://wootech.com.br/agenda' },
  { id: 'qr-3', shortcut: '/cnpj', title: 'Dúvida Enriquecimento CNPJ', content: 'Nosso enriquecimento de CNPJ é 100% automático e nativo com a Receita Federal e crawler comercial sem custo adicional.' }
];

export const INITIAL_AUTOMATIONS: AutomationFlow[] = [
  {
    id: 'flow-1',
    name: 'Automação de Novo Lead Prospectado',
    description: 'Assim que um lead é qualificado na prospecção, atribui vendedor, cria tarefa e envia mensagem no WhatsApp.',
    active: true,
    executionCount: 142,
    lastRunAt: '2026-07-22T13:10:00Z',
    nodes: [
      { id: 'n-1', type: 'trigger', label: 'GMB Prospectado', sublabel: 'Novo Lead importado do Google Meu Negócio', config: {}, position: { x: 50, y: 100 } },
      { id: 'n-2', type: 'action', label: 'Enriquecer Dados', sublabel: 'Consultar Receita Federal + Web Crawler', config: {}, position: { x: 300, y: 100 } },
      { id: 'n-3', type: 'condition', label: 'Score Comercial > 70?', sublabel: 'Verifica potencial do lead', config: {}, position: { x: 550, y: 100 } },
      { id: 'n-4', type: 'action', label: 'Criar Oportunidade Kanban', sublabel: 'Etapa: Primeiro Contato', config: {}, position: { x: 800, y: 50 } },
      { id: 'n-5', type: 'action', label: 'Notificar Vendedor WhatsApp', sublabel: 'Envia alerta para equipe comercial', config: {}, position: { x: 800, y: 180 } }
    ],
    edges: [
      { id: 'e-1', source: 'n-1', target: 'n-2' },
      { id: 'e-2', source: 'n-2', target: 'n-3' },
      { id: 'e-3', source: 'n-3', target: 'n-4' },
      { id: 'e-4', source: 'n-3', target: 'n-5' }
    ]
  },
  {
    id: 'flow-2',
    name: 'SLA Alert: Proposta sem Resposta em 48h',
    description: 'Envia notificação de follow-up prioritário quando uma proposta estagna na etapa.',
    active: true,
    executionCount: 58,
    lastRunAt: '2026-07-21T18:00:00Z',
    nodes: [
      { id: 'n-10', type: 'trigger', label: 'Tempo em Etapa', sublabel: 'Proposta Enviada > 48 horas', config: {}, position: { x: 50, y: 100 } },
      { id: 'n-11', type: 'action', label: 'Gerar Script IA Comercial', sublabel: 'Gera abordagem de acompanhamento customizada', config: {}, position: { x: 320, y: 100 } },
      { id: 'n-12', type: 'action', label: 'Criar Tarefa Follow-up', sublabel: 'Atribui ao Vendedor Responsável', config: {}, position: { x: 600, y: 100 } }
    ],
    edges: [
      { id: 'e-10', source: 'n-10', target: 'n-11' },
      { id: 'e-11', source: 'n-11', target: 'n-12' }
    ]
  }
];
