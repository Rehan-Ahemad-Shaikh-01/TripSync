/**
 * GrouptripLedger - Core Domain Types
 * Based on PROJECT_BRIEF.md
 * 
 * Non-negotiable principles:
 * 1. Balances are derived, never stored as source of truth.
 * 2. Every cost item has an explicit SplitRule.
 * 3. Money math uses integer minor units (paise/cents).
 */

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type TripStatus = 'planning' | 'active' | 'settled';

export type MemberRole = 'organizer' | 'participant';

export type VendorCategory = 'airline' | 'hotel' | 'activity' | 'transport' | 'food' | 'other';

export type CostItemCategory = 'flight' | 'stay' | 'activity' | 'transport' | 'food' | 'miscellaneous';

export type CostItemStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'modified';

export type SplitType = 
  | 'equal'
  | 'participant_weighted'
  | 'shared_room'
  | 'activity_based'
  | 'custom'
  | 'organizer_paid';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'pool' | 'bank_transfer';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed';

export interface Trip {
  id: string;
  name: string;
  destination?: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
  baseCurrency: Currency;
  status: TripStatus;
  ownerId: string;   // Organizer member ID
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  tripId: string;
  userId?: string | null;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  role: MemberRole;
  joinedAt: string;       // ISO datetime string
  leftAt?: string | null; // ISO datetime string (null = still active)
}

export interface Vendor {
  id: string;
  tripId: string;
  name: string;
  category: VendorCategory;
  contactInfo?: string | null;
}

export interface BookingParticipant {
  bookingId: string;
  memberId: string;
  overrideShare?: number | null; // For participant-weighted (e.g., 2.0 = 2x, 0.5 = 0.5x)
  roomUnitId?: string | null;    // For shared-room split type
}

export interface SharedRoomConfig {
  rooms: Array<{
    roomId: string;
    roomName?: string;
    occupantMemberIds: string[];
    costOverride?: number | null; // Minor units override if specific room has distinct price
  }>;
}

export interface WeightedSplitConfig {
  weights: Record<string, number>; // memberId -> weight (e.g. 1.0, 2.0, 0.5)
}

export interface CustomSplitConfig {
  shares: Record<string, number>; // memberId -> explicitly assigned minor units
}

export interface SplitRule {
  id: string;
  type: SplitType;
  config?: SharedRoomConfig | WeightedSplitConfig | CustomSplitConfig | Record<string, any> | null;
}

/**
 * Unified CostItem (Booking or Expense)
 * Every expense is a lightweight CostItem with vendorId nullable.
 */
export interface CostItem {
  id: string;
  tripId: string;
  vendorId?: string | null;
  title: string;
  category: CostItemCategory;
  totalAmount: number; // Integer in minor units (e.g. 100000 = ₹1,000.00)
  currency: Currency;
  startDatetime: string; // ISO string
  endDatetime: string;   // ISO string
  status: CostItemStatus;
  cancellationPolicy?: string | null;
  paidByMemberId?: string | null; // If paid upfront by a specific member rather than vendor booking
  splitRule: SplitRule;
  participants: BookingParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  tripId: string;
  fromMemberId: string;
  // Destination target: EITHER toPool OR toVendorId OR toMemberId (settlement payment)
  toPool?: boolean;
  toVendorId?: string | null;
  toMemberId?: string | null;
  amount: number; // Integer in minor units
  currency: Currency;
  method: PaymentMethod;
  appliesToCostItemId?: string | null; // null = general pool contribution or trip settlement
  refundForCostItemId?: string | null; // Vendor refund credited back to the trip pool
  status: PaymentStatus;
  notes?: string | null;
  createdAt: string;
}

export interface Pool {
  id: string;
  tripId: string;
  currentBalance: number; // Integer in minor units
  fundingThresholdRules?: Record<string, any> | null;
}

/**
 * Derived item breakdown for explainable auditability
 */
export interface CostItemShareBreakdown {
  costItemId: string;
  itemTitle: string;
  totalAmount: number;
  splitType: SplitType;
  memberShares: Record<string, number>; // memberId -> owed amount in minor units
  explanation: Record<string, string>;  // memberId -> human-readable explanation
}

/**
 * Derived Ledger Entry per member
 */
export interface MemberLedgerEntry {
  memberId: string;
  displayName: string;
  role: MemberRole;
  isActive: boolean;
  grossOwed: number;  // Total minor units this member owes across all active items
  grossPaid: number;  // Total minor units this member has paid directly / to pool
  netBalance: number; // grossPaid - grossOwed (Positive = owed money back, Negative = owes money)
  sharesByCostItem: Array<{
    costItemId: string;
    costItemTitle: string;
    owedAmount: number;
    splitType: SplitType;
    explanation: string;
  }>;
  paymentsList: Payment[];
}

export interface TripLedgerSnapshot {
  tripId: string;
  computedAt: string;
  currency: Currency;
  totalTripSpend: number;
  totalCollected: number;
  poolBalance: number;
  membersLedger: Record<string, MemberLedgerEntry>;
  itemBreakdowns: Record<string, CostItemShareBreakdown>;
}

export interface SettlementTransaction {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number; // minor units
  currency: Currency;
}

export interface InconsistencyWarning {
  id: string;
  code: 'DOUBLE_BOOKING' | 'ZERO_PARTICIPANTS' | 'OVERPAYMENT' | 'LEFT_MEMBER_FUTURE_COST' | 'CONFIRMED_UNPAID';
  severity: 'warning' | 'info';
  title: string;
  description: string;
  entityType: 'cost_item' | 'member' | 'payment';
  entityId: string;
  suggestedAction?: string;
}

export interface AuditLog {
  id: string;
  tripId: string;
  actorMemberId: string;
  actorName?: string;
  actionType: string;
  entityType: string;
  entityId: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  description: string;
  createdAt: string;
}

export interface DraftBookingSuggestion {
  id: string;
  title: string;
  category: CostItemCategory;
  vendorName?: string;
  estimatedAmount: number; // minor units
  currency: Currency;
  startDate?: string;
  endDate?: string;
  suggestedSplitType: SplitType;
  suggestedParticipantNames: string[];
  rawSnippet: string;
}
