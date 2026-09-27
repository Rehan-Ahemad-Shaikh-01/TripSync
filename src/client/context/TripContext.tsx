import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuditLog,
  CostItem,
  InconsistencyWarning,
  Member,
  Payment,
  SettlementTransaction,
  Trip,
  TripLedgerSnapshot,
} from '../../core/types.js';
import { api } from '../utils/api.js';

export type ScreenId = 'dashboard' | 'digital_twin' | 'item_editor' | 'personal' | 'settle' | 'ai_parser';

interface TripContextType {
  tripId: string;
  trips: Trip[];
  selectTrip: (id: string) => void;
  trip: Trip | null;
  members: Member[];
  costItems: CostItem[];
  payments: Payment[];
  vendors: any[];
  ledgerSnapshot: TripLedgerSnapshot | null;
  settlementTransactions: SettlementTransaction[];
  inconsistencies: InconsistencyWarning[];
  auditLogs: AuditLog[];
  loading: boolean;
  error: string | null;

  // Active perspective
  currentMemberId: string;
  setCurrentMemberId: (id: string) => void;
  currentMember: Member | null;
  isOrganizer: boolean;

  // Navigation state
  activeScreen: ScreenId;
  navigateTo: (screen: ScreenId, params?: { itemId?: string }) => void;
  editingItemId: string | null;

  // Modals
  auditModalOpen: boolean;
  auditModalMemberId: string | null;
  openAuditModal: (memberId?: string) => void;
  closeAuditModal: () => void;

  isPaymentModalOpen: boolean;
  openPaymentModal: () => void;
  closePaymentModal: () => void;

  isMemberModalOpen: boolean;
  openMemberModal: () => void;
  closeMemberModal: () => void;

  // Mutations
  refreshAll: () => Promise<void>;
  createCostItem: (data: any) => Promise<CostItem>;
  updateCostItem: (itemId: string, data: any) => Promise<CostItem>;
  cancelCostItem: (itemId: string, refundAmount?: number, reason?: string) => Promise<void>;
  recordPayment: (data: any) => Promise<Payment>;
  addMember: (displayName: string, email?: string, role?: string) => Promise<Member>;
  markMemberLeft: (memberId: string, leaveDate?: string) => Promise<void>;
  reseed: () => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tripId, setTripId] = useState<string>('trip-goa-2026');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [ledgerSnapshot, setLedgerSnapshot] = useState<TripLedgerSnapshot | null>(null);
  const [settlementTransactions, setSettlementTransactions] = useState<SettlementTransaction[]>([]);
  const [inconsistencies, setInconsistencies] = useState<InconsistencyWarning[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [currentMemberId, setCurrentMemberId] = useState<string>('mem-alice');
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Modals
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditModalMemberId, setAuditModalMemberId] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState<boolean>(false);

  const refreshAll = async () => {
    try {
      setError(null);
      const availableTrips = await api.getTrips();
      setTrips(availableTrips);
      const tripData = await api.getTrip(tripId);
      setTrip(tripData.trip);
      setMembers(tripData.members);
      setCostItems(tripData.costItems);
      setPayments(tripData.payments);
      setVendors(tripData.vendors);

      // Re-derive ledger snapshot
      const ledger = await api.getTripLedger(tripId);
      setLedgerSnapshot(ledger);

      // Fetch settlement plan
      const settlement = await api.getSettlementPlan(tripId);
      setSettlementTransactions(settlement.transactions);

      // Fetch anomalies & inconsistencies
      const warns = await api.getInconsistencies(tripId);
      setInconsistencies(warns);

      // Fetch audit logs
      const logs = await api.getAuditLogs(tripId);
      setAuditLogs(logs);

      // Set default active member if not present
      if (!currentMemberId && tripData.members.length > 0) {
        setCurrentMemberId(tripData.members[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load trip data:', err);
      setError(err.message || 'Error loading trip');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [tripId]);

  const currentMember = members.find(m => m.id === currentMemberId) || members[0] || null;
  const isOrganizer = currentMember?.role === 'organizer' || trip?.ownerId === currentMemberId;

  const navigateTo = (screen: ScreenId, params?: { itemId?: string }) => {
    setEditingItemId(params?.itemId || null);
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuditModal = (memberId?: string) => {
    setAuditModalMemberId(memberId || currentMemberId);
    setAuditModalOpen(true);
  };

  const closeAuditModal = () => {
    setAuditModalOpen(false);
    setAuditModalMemberId(null);
  };

  const openPaymentModal = () => setIsPaymentModalOpen(true);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  const openMemberModal = () => setIsMemberModalOpen(true);
  const closeMemberModal = () => setIsMemberModalOpen(false);

  // Mutations
  const createCostItem = async (data: any) => {
    const created = await api.createCostItem(tripId, {
      ...data,
      actorMemberId: currentMemberId,
    });
    await refreshAll();
    return created;
  };

  const updateCostItem = async (itemId: string, data: any) => {
    const updated = await api.updateCostItem(tripId, itemId, {
      ...data,
      actorMemberId: currentMemberId,
    });
    await refreshAll();
    return updated;
  };

  const cancelCostItem = async (itemId: string, refundAmount: number = 0, reason?: string) => {
    await api.cancelCostItem(tripId, itemId, {
      refundAmount,
      reason,
      actorMemberId: currentMemberId,
    });
    await refreshAll();
  };

  const recordPayment = async (data: any) => {
    const payment = await api.recordPayment(tripId, {
      ...data,
      actorMemberId: currentMemberId,
    });
    await refreshAll();
    return payment;
  };

  const addMember = async (displayName: string, email?: string, role: string = 'participant') => {
    const member = await api.addMember(tripId, {
      displayName,
      email,
      role,
      actorMemberId: currentMemberId,
    });
    await refreshAll();
    return member;
  };

  const markMemberLeft = async (memberId: string, leaveDate?: string) => {
    await api.markMemberLeft(tripId, memberId, leaveDate, currentMemberId);
    await refreshAll();
  };

  const reseed = async () => {
    setLoading(true);
    await api.reseedDatabase();
    await refreshAll();
  };

  return (
    <TripContext.Provider
      value={{
        tripId,
        trips,
        selectTrip: (id: string) => { setCurrentMemberId(''); setTripId(id); setActiveScreen('dashboard'); },
        trip,
        members,
        costItems,
        payments,
        vendors,
        ledgerSnapshot,
        settlementTransactions,
        inconsistencies,
        auditLogs,
        loading,
        error,
        currentMemberId,
        setCurrentMemberId,
        currentMember,
        isOrganizer,
        activeScreen,
        navigateTo,
        editingItemId,
        auditModalOpen,
        auditModalMemberId,
        openAuditModal,
        closeAuditModal,
        isPaymentModalOpen,
        openPaymentModal,
        closePaymentModal,
        isMemberModalOpen,
        openMemberModal,
        closeMemberModal,
        refreshAll,
        createCostItem,
        updateCostItem,
        cancelCostItem,
        recordPayment,
        addMember,
        markMemberLeft,
        reseed,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
