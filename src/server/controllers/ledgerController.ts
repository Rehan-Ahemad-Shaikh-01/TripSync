import { Request, Response } from 'express';
import { detectInconsistencies } from '../../core/inconsistency.js';
import { explainMemberDues, recalculateTripLedger } from '../../core/ledger.js';
import { simplifyDebts } from '../../core/settlement.js';
import { db } from '../db/store.js';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

export const getTripLedger = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const trip = db.getTripById(tripId);

  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const members = db.getMembers(tripId);
  const costItems = db.getCostItems(tripId);
  const payments = db.getPayments(tripId);

  const snapshot = recalculateTripLedger({
    trip,
    members,
    costItems,
    payments,
  });

  res.json({ success: true, data: snapshot });
};

export const explainMember = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const memberId = getParam(req.params.memberId);
  const trip = db.getTripById(tripId);

  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const members = db.getMembers(tripId);
  const costItems = db.getCostItems(tripId);
  const payments = db.getPayments(tripId);

  const snapshot = recalculateTripLedger({
    trip,
    members,
    costItems,
    payments,
  });

  const explanation = explainMemberDues(memberId, snapshot);

  res.json({ success: true, data: explanation });
};

export const getSettlementPlan = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const trip = db.getTripById(tripId);

  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const members = db.getMembers(tripId);
  const costItems = db.getCostItems(tripId);
  const payments = db.getPayments(tripId);

  const snapshot = recalculateTripLedger({
    trip,
    members,
    costItems,
    payments,
  });

  const transactions = simplifyDebts(snapshot);

  res.json({
    success: true,
    data: {
      tripId,
      computedAt: snapshot.computedAt,
      currency: snapshot.currency,
      transactions,
      memberBalances: snapshot.membersLedger,
    },
  });
};

export const getInconsistencies = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const trip = db.getTripById(tripId);

  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const members = db.getMembers(tripId);
  const costItems = db.getCostItems(tripId);
  const payments = db.getPayments(tripId);

  const warnings = detectInconsistencies({
    members,
    costItems,
    payments,
  });

  res.json({ success: true, data: warnings });
};
