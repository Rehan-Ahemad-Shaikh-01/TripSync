import { Request, Response } from 'express';
import { db } from '../db/store.js';

const getParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

export const getAuditLogs = (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const logs = db.getAuditLogs(tripId);
  res.json({ success: true, data: logs });
};
