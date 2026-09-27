import {
  CostItem,
  CostItemShareBreakdown,
  CustomSplitConfig,
  Member,
  SharedRoomConfig,
  SplitRule,
  SplitType,
  WeightedSplitConfig,
} from './types.js';

export interface SplitResult {
  memberShares: Record<string, number>; // memberId -> minor units
  explanations: Record<string, string>; // memberId -> human-readable explanation
}

/**
 * Strategy interface for split calculation.
 * Each strategy receives a CostItem, active members list, and trip organizer ID,
 * and returns the exact integer minor-unit amount each member owes.
 */
export type SplitStrategyFn = (
  costItem: CostItem,
  members: Member[],
  tripOwnerId: string
) => SplitResult;

/**
 * Distributes remainder paise deterministically to the first `remainder` participant IDs
 * after sorting their IDs alphabetically to ensure 100% reproducible results.
 */
export function distributeEqualWithRemainder(
  totalAmount: number,
  participantIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  const uniqueIds = [...new Set(participantIds)];
  if (uniqueIds.length === 0 || !Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
    return result;
  }

  // Sort deterministically
  const sortedIds = uniqueIds.sort();
  const count = sortedIds.length;
  const baseShare = Math.floor(totalAmount / count);
  let remainder = totalAmount % count;

  for (let i = 0; i < sortedIds.length; i++) {
    const id = sortedIds[i];
    const extra = i < remainder ? 1 : 0;
    result[id] = baseShare + extra;
  }

  return result;
}

/**
 * 1. EQUAL SPLIT
 * Total divided equally among active item participants.
 */
export const equalSplitStrategy: SplitStrategyFn = (costItem, members, _tripOwnerId) => {
  const participantIds = [...new Set(costItem.participants.map(p => p.memberId))];
  const shares = distributeEqualWithRemainder(costItem.totalAmount, participantIds);
  const explanations: Record<string, string> = {};

  const count = participantIds.length;
  for (const id of participantIds) {
    const amount = shares[id] || 0;
    explanations[id] = `Equal split of ${(costItem.totalAmount / 100).toFixed(2)} ${costItem.currency} across ${count} participants`;
  }

  return { memberShares: shares, explanations };
};

/**
 * 2. PARTICIPANT WEIGHTED SPLIT
 * Divided according to explicit weight multipliers (e.g. adult=1.0, child=0.5, family=2.0).
 */
export const participantWeightedSplitStrategy: SplitStrategyFn = (costItem, members, _tripOwnerId) => {
  const config = costItem.splitRule.config as WeightedSplitConfig | undefined;
  const participantIds = [...new Set(costItem.participants.map(p => p.memberId))];
  const memberShares: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  if (participantIds.length === 0 || !Number.isSafeInteger(costItem.totalAmount) || costItem.totalAmount <= 0) {
    return { memberShares, explanations };
  }

  // Calculate weights
  const weights: Record<string, number> = {};
  let totalWeight = 0;

  for (const p of costItem.participants.filter((participant, index, all) => all.findIndex((candidate) => candidate.memberId === participant.memberId) === index)) {
    const configWeight = config?.weights?.[p.memberId];
    const overrideWeight = p.overrideShare;
    const candidateWeight = overrideWeight ?? configWeight ?? 1.0;
    const weight = Number.isFinite(candidateWeight) && candidateWeight > 0 ? candidateWeight : 1.0;
    weights[p.memberId] = weight;
    totalWeight += weight;
  }

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return equalSplitStrategy(costItem, members, _tripOwnerId);
  }

  // Distribute floor shares
  let allocatedSum = 0;
  const fractions: Array<{ memberId: string; fraction: number; weight: number }> = [];

  for (const memberId of participantIds) {
    const weight = weights[memberId];
    const exactShare = (costItem.totalAmount * weight) / totalWeight;
    const floorShare = Math.floor(exactShare);
    memberShares[memberId] = floorShare;
    allocatedSum += floorShare;
    fractions.push({
      memberId,
      fraction: exactShare - floorShare,
      weight,
    });
  }

  // Distribute remaining paise to largest fractional remainder, tie-breaking by memberId
  let remainder = costItem.totalAmount - allocatedSum;
  fractions.sort((a, b) => {
    if (Math.abs(b.fraction - a.fraction) > 0.000001) {
      return b.fraction - a.fraction;
    }
    return a.memberId.localeCompare(b.memberId);
  });

  for (let i = 0; i < remainder && i < fractions.length; i++) {
    const targetId = fractions[i].memberId;
    memberShares[targetId] = (memberShares[targetId] || 0) + 1;
  }

  for (const memberId of participantIds) {
    const weight = weights[memberId];
    explanations[memberId] = `Weighted split (${weight}x share of total weight ${totalWeight})`;
  }

  return { memberShares, explanations };
};

