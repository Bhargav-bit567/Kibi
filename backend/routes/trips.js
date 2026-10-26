/* ============================================
   Kibi — Trip and saved-itinerary routes
   Reading trips is public; creating, changing and deleting needs a login.
   The website creates trips with its own id (PUT), so retried requests are safe.
   ============================================ */

const express = require('express');
const { Trip, SavedItinerary, JoinRequest } = require('../models');
const { isAdmin, requireAuth } = require('../middleware/auth');
const { asyncHandler, pickUpdates, logActivity, generateId, toClient } = require('../utils');

const trips = express.Router();
const saved = express.Router();

function canManage(user, doc) {
  return doc.createdBy === user._id || isAdmin(user);
}

async function writeTrip(req, res, { allowCreate }) {
  const me = req.user;
  const admin = isAdmin(me);
  const updates = pickUpdates(req.body, ['createdBy', ...(admin ? [] : ['featured'])]);
  const existing = await Trip.findById(req.params.id);

  if (!existing) {
    if (!allowCreate) return res.status(404).json({ error: 'Trip not found' });
    const trip = await Trip.create({ ...updates, _id: req.params.id, createdBy: me._id, createdAt: req.body.createdAt });
    return res.status(201).json(trip.toJSON());
  }

  if (!canManage(me, existing)) return res.status(403).json({ error: 'Only the trip creator can change this trip.' });
  existing.set(updates);
  await existing.save();

  if (admin && 'featured' in updates) {
    logActivity('trip_featured', `${existing.title || existing.destination || existing._id} ${updates.featured ? 'featured' : 'unfeatured'}`, me._id);
  }
  res.json(existing.toJSON());
}

// GET /api/trips — all trips
trips.get('/', asyncHandler(async (req, res) => {
  const list = await Trip.find().sort({ createdAt: 1 }).lean();
  res.json(list.map(toClient));
}));

// GET /api/trips/:id — one trip
trips.get('/:id', asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id).lean();
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  res.json(toClient(trip));
}));

// POST /api/trips — create a trip from the JSON body (the server picks the id)
trips.post('/', requireAuth, asyncHandler(async (req, res) => {
  const updates = pickUpdates(req.body, ['createdBy', ...(isAdmin(req.user) ? [] : ['featured'])]);
  const trip = await Trip.create({ ...updates, _id: generateId(), createdBy: req.user._id });
  res.status(201).json(trip.toJSON());
}));

trips.put('/:id', requireAuth, asyncHandler((req, res) => writeTrip(req, res, { allowCreate: true })));
trips.patch('/:id', requireAuth, asyncHandler((req, res) => writeTrip(req, res, { allowCreate: false })));

trips.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) return res.json({ ok: true }); // already gone
  if (!canManage(req.user, trip)) return res.status(403).json({ error: 'Only the trip creator can delete this trip.' });

  await Promise.all([Trip.deleteOne({ _id: trip._id }), JoinRequest.deleteMany({ tripId: trip._id })]);
  if (isAdmin(req.user) && trip.createdBy !== req.user._id) {
    logActivity('trip_deleted', `Trip ${trip._id} deleted`, req.user._id);
  }
  res.json({ ok: true });
}));

/* --- Saved itineraries (personal snapshots) --- */
saved.put('/:id', asyncHandler(async (req, res) => {
  const me = req.user;
  const id = req.params.id;
  const existing = await SavedItinerary.findOne({ createdBy: me._id, id });

  const updates = pickUpdates(req.body, ['createdBy']);
  if (!existing) {
    // Same rule as the client: one snapshot per destination + start date.
    const duplicate = await SavedItinerary.exists({ createdBy: me._id, destination: updates.destination, startDate: updates.startDate });
    if (duplicate) return res.json({ duplicate: true });
    const doc = await SavedItinerary.create({
      ...updates,
      _id: `${me._id}:${id}`,
      id,
      createdBy: me._id,
      createdAt: req.body.createdAt
    });
    return res.status(201).json(doc.toJSON());
  }

  existing.set(updates);
  await existing.save();
  res.json(existing.toJSON());
}));

saved.delete('/:id', asyncHandler(async (req, res) => {
  await SavedItinerary.deleteOne({ createdBy: req.user._id, id: req.params.id });
  res.json({ ok: true });
}));

module.exports = { trips, saved };
