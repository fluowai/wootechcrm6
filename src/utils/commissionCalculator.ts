import {
  SalesRep,
  CommissionStructure,
  CommissionTier,
  SalesGoalTarget,
  CommissionCalculationResult,
  Deal
} from '../types';

export const DEFAULT_COMMISSION_STRUCTURES: CommissionStructure[] = [
  {
    id: 'struct-tiered-accelerator',
    name: 'Acelerador de Performance Tiered',
    description: 'Comissão progressiva por faixa de atingimento da meta de receita com bônus de superação.',
    type: 'tiered_acceleration',
    baseRate: 4,
    tiers: [
      { id: 't1', minAchievementPct: 0, maxAchievementPct: 79.9, commissionRate: 3.5, tierBonusAmount: 0, label: 'Base (< 80%)' },
      { id: 't2', minAchievementPct: 80, maxAchievementPct: 99.9, commissionRate: 5.0, tierBonusAmount: 250, label: 'Nível Prata (80%-99%)' },
      { id: 't3', minAchievementPct: 100, maxAchievementPct: 119.9, commissionRate: 7.0, tierBonusAmount: 1000, label: 'Meta Batida (100%-119%)' },
      { id: 't4', minAchievementPct: 120, maxAchievementPct: 999, commissionRate: 9.5, tierBonusAmount: 2500, label: 'Super Acelerador (≥ 120%)' },
    ],
    minDealValueForBonus: 40000,
    dealBonusRate: 1.5,
    dealCountMilestone: 5,
    dealCountBonusAmount: 800
  },
  {
    id: 'struct-flat-standard',
    name: 'Comissão Fixa Padrão (5%)',
    description: 'Comissão linear de 5% sobre todas as vendas fechadas sem faixas progressivas.',
    type: 'flat_rate',
    baseRate: 5,
    tiers: [
      { id: 'tf1', minAchievementPct: 0, maxAchievementPct: 999, commissionRate: 5.0, tierBonusAmount: 0, label: 'Taxa Única 5%' }
    ]
  },
  {
    id: 'struct-high-ticket',
    name: 'Escala Enterprise & High-Ticket',
    description: 'Foco em grandes contas com bônus direto para contratos acima de R$ 50.000.',
    type: 'deal_size_bonus',
    baseRate: 4.5,
    tiers: [
      { id: 'th1', minAchievementPct: 0, maxAchievementPct: 99.9, commissionRate: 4.5, tierBonusAmount: 0, label: 'Standard (4.5%)' },
      { id: 'th2', minAchievementPct: 100, maxAchievementPct: 999, commissionRate: 8.0, tierBonusAmount: 1500, label: 'High Performer (8.0%)' }
    ],
    minDealValueForBonus: 50000,
    dealBonusRate: 2.0,
    dealCountMilestone: 3,
    dealCountBonusAmount: 1200
  }
];

export const DEFAULT_GOAL_TARGETS: SalesGoalTarget[] = [
  {
    id: 'goal-carlos-jul26',
    assigneeId: 'rep-1',
    assigneeName: 'Carlos Andrade',
    type: 'individual',
    period: 'monthly',
    periodName: 'Julho 2026',
    revenueTarget: 180000,
    closedDealsTarget: 6,
    qualifiedLeadsTarget: 25,
    commissionStructureId: 'struct-tiered-accelerator',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'active'
  },
  {
    id: 'goal-fernanda-jul26',
    assigneeId: 'rep-2',
    assigneeName: 'Fernanda Lima',
    type: 'individual',
    period: 'monthly',
    periodName: 'Julho 2026',
    revenueTarget: 120000,
    closedDealsTarget: 8,
    qualifiedLeadsTarget: 40,
    commissionStructureId: 'struct-tiered-accelerator',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'active'
  },
  {
    id: 'goal-roberto-jul26',
    assigneeId: 'rep-3',
    assigneeName: 'Roberto Mendes',
    type: 'individual',
    period: 'monthly',
    periodName: 'Julho 2026',
    revenueTarget: 150000,
    closedDealsTarget: 5,
    qualifiedLeadsTarget: 30,
    commissionStructureId: 'struct-flat-standard',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'active'
  },
  {
    id: 'goal-juliana-jul26',
    assigneeId: 'rep-4',
    assigneeName: 'Juliana Castro',
    type: 'individual',
    period: 'monthly',
    periodName: 'Julho 2026',
    revenueTarget: 200000,
    closedDealsTarget: 10,
    qualifiedLeadsTarget: 50,
    commissionStructureId: 'struct-high-ticket',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    status: 'active'
  },
  {
    id: 'goal-team-closers-q3',
    assigneeId: 'team_closers',
    assigneeName: 'Time de Vendas & Closers',
    type: 'team',
    period: 'quarterly',
    periodName: 'Q3 2026 (Jul-Set)',
    revenueTarget: 1950000,
    closedDealsTarget: 80,
    qualifiedLeadsTarget: 450,
    commissionStructureId: 'struct-tiered-accelerator',
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    status: 'active'
  }
];

