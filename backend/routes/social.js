/* ============================================
   Kibi — Join requests, notifications and admin activity log
   ============================================ */

const express = require('express');
const { Trip, JoinRequest, Notification, ActivityLog } = require('../models');
const { isAdmin, requireAdmin } = require('../middleware/auth');
const { asyncHandler, logActivity } = require('../utils');

const joinRequests = express.Router();
const notifications = express.Router();
const admin = express.Router();

/* --- Join requests --- */
joinRequests.put('/:id', asyncHandler(async (req, res) => {
  const me = req.user;
  const tripId = String(req.body.tripId || '');
  if (!(await Trip.exists({ _id: tripId }))) return res.status(404).json({ error: 'Trip not found' });

  // One request per user per trip; repeats return the existing request.
  const existing = await JoinRequest.findOne({ $or: [{ _id: req.params.id }, { userId: me._id, tripId }] });
  if (existing) {
    if (existing.userId !== me._id) return res.status(403).json({ error: 'Not allowed' });
    return res.json(existing.toJSON());
  }

  const request = await JoinRequest.create({
    _id: req.params.id,
    tripId,
    userId: me._id,
    status: 'pending',
    createdAt: req.body.createdAt
  });
  res.status(201).json(request.toJSON());
}));

joinRequests.patch('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const request = await JoinRequest.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true });
  if (!request) return res.status(404).json({ error: 'Join request not found' });
  if (status !== 'pending') logActivity(`join_${status}`, `Join request ${request._id} ${status}`, req.user._id);
  res.json(request.toJSON());
}));

joinRequests.delete('/:id', asyncHandler(async (req, res) => {
  const request = await JoinRequest.findById(req.params.id);
  if (request && request.userId !== req.user._id && !isAdmin(req.user)) return res.status(403).json({ error: 'Not allowed' });
  if (request) await request.deleteOne();
  res.json({ ok: true });
}));

/* --- Notifications --- */
notifications.put('/:id', asyncHandler(async (req, res) => {
  const me = req.user;
  const { userId = me._id, message, type, tripId, createdAt } = req.body || {};
  if (userId !== me._id && !isAdmin(me)) return res.status(403).json({ error: 'Not allowed' });

  await Notification.updateOne(
    { _id: req.params.id },
    { $setOnInsert: { userId, message: String(message || ''), type, tripId, read: false, createdAt: createdAt || new Date().toISOString() } },
    { upsert: true }
  );
  res.status(201).json({ ok: true });
}));

notifications.post('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, read: false }, { $set: { read: true } });
  res.json({ ok: true });
}));

notifications.post('/:id/read', asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
}));

/* --- Admin --- */
admin.delete('/activity-log', requireAdmin, asyncHandler(async (req, res) => {
  await ActivityLog.deleteMany({});
  res.json({ ok: true });
}));

module.exports = { joinRequests, notifications, admin };
