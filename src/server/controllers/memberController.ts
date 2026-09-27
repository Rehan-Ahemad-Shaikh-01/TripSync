import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../../core/types.js';
import { db } from '../db/store.js';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

export const getMembers = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const members = db.getMembers(tripId);
  res.json({ success: true, data: members });
};

export const addMember = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const { displayName, email, role = 'participant', actorMemberId = 'system' } = req.body;

  if (!displayName) {
    return res.status(400).json({ success: false, error: 'displayName is required' });
  }

  const trip = db.getTripById(tripId);
  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found' });
  }

  const memberId = `mem-${uuidv4().slice(0, 8)}`;
  const now = new Date().toISOString();

  const member: Member = {
    id: memberId,
    tripId,
    displayName,
    email: email || null,
    role,
    joinedAt: now,
  };

  db.insertMember(member);

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: 'ADD_MEMBER',
    entityType: 'member',
    entityId: memberId,
    afterState: member,
    description: `Added new member ${displayName} (${role}) to trip`,
  });

  res.status(201).json({ success: true, data: member });
};

export const updateMember = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const memberId = getParam(req.params.memberId);
  const { displayName, role, leftAt, actorMemberId = 'system' } = req.body;

  const existing = db.getMemberById(memberId);
  if (!existing || existing.tripId !== tripId) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }

  const before = { ...existing };
  const patch: Partial<Member> = {};
  if (displayName !== undefined) patch.displayName = displayName;
  if (role !== undefined) patch.role = role;
  if (leftAt !== undefined) patch.leftAt = leftAt;

  const updated = db.updateMember(memberId, patch);

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: leftAt ? 'MEMBER_LEFT' : 'UPDATE_MEMBER',
    entityType: 'member',
    entityId: memberId,
    beforeState: before,
    afterState: updated,
    description: leftAt
      ? `${existing.displayName} marked as left trip at ${leftAt}`
      : `Updated member profile for ${existing.displayName}`,
  });

  res.json({ success: true, data: updated });
};

export const markMemberLeft = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const memberId = getParam(req.params.memberId);
  const { actorMemberId = 'system', leaveDate = new Date().toISOString() } = req.body;

  const existing = db.getMemberById(memberId);
  if (!existing || existing.tripId !== tripId) {
    return res.status(404).json({ success: false, error: 'Member not found' });
  }

  const before = { ...existing };
  const updated = db.updateMember(memberId, { leftAt: leaveDate });

  db.logAction({
    tripId,
    actorMemberId: String(actorMemberId),
    actionType: 'MEMBER_LEFT',
    entityType: 'member',
    entityId: memberId,
    beforeState: before,
    afterState: updated,
    description: `${existing.displayName} left the trip on ${new Date(leaveDate).toLocaleDateString()}`,
  });

  res.json({ success: true, data: updated });
};