/**
 * Calculates commission breakdown for a specific seller or input values based on structure and target.
 */
export function calculateCommissionPayout(
  rep: SalesRep,
  closedRevenueOverride?: number,
  dealsOverride?: Deal[],
  structures: CommissionStructure[] = DEFAULT_COMMISSION_STRUCTURES,
  goals: SalesGoalTarget[] = DEFAULT_GOAL_TARGETS
): CommissionCalculationResult {
  const actualRevenue = closedRevenueOverride !== undefined ? closedRevenueOverride : rep.closedValue;
  
  // Find goal target
  const goal = goals.find(g => g.assigneeId === rep.id) || {
    revenueTarget: rep.goalValue || 150000,
    closedDealsTarget: 5,
    commissionStructureId: rep.commissionStructureId || 'struct-tiered-accelerator'
  };

  const revenueTarget = goal.revenueTarget;
  const closedDealsCount = rep.closedDealsCount || 4;

  // Find assigned structure
  const structure = structures.find(s => s.id === (rep.commissionStructureId || goal.commissionStructureId)) || structures[0];

  // Calculate achievement percentages
  const revenueAchievementPct = Math.round((actualRevenue / Math.max(1, revenueTarget)) * 100);
  const dealsAchievementPct = Math.round((closedDealsCount / Math.max(1, goal.closedDealsTarget || 5)) * 100);

  // Find matching tier based on revenue achievement
  let appliedTier: CommissionTier | null = null;
  if (structure.tiers && structure.tiers.length > 0) {
    // Sort tiers by minAchievementPct asc
    const sortedTiers = [...structure.tiers].sort((a, b) => a.minAchievementPct - b.minAchievementPct);
    for (const tier of sortedTiers) {
      if (revenueAchievementPct >= tier.minAchievementPct) {
        appliedTier = tier;
      }
    }
  }

  const effectiveRate = appliedTier ? appliedTier.commissionRate : structure.baseRate;
  const baseCommissionValue = Math.round((actualRevenue * effectiveRate) / 100);
  const tierBonusValue = appliedTier ? appliedTier.tierBonusAmount : 0;

  // Milestone deal count bonus
  let dealCountBonusValue = 0;
  if (structure.dealCountMilestone && closedDealsCount >= structure.dealCountMilestone) {
    dealCountBonusValue = structure.dealCountBonusAmount || 0;
  }

  // High ticket bonus check
  let highTicketBonusValue = 0;
  if (structure.minDealValueForBonus && structure.dealBonusRate && dealsOverride) {
    const highTicketDeals = dealsOverride.filter(
      d => d.assignedTo === rep.id && d.stageId === 'won' && d.value >= (structure.minDealValueForBonus || 50000)
    );
    const totalHighTicketValue = highTicketDeals.reduce((sum, d) => sum + d.value, 0);
    highTicketBonusValue = Math.round((totalHighTicketValue * structure.dealBonusRate) / 100);
  }

  const totalCommissionPayout = baseCommissionValue + tierBonusValue + dealCountBonusValue + highTicketBonusValue;

  // Calculate projected pipeline payout
  let projectedPipelinePayout = 0;
  if (dealsOverride) {
    const openDeals = dealsOverride.filter(d => d.assignedTo === rep.id && d.stageId !== 'won' && d.stageId !== 'lost');
    const weightedOpenRevenue = openDeals.reduce((sum, d) => sum + (d.value * (d.probability / 100)), 0);
    projectedPipelinePayout = Math.round((weightedOpenRevenue * effectiveRate) / 100);
  }

  // Next tier calculation
  let nextTierRevenueTarget: number | undefined;
  let nextTierRate: number | undefined;
  if (structure.tiers) {
    const nextTier = structure.tiers
      .sort((a, b) => a.minAchievementPct - b.minAchievementPct)
      .find(t => t.minAchievementPct > revenueAchievementPct);
    if (nextTier) {
      nextTierRevenueTarget = Math.round((revenueTarget * nextTier.minAchievementPct) / 100);
      nextTierRate = nextTier.commissionRate;
    }
  }

  return {
    repId: rep.id,
    repName: rep.name,
    revenueTarget,
    actualClosedRevenue: actualRevenue,
    closedDealsCount,
    revenueAchievementPct,
    dealsAchievementPct,
    appliedTier,
    effectiveRate,
    baseCommissionValue,
    tierBonusValue,
    dealCountBonusValue,
    highTicketBonusValue,
    totalCommissionPayout,
    projectedPipelinePayout,
    nextTierRevenueTarget,
    nextTierRate
  };
}
