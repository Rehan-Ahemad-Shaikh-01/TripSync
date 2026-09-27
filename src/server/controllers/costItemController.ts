import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CostItem, Payment } from '../../core/types.js';
import { db } from '../db/store.js';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

const validateCustomShares = (
  totalAmount: number,
  splitRule: any,
  participants: Array<{ memberId: string }>
): string | null => {
  if (splitRule?.type !== 'custom') return null;

  const shares = splitRule.config?.shares;
  if (!shares || typeof shares !== 'object' || Array.isArray(shares)) {
    return 'Custom split requires a share amount for each selected participant';
  }

  const participantIds = new Set(participants.map((participant) => participant.memberId));
  const shareIds = Object.keys(shares);
  if (shareIds.some((memberId) => !participantIds.has(memberId))) {
    return 'Custom shares can only be assigned to selected participants';
  }

  const amounts = [...participantIds].map((memberId) => shares[memberId] ?? 0);
  if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0)) {
    return 'Custom shares must be non-negative amounts in minor currency units';
  }

  const assignedTotal = amounts.reduce((sum, amount) => sum + amount, 0);
  if (assignedTotal <= 0 || assignedTotal >= totalAmount) {
    return 'Custom shares must total more than zero and less than the expense';
  }
  return null;
};

export const getCostItems = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const items = db.getCostItems(tripId);
  res.json({ success: true, data: items });
};