/**
 * 3. SHARED ROOM SPLIT
 * Room cost split among room occupants; supports individual room cost overrides or uneven room sizes.
 */
export const sharedRoomSplitStrategy: SplitStrategyFn = (costItem, members, _tripOwnerId) => {
  const config = costItem.splitRule.config as SharedRoomConfig | undefined;
  const memberShares: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  if (!config?.rooms || config.rooms.length === 0) {
    return equalSplitStrategy(costItem, members, _tripOwnerId);
  }

  const rooms = config.rooms;
  if (new Set(rooms.map((room) => room.roomId)).size !== rooms.length) {
    return equalSplitStrategy(costItem, members, _tripOwnerId);
  }
  const roomsWithCost = rooms.filter(r => typeof r.costOverride === 'number' && r.costOverride > 0);
  const costOverrideSum = roomsWithCost.reduce((sum, r) => sum + (r.costOverride || 0), 0);
  const unassignedRooms = rooms.filter(r => typeof r.costOverride !== 'number' || r.costOverride <= 0);

  const remainingAmount = Math.max(0, costItem.totalAmount - costOverrideSum);
  const roomAmounts: Record<string, number> = {};

  // Normalize legacy room overrides that exceed the expense so shares still reconcile.
  if (costOverrideSum > costItem.totalAmount) {
    const allocations = roomsWithCost.map((room) => {
      const exact = costItem.totalAmount * room.costOverride! / costOverrideSum;
      return { roomId: room.roomId, amount: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remainder = costItem.totalAmount - allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
    allocations.sort((a, b) => b.fraction - a.fraction || a.roomId.localeCompare(b.roomId));
    for (const allocation of allocations) {
      roomAmounts[allocation.roomId] = allocation.amount + (remainder-- > 0 ? 1 : 0);
    }
  } else {
    for (const r of roomsWithCost) roomAmounts[r.roomId] = r.costOverride!;
  }

  // Distribute unassigned room amounts equally across unassigned rooms
  if (unassignedRooms.length > 0) {
    const roomIds = unassignedRooms.map(r => r.roomId);
    const distributed = distributeEqualWithRemainder(remainingAmount, roomIds);
    for (const rid of roomIds) {
      roomAmounts[rid] = distributed[rid];
    }
  }

  // Now split each room's cost among its occupants
  for (const room of rooms) {
    const occupants = [...new Set(room.occupantMemberIds || [])];
    const roomCost = roomAmounts[room.roomId] || 0;
    const roomName = room.roomName || `Room ${room.roomId}`;

    if (occupants.length === 0) continue;

    const occupantSplit = distributeEqualWithRemainder(roomCost, occupants);
    for (const memberId of occupants) {
      memberShares[memberId] = (memberShares[memberId] || 0) + occupantSplit[memberId];
      explanations[memberId] = `Shared ${roomName} (${(roomCost / 100).toFixed(2)} ${costItem.currency} split among ${occupants.length} occupants)`;
    }
  }

  return { memberShares, explanations };
};

/**
 * 4. ACTIVITY BASED SPLIT
 * Only members who explicitly opted into the activity pay for it; non-participants owe 0.
 */
export const activityBasedSplitStrategy: SplitStrategyFn = (costItem, members, _tripOwnerId) => {
  const participantIds = [...new Set(costItem.participants.map(p => p.memberId))];
  const memberShares: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  if (participantIds.length === 0 || costItem.totalAmount <= 0) {
    return { memberShares, explanations };
  }

  const shares = distributeEqualWithRemainder(costItem.totalAmount, participantIds);
  for (const id of participantIds) {
    memberShares[id] = shares[id];
    explanations[id] = `Opted-in activity participant (${(costItem.totalAmount / 100).toFixed(2)} ${costItem.currency} split among ${participantIds.length} members)`;
  }

  // Non-participants explicitly owe 0
  for (const m of members) {
    if (!participantIds.includes(m.id)) {
      memberShares[m.id] = 0;
      explanations[m.id] = `Not participating in this activity (0.00 ${costItem.currency})`;
    }
  }

  return { memberShares, explanations };
};

/**
 * CUSTOM SPLIT
 * Uses explicit per-member amounts and leaves any unassigned remainder with the payer.
 * Allocations must be positive in total and strictly less than the expense amount.
 */
export const customSplitStrategy: SplitStrategyFn = (costItem, members, _tripOwnerId) => {
  const config = costItem.splitRule.config as CustomSplitConfig | undefined;
  const participantIds = new Set(costItem.participants.map((participant) => participant.memberId));
  const shares: Record<string, number> = {};
  const explanations: Record<string, string> = {};
  const configuredShares = config?.shares || {};

  for (const memberId of participantIds) {
    const amount = configuredShares[memberId] ?? 0;
    if (!Number.isSafeInteger(amount) || amount < 0) {
      return { memberShares: {}, explanations: {} };
    }
    shares[memberId] = amount;
  }

  const assignedTotal = Object.values(shares).reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(assignedTotal) || assignedTotal <= 0 || assignedTotal >= costItem.totalAmount) {
    return { memberShares: {}, explanations: {} };
  }

  for (const member of members) {
    const amount = shares[member.id] || 0;
    explanations[member.id] = participantIds.has(member.id)
      ? `Custom share (${(amount / 100).toFixed(2)} ${costItem.currency})`
      : `Not included in this expense (0.00 ${costItem.currency})`;
  }

  return { memberShares: shares, explanations };
};

/**
 * 5. ORGANIZER PAID SPLIT
 * Organizer covers 100% of the cost; other members owe 0.
 */
export const organizerPaidSplitStrategy: SplitStrategyFn = (costItem, members, tripOwnerId) => {
  const memberShares: Record<string, number> = {};
  const explanations: Record<string, string> = {};

  const targetPayerId = costItem.paidByMemberId || tripOwnerId;

  for (const m of members) {
    if (m.id === targetPayerId) {
      memberShares[m.id] = costItem.totalAmount;
      explanations[m.id] = `Covered 100% by organizer/host (${(costItem.totalAmount / 100).toFixed(2)} ${costItem.currency})`;
    } else {
      memberShares[m.id] = 0;
      explanations[m.id] = `Sponsored by organizer (0.00 ${costItem.currency})`;
    }
  }

  return { memberShares, explanations };
};

/**
 * Split Strategy Registry
 */
export const splitStrategies: Record<SplitType, SplitStrategyFn> = {
  equal: equalSplitStrategy,
  participant_weighted: participantWeightedSplitStrategy,
  shared_room: sharedRoomSplitStrategy,
  activity_based: activityBasedSplitStrategy,
  custom: customSplitStrategy,
  organizer_paid: organizerPaidSplitStrategy,
};

/**
 * Computes split for a single CostItem using its configured split rule.
 */
export function computeSplitForCostItem(
  costItem: CostItem,
  members: Member[],
  tripOwnerId: string
): CostItemShareBreakdown {
  if (costItem.status === 'cancelled' || costItem.status === 'refunded') {
    // Cancelled items incur 0 owed for everyone
    const memberShares: Record<string, number> = {};
    const explanation: Record<string, string> = {};
    for (const m of members) {
      memberShares[m.id] = 0;
      explanation[m.id] = `Item cancelled/refunded (0.00 ${costItem.currency})`;
    }
    return {
      costItemId: costItem.id,
      itemTitle: costItem.title,
      totalAmount: costItem.totalAmount,
      splitType: costItem.splitRule.type,
      memberShares,
      explanation,
    };
  }

  const strategy = splitStrategies[costItem.splitRule.type] || equalSplitStrategy;
  const result = strategy(costItem, members, tripOwnerId);

  return {
    costItemId: costItem.id,
    itemTitle: costItem.title,
    totalAmount: costItem.totalAmount,
    splitType: costItem.splitRule.type,
    memberShares: result.memberShares,
    explanation: result.explanations,
  };
}
