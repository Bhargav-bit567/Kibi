/* ============================================
   Kibi — User routes
   Reading users is public (public profiles only); changing them needs a login.
   ============================================ */

const express = require('express');
const { User, Trip, SavedItinerary, JoinRequest, Notification, Preference, ChatMessage } = require('../models');
const { isAdmin, requireAuth, requireAdmin } = require('../middleware/auth');
const { asyncHandler, pickUpdates, isValidEmail, logActivity, toClient, PRIVATE_USER_FIELDS } = require('../utils');

const router = express.Router();

const ROLES = ['user', 'moderator', 'admin'];
const STATUSES = ['active', 'suspended', 'banned'];
const ADMIN_ONLY_FIELDS = ['role', 'status', 'statusReason'];

// Full profile for yourself or an admin, public profile for everyone else.
const fieldsFor = (viewer, id) => (viewer && (viewer._id === id || isAdmin(viewer)) ? '-passwordHash' : PRIVATE_USER_FIELDS);

// GET /api/users — all users
router.get('/', asyncHandler(async (req, res) => {
  const users = await User.find().select(isAdmin(req.user) ? '-passwordHash' : PRIVATE_USER_FIELDS).sort({ createdAt: 1 }).lean();
  res.json(users.map(toClient));
}));

// GET /api/users/me — the logged-in user
router.get('/me', requireAuth, (req, res) => res.json(req.user.toJSON()));

// GET /api/users/:id — one user
router.get('/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select(fieldsFor(req.user, req.params.id)).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(toClient(user));
}));

// GET /api/users/:id/trips — trips this user created
router.get('/:id/trips', asyncHandler(async (req, res) => {
  if (!(await User.exists({ _id: req.params.id }))) return res.status(404).json({ error: 'User not found' });
  const trips = await Trip.find({ createdBy: req.params.id }).sort({ createdAt: 1 }).lean();
  res.json(trips.map(toClient));
}));

router.patch('/:id', requireAuth, asyncHandler(async (req, res) => {
  const me = req.user;
  const admin = isAdmin(me);
  const isSelf = me._id === req.params.id;

  const target = await User.findById(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const updates = pickUpdates(req.body);
  const touchesAdminFields = ADMIN_ONLY_FIELDS.some(f => f in updates);

  if (touchesAdminFields) {
    // The first user may claim admin when no admin exists yet (admin.html flow).
    const claimingFirstAdmin = isSelf && updates.role === 'admin' && Object.keys(updates).length === 1 &&
      !(await User.exists({ role: 'admin' }));
    if (!admin && !claimingFirstAdmin) return res.status(403).json({ error: 'Admin access required.' });

    if ('role' in updates && !ROLES.includes(updates.role)) return res.status(400).json({ error: 'Invalid role' });
    if ('status' in updates && !STATUSES.includes(updates.status)) return res.status(400).json({ error: 'Invalid status' });
    if (target.role === 'admin' && 'role' in updates && updates.role !== 'admin' &&
        (await User.countDocuments({ role: 'admin' })) <= 1) {
      return res.status(400).json({ error: 'At least one admin is required' });
    }
  } else if (!isSelf && !admin) {
    return res.status(403).json({ error: 'You can only edit your own profile.' });
  }

  if ('email' in updates) {
    const email = String(updates.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) return res.status(400).json({ field: 'email', error: 'Please enter a valid email' });
    if (email !== target.email && await User.exists({ email })) {
      return res.status(409).json({ field: 'email', error: 'That email is already used by another account' });
    }
    updates.email = email;
  }
  if ('name' in updates && String(updates.name || '').trim().length < 2) {
    return res.status(400).json({ field: 'name', error: 'Name must be at least 2 characters' });
  }

  target.set(updates);
  await target.save();

  const label = target.name || target.email || target._id;
  if ('role' in updates) logActivity('role_change', `${label} role changed to ${updates.role}`, me._id);
  if ('status' in updates) logActivity('status_change', `${label} status changed to ${updates.status}`, me._id);

  res.json(target.toJSON());
}));

router.delete('/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const tripIds = (await Trip.find({ createdBy: userId }).select('_id').lean()).map(t => t._id);

  await Promise.all([
    User.deleteOne({ _id: userId }),
    Trip.deleteMany({ createdBy: userId }),
    JoinRequest.deleteMany({ $or: [{ userId }, { tripId: { $in: tripIds } }] }),
    Notification.deleteMany({ userId }),
    SavedItinerary.deleteMany({ createdBy: userId }),
    Preference.deleteOne({ _id: userId }),
    ChatMessage.deleteMany({ userId })
  ]);
  logActivity('user_deleted', `User ${userId} deleted`, req.user._id);
  res.json({ ok: true });
}));

/* --- Preferences: stored per user and mirrored onto the user profile --- */
router.put('/:id/preferences', requireAuth, asyncHandler(async (req, res) => {
  const userId = req.params.id;
  if (req.user._id !== userId && !isAdmin(req.user)) return res.status(403).json({ error: 'Not allowed' });

  const prefs = pickUpdates(req.body, ADMIN_ONLY_FIELDS.concat(['email', 'name']));
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  await Preference.updateOne({ _id: userId }, { $set: prefs }, { upsert: true });
  user.set(prefs);
  await user.save();
  res.json(user.toJSON());
}));

module.exports = router;
