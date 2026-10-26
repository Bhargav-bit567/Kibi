/* ============================================
   Kibi — Data API
   Single source of truth for all data operations.

   Pages use the same synchronous functions as always (getTrips, saveTrip…),
   backed by the Kibi server + MongoDB:
   - On load, the viewer's data is fetched from /api/bootstrap into an
     in-memory store. Page init (DOMContentLoaded handlers registered after
     this script) waits until that data has arrived.
   - Reads are synchronous against the in-memory store.
   - Writes update the store immediately and are sent to the server through
     a persistent outbox, so they survive page navigation and are retried.
   ============================================ */

const KIBI_API_BASE = (window.KIBI_API_BASE || '/api').replace(/\/$/, '');
const AUTH_SESSION_KEY = 'kibi_auth_user';
const OUTBOX_KEY = 'kibi_outbox';

const STORAGE_KEYS = {
  USERS: 'wm_users',
  CURRENT_USER: 'wm_current_user',
  PREFERENCES: 'wm_preferences',
  TRIPS: 'wm_trips',
  DESTINATIONS: 'wm_destinations',
  JOIN_REQUESTS: 'wm_join_requests',
  NOTIFICATIONS: 'wm_notifications',
  SAMPLE_TRAVELERS: 'wm_sample_travelers',
  SAVED_ITINERARIES: 'wm_saved_itineraries'
};
const ACTIVITY_LOG_KEY = 'wm_activity_log';

/* --- In-memory store --- */
// Values are kept as JSON strings so every read returns a fresh copy,
// exactly like the localStorage-based store this replaces.
const memoryStore = new Map();
let kibiDataLoaded = false;

function getStore(key) {
  if (!kibiDataLoaded) console.warn(`[Kibi] "${key}" was read before data finished loading.`);
  try {
    const data = memoryStore.get(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Storage read error:', key, e);
    return null;
  }
}

function setStore(key, value) {
  memoryStore.set(key, JSON.stringify(value));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* --- Server communication --- */
function getAuthToken() {
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
    return (session && session.token) || null;
  } catch (e) {
    return null;
  }
}

async function kibiRequest(method, path, body, token = getAuthToken()) {
  const headers = {};
  const payload = body === undefined ? undefined : JSON.stringify(body);
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(KIBI_API_BASE + path, {
    method,
    headers,
    body: payload,
    // keepalive lets small writes finish even if the page navigates away (64KB browser limit).
    keepalive: !payload || payload.length < 60000
  });

  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const error = new Error((data && data.error) || `Request failed (${res.status})`);
    error.status = res.status;
    error.field = data && data.field;
    throw error;
  }
  return data;
}

// Account endpoints used by auth.js
const kibiAuth = {
  login: (email, password) => kibiRequest('POST', '/auth/login', { email, password }, null),
  signup: (name, email, password) => kibiRequest('POST', '/auth/signup', { name, email, password }, null)
};

/* --- Outbox: queued writes, persisted across page loads --- */
function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || [];
  } catch (e) {
    return [];
  }
}

const outbox = readOutbox();
let outboxFlush = null;
let outboxRetryTimer = null;

function persistOutbox() {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  } catch (e) {
    console.warn('[Kibi] Pending changes are too large to keep across pages; sending them now.', e);
  }
}

// showToast lives in app.js, which loads after this file.
function toastWhenReady(message, duration) {
  const notify = () => typeof showToast === 'function' && showToast(message, 'error', duration);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notify);
  else notify();
}

function reportSyncError(error) {
  console.warn('[Kibi] A change was rejected by the server:', error.message);
  toastWhenReady(error.message);
}

function flushOutbox() {
  if (outboxFlush) return outboxFlush;
  outboxFlush = (async () => {
    while (outbox.length) {
      const op = outbox[0];
      try {
        await kibiRequest(op.method, op.path, op.body, op.token);
      } catch (error) {
        // Offline or server trouble: keep the change and retry later.
        if (!error.status || error.status >= 500) {
          clearTimeout(outboxRetryTimer);
          outboxRetryTimer = setTimeout(flushOutbox, 5000);
          break;
        }
        reportSyncError(error);
      }
      outbox.shift();
      persistOutbox();
    }
  })().finally(() => { outboxFlush = null; });
  return outboxFlush;
}

function queueSync(method, path, body) {
  const token = getAuthToken();
  if (!token) return; // visitors' changes stay on this page only
  outbox.push({ method, path, body, token });
  persistOutbox();
  flushOutbox();
}

window.addEventListener('online', flushOutbox);

