import { DatabaseStore, db } from './store.js';
import {
  AuditLog,
  CostItem,
  Member,
  Payment,
  Trip,
  Vendor,
} from '../../core/types.js';

export function seedDatabase(targetDb: DatabaseStore = db): void {
  const tripId = 'trip-goa-2026';
  const ownerId = 'mem-alice';

  const trip: Trip = {
    id: tripId,
    name: 'Goa Beach & Adventure 2026',
    destination: 'Goa, India',
    startDate: '2026-10-15',
    endDate: '2026-10-20',
    baseCurrency: 'INR',
    status: 'active',
    ownerId: ownerId,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
  };

  const members: Member[] = [
    {
      id: 'mem-alice',
      tripId,
      displayName: 'Alice Sharma (Host)',
      email: 'alice@grouptrip.com',
      role: 'organizer',
      joinedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'mem-bob',
      tripId,
      displayName: 'Bob Mehta',
      email: 'bob@grouptrip.com',
      role: 'participant',
      joinedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'mem-charlie',
      tripId,
      displayName: 'Charlie Roy',
      email: 'charlie@grouptrip.com',
      role: 'participant',
      joinedAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'mem-dave',
      tripId,
      displayName: 'Dave Patel',
      email: 'dave@grouptrip.com',
      role: 'participant',
      joinedAt: '2026-09-01T10:00:00Z',
    },
  ];

  const vendors: Vendor[] = [
    { id: 'ven-villa', tripId, name: 'Anjuna Palm Luxury Villa', category: 'hotel', contactInfo: '+91 98230 11223' },
    { id: 'ven-cabs', tripId, name: 'Goa Coastal Cabs', category: 'transport', contactInfo: '+91 98221 44556' },
    { id: 'ven-scuba', tripId, name: 'Goa Dive Center & Water Sports', category: 'activity', contactInfo: '+91 98233 77889' },
    { id: 'ven-dining', tripId, name: 'Fisherman’s Wharf Dining', category: 'food', contactInfo: '+91 832 277 8899' },
  ];

  const costItems: CostItem[] = [
    {
      id: 'item-villa',
      tripId,
      vendorId: 'ven-villa',
      title: 'Private 2-Wing Luxury Villa (5 Nights)',
      category: 'stay',
      totalAmount: 4000000, // ₹40,000.00
      currency: 'INR',
      startDatetime: '2026-10-15T14:00:00Z',
      endDatetime: '2026-10-20T11:00:00Z',
      status: 'confirmed',
      paidByMemberId: 'mem-alice',
      cancellationPolicy: 'Free cancellation up to 48 hours before check-in',
      splitRule: {
        id: 'rule-villa',
        type: 'shared_room',
        config: {
          rooms: [
            {
              roomId: 'room-suite',
              roomName: 'Oceanview Master Suite (Alice & Bob)',
              occupantMemberIds: ['mem-alice', 'mem-bob'],
              costOverride: 2400000, // ₹24,000
            },
            {
              roomId: 'room-garden',
              roomName: 'Garden Deluxe Room (Charlie & Dave)',
              occupantMemberIds: ['mem-charlie', 'mem-dave'],
              costOverride: 1600000, // ₹16,000
            },
          ],
        },
      },
      participants: [
        { bookingId: 'item-villa', memberId: 'mem-alice', roomUnitId: 'room-suite' },
        { bookingId: 'item-villa', memberId: 'mem-bob', roomUnitId: 'room-suite' },
        { bookingId: 'item-villa', memberId: 'mem-charlie', roomUnitId: 'room-garden' },
        { bookingId: 'item-villa', memberId: 'mem-dave', roomUnitId: 'room-garden' },
      ],
      createdAt: '2026-09-02T11:00:00Z',
      updatedAt: '2026-09-02T11:00:00Z',
    },
    {
      id: 'item-van',
      tripId,
      vendorId: 'ven-cabs',
      title: 'Airport Transfer & Coastal Cruiser Van',
      category: 'transport',
      totalAmount: 360000, // ₹3,600.00
      currency: 'INR',
      startDatetime: '2026-10-15T10:00:00Z',
      endDatetime: '2026-10-15T13:00:00Z',
      status: 'confirmed',
      paidByMemberId: 'mem-bob',
      splitRule: { id: 'rule-van', type: 'equal' },
      participants: [
        { bookingId: 'item-van', memberId: 'mem-alice' },
        { bookingId: 'item-van', memberId: 'mem-bob' },
        { bookingId: 'item-van', memberId: 'mem-charlie' },
        { bookingId: 'item-van', memberId: 'mem-dave' },
      ],
      createdAt: '2026-09-03T12:00:00Z',
      updatedAt: '2026-09-03T12:00:00Z',
    },
    {
      id: 'item-scuba',
      tripId,
      vendorId: 'ven-scuba',
      title: 'Grand Island Scuba Diving & Parasailing',
      category: 'activity',
      totalAmount: 1200000, // ₹12,000.00
      currency: 'INR',
      startDatetime: '2026-10-17T08:00:00Z',
      endDatetime: '2026-10-17T14:00:00Z',
      status: 'confirmed',
      paidByMemberId: null, // to be settled / paid from pool
      splitRule: { id: 'rule-scuba', type: 'activity_based' },
      participants: [
        { bookingId: 'item-scuba', memberId: 'mem-bob' },
        { bookingId: 'item-scuba', memberId: 'mem-charlie' },
      ],
      createdAt: '2026-09-04T09:00:00Z',
      updatedAt: '2026-09-04T09:00:00Z',
    },
    {
      id: 'item-dinner',
      tripId,
      vendorId: 'ven-dining',
      title: 'Grand Seafood & Wine Feast',
      category: 'food',
      totalAmount: 1000000, // ₹10,000.00
      currency: 'INR',
      startDatetime: '2026-10-18T19:30:00Z',
      endDatetime: '2026-10-18T22:30:00Z',
      status: 'confirmed',
      paidByMemberId: 'mem-alice',
      splitRule: {
        id: 'rule-dinner',
        type: 'participant_weighted',
        config: {
          weights: {
            'mem-alice': 2.0, // Alice with guest (2x)
            'mem-bob': 1.0,
            'mem-charlie': 1.0,
            'mem-dave': 1.0,
          },
        },
      },
      participants: [
        { bookingId: 'item-dinner', memberId: 'mem-alice', overrideShare: 2.0 },
        { bookingId: 'item-dinner', memberId: 'mem-bob', overrideShare: 1.0 },
        { bookingId: 'item-dinner', memberId: 'mem-charlie', overrideShare: 1.0 },
        { bookingId: 'item-dinner', memberId: 'mem-dave', overrideShare: 1.0 },
      ],
      createdAt: '2026-09-05T15:00:00Z',
      updatedAt: '2026-09-05T15:00:00Z',
    },
    {
      id: 'item-cocktails',
      tripId,
      title: 'Sunset Welcome Cocktails & Starters',
      category: 'food',
      totalAmount: 500000, // ₹5,000.00
      currency: 'INR',
      startDatetime: '2026-10-15T18:00:00Z',
      endDatetime: '2026-10-15T20:00:00Z',
      status: 'confirmed',
      paidByMemberId: 'mem-alice',
      splitRule: { id: 'rule-cocktails', type: 'organizer_paid' },
      participants: [
        { bookingId: 'item-cocktails', memberId: 'mem-alice' },
        { bookingId: 'item-cocktails', memberId: 'mem-bob' },
        { bookingId: 'item-cocktails', memberId: 'mem-charlie' },
        { bookingId: 'item-cocktails', memberId: 'mem-dave' },
      ],
      createdAt: '2026-09-05T18:00:00Z',
      updatedAt: '2026-09-05T18:00:00Z',
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay-charlie-pool',
      tripId,
      fromMemberId: 'mem-charlie',
      toPool: true,
      amount: 600000, // ₹6,000.00
      currency: 'INR',
      method: 'upi',
      status: 'confirmed',
      notes: 'Advance deposit to trip pool for scuba & dinner',
      createdAt: '2026-09-06T10:00:00Z',
    },
    {
      id: 'pay-dave-pool',
      tripId,
      fromMemberId: 'mem-dave',
      toPool: true,
      amount: 500000, // ₹5,000.00
      currency: 'INR',
      method: 'upi',
      status: 'confirmed',
      notes: 'Initial advance share payment',
      createdAt: '2026-09-06T11:00:00Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      tripId,
      actorMemberId: 'mem-alice',
      actorName: 'Alice Sharma',
      actionType: 'CREATE_TRIP',
      entityType: 'trip',
      entityId: tripId,
      description: 'Trip "Goa Beach & Adventure 2026" created by Alice Sharma',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'log-2',
      tripId,
      actorMemberId: 'mem-alice',
      actorName: 'Alice Sharma',
      actionType: 'CREATE_COST_ITEM',
      entityType: 'cost_item',
      entityId: 'item-villa',
      description: 'Booked "Private 2-Wing Luxury Villa" for ₹40,000 (shared_room split)',
      createdAt: '2026-09-02T11:00:00Z',
    },
    {
      id: 'log-3',
      tripId,
      actorMemberId: 'mem-bob',
      actorName: 'Bob Mehta',
      actionType: 'CREATE_COST_ITEM',
      entityType: 'cost_item',
      entityId: 'item-van',
      description: 'Booked "Airport Transfer & Coastal Cruiser Van" for ₹3,600 (equal split)',
      createdAt: '2026-09-03T12:00:00Z',
    },
  ];

  targetDb.mergeSeed({
    trips: [trip],
    members,
    vendors,
    costItems,
    payments,
    pools: [{ id: 'pool-goa', tripId, currentBalance: 1100000 }],
    auditLogs,
  });

  const munnar = makeDemoTrip({
    id: 'trip-munnar-tea-trail', name: 'Munnar Tea Trail', destination: 'Munnar, Kerala',
    dates: ['2026-11-12', '2026-11-16'], people: ['Priya Nair', 'Arjun Menon', 'Meera Iyer', 'Rohan Das'],
    expenses: [
      ['Tea Valley homestay · 4 nights', 'stay', 3200000, 'Munnar Tea Valley Stay'],
      ['Eravikulam shared taxi', 'transport', 480000, 'Hill Route Cabs'],
      ['Tea museum & plantation walk', 'activity', 180000, 'Munnar Tea Experiences'],
    ],
  });
  const jaipur = makeDemoTrip({
    id: 'trip-jaipur-pink-city', name: 'Jaipur Pink City Weekend', destination: 'Jaipur, Rajasthan',
    dates: ['2026-12-04', '2026-12-06'], people: ['Kavya Singh', 'Ishaan Rao', 'Nisha Kapoor'],
    expenses: [
      ['Haveli stay · 2 nights', 'stay', 2100000, 'Hawa Mahal Haveli'],
      ['Amber Fort guided walk', 'activity', 900000, 'Pink City Walks'],
      ['Rajasthani thali dinner', 'food', 750000, 'Chokhi Dhani Kitchen'],
    ],
  });
  targetDb.mergeSeed({ ...munnar, ...jaipur,
    trips: [...munnar.trips, ...jaipur.trips], members: [...munnar.members, ...jaipur.members],
    vendors: [...munnar.vendors, ...jaipur.vendors], costItems: [...munnar.costItems, ...jaipur.costItems],
    payments: [...munnar.payments, ...jaipur.payments], pools: [...munnar.pools, ...jaipur.pools], auditLogs: [...munnar.auditLogs, ...jaipur.auditLogs],
  });

  console.log('Database seeded with rich demo trip data.');
}

