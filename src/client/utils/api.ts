import {
  AuditLog,
  CostItem,
  DraftBookingSuggestion,
  InconsistencyWarning,
  Member,
  Payment,
  SettlementTransaction,
  Trip,
  TripLedgerSnapshot,
} from '../../core/types.js';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || `API request failed with status ${response.status}`);
  }

  return data.data;
}

export const api = {
  // Trips
  getTrips: () => request<Trip[]>('/trips'),
  getTrip: (tripId: string) =>
    request<{
      trip: Trip;
      members: Member[];
      costItems: CostItem[];
      payments: Payment[];
      vendors: any[];
    }>(`/trips/${tripId}`),
  createTrip: (body: { name: string; startDate: string; endDate: string; baseCurrency?: string; organizerName?: string }) =>
    request<Trip>('/trips', { method: 'POST', body: JSON.stringify(body) }),
  updateTripStatus: (tripId: string, status: string, actorMemberId?: string) =>
    request<Trip>(`/trips/${tripId}/status`, { method: 'PATCH', body: JSON.stringify({ status, actorMemberId }) }),
  reseedDatabase: () => request<void>('/seed', { method: 'POST' }),

  // Members
  getMembers: (tripId: string) => request<Member[]>(`/trips/${tripId}/members`),
  addMember: (tripId: string, body: { displayName: string; email?: string; role?: string; actorMemberId?: string }) =>
    request<Member>(`/trips/${tripId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (tripId: string, memberId: string, body: Partial<Member> & { actorMemberId?: string }) =>
    request<Member>(`/trips/${tripId}/members/${memberId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  markMemberLeft: (tripId: string, memberId: string, leaveDate?: string, actorMemberId?: string) =>
    request<Member>(`/trips/${tripId}/members/${memberId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ leaveDate, actorMemberId }),
    }),

  // Cost Items
  getCostItems: (tripId: string) => request<CostItem[]>(`/trips/${tripId}/cost-items`),
  createCostItem: (tripId: string, body: any) =>
    request<CostItem>(`/trips/${tripId}/cost-items`, { method: 'POST', body: JSON.stringify(body) }),
  updateCostItem: (tripId: string, itemId: string, body: any) =>
    request<CostItem>(`/trips/${tripId}/cost-items/${itemId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  cancelCostItem: (tripId: string, itemId: string, body: { refundAmount?: number; reason?: string; actorMemberId?: string }) =>
    request<{ costItem: CostItem; refundPayment: Payment | null }>(`/trips/${tripId}/cost-items/${itemId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Payments
  getPayments: (tripId: string) => request<Payment[]>(`/trips/${tripId}/payments`),
  recordPayment: (tripId: string, body: any) =>
    request<Payment>(`/trips/${tripId}/payments`, { method: 'POST', body: JSON.stringify(body) }),

  // Ledger & Calculations
  getTripLedger: (tripId: string) => request<TripLedgerSnapshot>(`/trips/${tripId}/ledger`),
  explainMember: (tripId: string, memberId: string) => request<any>(`/trips/${tripId}/ledger/explain/${memberId}`),
  getSettlementPlan: (tripId: string) =>
    request<{
      tripId: string;
      computedAt: string;
      currency: string;
      transactions: SettlementTransaction[];
      memberBalances: any;
    }>(`/trips/${tripId}/settlement`),
  getInconsistencies: (tripId: string) => request<InconsistencyWarning[]>(`/trips/${tripId}/inconsistencies`),

  // Audit Logs
  getAuditLogs: (tripId: string) => request<AuditLog[]>(`/trips/${tripId}/audit-logs`),

  // AI Chat Parser
  getAiSettings: () => request<{ configured: boolean; model: string; baseUrl: string }>('/ai/settings'),
  saveAiSettings: (body: { apiKey: string; model: string; baseUrl: string }) =>
    request<{ configured: boolean; model: string; baseUrl: string }>('/ai/settings', { method: 'PUT', body: JSON.stringify(body) }),
  testAiConnection: () => request<{ connected: boolean; model: string }>('/ai/test-connection', { method: 'POST' }),
  parseChatItinerary: (tripId: string, chatText: string) =>
    request<{
      tripId: string;
      parsedCount: number;
      suggestions: DraftBookingSuggestion[];
    }>(`/trips/${tripId}/ai/parse-chat`, {
      method: 'POST',
      body: JSON.stringify({ chatText }),
    }),
};
