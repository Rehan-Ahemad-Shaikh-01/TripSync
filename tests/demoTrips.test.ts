import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseStore } from '../src/server/db/store.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { seedDatabase } from '../src/server/db/seed.js';
import { getTwinScenario } from '../src/client/screens/digitalTwinModel.js';

describe('TripSync demo trips and Digital Twin scenarios', () => {
  const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tripsync-demo-test-'));
  const db = new DatabaseStore(path.join(testDir, 'db.json'));
  afterAll(() => fs.rmSync(testDir, { recursive: true, force: true }));
  beforeEach(() => db.reset());

  it('seeds the two trips with members, expected expense categories and contributions', () => {
    seedDatabase(db);
    const munnar = db.getTripById('trip-munnar-tea-trail')!;
    const jaipur = db.getTripById('trip-jaipur-pink-city')!;
    expect(munnar.destination).toBe('Munnar, Kerala');
    expect(db.getMembers(munnar.id)).toHaveLength(4);
    expect(db.getCostItems(munnar.id).map(item => item.category)).toEqual(['stay', 'transport', 'activity']);
    expect(db.getPayments(munnar.id)).toHaveLength(2);
    expect(jaipur.destination).toBe('Jaipur, Rajasthan');
    expect(db.getMembers(jaipur.id)).toHaveLength(3);
    expect(db.getCostItems(jaipur.id).map(item => item.category)).toEqual(['stay', 'activity', 'food']);
    expect(db.getPayments(jaipur.id)).toHaveLength(2);
  });

  it('merges seed data idempotently and preserves existing records', () => {
    seedDatabase(db);
    const existing = db.getTripById('trip-munnar-tea-trail')!;
    db.updateTrip(existing.id, { name: 'My edited Munnar trip' });
    const itemCount = db.getCostItems(existing.id).length;
    seedDatabase(db);
    expect(db.getTripById(existing.id)?.name).toBe('My edited Munnar trip');
    expect(db.getCostItems(existing.id)).toHaveLength(itemCount);
  });

  it('returns destination content and updates demo estimates as rainfall changes', () => {
    const clear = getTwinScenario('Goa', 0);
    const rainy = getTwinScenario('Goa', 90);
    const hills = getTwinScenario('Munnar', 40);
    expect(clear.places).toContain('Candolim');
    expect(hills.places).toContain('Tea Museum');
    expect(getTwinScenario('Jaipur', 20).places).toContain('Hawa Mahal');
    expect(rainy.weather).toContain('90%');
    expect(rainy.estimates.transport).toBeGreaterThan(clear.estimates.transport);
    expect(rainy.suggestions[0].text).not.toBe(clear.suggestions[0].text);
  });
});