/* --- Load the viewer's data from the server --- */
async function loadServerData() {
  const data = await kibiRequest('GET', '/bootstrap');

  setStore(STORAGE_KEYS.USERS, data.users);
  setStore(STORAGE_KEYS.TRIPS, data.trips);
  setStore(STORAGE_KEYS.DESTINATIONS, data.destinations);
  setStore(STORAGE_KEYS.SAMPLE_TRAVELERS, data.sampleTravelers);
  setStore(STORAGE_KEYS.JOIN_REQUESTS, data.joinRequests);
  setStore(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
  setStore(STORAGE_KEYS.SAVED_ITINERARIES, data.savedItineraries);
  setStore(STORAGE_KEYS.PREFERENCES, data.preferences);
  setStore(ACTIVITY_LOG_KEY, data.activityLog);

  let session = null;
  try { session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)); } catch (e) {}
  if (!session) return;

  if (!data.user) {
    // Token expired or the account is gone.
    localStorage.removeItem(AUTH_SESSION_KEY);
    return;
  }
  // Keep the cached session (navbar name/avatar) in step with the server.
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
    ...session,
    name: data.user.name,
    email: data.user.email,
    avatar: data.user.avatar || session.avatar
  }));
}

// Sessions from the old browser-only version have no server token.
(function dropLegacySession() {
  const token = getAuthToken();
  if (localStorage.getItem(AUTH_SESSION_KEY) && !(token && token.split('.').length === 3)) {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
})();

const KIBI_DATA_READY = flushOutbox()
  .then(loadServerData)
  .catch(error => {
    console.error('[Kibi] Could not load data from the server:', error);
    toastWhenReady('Could not reach the Kibi server. Please refresh to try again.', 6000);
  })
  .finally(() => { kibiDataLoaded = true; });
window.KIBI_DATA_READY = KIBI_DATA_READY;

// Page scripts initialise in DOMContentLoaded handlers and read data
// synchronously, so hold those handlers until the server data is in.
(function deferPageInitUntilDataLoads() {
  const nativeAddEventListener = document.addEventListener;
  document.addEventListener = function (type, listener, options) {
    if (type !== 'DOMContentLoaded' || kibiDataLoaded || !listener) {
      return nativeAddEventListener.call(this, type, listener, options);
    }
    const deferred = event => KIBI_DATA_READY.then(() => {
      if (typeof listener === 'function') listener.call(document, event);
      else listener.handleEvent(event);
    });
    return nativeAddEventListener.call(this, type, deferred, options);
  };
})();

/* --- User Functions --- */
// Accounts are created on the server via kibiAuth; this only updates the local store.
function saveUser(user) {
  const users = getUsers();
  user.id = user.id || generateId();
  user.createdAt = user.createdAt || new Date().toISOString();
  users.push(user);
  setStore(STORAGE_KEYS.USERS, users);
  return user;
}

function getUsers() {
  return getStore(STORAGE_KEYS.USERS) || [];
}

function getUserById(id) {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
}

function getUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email === email) || null;
}

function getCurrentUser() {
  // Prefer unified auth session
  try {
    const session = JSON.parse(localStorage.getItem(AUTH_SESSION_KEY));
    if (session && session.id) return getUserById(session.id);
  } catch (e) {}

  const userId = getStore(STORAGE_KEYS.CURRENT_USER);
  if (!userId) return null;
  return getUserById(userId);
}

function setCurrentUser(userId) {
  setStore(STORAGE_KEYS.CURRENT_USER, userId);
}

function logoutUser() {
  memoryStore.delete(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function applyUserUpdate(userId, updates) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    setStore(STORAGE_KEYS.USERS, users);
    return users[index];
  }
  return null;
}

function updateUser(userId, updates) {
  const user = applyUserUpdate(userId, updates);
  if (user) queueSync('PATCH', `/users/${userId}`, updates);
  return user;
}

/* --- Admin Functions --- */
const USER_ROLES = { ADMIN: 'admin', MODERATOR: 'moderator', USER: 'user' };
const USER_STATUS = { ACTIVE: 'active', SUSPENDED: 'suspended', BANNED: 'banned' };

function isUserAdmin(user) {
  return !!user && (user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.MODERATOR);
}

function anyAdminExists() {
  return getUsers().some(user => user.role === USER_ROLES.ADMIN);
}

function setUserRole(userId, role) {
  const user = updateUser(userId, { role });
  if (user) saveActivityLog('role_change', `${user.name || user.email || userId} role changed to ${role}`);
  return user;
}

function setUserStatus(userId, status, reason) {
  const user = updateUser(userId, { status, statusReason: reason || '' });
  if (user) saveActivityLog('status_change', `${user.name || user.email || userId} status changed to ${status}`);
  return user;
}

function deleteUser(userId) {
  setStore(STORAGE_KEYS.USERS, getUsers().filter(user => user.id !== userId));
  setStore(STORAGE_KEYS.TRIPS, getTrips().filter(trip => trip.createdBy !== userId));
  setStore(STORAGE_KEYS.JOIN_REQUESTS, getJoinRequests().filter(request => request.userId !== userId));
  saveActivityLog('user_deleted', `User ${userId} deleted`);
  queueSync('DELETE', `/users/${userId}`);
}

