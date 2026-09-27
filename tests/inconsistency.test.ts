import { describe, expect, it } from 'vitest';
import { detectInconsistencies } from '../src/core/inconsistency.js';
import { CostItem, Member, Payment } from '../src/core/types.js';

describe('Inconsistency & Anomaly Detector', () => {
  it('detects double-booking overlapping timeframes', () => {
    const members: Member[] = [
      { id: 'm1', tripId: 't1', displayName: 'Alice', role: 'organizer', joinedAt: '2026-06-01T00:00:00Z' },
    ];

    const costItems: CostItem[] = [
      {
        id: 'c1',
        tripId: 't1',
        title: 'Morning Kayaking',
        category: 'activity',
        totalAmount: 3000,
        currency: 'INR',
        startDatetime: '2026-06-10T09:00:00Z',
        endDatetime: '2026-06-10T12:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [{ bookingId: 'c1', memberId: 'm1' }],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'c2',
        tripId: 't1',
        title: 'Morning Scuba Lesson',
        category: 'activity',
        totalAmount: 5000,
        currency: 'INR',
        startDatetime: '2026-06-10T11:00:00Z', // Overlaps with 09:00-12:00
        endDatetime: '2026-06-10T14:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr2', type: 'equal' },
        participants: [{ bookingId: 'c2', memberId: 'm1' }],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    const warnings = detectInconsistencies({ members, costItems, payments: [] });
    const doubleBook = warnings.find(w => w.code === 'DOUBLE_BOOKING');
    expect(doubleBook).toBeDefined();
    expect(doubleBook?.description).toContain('Alice');
  });

  it('detects overpayments and left member assignments', () => {
    const members: Member[] = [
      { id: 'm1', tripId: 't1', displayName: 'Alice', role: 'organizer', joinedAt: '2026-06-01T00:00:00Z' },
      { id: 'm2', tripId: 't1', displayName: 'Bob', role: 'participant', joinedAt: '2026-06-01T00:00:00Z', leftAt: '2026-06-05T00:00:00Z' },
    ];

    const costItems: CostItem[] = [
      {
        id: 'c1',
        tripId: 't1',
        title: 'Future Island Cruise',
        category: 'activity',
        totalAmount: 10000,
        currency: 'INR',
        startDatetime: '2026-06-12T10:00:00Z',
        endDatetime: '2026-06-12T16:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [
          { bookingId: 'c1', memberId: 'm1' },
          { bookingId: 'c1', memberId: 'm2' }, // Bob left on June 5, but is in June 12 cruise!
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    const payments: Payment[] = [
      {
        id: 'p1',
        tripId: 't1',
        fromMemberId: 'm1',
        appliesToCostItemId: 'c1',
        amount: 15000, // Overpayment: 15000 > 10000
        currency: 'INR',
        method: 'upi',
        status: 'confirmed',
        createdAt: '2026-06-06T00:00:00Z',
      },
    ];

    const warnings = detectInconsistencies({ members, costItems, payments });
    const overpay = warnings.find(w => w.code === 'OVERPAYMENT');
    const leftMember = warnings.find(w => w.code === 'LEFT_MEMBER_FUTURE_COST');

    expect(overpay).toBeDefined();
    expect(leftMember).toBeDefined();
  });
});
