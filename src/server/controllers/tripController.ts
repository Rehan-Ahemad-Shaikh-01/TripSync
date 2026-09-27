import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Trip } from '../../core/types.js';
import { db } from '../db/store.js';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

export const getTrips = (_req: Request, res: Response) => {
  const trips = db.getTrips();
  res.json({ success: true, data: trips });
};

export const getTrip = (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const trip = db.getTripById(id);
  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }
  const members = db.getMembers(id);
  const costItems = db.getCostItems(id);
  const payments = db.getPayments(id);
  const vendors = db.getVendors(id);

  res.json({
    success: true,
    data: {
      trip,
      members,
      costItems,
      payments,
      vendors,
    },
  });
};

export const createTrip = (req: Request, res: Response) => {
  const { name, startDate, endDate, baseCurrency = 'INR', organizerName = 'Organizer' } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ success: false, error: 'name, startDate, and endDate are required' });
  }

  const tripId = `trip-${uuidv4().slice(0, 8)}`;
  const ownerId = `mem-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const trip: Trip = {
    id: tripId,
    name,
    startDate,
    endDate,
    baseCurrency,
    status: 'planning',
    ownerId,
    createdAt: now,
    updatedAt: now,
  };

  db.insertTrip(trip);

  db.insertMember({
    id: ownerId,
    tripId,
    displayName: organizerName,
    role: 'organizer',
    joinedAt: now,
  });

  db.logAction({
    tripId,
    actorMemberId: ownerId,
    actorName: organizerName,
    actionType: 'CREATE_TRIP',
    entityType: 'trip',
    entityId: tripId,
    description: `Created trip "${name}" (${startDate} to ${endDate})`,
    afterState: trip,
  });

  res.status(201).json({ success: true, data: trip });
};

export const updateTripStatus = (req: Request, res: Response) => {
  const id = getParam(req.params.id);
  const { status, actorMemberId = 'system' } = req.body;

  const trip = db.getTripById(id);
  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const before = { ...trip };
  const updated = db.updateTrip(id, { status });

  db.logAction({
    tripId: id,
    actorMemberId: String(actorMemberId),
    actionType: 'UPDATE_TRIP_STATUS',
    entityType: 'trip',
    entityId: id,
    beforeState: before,
    afterState: updated,
    description: `Trip status changed from ${before.status} to ${status}`,
  });

  res.json({ success: true, data: updated });
};
