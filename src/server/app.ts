import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { seedDatabase } from './db/seed.js';
import { router } from './routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', router);

app.get('/', (_req, res) => {
  res.json({
    name: 'TripSync API',
    version: '1.0.0',
    description: 'Itinerary-aware group travel coordination and dynamic settlement ledger',
    endpoints: {
      health: '/api/health',
      trips: '/api/trips',
      seed: '/api/seed',
    },
  });
});

// Stable-ID demo records are added on startup without overwriting existing data.
seedDatabase();

export { app };
export default app;
