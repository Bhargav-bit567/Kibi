/* ============================================
   Kibi — Kibi AI chat
   Everyone can chat. For signed-in users, every message is saved in MongoDB and
   their recent conversation, travel preferences and trips are sent to Gemini,
   so answers stay personal across pages, devices and visits. Guests' chats are
   never stored; the browser sends their in-page history with each message.
   ============================================ */

const crypto = require('crypto');
const express = require('express');
const config = require('../config');
const { ChatMessage, Preference, Trip, SavedItinerary } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils');
const { rateLimit, generateText } = require('./ai');

const router = express.Router();

const MAX_MESSAGE_CHARS = 2000;
const CONTEXT_MESSAGES = 40;   // recent messages sent to Gemini as the conversation
const HISTORY_MESSAGES = 100;  // messages shown when the chat opens
const STORED_MESSAGES = 500;   // older messages are pruned per user

const SYSTEM_PROMPT = `You are Kibi AI, a friendly and knowledgeable travel planning assistant built into Kibi Travel Planner.
You ONLY answer questions related to: travel destinations, trip itineraries, budgets, accommodation, transportation, local attractions, food, culture, travel tips, visa requirements, and trip planning in general.
If someone asks about anything outside travel and trip planning (e.g. coding, math, politics, medicine), politely say you can only help with travel topics, and give one example of something you CAN help with.
Be concise, warm, and helpful. Use emojis sparingly to keep responses friendly.
When suggesting Indian destinations, include approximate costs in Indian Rupees (₹).`;

const clip = (text, max) => (text.length > max ? text.slice(0, max) + '…' : text);

// What Kibi knows about a signed-in traveler, so Gemini can tailor its answers.
async function travelerProfile(user) {
  const [prefs, trips, saved] = await Promise.all([
    Preference.findById(user._id).lean(),
    Trip.find({ createdBy: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
    SavedItinerary.find({ createdBy: user._id }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  const lines = [`Name: ${user.name}`];
  if (prefs) {
    const { _id, ...rest } = prefs;
    const fields = Object.entries(rest)
      .filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : v}`);
    if (fields.length) lines.push(`Travel preferences: ${clip(fields.join('; '), 1500)}`);
  }
  const places = items => [...new Set(items.map(t => t.destination || t.title || t.name).filter(Boolean))].join(', ');
  if (trips.length) lines.push(`Group trips they created: ${places(trips)}`);
  if (saved.length) lines.push(`Itineraries they saved: ${places(saved)}`);
  return lines.join('\n');
}

function buildPrompt(history, message, profile) {
  const conversation = history
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .concat(`User: ${message}`)
    .join('\n');
  const about = profile
    ? `\n\nAbout this traveler (use it to personalise suggestions and remember earlier chats; don't recite it back unless asked):\n${profile}`
    : '';
  return `${SYSTEM_PROMPT}${about}\n\nConversation so far:\n${conversation}\n\nAssistant:`;
}

// Guests send their in-page history; keep only well-formed, bounded entries.
function guestHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-CONTEXT_MESSAGES)
    .map(m => ({ role: m.role, content: clip(m.content, 4000) }));
}

// Send a message to Kibi AI. Saved to the account when signed in.
router.post('/', rateLimit, asyncHandler(async (req, res) => {
  if (!config.geminiApiKey) {
    return res.status(503).json({ error: 'Kibi AI is not configured on the server.' });
  }
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'A message is required.' });
  if (message.length > MAX_MESSAGE_CHARS) return res.status(413).json({ error: 'Message is too long.' });

  const user = req.user;
  let history = guestHistory(req.body.history);
  let profile = null;
  if (user) {
    const [recent, about] = await Promise.all([
      ChatMessage.find({ userId: user._id }).sort({ createdAt: -1 }).limit(CONTEXT_MESSAGES).lean(),
      travelerProfile(user)
    ]);
    history = recent.reverse();
    profile = about;
  }

  let reply;
  try {
    reply = (await generateText(buildPrompt(history, message, profile), { temperature: 0.7, maxOutputTokens: 1024 })).trim();
  } catch (err) {
    console.error('Kibi AI chat failed:', err.message);
    return res.status(502).json({ error: 'The AI service returned an error.' });
  }
  if (!reply) return res.status(502).json({ error: 'The AI service returned an empty reply.' });

  if (user) {
    const now = Date.now();
    await ChatMessage.insertMany([
      { _id: crypto.randomUUID(), userId: user._id, role: 'user', content: message, createdAt: new Date(now).toISOString() },
      { _id: crypto.randomUUID(), userId: user._id, role: 'assistant', content: reply, createdAt: new Date(now + 1).toISOString() }
    ]);
    const old = await ChatMessage.find({ userId: user._id }).sort({ createdAt: -1 }).skip(STORED_MESSAGES).select('_id').lean();
    if (old.length) await ChatMessage.deleteMany({ _id: { $in: old.map(m => m._id) } });
  }

  res.json({ text: reply, saved: !!user });
}));

// The signed-in user's recent chat, oldest first.
router.get('/history', requireAuth, asyncHandler(async (req, res) => {
  const recent = await ChatMessage.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(HISTORY_MESSAGES).lean();
  res.json({ messages: recent.reverse().map(m => ({ role: m.role, content: m.content, createdAt: m.createdAt })) });
}));

// Clear the signed-in user's chat history.
router.delete('/history', requireAuth, asyncHandler(async (req, res) => {
  await ChatMessage.deleteMany({ userId: req.user._id });
  res.json({ ok: true });
}));

module.exports = router;
