import { CostItem, InconsistencyWarning, Member, Payment } from './types.js';

export interface InconsistencyCheckInput {
  members: Member[];
  costItems: CostItem[];
  payments: Payment[];
  nowIso?: string;
}

/**
 * Rule-based anomaly and inconsistency detector.
 * Surfaces actionable warnings in the organizer dashboard.
 */
export function detectInconsistencies(input: InconsistencyCheckInput): InconsistencyWarning[] {
  const { members, costItems, payments, nowIso } = input;
  const now = nowIso ? new Date(nowIso) : new Date();
  const warnings: InconsistencyWarning[] = [];

  const memberMap = new Map<string, Member>();
  for (const m of members) {
    memberMap.set(m.id, m);
  }

  // 1. Zero participants with nonzero amount
  for (const item of costItems) {
    if (item.status === 'cancelled' || item.status === 'refunded') continue;

    if (item.totalAmount > 0 && (!item.participants || item.participants.length === 0)) {
      warnings.push({
        id: `warn-zero-part-${item.id}`,
        code: 'ZERO_PARTICIPANTS',
        severity: 'warning',
        title: `No participants on "${item.title}"`,
        description: `Cost item "${item.title}" has a total amount of ${(item.totalAmount / 100).toFixed(2)} ${item.currency} but 0 participants assigned.`,
        entityType: 'cost_item',
        entityId: item.id,
        suggestedAction: 'Assign at least one participant or mark as organizer-sponsored.',
      });
    }
  }

  // 2. Overpayments: sum of payments toward a specific item exceeds item total
  const paymentsByItem: Record<string, number> = {};
  for (const p of payments) {
    if (p.status === 'confirmed' && p.appliesToCostItemId && !p.refundForCostItemId) {
      const item = costItems.find((costItem) => costItem.id === p.appliesToCostItemId);
      if (!item || p.currency !== item.currency) continue;
      paymentsByItem[p.appliesToCostItemId] = (paymentsByItem[p.appliesToCostItemId] || 0) + p.amount;
    }
  }

  for (const item of costItems) {
    if (item.status === 'cancelled' || item.status === 'refunded') continue;
    const itemPaid = paymentsByItem[item.id] || 0;
    if (itemPaid > item.totalAmount) {
      const overAmount = ((itemPaid - item.totalAmount) / 100).toFixed(2);
      warnings.push({
        id: `warn-overpay-${item.id}`,
        code: 'OVERPAYMENT',
        severity: 'warning',
        title: `Overpayment detected on "${item.title}"`,
        description: `Total payments recorded (${(itemPaid / 100).toFixed(2)} ${item.currency}) exceed booking cost (${(item.totalAmount / 100).toFixed(2)} ${item.currency}) by ${overAmount} ${item.currency}.`,
        entityType: 'cost_item',
        entityId: item.id,
        suggestedAction: 'Review payments list or issue refund record.',
      });
    }
  }

  // 3. Left member assigned future cost items
  for (const m of members) {
    if (!m.leftAt) continue;
    const leftTime = new Date(m.leftAt).getTime();

    for (const item of costItems) {
      if (item.status === 'cancelled' || item.status === 'refunded') continue;
      const itemStart = new Date(item.startDatetime).getTime();

      if (itemStart > leftTime) {
        const isParticipant = item.participants.some(p => p.memberId === m.id);
        if (isParticipant) {
          warnings.push({
            id: `warn-left-member-${m.id}-${item.id}`,
            code: 'LEFT_MEMBER_FUTURE_COST',
            severity: 'warning',
            title: `Former member assigned to future booking`,
            description: `${m.displayName} left the trip on ${new Date(m.leftAt).toLocaleDateString()}, but is still assigned to "${item.title}" starting ${new Date(item.startDatetime).toLocaleDateString()}.`,
            entityType: 'member',
            entityId: m.id,
            suggestedAction: `Remove ${m.displayName} from this booking to recalculate remaining shares.`,
          });
        }
      }
    }
  }

  // 4. Overlapping timeframes for same member (double-booking detection)
  const activeItems = costItems.filter(
    item => item.status !== 'cancelled' && item.status !== 'refunded' && item.category !== 'stay' && item.startDatetime && item.endDatetime
  );

  for (let i = 0; i < activeItems.length; i++) {
    for (let j = i + 1; j < activeItems.length; j++) {
      const itemA = activeItems[i];
      const itemB = activeItems[j];

      const startA = new Date(itemA.startDatetime).getTime();
      const endA = new Date(itemA.endDatetime).getTime();
      const startB = new Date(itemB.startDatetime).getTime();
      const endB = new Date(itemB.endDatetime).getTime();

      if (![startA, endA, startB, endB].every(Number.isFinite) || endA <= startA || endB <= startB) continue;

      // Check if time intervals overlap
      const hasOverlap = Math.max(startA, startB) < Math.min(endA, endB);
      if (hasOverlap) {
        // Find common participants
        const participantsA = new Set(itemA.participants.map(p => p.memberId));
        const commonMemberIds = [...new Set(itemB.participants
          .map(p => p.memberId)
          .filter(id => participantsA.has(id)))];

        for (const mid of commonMemberIds) {
          const memberName = memberMap.get(mid)?.displayName || 'A member';
          warnings.push({
            id: `warn-overlap-${itemA.id}-${itemB.id}-${mid}`,
            code: 'DOUBLE_BOOKING',
            severity: 'warning',
            title: `Schedule conflict for ${memberName}`,
            description: `${memberName} is scheduled for both "${itemA.title}" and "${itemB.title}" during overlapping times.`,
            entityType: 'cost_item',
            entityId: itemA.id,
            suggestedAction: 'Verify dates or remove conflicting participant assignment.',
          });
        }
      }
    }
  }

  // 5. Confirmed booking past start date with 0 payments
  for (const item of costItems) {
    if (item.status === 'confirmed') {
      const itemStart = new Date(item.startDatetime).getTime();
      if (itemStart < now.getTime()) {
        const itemPaid = paymentsByItem[item.id] || 0;
        const paidUpfront = !!item.paidByMemberId;
        if (itemPaid === 0 && !paidUpfront && item.totalAmount > 0) {
          warnings.push({
            id: `warn-unpaid-${item.id}`,
            code: 'CONFIRMED_UNPAID',
            severity: 'info',
            title: `Unpaid past booking "${item.title}"`,
            description: `"${item.title}" was scheduled for ${new Date(item.startDatetime).toLocaleDateString()} but has no recorded payments or upfront payer.`,
            entityType: 'cost_item',
            entityId: item.id,
            suggestedAction: 'Record payment or mark who paid for this item.',
          });
        }
      }
    }
  }

  return warnings;
}
