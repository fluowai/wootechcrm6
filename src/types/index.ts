export type LeadStageId = 
  | 'prospecting'
  | 'first_contact'
  | 'meeting_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface Stage {
  id: LeadStageId;
  name: string;
  color: string;
  order: number;
  slaHours: number;
}

export interface DecisionMaker {
  id: string;
  name: string;
  role: string;
  department?: string;
  linkedIn?: string;
  email?: string;
  phone?: string;
  whatsApp?: string;
  isLegalRepresentative?: boolean;
}

export interface TechStackItem {
  name: string;
  category: 'analytics' | 'marketing' | 'cms' | 'crm' | 'advertising' | 'other';
  icon?: string;
}

export interface Company {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  situacao: 'ATIVA' | 'INATIVA' | 'SUSPENSA' | 'EM BAIXA';
  cnaePrincipal: { code: string; text: string };
  cnaesSecundarios?: { code: string; text: string }[];
  capitalSocial: number;
  fundacao: string; // YYYY-MM-DD
  porte: 'ME' | 'EPP' | 'DEMAIS' | 'GRANDE';
  naturezaJuridica: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    lat?: number;
    lng?: number;
  };
  website?: string;
  instagram?: string;
  facebook?: string;
  linkedIn?: string;
  telefones: string[];
  emails: string[];
  observacoes?: string;
  tags: string[];
  enriched: boolean;
  scoreComercial?: number; // 0-100
  ratingGMB?: number;
  reviewsCountGMB?: number;
  placeIdGMB?: string;
  techStack?: TechStackItem[];
  decisionMakers?: DecisionMaker[];
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  role: string;
  department: string;
  whatsApp: string;
  phone?: string;
  email: string;
  linkedIn?: string;
  birthday?: string;
  observacoes?: string;
  tags: string[];
  isDecisionMaker: boolean;
}

export interface ActivityHistoryItem {
  id: string;
  type: 'created' | 'stage_changed' | 'note_added' | 'whatsapp_sent' | 'call_made' | 'email_sent' | 'ai_generated';
  title: string;
  description: string;
  author: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  value: number; // R$
  probability: number; // 0-100
  expectedRevenue: number; // value * (prob / 100)
  stageId: LeadStageId;
  assignedTo: string; // Vendedor ID
  contactName: string;
  contactWhatsApp: string;
  contactEmail: string;
  timeInStageDays: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  lossReason?: string;
  winReason?: string;
  history: ActivityHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: string;
  dealId?: string;
  companyId?: string;
  title: string;
  type: 'meeting' | 'call' | 'followup' | 'visit' | 'task';
  scheduledAt: string; // ISO String
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  assignedTo: string;
}

export interface ProspectingQueryParams {
  cidade: string;
  estado: string;
  cep?: string;
  raioKm?: number;
  categoria: string;
  palavraChave?: string;
}

export interface ProspectingResultItem {
  googlePlaceId: string;
  nomeEmpresa: string;
  categoria: string;
  telefone: string;
  website: string;
  endereco: string;
  cidade: string;
  estado: string;
  lat: number;
  lng: number;
  rating: number;
  reviewsCount: number;
  photos: string[];
  horarioFuncionamento?: string;
  alreadyInCRM?: boolean;
}

export interface WhatsAppSession {
  id: string;
  name: string;
  number: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE';
  qrCodeUrl?: string;
  unreadCount: number;
  updatedAt: string;
}

export interface WhatsAppMessage {
  id: string;
  chatId: string;
  sender: 'user' | 'lead' | 'system';
  content: string;
  mediaType?: 'text' | 'image' | 'audio' | 'document';
  mediaUrl?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'pending';
}

export interface WhatsAppChat {
  id: string;
  sessionId: string;
  contactName: string;
  contactNumber: string;
  companyName?: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  tags: string[];
  assignedTo?: string;
  hasWhatsApp: boolean;
}

export interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  content: string;
}

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  label: string;
  sublabel: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
}

export interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  active: boolean;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
  executionCount: number;
  lastRunAt?: string;
}

export interface SalesRep {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'sdr' | 'bdr' | 'closer' | 'manager';
  avatar: string;
  goalValue: number;
  closedValue: number;
  closedDealsCount?: number;
  commissionRate: number; // percentage
  commissionStructureId?: string;
  activeDealsCount: number;
  conversionRate: number; // percentage
}

export interface CommissionTier {
  id: string;
  minAchievementPct: number; // e.g. 0, 80, 100, 120, 150
  maxAchievementPct?: number; // e.g. 79.9, 99.9, 119.9, etc.
  commissionRate: number; // e.g. 3, 5, 8, 12 %
  tierBonusAmount: number; // R$ flat bonus
  label: string; // e.g. "Padrão (0-79%)", "Meta Atingida (100%)", "Acelerador Ouro (>120%)"
}

export interface CommissionStructure {
  id: string;
  name: string;
  description: string;
  type: 'flat_rate' | 'tiered_acceleration' | 'deal_size_bonus' | 'hybrid';
  baseRate: number; // Default percentage
  tiers: CommissionTier[];
  minDealValueForBonus?: number; // e.g. R$ 50,000
  dealBonusRate?: number; // extra % for high ticket deals
  dealCountMilestone?: number; // e.g. 10 closed deals
  dealCountBonusAmount?: number; // R$ 1,000 flat milestone bonus
}

export interface SalesGoalTarget {
  id: string;
  assigneeId: string; // SalesRep ID or Team ID ('team_closers', 'team_sdr')
  assigneeName: string;
  type: 'individual' | 'team';
  period: 'monthly' | 'quarterly' | 'annual';
  periodName: string; // e.g., 'Julho 2026', 'Q3 2026'
  revenueTarget: number; // R$
  closedDealsTarget: number; // count
  qualifiedLeadsTarget: number; // count
  commissionStructureId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'draft';
}

export interface CommissionCalculationResult {
  repId: string;
  repName: string;
  revenueTarget: number;
  actualClosedRevenue: number;
  closedDealsCount: number;
  revenueAchievementPct: number;
  dealsAchievementPct: number;
  appliedTier: CommissionTier | null;
  effectiveRate: number;
  baseCommissionValue: number;
  tierBonusValue: number;
  dealCountBonusValue: number;
  highTicketBonusValue: number;
  totalCommissionPayout: number;
  projectedPipelinePayout: number;
  nextTierRevenueTarget?: number;
  nextTierRate?: number;
}

export interface AICommercialRequest {
  type: 'script' | 'email' | 'whatsapp' | 'objection' | 'summary' | 'score';
  companyName?: string;
  contactRole?: string;
  niche?: string;
  dealValue?: number;
  notes?: string;
  objectionText?: string;
}

export interface AICommercialResponse {
  result: string;
  suggestions?: string[];
  score?: number;
  bullets?: string[];
}
