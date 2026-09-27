import { Router } from 'express';
import { getAiSettings, parseChatItinerary, saveAiSettings, testAiConnection } from './controllers/aiController.js';
import { getAuditLogs } from './controllers/auditController.js';
import {
  cancelCostItem,
  createCostItem,
  getCostItems,
  updateCostItem,
} from './controllers/costItemController.js';
import {
  explainMember,
  getInconsistencies,
  getSettlementPlan,
  getTripLedger,
} from './controllers/ledgerController.js';
import {
  addMember,
  getMembers,
  markMemberLeft,
  updateMember,
} from './controllers/memberController.js';
import { getPayments, recordPayment } from './controllers/paymentController.js';
import {
  createTrip,
  getTrip,
  getTrips,
  updateTripStatus,
} from './controllers/tripController.js';
import { seedDatabase } from './db/seed.js';

export const router = Router();

// Health check & Seed endpoint
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.post('/seed', (_req, res) => {
  seedDatabase();
  res.json({ success: true, message: 'Demo trip records are present; existing data was preserved.' });
});

// Trip routes
router.get('/trips', getTrips);
router.get('/trips/:id', getTrip);
router.post('/trips', createTrip);
router.patch('/trips/:id/status', updateTripStatus);

// Member routes
router.get('/trips/:tripId/members', getMembers);
router.post('/trips/:tripId/members', addMember);
router.patch('/trips/:tripId/members/:memberId', updateMember);
router.post('/trips/:tripId/members/:memberId/leave', markMemberLeft);

// CostItem (Bookings & Expenses) routes
router.get('/trips/:tripId/cost-items', getCostItems);
router.post('/trips/:tripId/cost-items', createCostItem);
router.patch('/trips/:tripId/cost-items/:itemId', updateCostItem);
router.post('/trips/:tripId/cost-items/:itemId/cancel', cancelCostItem);

// Payment routes
router.get('/trips/:tripId/payments', getPayments);
router.post('/trips/:tripId/payments', recordPayment);

// Ledger & Calculation routes
router.get('/trips/:tripId/ledger', getTripLedger);
router.get('/trips/:tripId/ledger/explain/:memberId', explainMember);
router.get('/trips/:tripId/settlement', getSettlementPlan);
router.get('/trips/:tripId/inconsistencies', getInconsistencies);

// Audit Log routes
router.get('/trips/:tripId/audit-logs', getAuditLogs);

// AI Itinerary Parser routes
router.get('/ai/settings', getAiSettings);
router.put('/ai/settings', saveAiSettings);
router.post('/ai/test-connection', testAiConnection);
router.post('/trips/:tripId/ai/parse-chat', parseChatItinerary);
