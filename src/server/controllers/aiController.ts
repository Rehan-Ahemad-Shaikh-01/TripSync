import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CostItemCategory, DraftBookingSuggestion, SplitType } from '../../core/types.js';
import { db } from '../db/store.js';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';
const MAX_CHAT_LENGTH = 20_000;

// Prototype settings deliberately live only for the lifetime of the server process.
let aiSettings = { apiKey: '', model: DEFAULT_MODEL, baseUrl: DEFAULT_BASE_URL };

const categories: CostItemCategory[] = ['flight', 'stay', 'activity', 'transport', 'food', 'miscellaneous'];
const splitTypes: SplitType[] = ['equal', 'participant_weighted', 'shared_room', 'activity_based', 'custom', 'organizer_paid'];
const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const getParam = (param: string | string[] | undefined): string => Array.isArray(param) ? param[0] || '' : param || '';
const settingsView = () => ({ configured: Boolean(aiSettings.apiKey), model: aiSettings.model, baseUrl: aiSettings.baseUrl });

export const getAiSettings = (_req: Request, res: Response) => res.json({ success: true, data: settingsView() });

export const saveAiSettings = (req: Request, res: Response) => {
  const { apiKey, model, baseUrl } = req.body || {};
  if (typeof apiKey !== 'string' || (!apiKey.trim() && !aiSettings.apiKey)) {
    return res.status(400).json({ success: false, error: 'Enter a Google AI Studio API key.' });
  }
  if (typeof model !== 'string' || !model.trim()) {
    return res.status(400).json({ success: false, error: 'Enter a Gemini model name.' });
  }
  let parsedUrl: URL;
  try { parsedUrl = new URL(typeof baseUrl === 'string' && baseUrl.trim() ? baseUrl : DEFAULT_BASE_URL); }
  catch { return res.status(400).json({ success: false, error: 'Enter a valid Gemini API base URL.' }); }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
    return res.status(400).json({ success: false, error: 'The Gemini API base URL must use HTTPS.' });
  }
  aiSettings = { apiKey: apiKey.trim() || aiSettings.apiKey, model: model.trim(), baseUrl: parsedUrl.toString().replace(/\/$/, '') };
  return res.json({ success: true, data: settingsView() });
};

async function generate(prompt: string, schema?: Record<string, unknown>): Promise<string> {
  if (!aiSettings.apiKey) throw new Error('Add your Google AI Studio API key in AI provider settings first.');
  const baseUrl = aiSettings.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/v1beta/models/${encodeURIComponent(aiSettings.model)}:generateContent?key=${encodeURIComponent(aiSettings.apiKey)}`;
  const generationConfig: Record<string, unknown> = { temperature: 0.1 };
  if (schema) Object.assign(generationConfig, { responseMimeType: 'application/json', responseSchema: schema });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig }),
    signal: AbortSignal.timeout(30_000),
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error?.message || `Gemini request failed (${response.status}).`;
    throw new Error(message);
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('').trim();
  if (!text) throw new Error('Gemini returned an empty response. Try again.');
  return text;
}

export const testAiConnection = async (_req: Request, res: Response) => {
  try {
    await generate('Reply with the single word OK.');
    return res.json({ success: true, data: { connected: true, model: aiSettings.model } });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error.message || 'Could not connect to Gemini.' });
  }
};

const draftSchema: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    suggestions: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      title: { type: 'STRING' }, category: { type: 'STRING', enum: categories }, vendorName: { type: 'STRING' },
      amount: { type: 'NUMBER' }, currency: { type: 'STRING' }, startDate: { type: 'STRING' }, endDate: { type: 'STRING' },
      splitType: { type: 'STRING', enum: splitTypes }, participantNames: { type: 'ARRAY', items: { type: 'STRING' } }, rawSnippet: { type: 'STRING' },
    }, required: ['title', 'category', 'amount', 'currency', 'splitType', 'participantNames', 'rawSnippet'] } },
  }, required: ['suggestions'],
};

export const parseChatItinerary = async (req: Request, res: Response) => {
  const tripId = getParam(req.params.tripId);
  const { chatText } = req.body || {};
  if (typeof chatText !== 'string' || !chatText.trim()) return res.status(400).json({ success: false, error: 'Trip notes are required.' });
  if (chatText.length > MAX_CHAT_LENGTH) return res.status(413).json({ success: false, error: `Trip notes must be ${MAX_CHAT_LENGTH.toLocaleString()} characters or fewer.` });

  const trip = db.getTripById(tripId);
  if (!trip) return res.status(404).json({ success: false, error: 'Trip not found.' });
  const members = db.getMembers(tripId).filter((m) => !m.leftAt);
  const context = `Trip: ${trip.name}. Dates: ${trip.startDate} through ${trip.endDate}. Base currency: ${trip.baseCurrency}. Members: ${members.map((m) => m.displayName).join(', ')}.`;
  const prompt = `Extract itinerary bookings and activities from the notes below. Return only facts supported by the notes. Do not invent prices or dates: use amount 0 when no total is stated, and omit dates you cannot determine. Convert per-person prices to total only when the number of participants is clear; otherwise preserve the stated amount as the estimate. Map participants only to the listed trip members; if all are included or participant scope is unclear, return all listed members. Amount is in major currency units, not cents. Dates must be ISO YYYY-MM-DD when known. Use trip base currency if no currency is stated. rawSnippet must quote the relevant source excerpt.\n${context}\n\nNotes:\n${chatText}`;

  try {
    const raw = await generate(prompt, draftSchema);
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { throw new Error('Gemini returned invalid structured data. Please try again.'); }
    if (!Array.isArray(parsed.suggestions)) throw new Error('Gemini response did not contain itinerary suggestions.');
    const memberNames = new Set(members.map((m) => m.displayName.toLowerCase()));
    const suggestions: DraftBookingSuggestion[] = parsed.suggestions.slice(0, 50).flatMap((s: any) => {
      const amount = Number(s.amount);
      const currency = String(s.currency || trip.baseCurrency).toUpperCase();
      if (!s.title || !categories.includes(s.category) || !splitTypes.includes(s.splitType) || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) return [];
      const names = Array.isArray(s.participantNames) ? s.participantNames.filter((n: unknown): n is string => typeof n === 'string' && memberNames.has(n.toLowerCase())) : [];
      return [{
        id: `draft-${uuidv4().slice(0, 8)}`, title: String(s.title).slice(0, 160), category: s.category,
        vendorName: typeof s.vendorName === 'string' ? s.vendorName.slice(0, 120) : undefined,
        estimatedAmount: Math.round(amount * 100), currency: currency as DraftBookingSuggestion['currency'],
        startDate: isIsoDate(s.startDate) ? s.startDate : undefined,
        endDate: isIsoDate(s.endDate) ? s.endDate : undefined,
        suggestedSplitType: s.splitType, suggestedParticipantNames: names, rawSnippet: String(s.rawSnippet || '').slice(0, 500),
      }];
    });
    return res.json({ success: true, data: { tripId, parsedCount: suggestions.length, suggestions } });
  } catch (error: any) {
    return res.status(502).json({ success: false, error: error.message || 'Failed to extract itinerary drafts.' });
  }
};
