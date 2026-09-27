import { describe, expect, it } from 'vitest';
import {
  activityBasedSplitStrategy,
  distributeEqualWithRemainder,
  equalSplitStrategy,
  organizerPaidSplitStrategy,
  participantWeightedSplitStrategy,
  sharedRoomSplitStrategy,
} from '../src/core/splitStrategies.js';
import { CostItem, Member } from '../src/core/types.js';

const mockMembers: Member[] = [
  { id: 'm1', tripId: 't1', displayName: 'Alice (Host)', role: 'organizer', joinedAt: '2026-06-01T00:00:00Z' },
  { id: 'm2', tripId: 't1', displayName: 'Bob', role: 'participant', joinedAt: '2026-06-01T00:00:00Z' },
  { id: 'm3', tripId: 't1', displayName: 'Charlie', role: 'participant', joinedAt: '2026-06-01T00:00:00Z' },
  { id: 'm4', tripId: 't1', displayName: 'Dave', role: 'participant', joinedAt: '2026-06-01T00:00:00Z' },
];

describe('Split Strategies & Deterministic Remainder', () => {
  describe('distributeEqualWithRemainder', () => {
    it('should split 1000 paise 3 ways with deterministic 334, 333, 333', () => {
      const shares = distributeEqualWithRemainder(1000, ['m1', 'm2', 'm3']);
      const total = Object.values(shares).reduce((a, b) => a + b, 0);
      expect(total).toBe(1000);
      // Alphabetical order: m1 gets remainder paise
      expect(shares['m1']).toBe(334);
      expect(shares['m2']).toBe(333);
      expect(shares['m3']).toBe(333);
    });

    it('should split 10000 paise 4 ways equally (2500 each)', () => {
      const shares = distributeEqualWithRemainder(10000, ['m1', 'm2', 'm3', 'm4']);
      expect(shares['m1']).toBe(2500);
      expect(shares['m2']).toBe(2500);
      expect(shares['m3']).toBe(2500);
      expect(shares['m4']).toBe(2500);
    });
  });

  describe('equalSplitStrategy', () => {
    it('splits total across participants and reconciles exact total', () => {
      const item: CostItem = {
        id: 'c1',
        tripId: 't1',
        title: 'Airport Cab',
        category: 'transport',
        totalAmount: 1550, // 15.50
        currency: 'INR',
        startDatetime: '2026-06-10T10:00:00Z',
        endDatetime: '2026-06-10T11:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr1', type: 'equal' },
        participants: [{ bookingId: 'c1', memberId: 'm1' }, { bookingId: 'c1', memberId: 'm2' }, { bookingId: 'c1', memberId: 'm3' }],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };

      const result = equalSplitStrategy(item, mockMembers, 'm1');
      const sum = Object.values(result.memberShares).reduce((a, b) => a + b, 0);
      expect(sum).toBe(1550);
      expect(result.memberShares['m1']).toBe(517); // 1550 = 516*3 + 2 => m1:517, m2:517, m3:516
      expect(result.memberShares['m2']).toBe(517);
      expect(result.memberShares['m3']).toBe(516);
    });
  });

  describe('participantWeightedSplitStrategy', () => {
    it('splits proportional to weights and sums to exact total', () => {
      const item: CostItem = {
        id: 'c2',
        tripId: 't1',
        title: 'Group Dinner Buffet',
        category: 'food',
        totalAmount: 7000,
        currency: 'INR',
        startDatetime: '2026-06-10T20:00:00Z',
        endDatetime: '2026-06-10T22:00:00Z',
        status: 'confirmed',
        splitRule: {
          id: 'sr2',
          type: 'participant_weighted',
          config: {
            weights: {
              m1: 2.0, // Alice with plus-one (2x)
              m2: 1.0, // Bob (1x)
              m3: 0.5, // Charlie kid (0.5x)
            },
          },
        },
        participants: [
          { bookingId: 'c2', memberId: 'm1' },
          { bookingId: 'c2', memberId: 'm2' },
          { bookingId: 'c2', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };

      // Total weights = 3.5. 7000 / 3.5 = 2000 per unit.
      // m1 (2.0) = 4000, m2 (1.0) = 2000, m3 (0.5) = 1000
      const result = participantWeightedSplitStrategy(item, mockMembers, 'm1');
      expect(result.memberShares['m1']).toBe(4000);
      expect(result.memberShares['m2']).toBe(2000);
      expect(result.memberShares['m3']).toBe(1000);
      const sum = Object.values(result.memberShares).reduce((a, b) => a + b, 0);
      expect(sum).toBe(7000);
    });
  });

  describe('sharedRoomSplitStrategy', () => {
    it('splits room costs among room occupants accurately', () => {
      const item: CostItem = {
        id: 'c3',
        tripId: 't1',
        title: 'Beach Resort Villa (2 Rooms)',
        category: 'stay',
        totalAmount: 12000, // 120.00
        currency: 'INR',
        startDatetime: '2026-06-10T14:00:00Z',
        endDatetime: '2026-06-12T11:00:00Z',
        status: 'confirmed',
        splitRule: {
          id: 'sr3',
          type: 'shared_room',
          config: {
            rooms: [
              {
                roomId: 'r1',
                roomName: 'Master Suite (Alice & Bob)',
                occupantMemberIds: ['m1', 'm2'],
                costOverride: 7000,
              },
              {
                roomId: 'r2',
                roomName: 'Standard Room (Charlie & Dave)',
                occupantMemberIds: ['m3', 'm4'],
                costOverride: 5000,
              },
            ],
          },
        },
        participants: [
          { bookingId: 'c3', memberId: 'm1' },
          { bookingId: 'c3', memberId: 'm2' },
          { bookingId: 'c3', memberId: 'm3' },
          { bookingId: 'c3', memberId: 'm4' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };

      const result = sharedRoomSplitStrategy(item, mockMembers, 'm1');
      expect(result.memberShares['m1']).toBe(3500);
      expect(result.memberShares['m2']).toBe(3500);
      expect(result.memberShares['m3']).toBe(2500);
      expect(result.memberShares['m4']).toBe(2500);
      const sum = Object.values(result.memberShares).reduce((a, b) => a + b, 0);
      expect(sum).toBe(12000);
    });
  });

  describe('activityBasedSplitStrategy', () => {
    it('only charges opted-in participants and assigns 0 to others', () => {
      const item: CostItem = {
        id: 'c4',
        tripId: 't1',
        title: 'Scuba Diving Tour',
        category: 'activity',
        totalAmount: 6000,
        currency: 'INR',
        startDatetime: '2026-06-11T09:00:00Z',
        endDatetime: '2026-06-11T13:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr4', type: 'activity_based' },
        // Only Bob (m2) and Charlie (m3) join
        participants: [
          { bookingId: 'c4', memberId: 'm2' },
          { bookingId: 'c4', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };

      const result = activityBasedSplitStrategy(item, mockMembers, 'm1');
      expect(result.memberShares['m2']).toBe(3000);
      expect(result.memberShares['m3']).toBe(3000);
      expect(result.memberShares['m1']).toBe(0);
      expect(result.memberShares['m4']).toBe(0);
    });
  });

  describe('organizerPaidSplitStrategy', () => {
    it('assigns 100% to organizer and 0 to all participants', () => {
      const item: CostItem = {
        id: 'c5',
        tripId: 't1',
        title: 'Welcome Drinks on Organizer',
        category: 'food',
        totalAmount: 4500,
        currency: 'INR',
        startDatetime: '2026-06-10T19:00:00Z',
        endDatetime: '2026-06-10T20:00:00Z',
        status: 'confirmed',
        splitRule: { id: 'sr5', type: 'organizer_paid' },
        participants: [
          { bookingId: 'c5', memberId: 'm1' },
          { bookingId: 'c5', memberId: 'm2' },
          { bookingId: 'c5', memberId: 'm3' },
        ],
        createdAt: '2026-06-01T00:00:00Z',
        updatedAt: '2026-06-01T00:00:00Z',
      };

      const result = organizerPaidSplitStrategy(item, mockMembers, 'm1');
      expect(result.memberShares['m1']).toBe(4500);
      expect(result.memberShares['m2']).toBe(0);
      expect(result.memberShares['m3']).toBe(0);
    });
  });
});