function setTripFeatured(tripId, featured) {
  const trip = updateTrip(tripId, { featured });
  if (trip) saveActivityLog('trip_featured', `${trip.title || trip.destination || tripId} ${featured ? 'featured' : 'unfeatured'}`);
  return trip;
}

function adminDeleteTrip(tripId) {
  deleteTrip(tripId);
  setStore(STORAGE_KEYS.JOIN_REQUESTS, getJoinRequests().filter(request => request.tripId !== tripId));
  saveActivityLog('trip_deleted', `Trip ${tripId} deleted`);
}

function approveJoinRequest(requestId) {
  const request = updateJoinRequest(requestId, { status: 'approved' });
  if (request) saveActivityLog('join_approved', `Join request ${requestId} approved`);
  return request;
}

function rejectJoinRequest(requestId) {
  const request = updateJoinRequest(requestId, { status: 'rejected' });
  if (request) saveActivityLog('join_rejected', `Join request ${requestId} rejected`);
  return request;
}

function deleteJoinRequest(requestId) {
  setStore(STORAGE_KEYS.JOIN_REQUESTS, getJoinRequests().filter(request => request.id !== requestId));
  queueSync('DELETE', `/join-requests/${requestId}`);
}

function getActivityLog() {
  return getStore(ACTIVITY_LOG_KEY) || [];
}

// The server records admin actions itself; this keeps the open page in step.
function saveActivityLog(action, details) {
  const log = getActivityLog();
  log.unshift({ id: generateId(), action, details, actorId: getCurrentUser()?.id || null, createdAt: new Date().toISOString() });
  setStore(ACTIVITY_LOG_KEY, log.slice(0, 500));
}

function clearActivityLog() {
  setStore(ACTIVITY_LOG_KEY, []);
  queueSync('DELETE', '/admin/activity-log');
}

function getAdminStats() {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const users = getUsers();
  const trips = getTrips();
  const requests = getJoinRequests();
  return {
    totalUsers: users.length,
    admins: users.filter(user => user.role === USER_ROLES.ADMIN).length,
    suspended: users.filter(user => user.status === USER_STATUS.SUSPENDED).length,
    totalTrips: trips.length,
    openTrips: trips.filter(trip => (trip.status || 'open') === 'open').length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(request => request.status === 'pending').length,
    newUsersThisWeek: users.filter(user => new Date(user.createdAt || 0).getTime() >= weekAgo).length,
    newTripsThisWeek: trips.filter(trip => new Date(trip.createdAt || 0).getTime() >= weekAgo).length
  };
}

/* --- Preferences Functions --- */
function savePreferences(userId, prefs) {
  const allPrefs = getStore(STORAGE_KEYS.PREFERENCES) || {};
  allPrefs[userId] = { ...allPrefs[userId], ...prefs };
  setStore(STORAGE_KEYS.PREFERENCES, allPrefs);

  // Also update user record (the server mirrors preferences onto the user too)
  applyUserUpdate(userId, prefs);
  queueSync('PUT', `/users/${userId}/preferences`, prefs);
}

function getPreferences(userId) {
  const allPrefs = getStore(STORAGE_KEYS.PREFERENCES) || {};
  return allPrefs[userId] || null;
}

/* --- Trip Functions --- */
function saveTrip(trip) {
  const trips = getTrips();
  trip.id = trip.id || generateId();
  trip.createdAt = trip.createdAt || new Date().toISOString();

  // Saved trips are snapshots: allow multiple trips to the same destination/dates.
  // The UI already guards against accidental double-saves via hasSimilarTrip / dataset.saving.
  trips.push(trip);
  setStore(STORAGE_KEYS.TRIPS, trips);
  queueSync('PUT', `/trips/${trip.id}`, trip);
  return trip;
}

function getTrips() {
  return getStore(STORAGE_KEYS.TRIPS) || [];
}

function getTripById(id) {
  const trips = getTrips();
  return trips.find(t => t.id === id) || null;
}

function getUserTrips(userId) {
  const trips = getTrips();
  return trips.filter(t => t.createdBy === userId);
}

function getJoinedTrips(userId) {
  const trips = getTrips();
  return trips.filter(t => t.members && t.members.includes(userId));
}

function getSavedItineraries() {
  return getStore(STORAGE_KEYS.SAVED_ITINERARIES) || [];
}

function getSavedTrips(userId) {
  return getSavedItineraries().filter(t => t.createdBy === userId);
}

function updateTrip(tripId, updates) {
  const trips = getTrips();
  const index = trips.findIndex(t => t.id === tripId);
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updates };
    setStore(STORAGE_KEYS.TRIPS, trips);
    queueSync('PATCH', `/trips/${tripId}`, updates);
    return trips[index];
  }
  return null;
}

