import { describe, expect, it } from 'vitest';
import { explainMemberDues, recalculateTripLedger } from '../src/core/ledger.js';
import { CostItem, Member, Payment, Trip } from '../src/core/types.js';

const trip: Trip = {
  id: 't1',
  name: 'Goa Summer Getaway',
  startDate: '2026-06-10',
  endDate: '2026-06-14',
  baseCurrency: 'INR',
  status: 'active',
  ownerId: 'm1',
  createdAt: '2026-06-01T00:00:00Z',
  updatedAt: '2026-06-01T00:00:00Z',
};

const members: Member[] = [
  { id: 'm1', tripId: 't1', displayName: 'Alice (Host)', role: 'organizer', joinedAt: '2026-06-01T00:00:00Z' },
  { id: 'm2', tripId: 't1', displayName: 'Bob', role: 'participant', joinedAt: '2026-06-01T00:00:00Z' },
  { id: 'm3', tripId: 't1', displayName: 'Charlie', role: 'participant', joinedAt: '2026-06-01T00:00:00Z' },
];

describe('Ledger Calculation Engine', () => {
  it('recalculates ledger accurately with dynamic shares and payments', () => {
    const costItems: CostItem[] = [
      {
        id: 'c1',
        tripId: 't1',
        title: 'Villa Stay',
        category: 'stay',
        totalAmount: 30000, // 300.00
        currency: 'INR',
        startDatetime: '2026-06-10T14:00:00Z',
        endDatetime: '2026-06-14T11:00:00Z',
        status: 'confirmed',
        paidByMemberId: 'm1', // Alice paid upfront 30000
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [
          { bookingId: 'c1', memberId: 'm1' },
          { bookingId: 'c1', memberId: 'm2' },
          { bookingId: 'c1', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        id: 'c2',
        tripId: 't1',
        title: 'Snacks & Drinks',
        category: 'food',
        totalAmount: 6000,
        currency: 'INR',
        startDatetime: '2026-06-11T16:00:00Z',
        endDatetime: '2026-06-11T17:00:00Z',
        status: 'confirmed',
        paidByMemberId: 'm2', // Bob paid upfront 6000
        splitRule: { id: 'sr2', type: 'equal' },
        participants: [
          { bookingId: 'c2', memberId: 'm1' },
          { bookingId: 'c2', memberId: 'm2' },
          { bookingId: 'c2', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    const payments: Payment[] = [
      {
        id: 'p1',
        tripId: 't1',
        fromMemberId: 'm3',
        toPool: true,
        amount: 5000, // Charlie paid 5000 into pool
        currency: 'INR',
        method: 'upi',
        status: 'confirmed',
        createdAt: '2026-06-05T00:00:00Z',
      },
    ];

    const snapshot = recalculateTripLedger({ trip, members, costItems, payments });

    // Total spend = 30000 + 6000 = 36000
    expect(snapshot.totalTripSpend).toBe(36000);

    // Each member owes 1/3 of 30000 (10000) + 1/3 of 6000 (2000) = 12000 grossOwed
    expect(snapshot.membersLedger['m1'].grossOwed).toBe(12000);
    expect(snapshot.membersLedger['m2'].grossOwed).toBe(12000);
    expect(snapshot.membersLedger['m3'].grossOwed).toBe(12000);

    // Alice paid 30000 upfront. Net = 30000 - 12000 = +18000 (owed to Alice)
    expect(snapshot.membersLedger['m1'].grossPaid).toBe(30000);
    expect(snapshot.membersLedger['m1'].netBalance).toBe(18000);

    // Bob paid 6000 upfront. Net = 6000 - 12000 = -6000 (Bob owes 6000)
    expect(snapshot.membersLedger['m2'].grossPaid).toBe(6000);
    expect(snapshot.membersLedger['m2'].netBalance).toBe(-6000);

    // Charlie paid 5000 to pool. Net = 5000 - 12000 = -7000 (Charlie owes 7000)
    expect(snapshot.membersLedger['m3'].grossPaid).toBe(5000);
    expect(snapshot.membersLedger['m3'].netBalance).toBe(-7000);

    // Explainable dues verification for Charlie
    const explanation = explainMemberDues('m3', snapshot);
    expect(explanation.lineItems.length).toBe(2);
    expect(explanation.paymentsMade.length).toBe(1);
    expect(explanation.netStatement).toContain('You owe 70.00 INR');
  });

  it('handles mid-trip member addition seamlessly with dynamic recalculation', () => {
    const costItems: CostItem[] = [
      {
        id: 'c1',
        tripId: 't1',
        title: 'Villa Stay',
        category: 'stay',
        totalAmount: 40000,
        currency: 'INR',
        startDatetime: '2026-06-10T14:00:00Z',
        endDatetime: '2026-06-14T11:00:00Z',
        status: 'confirmed',
        paidByMemberId: 'm1',
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [
          { bookingId: 'c1', memberId: 'm1' },
          { bookingId: 'c1', memberId: 'm2' },
          { bookingId: 'c1', memberId: 'm3' },
          { bookingId: 'c1', memberId: 'm4' }, // Dave joins mid-trip
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    const extendedMembers: Member[] = [
      ...members,
      { id: 'm4', tripId: 't1', displayName: 'Dave (Late Joiner)', role: 'participant', joinedAt: '2026-06-11T00:00:00Z' },
    ];

    const snapshot = recalculateTripLedger({ trip, members: extendedMembers, costItems, payments: [] });

    // 40000 split 4 ways = 10000 each
    expect(snapshot.membersLedger['m4'].grossOwed).toBe(10000);
    expect(snapshot.membersLedger['m4'].netBalance).toBe(-10000);
    expect(snapshot.membersLedger['m1'].netBalance).toBe(30000);
  });

  it('handles cancelled items correctly by zeroing out owed shares', () => {
    const costItems: CostItem[] = [
      {
        id: 'c1',
        tripId: 't1',
        title: 'Cancelled Trek Tour',
        category: 'activity',
        totalAmount: 9000,
        currency: 'INR',
        startDatetime: '2026-06-12T08:00:00Z',
        endDatetime: '2026-06-12T14:00:00Z',
        status: 'cancelled',
        paidByMemberId: 'm1',
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [
          { bookingId: 'c1', memberId: 'm1' },
          { bookingId: 'c1', memberId: 'm2' },
          { bookingId: 'c1', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      },
    ];

    const snapshot = recalculateTripLedger({ trip, members, costItems, payments: [] });
    expect(snapshot.totalTripSpend).toBe(0);
    expect(snapshot.membersLedger['m1'].grossOwed).toBe(0);
    expect(snapshot.membersLedger['m2'].grossOwed).toBe(0);
    expect(snapshot.membersLedger['m3'].grossOwed).toBe(0);
  });
});
