/* ============================================
   Kibi — Shared server helpers
   ============================================ */

const crypto = require('crypto');
const { ActivityLog } = require('./models');

// Fields clients may never write directly through generic update endpoints.
const PROTECTED_FIELDS = ['_id', 'id', 'passwordHash', 'password', 'createdAt', 'provider', 'providerId'];

// Wrap async route handlers so rejected promises reach the error middleware.
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Same id format the frontend generates (time + random, base36).
function generateId() {
  return Date.now().toString(36) + crypto.randomBytes(4).toString('hex').slice(0, 5);
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

function validateIdParam(req, res, next, id) {
  if (!ID_PATTERN.test(id)) return res.status(400).json({ error: 'Invalid id' });
  next();
}

// Copy a request body for use in `$set`, dropping protected and operator-like keys.
function pickUpdates(body, extraBlocked = []) {
  const blocked = new Set([...PROTECTED_FIELDS, ...extraBlocked]);
  const updates = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return updates;
  for (const [key, value] of Object.entries(body)) {
    if (blocked.has(key) || key.startsWith('$') || key.includes('.')) continue;
    updates[key] = value;
  }
  return updates;
}

// Convert a lean Mongo document into the shape the frontend expects
// (a stored `id` field, used by saved itineraries, takes precedence over _id).
function toClient(doc) {
  if (!doc) return doc;
  const { _id, passwordHash, ...rest } = doc;
  return { id: _id, ...rest };
}

// Default profile fields for a new account.
function newUserFields(name) {
  return {
    _id: generateId(),
    travelStyle: [],
    budget: '',
    socialPreference: '',
    interests: [],
    travelPace: '',
    avatar: name.charAt(0).toUpperCase(),
    savedTrips: []
  };
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function logActivity(action, details, actorId) {
  return ActivityLog.create({ _id: generateId(), action, details, actorId: actorId || null })
    .catch(err => console.error('Activity log write failed:', err.message));
}

module.exports = { asyncHandler, generateId, validateIdParam, pickUpdates, toClient, newUserFields, isValidEmail, logActivity };
