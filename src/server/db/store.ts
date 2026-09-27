import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AuditLog,
  CostItem,
  Member,
  Payment,
  Pool,
  Trip,
  Vendor,
} from '../../core/types.js';

export interface DatabaseState {
  trips: Trip[];
  members: Member[];
  vendors: Vendor[];
  costItems: CostItem[];
  payments: Payment[];
  pools: Pool[];
  auditLogs: AuditLog[];
}

const DEFAULT_STATE: DatabaseState = {
  trips: [],
  members: [],
  vendors: [],
  costItems: [],
  payments: [],
  pools: [],
  auditLogs: [],
};

export class DatabaseStore {
  private state: DatabaseState;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'db.json');
    this.state = this.load();
  }

  private load(): DatabaseState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const loaded = JSON.parse(raw);
        return Object.fromEntries(
          Object.keys(DEFAULT_STATE).map(key => [key, Array.isArray(loaded[key]) ? loaded[key] : []]),
        ) as unknown as DatabaseState;
      }
    } catch (e) {
      console.warn('Could not load existing db file, initializing default state.', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  public save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database state:', e);
    }
  }

  public reset(newState?: DatabaseState): void {
    this.state = newState ? JSON.parse(JSON.stringify(newState)) : JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.save();
  }

  /** Add seed records by stable id while preserving all existing user data. */
  public mergeSeed(data: DatabaseState): void {
    for (const key of Object.keys(DEFAULT_STATE) as (keyof DatabaseState)[]) {
      const existingIds = new Set(this.state[key].map((record: any) => record.id));
      this.state[key].push(...data[key].filter((record: any) => !existingIds.has(record.id)) as never[]);
    }
    this.save();
  }

  // --- TRIPS ---
  public getTrips(): Trip[] {
    return this.state.trips;
  }

  public getTripById(id: string): Trip | undefined {
    return this.state.trips.find(t => t.id === id);
  }

  public insertTrip(trip: Trip): Trip {
    this.state.trips.push(trip);
    this.save();
    return trip;
  }

  public updateTrip(id: string, patch: Partial<Trip>): Trip | undefined {
    const idx = this.state.trips.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.state.trips[idx] = {
      ...this.state.trips[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.state.trips[idx];
  }

  // --- MEMBERS ---
  public getMembers(tripId: string): Member[] {
    return this.state.members.filter(m => m.tripId === tripId);
  }

  public getMemberById(id: string): Member | undefined {
    return this.state.members.find(m => m.id === id);
  }

  public insertMember(member: Member): Member {
    this.state.members.push(member);
    this.save();
    return member;
  }

  public updateMember(id: string, patch: Partial<Member>): Member | undefined {
    const idx = this.state.members.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.state.members[idx] = { ...this.state.members[idx], ...patch };
    this.save();
    return this.state.members[idx];
  }

  public removeMember(id: string): boolean {
    const initialLen = this.state.members.length;
    this.state.members = this.state.members.filter(m => m.id !== id);
    this.save();
    return this.state.members.length < initialLen;
  }

  // --- VENDORS ---
  public getVendors(tripId: string): Vendor[] {
    return this.state.vendors.filter(v => v.tripId === tripId);
  }

  public insertVendor(vendor: Vendor): Vendor {
    this.state.vendors.push(vendor);
    this.save();
    return vendor;
  }

  // --- COST ITEMS (Bookings & Expenses) ---
  public getCostItems(tripId: string): CostItem[] {
    return this.state.costItems.filter(c => c.tripId === tripId);
  }

  public getCostItemById(id: string): CostItem | undefined {
    return this.state.costItems.find(c => c.id === id);
  }

  public insertCostItem(item: CostItem): CostItem {
    this.state.costItems.push(item);
    this.save();
    return item;
  }

  public updateCostItem(id: string, patch: Partial<CostItem>): CostItem | undefined {
    const idx = this.state.costItems.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.state.costItems[idx] = {
      ...this.state.costItems[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.state.costItems[idx];
  }

  public deleteCostItem(id: string): boolean {
    const initialLen = this.state.costItems.length;
    this.state.costItems = this.state.costItems.filter(c => c.id !== id);
    this.save();
    return this.state.costItems.length < initialLen;
  }

  // --- PAYMENTS ---
  public getPayments(tripId: string): Payment[] {
    return this.state.payments.filter(p => p.tripId === tripId);
  }

  public insertPayment(payment: Payment): Payment {
    this.state.payments.push(payment);
    this.save();
    return payment;
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(tripId: string): AuditLog[] {
    return this.state.auditLogs
      .filter(l => l.tripId === tripId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public logAction(entry: {
    tripId: string;
    actorMemberId: string;
    actorName?: string;
    actionType: string;
    entityType: string;
    entityId: string;
    beforeState?: Record<string, any> | null;
    afterState?: Record<string, any> | null;
    description: string;
  }): AuditLog {
    const log: AuditLog = {
      id: uuidv4(),
      tripId: entry.tripId,
      actorMemberId: entry.actorMemberId,
      actorName: entry.actorName,
      actionType: entry.actionType,
      entityType: entry.entityType,
      entityId: entry.entityId,
      beforeState: entry.beforeState,
      afterState: entry.afterState,
      description: entry.description,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.push(log);
    this.save();
    return log;
  }
}

export const db = new DatabaseStore();
