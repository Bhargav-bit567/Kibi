/* ============================================
   Kibi — Mongoose models
   Documents keep the same shape the frontend has always used
   (string `id`, camelCase fields, free-form trip/itinerary data).
   The client generates ids, so `_id` is a string and is exposed as `id`.
   ============================================ */

const mongoose = require('mongoose');

function toClient(doc, ret) {
  ret.id = ret.id || ret._id;
  delete ret._id;
  delete ret.passwordHash;
  return ret;
}

// strict: false keeps every field the frontend stores (itineraries, weather,
// accommodations, preferences…) without having to mirror them in a schema.
function clientSchema(fields) {
  return new mongoose.Schema(
    { _id: { type: String, required: true }, ...fields },
    { strict: false, minimize: false, versionKey: false, toJSON: { transform: toClient }, toObject: { transform: toClient } }
  );
}

const nowIso = () => new Date().toISOString();

const userSchema = clientSchema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: String,
  provider: { type: String, default: 'local' },
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  createdAt: { type: String, default: nowIso }
});

const tripSchema = clientSchema({
  createdBy: { type: String, index: true },
  createdAt: { type: String, default: nowIso }
});

// Saved itineraries are personal snapshots that often reuse the id of the
// group trip they copy, so the client id is only unique per user:
// _id is "<userId>:<id>" and the client-facing id is stored in `id`.
const savedItinerarySchema = clientSchema({
  id: { type: String, required: true },
  createdBy: { type: String, required: true, index: true },
  createdAt: { type: String, default: nowIso }
});

const joinRequestSchema = clientSchema({
  tripId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: String, default: nowIso }
});

const notificationSchema = clientSchema({
  userId: { type: String, required: true, index: true },
  message: String,
  type: String,
  read: { type: Boolean, default: false },
  createdAt: { type: String, default: nowIso }
});

// One preferences document per user; _id is the user id.
const preferenceSchema = clientSchema({});

const activityLogSchema = clientSchema({
  action: String,
  details: String,
  actorId: String,
  createdAt: { type: String, default: nowIso, index: true }
});

// Kibi AI chat history, saved only for signed-in users.
const chatMessageSchema = clientSchema({
  userId: { type: String, required: true, index: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: String, default: nowIso }
});
chatMessageSchema.index({ userId: 1, createdAt: -1 });

const destinationSchema = clientSchema({ name: String });
const sampleTravelerSchema = clientSchema({ name: String });

module.exports = {
  User: mongoose.model('User', userSchema),
  Trip: mongoose.model('Trip', tripSchema),
  SavedItinerary: mongoose.model('SavedItinerary', savedItinerarySchema),
  JoinRequest: mongoose.model('JoinRequest', joinRequestSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  Preference: mongoose.model('Preference', preferenceSchema),
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  Destination: mongoose.model('Destination', destinationSchema),
  SampleTraveler: mongoose.model('SampleTraveler', sampleTravelerSchema)
};
