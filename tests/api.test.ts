import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseStore } from '../src/server/db/store.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seedDatabase } from '../src/server/db/seed.js';
import { recalculateTripLedger } from '../src/core/ledger.js';
import { simplifyDebts } from '../src/core/settlement.js';

describe('End-to-End API Store & Flow Integration', () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tripsync-api-test-'));
  const db = new DatabaseStore(path.join(testDir, 'db.json'));
  afterAll(() => fs.rmSync(testDir, { recursive: true, force: true }));
  beforeAll(() => {
    seedDatabase(db);
  });

  it('verifies seeded trip structure and initial ledger balance', () => {
    const trip = db.getTripById('trip-goa-2026');
    expect(trip).toBeDefined();
    expect(trip?.name).toBe('Goa Beach & Adventure 2026');

    const members = db.getMembers('trip-goa-2026');
    expect(members.length).toBe(4);

    const costItems = db.getCostItems('trip-goa-2026');
    expect(costItems.length).toBe(5);

    const payments = db.getPayments('trip-goa-2026');
    expect(payments.length).toBe(2);

    const snapshot = recalculateTripLedger({
      trip: trip!,
      members,
      costItems,
      payments,
    });

    // Total spend = 40000 + 3600 + 12000 + 10000 + 5000 = 70600 (in INR, 7060000 paise)
    expect(snapshot.totalTripSpend).toBe(7060000);

    // Sum of net balances = total grossPaid across members - total grossOwed across members
    const totalGrossPaid = Object.values(snapshot.membersLedger).reduce((sum, m) => sum + m.grossPaid, 0);
    const totalGrossOwed = Object.values(snapshot.membersLedger).reduce((sum, m) => sum + m.grossOwed, 0);
    const sumNet = Object.values(snapshot.membersLedger).reduce((sum, m) => sum + m.netBalance, 0);

    expect(sumNet).toBe(totalGrossPaid - totalGrossOwed);
  });

  it('verifies cancellation with refund updates ledger correctly', () => {
    const trip = db.getTripById('trip-goa-2026')!;
    const members = db.getMembers(trip.id);
    
    // Cancel the scuba item (₹12,000)
    db.updateCostItem('item-scuba', { status: 'cancelled' });

    const updatedCostItems = db.getCostItems(trip.id);
    const payments = db.getPayments(trip.id);

    const snapshot = recalculateTripLedger({
      trip,
      members,
      costItems: updatedCostItems,
      payments,
    });

    // Total spend should decrease by 1200000 paise
    expect(snapshot.totalTripSpend).toBe(7060000 - 1200000);
  });

  it('verifies final debt simplification on current balances', () => {
    const trip = db.getTripById('trip-goa-2026')!;
    const members = db.getMembers(trip.id);
    const costItems = db.getCostItems(trip.id);
    const payments = db.getPayments(trip.id);

    const snapshot = recalculateTripLedger({ trip, members, costItems, payments });
    const txs = simplifyDebts(snapshot);

    expect(Array.isArray(txs)).toBe(true);
    // Settlement transactions should strictly minimize transfers
    expect(txs.length).toBeLessThanOrEqual(members.length - 1);
  });
});