export const createCostItem = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const {
    title,
    category = 'activity',
    totalAmount,
    currency = 'INR',
    vendorId,
    startDatetime,
    endDatetime,
    paidByMemberId,
    splitRule,
    participants = [],
    cancellationPolicy,
    actorMemberId = 'system',
  } = req.body;

  if (!title || totalAmount === undefined || !splitRule || !splitRule.type) {
    return res.status(400).json({
      success: false,
      error: 'title, totalAmount, and splitRule (with type) are required',
    });
  }

  const trip = db.getTripById(tripId);
  const amountMinor = Number(totalAmount);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    return res.status(400).json({ success: false, error: 'totalAmount must be a positive integer in minor currency units' });
  }
  if (currency !== trip.baseCurrency) {
    return res.status(400).json({ success: false, error: `Cost items must use the trip currency (${trip.baseCurrency})` });
  }
  if (!Array.isArray(participants)) {
    return res.status(400).json({ success: false, error: 'participants must be an array' });
  }

  const itemId = `item-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const formattedParticipants = participants.map((p: any) => ({
    bookingId: itemId,
    memberId: typeof p === 'string' ? p : p.memberId,
    overrideShare: p.overrideShare ?? null,
    roomUnitId: p.roomUnitId ?? null,
  }));
  const tripMemberIds = new Set(db.getMembers(tripId).map((member) => member.id));
  if (new Set(formattedParticipants.map((participant: { memberId: string }) => participant.memberId)).size !== formattedParticipants.length ||
      formattedParticipants.some((participant: { memberId: string }) => !tripMemberIds.has(participant.memberId))) {
    return res.status(400).json({ success: false, error: 'Participants must be unique members of this trip' });
  }

  const customSplitError = validateCustomShares(
    amountMinor,
    splitRule,
    formattedParticipants
  );
  if (customSplitError) {
    return res.status(400).json({ success: false, error: customSplitError });
  }

  const item: CostItem = {
    id: itemId,
    tripId,
    vendorId: vendorId || null,
    title,
    category,
    totalAmount: amountMinor,
    currency,
    startDatetime: startDatetime || now,
    endDatetime: endDatetime || now,
    status: 'confirmed',
    cancellationPolicy: cancellationPolicy || null,
    paidByMemberId: paidByMemberId || null,
    splitRule: {
      id: splitRule.id || `rule-${uuidv4().slice(0, 8)}`,
      type: splitRule.type,
      config: splitRule.config || null,
    },
    participants: formattedParticipants,
    createdAt: now,
    updatedAt: now,
  };

  db.insertCostItem(item);

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: 'CREATE_COST_ITEM',
    entityType: 'cost_item',
    entityId: itemId,
    afterState: item,
    description: `Created cost item "${title}" (${(item.totalAmount / 100).toFixed(2)} ${currency}, split: ${item.splitRule.type})`,
  });

  res.status(201).json({ success: true, data: item });
};

export const updateCostItem = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const itemId = getParam(req.params.itemId);
  const existing = db.getCostItemById(itemId);

  if (!existing || existing.tripId !== tripId) {
    return res.status(404).json({ success: false, error: 'Cost item not found' });
  }

  const before = { ...existing };
  const {
    title,
    category,
    totalAmount,
    vendorId,
    startDatetime,
    endDatetime,
    status,
    paidByMemberId,
    splitRule,
    participants,
    cancellationPolicy,
    actorMemberId = 'system',
  } = req.body;

  const patch: Partial<CostItem> = {};
  const trip = db.getTripById(tripId);
  const nextAmount = totalAmount === undefined ? existing.totalAmount : Number(totalAmount);
  if (!Number.isSafeInteger(nextAmount) || nextAmount <= 0) {
    return res.status(400).json({ success: false, error: 'totalAmount must be a positive integer in minor currency units' });
  }
  const formattedParticipants = participants === undefined
    ? existing.participants
    : participants.map((p: any) => ({
      bookingId: itemId,
      memberId: typeof p === 'string' ? p : p.memberId,
      overrideShare: p.overrideShare ?? null,
      roomUnitId: p.roomUnitId ?? null,
    }));
  const tripMemberIds = new Set(db.getMembers(tripId).map((member) => member.id));
  if (new Set(formattedParticipants.map((participant: { memberId: string }) => participant.memberId)).size !== formattedParticipants.length ||
      formattedParticipants.some((participant: { memberId: string }) => !tripMemberIds.has(participant.memberId))) {
    return res.status(400).json({ success: false, error: 'Participants must be unique members of this trip' });
  }
  if (!trip || existing.currency !== trip.baseCurrency) {
    return res.status(400).json({ success: false, error: 'Cost item currency must match the trip currency' });
  }
  const nextSplitRule = splitRule === undefined
    ? existing.splitRule
    : { ...existing.splitRule, ...splitRule };
  const customSplitError = validateCustomShares(
    nextAmount,
    nextSplitRule,
    formattedParticipants
  );
  if (customSplitError) {
    return res.status(400).json({ success: false, error: customSplitError });
  }

  if (title !== undefined) patch.title = title;
  if (category !== undefined) patch.category = category;
  if (totalAmount !== undefined) patch.totalAmount = nextAmount;
  if (vendorId !== undefined) patch.vendorId = vendorId;
  if (startDatetime !== undefined) patch.startDatetime = startDatetime;
  if (endDatetime !== undefined) patch.endDatetime = endDatetime;
  if (status !== undefined) patch.status = status;
  if (paidByMemberId !== undefined) patch.paidByMemberId = paidByMemberId;
  if (cancellationPolicy !== undefined) patch.cancellationPolicy = cancellationPolicy;
  if (splitRule !== undefined) {
    patch.splitRule = nextSplitRule;
  }
  if (participants !== undefined) {
    patch.participants = formattedParticipants;
  }

  const updated = db.updateCostItem(itemId, patch);

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: 'UPDATE_COST_ITEM',
    entityType: 'cost_item',
    entityId: itemId,
    beforeState: before,
    afterState: updated,
    description: `Updated cost item "${updated?.title}"`,
  });

  res.json({ success: true, data: updated });
};

export const cancelCostItem = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const itemId = getParam(req.params.itemId);
  const { actorMemberId = 'system', refundAmount = 0, reason = 'Cancelled by user' } = req.body;

  const existing = db.getCostItemById(itemId);
  if (!existing || existing.tripId !== tripId) {
    return res.status(404).json({ success: false, error: 'Cost item not found' });
  }

  const refundAmountMinor = Number(refundAmount);
  if (!Number.isSafeInteger(refundAmountMinor) || refundAmountMinor < 0 || refundAmountMinor > existing.totalAmount) {
    return res.status(400).json({ success: false, error: 'refundAmount must be a non-negative integer no greater than the expense amount' });
  }

  const before = { ...existing };
  const updated = db.updateCostItem(itemId, { status: 'cancelled' });

  let refundPayment: Payment | null = null;
  if (refundAmountMinor > 0) {
    refundPayment = {
      id: `pay-refund-${uuidv4().slice(0, 8)}`,
      tripId,
      fromMemberId: existing.paidByMemberId || 'system',
      toPool: true,
      amount: refundAmountMinor,
      currency: existing.currency,
      method: 'bank_transfer',
      appliesToCostItemId: itemId,
      refundForCostItemId: itemId,
      status: 'confirmed',
      notes: `Vendor refund for cancelled booking "${existing.title}": ${reason}`,
      createdAt: new Date().toISOString(),
    };
    db.insertPayment(refundPayment);
  }

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: 'CANCEL_COST_ITEM',
    entityType: 'cost_item',
    entityId: itemId,
    beforeState: before,
    afterState: updated,
    description: `Cancelled booking "${existing.title}". ${
      refundAmountMinor > 0 ? `Refund recorded: ${(refundAmountMinor / 100).toFixed(2)} ${existing.currency}.` : 'No refund issued.'
    } Reason: ${reason}`,
  });

  res.json({
    success: true,
    data: {
      costItem: updated,
      refundPayment,
    },
  });
};