function deleteTrip(tripId) {
  const trips = getTrips();
  const filtered = trips.filter(t => t.id !== tripId);
  setStore(STORAGE_KEYS.TRIPS, filtered);
  queueSync('DELETE', `/trips/${tripId}`);
}

function saveSavedItinerary(trip) {
  const saved = getSavedItineraries();
  trip.id = trip.id || generateId();
  trip.createdAt = trip.createdAt || new Date().toISOString();

  // Prevent duplicate saved itineraries for the same user + destination + startDate.
  const currentUserId = (typeof getCurrentUser === 'function' && getCurrentUser()) ? getCurrentUser().id : trip.createdBy;
  const isDuplicate = saved.some(t =>
    t.createdBy === currentUserId &&
    t.destination === trip.destination &&
    t.startDate === trip.startDate
  );
  if (isDuplicate) return null;

  saved.push(trip);
  setStore(STORAGE_KEYS.SAVED_ITINERARIES, saved);
  queueSync('PUT', `/saved-itineraries/${trip.id}`, trip);
  return trip;
}

function removeSavedItinerary(tripId) {
  let saved = getSavedItineraries();
  saved = saved.filter(t => t.id !== tripId);
  setStore(STORAGE_KEYS.SAVED_ITINERARIES, saved);
  queueSync('DELETE', `/saved-itineraries/${tripId}`);
}

// Backwards-compatible aliases used by older callers/pages
function saveTripToUser(userId, tripId) {
  // no-op: saved itineraries are now stored in a single array keyed by createdBy
}

function removeSavedTrip(userId, tripId) {
  removeSavedItinerary(tripId);
}

/* --- Join Request Functions --- */
function saveJoinRequest(request) {
  const requests = getJoinRequests();
  request.id = request.id || generateId();
  request.createdAt = request.createdAt || new Date().toISOString();
  request.status = request.status || 'pending';
  requests.push(request);
  setStore(STORAGE_KEYS.JOIN_REQUESTS, requests);
  queueSync('PUT', `/join-requests/${request.id}`, request);

  // Create notification
  saveNotification({
    userId: request.userId,
    message: `Your request to join the trip has been sent!`,
    type: 'join_request',
    tripId: request.tripId
  });

  return request;
}

function getJoinRequests() {
  return getStore(STORAGE_KEYS.JOIN_REQUESTS) || [];
}

function getUserJoinRequests(userId) {
  const requests = getJoinRequests();
  return requests.filter(r => r.userId === userId);
}

function hasRequestedToJoin(userId, tripId) {
  const requests = getJoinRequests();
  return requests.some(r => r.userId === userId && r.tripId === tripId);
}

function updateJoinRequest(requestId, updates) {
  const requests = getJoinRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index !== -1) {
    requests[index] = { ...requests[index], ...updates };
    setStore(STORAGE_KEYS.JOIN_REQUESTS, requests);
    queueSync('PATCH', `/join-requests/${requestId}`, updates);
    return requests[index];
  }
  return null;
}

/* --- Notification Functions --- */
function saveNotification(notif) {
  const notifications = getNotifications();
  notif.id = notif.id || generateId();
  notif.createdAt = notif.createdAt || new Date().toISOString();
  notif.read = false;
  notifications.unshift(notif); // newest first
  setStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
  queueSync('PUT', `/notifications/${notif.id}`, notif);
  return notif;
}

function getNotifications() {
  return getStore(STORAGE_KEYS.NOTIFICATIONS) || [];
}

function getUserNotifications(userId) {
  const notifications = getNotifications();
  return notifications.filter(n => n.userId === userId);
}

function getUnreadCount(userId) {
  const notifications = getUserNotifications(userId);
  return notifications.filter(n => !n.read).length;
}

function markNotificationRead(notifId) {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notifId);
  if (index !== -1) {
    notifications[index].read = true;
    setStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
    queueSync('POST', `/notifications/${notifId}/read`);
  }
}

function markAllNotificationsRead(userId) {
  const notifications = getNotifications();
  if (!notifications.some(n => n.userId === userId && !n.read)) return;
  notifications.forEach(n => {
    if (n.userId === userId) n.read = true;
  });
  setStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
  queueSync('POST', '/notifications/read-all');
}

/* --- Profile Functions --- */
function updateProfile(userId, profileData) {
  return updateUser(userId, profileData);
}

/* --- Destination Functions --- */
function getDestinations() {
  return getStore(STORAGE_KEYS.DESTINATIONS) || [];
}

function getDestinationById(id) {
  const destinations = getDestinations();
  return destinations.find(d => d.id === id) || null;
}

/* --- Sample Travelers --- */
function getSampleTravelers() {
  return getStore(STORAGE_KEYS.SAMPLE_TRAVELERS) || [];
}
