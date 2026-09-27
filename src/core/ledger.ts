import { computeSplitForCostItem } from './splitStrategies.js';
import {
  CostItem,
  CostItemShareBreakdown,
  Member,
  MemberLedgerEntry,
  Payment,
  Trip,
  TripLedgerSnapshot,
} from './types.js';

export interface RecalculateInput {
  trip: Trip;
  members: Member[];
  costItems: CostItem[];
  payments: Payment[];
}

/**
 * Pure ledger recalculation engine.
 * Principle 1: Balances are derived, never stored as source of truth.
 * Full synchronous recompute from raw facts on every mutation.
 */
export function recalculateTripLedger(input: RecalculateInput): TripLedgerSnapshot {
  const { trip, members, costItems, payments } = input;
  const computedAt = new Date().toISOString();

  // 1. Process active cost items and compute split shares
  const itemBreakdowns: Record<string, CostItemShareBreakdown> = {};
  let totalTripSpend = 0;
  let totalCollected = 0;

  for (const item of costItems) {
    // Only non-cancelled / non-refunded items add to total spend
    if (item.currency === trip.baseCurrency && item.status !== 'cancelled' && item.status !== 'refunded') {
      totalTripSpend += item.totalAmount;
      if (item.paidByMemberId && item.currency === trip.baseCurrency) totalCollected += item.totalAmount;
    }

    const breakdown = computeSplitForCostItem(item, members, trip.ownerId);
    itemBreakdowns[item.id] = breakdown;
  }

  // 2. Initialize MemberLedgerEntry for every member (including inactive/left members)
  const membersLedger: Record<string, MemberLedgerEntry> = {};
  for (const member of members) {
    membersLedger[member.id] = {
      memberId: member.id,
      displayName: member.displayName,
      role: member.role,
      isActive: !member.leftAt,
      grossOwed: 0,
      grossPaid: 0,
      netBalance: 0,
      sharesByCostItem: [],
      paymentsList: [],
    };
  }

  // 3. Accumulate grossOwed per member from item breakdowns
  for (const item of costItems) {
    if (item.currency !== trip.baseCurrency) continue;
    const breakdown = itemBreakdowns[item.id];
    if (!breakdown) continue;

    for (const [memberId, owedAmount] of Object.entries(breakdown.memberShares)) {
      if (!membersLedger[memberId]) {
        // Fallback if an unlisted member ID was in participants
        membersLedger[memberId] = {
          memberId,
          displayName: `Member (${memberId.slice(0, 6)})`,
          role: 'participant',
          isActive: false,
          grossOwed: 0,
          grossPaid: 0,
          netBalance: 0,
          sharesByCostItem: [],
          paymentsList: [],
        };
      }

      if (owedAmount > 0) {
        membersLedger[memberId].grossOwed += owedAmount;
        membersLedger[memberId].sharesByCostItem.push({
          costItemId: item.id,
          costItemTitle: item.title,
          owedAmount,
          splitType: item.splitRule.type,
          explanation: breakdown.explanation[memberId] || '',
        });
      }
    }
  }

  // 4. Accumulate upfront payments (CostItems where paidByMemberId is set)
  for (const item of costItems) {
    if (item.currency !== trip.baseCurrency) continue;
    if (item.status === 'cancelled' || item.status === 'refunded') continue;

    if (item.paidByMemberId && membersLedger[item.paidByMemberId]) {
      membersLedger[item.paidByMemberId].grossPaid += item.totalAmount;
    }
  }

  // 5. Accumulate recorded payments
  let poolBalance = 0;

  for (const p of payments) {
    if (p.status !== 'confirmed') continue;

    if (p.currency !== trip.baseCurrency) continue;

    if (p.refundForCostItemId) {
      // Vendor refunds replenish the pool but are not a member contribution.
      if (p.toPool) poolBalance += p.amount;
      continue;
    }

    // Peer-to-peer settlements move an existing balance; they do not fund trip expenses.
    if (!p.toMemberId) totalCollected += p.amount;

    if (p.toPool) {
      poolBalance += p.amount;
    }

    if (membersLedger[p.fromMemberId]) {
      membersLedger[p.fromMemberId].grossPaid += p.amount;
      membersLedger[p.fromMemberId].paymentsList.push(p);
    }

    // If payment is a settlement payment to another member (toMemberId)
    if (p.toMemberId && membersLedger[p.toMemberId]) {
      // The recipient received cash, so their grossPaid effectively decreases / credit consumed
      membersLedger[p.toMemberId].grossPaid -= p.amount;
    }
  }

  // 6. Compute net balance per member: grossPaid - grossOwed
  for (const memberId of Object.keys(membersLedger)) {
    const entry = membersLedger[memberId];
    entry.netBalance = entry.grossPaid - entry.grossOwed;
  }

  return {
    tripId: trip.id,
    computedAt,
    currency: trip.baseCurrency,
    totalTripSpend,
    totalCollected,
    poolBalance,
    membersLedger,
    itemBreakdowns,
  };
}

/**
 * Provides an explainable breakdown for a specific member ("Why do I owe this?").
 */
export function explainMemberDues(
  memberId: string,
  snapshot: TripLedgerSnapshot
): {
  member: MemberLedgerEntry | null;
  summaryText: string;
  lineItems: Array<{
    itemTitle: string;
    totalItemCost: number;
    splitType: string;
    myShare: number;
    explanation: string;
  }>;
  paymentsMade: Array<{
    id: string;
    amount: number;
    method: string;
    target: string;
    date: string;
  }>;
  netStatement: string;
} {
  const member = snapshot.membersLedger[memberId] || null;
  if (!member) {
    return {
      member: null,
      summaryText: 'Member not found in current ledger snapshot.',
      lineItems: [],
      paymentsMade: [],
      netStatement: '0.00',
    };
  }

  const lineItems = member.sharesByCostItem.map(share => {
    const breakdown = snapshot.itemBreakdowns[share.costItemId];
    return {
      itemTitle: share.costItemTitle,
      totalItemCost: breakdown ? breakdown.totalAmount : share.owedAmount,
      splitType: share.splitType,
      myShare: share.owedAmount,
      explanation: share.explanation,
    };
  });

  const paymentsMade = member.paymentsList.map(p => ({
    id: p.id,
    amount: p.amount,
    method: p.method,
    target: p.toPool ? 'Trip Pool' : p.toVendorId ? 'Vendor' : p.toMemberId ? 'Peer Settlement' : 'Trip',
    date: p.createdAt,
  }));

  const netFormatted = (Math.abs(member.netBalance) / 100).toFixed(2);
  let netStatement = '';
  if (member.netBalance > 0) {
    netStatement = `You are owed ${netFormatted} ${snapshot.currency} by the group.`;
  } else if (member.netBalance < 0) {
    netStatement = `You owe ${netFormatted} ${snapshot.currency} to settle your share.`;
  } else {
    netStatement = `All settled up! You owe 0.00 ${snapshot.currency}.`;
  }

  const summaryText = `${member.displayName}: Total share of expenses ${(member.grossOwed / 100).toFixed(2)} ${snapshot.currency}, Total paid ${(member.grossPaid / 100).toFixed(2)} ${snapshot.currency}. Net: ${netStatement}`;

  return {
    member,
    summaryText,
    lineItems,
    paymentsMade,
    netStatement,
  };
}