function makeDemoTrip(input: {
  id: string; name: string; destination: string; dates: [string, string]; people: string[];
  expenses: [string, 'stay' | 'transport' | 'activity' | 'food', number, string][];
}) {
  const [startDate, endDate] = input.dates;
  const people = input.people;
  const trip: Trip = { id: input.id, name: input.name, destination: input.destination, startDate, endDate,
    baseCurrency: 'INR', status: 'planning', ownerId: `${input.id}-member-1`,
    createdAt: '2026-09-20T09:00:00Z', updatedAt: '2026-09-20T09:00:00Z' };
  const members: Member[] = people.map((displayName, index) => ({ id: `${input.id}-member-${index + 1}`, tripId: input.id,
    displayName, role: index === 0 ? 'organizer' : 'participant', joinedAt: '2026-09-20T09:00:00Z' }));
  const vendors: Vendor[] = input.expenses.map(([, category, , vendor], index) => ({
    id: `${input.id}-vendor-${index + 1}`, tripId: input.id, name: vendor,
    category: category === 'stay' ? 'hotel' : category === 'food' ? 'food' : category,
  }));
  const costItems: CostItem[] = input.expenses.map(([title, category, totalAmount], index) => ({
    id: `${input.id}-expense-${index + 1}`, tripId: input.id, vendorId: vendors[index].id,
    title, category, totalAmount, currency: 'INR', startDatetime: `${startDate}T09:00:00Z`,
    endDatetime: `${endDate}T18:00:00Z`, status: 'confirmed', paidByMemberId: members[index % members.length].id,
    splitRule: { id: `${input.id}-split-${index + 1}`, type: 'equal' },
    participants: members.map(member => ({ bookingId: `${input.id}-expense-${index + 1}`, memberId: member.id })),
    createdAt: '2026-09-20T09:00:00Z', updatedAt: '2026-09-20T09:00:00Z',
  }));
  const payments: Payment[] = members.slice(1, 3).map((member, index) => ({
    id: `${input.id}-contribution-${index + 1}`, tripId: input.id, fromMemberId: member.id, toPool: true,
    amount: (index + 1) * 250000, currency: 'INR', method: 'upi', status: 'confirmed',
    notes: 'Demo trip advance contribution', createdAt: '2026-09-21T10:00:00Z',
  }));
  const auditLogs: AuditLog[] = [{ id: `${input.id}-seed-log`, tripId: input.id, actorMemberId: members[0].id,
    actorName: people[0], actionType: 'CREATE_TRIP', entityType: 'trip', entityId: input.id,
    description: `${input.name} demo trip created`, createdAt: '2026-09-20T09:00:00Z' }];
  return { trips: [trip], members, vendors, costItems, payments,
    pools: [{ id: `${input.id}-pool`, tripId: input.id, currentBalance: 0 }], auditLogs };
}
