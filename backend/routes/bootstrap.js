/* ============================================
   Kibi — GET /api/bootstrap
   Returns everything a page needs in one request, scoped to the viewer:
   - everyone: destinations, sample travelers, trips, public user profiles
   - logged in: own profile, preferences, notifications, saved itineraries,
     own join requests + requests on trips they organise
   - admins: every user (with emails), every join request, activity log
   ============================================ */

const express = require('express');
const { User, Trip, SavedItinerary, JoinRequest, Notification, Preference, ActivityLog, Destination, SampleTraveler } = require('../models');
const { isAdmin } = require('../middleware/auth');
const { asyncHandler, toClient, PRIVATE_USER_FIELDS } = require('../utils');

const router = express.Router();

const lean = query => query.lean().then(docs => docs.map(toClient));

router.get('/', asyncHandler(async (req, res) => {
  const me = req.user;
  const admin = isAdmin(me);

  const [users, trips, destinations, sampleTravelers] = await Promise.all([
    lean(admin ? User.find().select('-passwordHash') : User.find().select(PRIVATE_USER_FIELDS)),
    lean(Trip.find().sort({ createdAt: 1 })),
    lean(Destination.find()),
    lean(SampleTraveler.find())
  ]);

  const data = {
    user: null,
    users,
    trips,
    destinations,
    sampleTravelers,
    joinRequests: [],
    notifications: [],
    savedItineraries: [],
    preferences: {},
    activityLog: []
  };

  if (me) {
    data.user = me.toJSON();
    // Replace the public copy of the viewer with their full profile.
    data.users = users.map(u => (u.id === me._id ? data.user : u));

    const myTripIds = trips.filter(t => t.createdBy === me._id).map(t => t.id);
    const requestFilter = admin ? {} : { $or: [{ userId: me._id }, { tripId: { $in: myTripIds } }] };

    const [joinRequests, notifications, savedItineraries, prefs, activityLog] = await Promise.all([
      lean(JoinRequest.find(requestFilter).sort({ createdAt: 1 })),
      lean(Notification.find({ userId: me._id }).sort({ createdAt: -1 }).limit(200)),
      lean(SavedItinerary.find({ createdBy: me._id }).sort({ createdAt: 1 })),
      Preference.findById(me._id).lean(),
      admin ? lean(ActivityLog.find().sort({ createdAt: -1 }).limit(500)) : []
    ]);

    Object.assign(data, { joinRequests, notifications, savedItineraries, activityLog });
    if (prefs) {
      const { _id, ...rest } = prefs;
      data.preferences = { [me._id]: rest };
    }
  }

  res.set('Cache-Control', 'no-store').json(data);
}));

module.exports = router;
