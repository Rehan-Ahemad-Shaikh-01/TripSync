import { describe, expect, it } from 'vitest';
import { simplifyDebts } from '../src/core/settlement.js';
import { TripLedgerSnapshot } from '../src/core/types.js';

describe('Settlement & Debt Simplification', () => {
  it('simplifies pairwise debts to minimal transactions', () => {
    // Alice is owed +18000
    // Bob owes -6000
    // Charlie owes -7000
    // Dave owes -5000
    const snapshot: TripLedgerSnapshot = {
      tripId: 't1',
      computedAt: new Date().toISOString(),
      currency: 'INR',
      totalTripSpend: 36000,
      totalCollected: 0,
      poolBalance: 0,
      itemBreakdowns: {},
      membersLedger: {
        m1: {
          memberId: 'm1',
          displayName: 'Alice',
          role: 'organizer',
          isActive: true,
          grossOwed: 12000,
          grossPaid: 30000,
          netBalance: 18000,
          sharesByCostItem: [],
          paymentsList: [],
        },
        m2: {
          memberId: 'm2',
          displayName: 'Bob',
          role: 'participant',
          isActive: true,
          grossOwed: 12000,
          grossPaid: 6000,
          netBalance: -6000,
          sharesByCostItem: [],
          paymentsList: [],
        },
        m3: {
          memberId: 'm3',
          displayName: 'Charlie',
          role: 'participant',
          isActive: true,
          grossOwed: 12000,
          grossPaid: 5000,
          netBalance: -7000,
          sharesByCostItem: [],
          paymentsList: [],
        },
        m4: {
          memberId: 'm4',
          displayName: 'Dave',
          role: 'participant',
          isActive: true,
          grossOwed: 5000,
          grossPaid: 0,
          netBalance: -5000,
          sharesByCostItem: [],
          paymentsList: [],
        },
      },
    };

    const txs = simplifyDebts(snapshot);
    // There should be 3 transactions directly to Alice
    expect(txs.length).toBe(3);

    const totalTransferred = txs.reduce((sum, tx) => sum + tx.amount, 0);
    expect(totalTransferred).toBe(18000);

    // All destinations should be Alice (m1)
    expect(txs.every(tx => tx.toMemberId === 'm1')).toBe(true);

    const charlieTx = txs.find(tx => tx.fromMemberId === 'm3');
    expect(charlieTx?.amount).toBe(7000);

    const bobTx = txs.find(tx => tx.fromMemberId === 'm2');
    expect(bobTx?.amount).toBe(6000);

    const daveTx = txs.find(tx => tx.fromMemberId === 'm4');
    expect(daveTx?.amount).toBe(5000);
  });
});
