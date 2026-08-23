/* ============================================
   Kibi — LocalStorage API
   Single source of truth for all data operations
   ============================================ */

const STORAGE_KEYS = {
  USERS: 'wm_users',
  CURRENT_USER: 'wm_current_user',
  PREFERENCES: 'wm_preferences',
  TRIPS: 'wm_trips',
  DESTINATIONS: 'wm_destinations',
  JOIN_REQUESTS: 'wm_join_requests',
  NOTIFICATIONS: 'wm_notifications',
  SAMPLE_TRAVELERS: 'wm_sample_travelers',
  INITIALIZED: 'wm_initialized'
};

/* --- Helper --- */
function getStore(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Storage read error:', key, e);
    return null;
  }
}

function setStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage write error:', key, e);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/* --- User Functions --- */
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
    const session = JSON.parse(localStorage.getItem('kibi_auth_user'));
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
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem('kibi_auth_user');
}

function updateUser(userId, updates) {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index] = { ...users[index], ...updates };
    setStore(STORAGE_KEYS.USERS, users);
    return users[index];
  }
  return null;
}

/* --- Preferences Functions --- */
function savePreferences(userId, prefs) {
  const allPrefs = getStore(STORAGE_KEYS.PREFERENCES) || {};
  allPrefs[userId] = { ...allPrefs[userId], ...prefs };
  setStore(STORAGE_KEYS.PREFERENCES, allPrefs);

  // Also update user record
  updateUser(userId, prefs);
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

  // Prevent duplicate trips for the same user/destination/dates
  const duplicate = trips.find(t =>
    t.createdBy === trip.createdBy &&
    t.destination === trip.destination &&
    t.startDate === trip.startDate &&
    t.endDate === trip.endDate
  );
  if (duplicate) {
    console.warn('Duplicate trip detected, returning existing trip:', duplicate.id);
    return duplicate;
  }

  trips.push(trip);
  setStore(STORAGE_KEYS.TRIPS, trips);
  console.log('[Storage] saveTrip:', trip.id, trip.destination, 'days:', (trip.itinerary || []).length);
  return trip;
}

function getTrips() {
  return getStore(STORAGE_KEYS.TRIPS) || [];
}

function getTripById(id) {
  const trips = getTrips();
  const trip = trips.find(t => t.id === id) || null;
  if (trip) {
    console.log('[Storage] getTripById:', id, '->', trip.destination, 'days:', (trip.itinerary || []).length);
  } else {
    console.log('[Storage] getTripById:', id, '-> not found');
  }
  return trip;
}

function getUserTrips(userId) {
  const trips = getTrips();
  return trips.filter(t => t.createdBy === userId);
}

function getJoinedTrips(userId) {
  const trips = getTrips();
  return trips.filter(t => t.members && t.members.includes(userId));
}

function getSavedTrips(userId) {
  const user = getUserById(userId);
  if (!user || !user.savedTrips) return [];
  const trips = getTrips();
  return trips.filter(t => user.savedTrips.includes(t.id));
}

function updateTrip(tripId, updates) {
  const trips = getTrips();
  const index = trips.findIndex(t => t.id === tripId);
  if (index !== -1) {
    trips[index] = { ...trips[index], ...updates };
    setStore(STORAGE_KEYS.TRIPS, trips);
    return trips[index];
  }
  return null;
}

function deleteTrip(tripId) {
  const trips = getTrips();
  const filtered = trips.filter(t => t.id !== tripId);
  setStore(STORAGE_KEYS.TRIPS, filtered);
  // Also remove isolated saved itinerary if present
  try {
    localStorage.removeItem(`wm_saved_itinerary_${tripId}`);
  } catch (e) {}
}

function saveTripToUser(userId, tripId) {
  const user = getUserById(userId);
  if (!user) return;
  const savedTrips = user.savedTrips || [];
  if (!savedTrips.includes(tripId)) {
    savedTrips.push(tripId);
    updateUser(userId, { savedTrips });
  }
}

function removeSavedTrip(userId, tripId) {
  const user = getUserById(userId);
  if (!user) return;
  const savedTrips = (user.savedTrips || []).filter(id => id !== tripId);
  updateUser(userId, { savedTrips });
  // Also remove isolated saved itinerary if present
  try {
    localStorage.removeItem(`wm_saved_itinerary_${tripId}`);
  } catch (e) {}
}

/* --- Join Request Functions --- */
function saveJoinRequest(request) {
  const requests = getJoinRequests();
  request.id = request.id || generateId();
  request.createdAt = request.createdAt || new Date().toISOString();
  request.status = request.status || 'pending';
  requests.push(request);
  setStore(STORAGE_KEYS.JOIN_REQUESTS, requests);

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
  }
}

function markAllNotificationsRead(userId) {
  const notifications = getNotifications();
  notifications.forEach(n => {
    if (n.userId === userId) n.read = true;
  });
  setStore(STORAGE_KEYS.NOTIFICATIONS, notifications);
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

/* --- Initialize Sample Data --- */
function initSampleData() {
  if (getStore(STORAGE_KEYS.INITIALIZED)) return;

  // Sample destinations
  const destinations = [
    {
      id: 'dest_manali',
      name: 'Manali',
      state: 'Himachal Pradesh',
      description: 'A breathtaking hill station nestled in the mountains of Himachal Pradesh, known for its stunning valleys, adventure sports, and serene landscapes.',
      tags: ['Nature', 'Adventure', 'Mountains'],
      budget: '5000-10000',
      budgetLabel: '₹5K–₹10K',
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      activities: [
        { name: 'Solang Valley', type: 'Nature', cost: 500, time: 'Morning', icon: '🏔️', description: 'Snow-capped valley with adventure sports' },
        { name: 'Old Manali', type: 'Culture', cost: 200, time: 'Afternoon', icon: '🏘️', description: 'Charming old town with cafés and temples' },
        { name: 'Mall Road', type: 'Shopping', cost: 300, time: 'Evening', icon: '🛍️', description: 'Main shopping street with local handicrafts' },
        { name: 'Hadimba Temple', type: 'Culture', cost: 0, time: 'Morning', icon: '🛕', description: 'Ancient wooden temple surrounded by cedar forest' },
        { name: 'Rohtang Pass', type: 'Adventure', cost: 1500, time: 'Full Day', icon: '🏔️', description: 'High mountain pass with snow activities' },
        { name: 'Jogini Waterfall Trek', type: 'Nature', cost: 0, time: 'Morning', icon: '🌊', description: 'Beautiful waterfall hike through forest' },
        { name: 'River Rafting', type: 'Adventure', cost: 800, time: 'Afternoon', icon: '🚣', description: 'White-water rafting on Beas river' },
        { name: 'Local Café Hopping', type: 'Food', cost: 400, time: 'Afternoon', icon: '☕', description: 'Explore cozy cafés with mountain views' },
        { name: 'Sunset Point', type: 'Photography', cost: 0, time: 'Evening', icon: '📸', description: 'Stunning golden hour photography spot' },
        { name: 'Manali Sanctuary', type: 'Nature', cost: 50, time: 'Morning', icon: '🌲', description: 'Wildlife sanctuary with diverse flora' }
      ],
      stays: [
        { name: 'Mountain Hostel', cost: 500, type: 'Budget' },
        { name: 'Riverside Cottage', cost: 1200, type: 'Mid-Range' },
        { name: 'Valley View Hotel', cost: 2000, type: 'Comfort' }
      ],
      transport: {
        fromDelhi: { mode: 'Bus', cost: 800, duration: '12-14 hrs' },
        fromChandigarh: { mode: 'Bus', cost: 500, duration: '8-10 hrs' },
        local: { mode: 'Auto/Local Bus', cost: 200, perDay: true }
      }
    },
    {
      id: 'dest_kasol',
      name: 'Kasol',
      state: 'Himachal Pradesh',
      description: 'A serene village in the Parvati Valley, known for its tranquil riverside setting, trekking trails, and laid-back atmosphere.',
      tags: ['Slow Travel', 'Mountains', 'Trekking'],
      budget: '3000-8000',
      budgetLabel: '₹3K–₹8K',
      image: 'https://images.unsplash.com/photo-1506905927185-0d3c0e4d3f4e?w=1200&q=80',
      activities: [
        { name: 'Kheerganga Trek', type: 'Adventure', cost: 300, time: 'Full Day', icon: '🥾', description: 'Stunning hot spring trek through forests' },
        { name: 'Parvati River Walk', type: 'Nature', cost: 0, time: 'Morning', icon: '🌊', description: 'Peaceful riverside walking trail' },
        { name: 'Chalal Village', type: 'Culture', cost: 0, time: 'Afternoon', icon: '🏘️', description: 'Quiet village across the river' },
        { name: 'Israeli Café Hopping', type: 'Food', cost: 500, time: 'Afternoon', icon: '☕', description: 'Famous cafés with mountain views' },
        { name: 'Tosh Village', type: 'Nature', cost: 100, time: 'Full Day', icon: '🏔️', description: 'Remote mountain village with panoramic views' },
        { name: 'Manikaran Gurudwara', type: 'Culture', cost: 0, time: 'Morning', icon: '🛕', description: 'Hot springs and spiritual site' },
        { name: 'Stargazing', type: 'Photography', cost: 0, time: 'Night', icon: '⭐', description: 'Clear mountain skies for astrophotography' },
        { name: 'Nature Sketching', type: 'Nature', cost: 0, time: 'Afternoon', icon: '🎨', description: 'Sketch the scenic valley landscapes' }
      ],
      stays: [
        { name: 'Riverside Camp', cost: 400, type: 'Budget' },
        { name: 'Wooden Cottage', cost: 800, type: 'Mid-Range' },
        { name: 'Boutique Stay', cost: 1500, type: 'Comfort' }
      ],
      transport: {
        fromDelhi: { mode: 'Bus', cost: 700, duration: '12-13 hrs' },
        fromChandigarh: { mode: 'Bus', cost: 500, duration: '9-10 hrs' },
        local: { mode: 'Walking/Local Bus', cost: 100, perDay: true }
      }
    },
    {
      id: 'dest_goa',
      name: 'Goa',
      state: 'Goa',
      description: 'India\'s beach paradise offering golden shores, vibrant nightlife, Portuguese heritage, and a relaxed coastal lifestyle.',
      tags: ['Beach', 'Relaxation', 'Nightlife'],
      budget: '8000-15000',
      budgetLabel: '₹8K–₹15K',
      image: 'https://images.unsplash.com/photo-1512343879784-a73133f1bf21?w=1200&q=80',
      activities: [
        { name: 'Beach Day', type: 'Relaxation', cost: 300, time: 'Full Day', icon: '🏖️', description: 'Relax on pristine sandy beaches' },
        { name: 'Old Goa Churches', type: 'Culture', cost: 0, time: 'Morning', icon: '⛪', description: 'UNESCO World Heritage churches' },
        { name: 'Dudhsagar Falls', type: 'Nature', cost: 1200, time: 'Full Day', icon: '🌊', description: 'Majestic four-tiered waterfall' },
        { name: 'Spice Plantation', type: 'Nature', cost: 400, time: 'Afternoon', icon: '🌿', description: 'Aromatic spice garden tour' },
        { name: 'Sunset Cruise', type: 'Relaxation', cost: 800, time: 'Evening', icon: '⛵', description: 'Scenic boat ride at golden hour' },
        { name: 'Flea Market', type: 'Shopping', cost: 500, time: 'Afternoon', icon: '🛍️', description: 'Colorful beachside markets' },
        { name: 'Water Sports', type: 'Adventure', cost: 1500, time: 'Morning', icon: '🏄', description: 'Parasailing, jet-ski, banana ride' },
        { name: 'Seafood Dining', type: 'Food', cost: 600, time: 'Evening', icon: '🦐', description: 'Fresh catch at beach shacks' }
      ],
      stays: [
        { name: 'Beach Hostel', cost: 600, type: 'Budget' },
        { name: 'Beach Hut', cost: 1500, type: 'Mid-Range' },
        { name: 'Heritage Villa', cost: 3000, type: 'Comfort' }
      ],
      transport: {
        fromMumbai: { mode: 'Train/Flight', cost: 1500, duration: '8-12 hrs / 1 hr' },
        fromBangalore: { mode: 'Bus/Flight', cost: 1200, duration: '10 hrs / 1 hr' },
        local: { mode: 'Scooter Rental', cost: 350, perDay: true }
      }
    },
    {
      id: 'dest_rishikesh',
      name: 'Rishikesh',
      state: 'Uttarakhand',
      description: 'The yoga capital of the world, where the Ganges flows through dramatic valleys offering adventure sports, spiritual retreats, and stunning natural beauty.',
      tags: ['Adventure', 'Wellness', 'Spiritual'],
      budget: '4000-10000',
      budgetLabel: '₹4K–₹10K',
      image: 'https://images.unsplash.com/photo-1527697891168-4d3a18e2955e?w=1200&q=80',
      activities: [
        { name: 'White Water Rafting', type: 'Adventure', cost: 1000, time: 'Morning', icon: '🚣', description: '16km rafting on the Ganges' },
        { name: 'Bungee Jumping', type: 'Adventure', cost: 3500, time: 'Afternoon', icon: '🤸', description: 'India\'s highest bungee at 83m' },
        { name: 'Ganga Aarti', type: 'Culture', cost: 0, time: 'Evening', icon: '🪔', description: 'Spiritual fire ceremony at Triveni Ghat' },
        { name: 'Beatles Ashram', type: 'Culture', cost: 150, time: 'Morning', icon: '🎸', description: 'Iconic abandoned ashram with murals' },
        { name: 'Yoga Session', type: 'Wellness', cost: 300, time: 'Morning', icon: '🧘', description: 'Sunrise yoga by the Ganges' },
        { name: 'Neer Waterfall', type: 'Nature', cost: 50, time: 'Afternoon', icon: '🌊', description: 'Scenic waterfall trek' },
        { name: 'Café Crawl', type: 'Food', cost: 400, time: 'Afternoon', icon: '☕', description: 'Organic cafés along the river' },
        { name: 'Camping by Ganges', type: 'Nature', cost: 800, time: 'Overnight', icon: '⛺', description: 'Riverside camping under stars' }
      ],
      stays: [
        { name: 'Ashram Stay', cost: 300, type: 'Budget' },
        { name: 'Riverside Hostel', cost: 600, type: 'Mid-Range' },
        { name: 'Boutique Hotel', cost: 1800, type: 'Comfort' }
      ],
      transport: {
        fromDelhi: { mode: 'Bus/Train', cost: 500, duration: '6-7 hrs' },
        fromDehradun: { mode: 'Bus', cost: 100, duration: '1 hr' },
        local: { mode: 'Auto/Walking', cost: 150, perDay: true }
      }
    }
  ];

  setStore(STORAGE_KEYS.DESTINATIONS, destinations);

  // Sample travelers (for matching demo)
  const sampleTravelers = [
    {
      id: 'traveler_rahul',
      name: 'Rahul',
      travelStyle: ['Nature', 'Photography'],
      budget: '5000-10000',
      socialPreference: 'Small Group',
      interests: ['Nature', 'Photography', 'Cafés'],
      travelPace: 'Slow',
      avatar: 'R'
    },
    {
      id: 'traveler_ananya',
      name: 'Ananya',
      travelStyle: ['Nature', 'Hiking'],
      budget: '5000-10000',
      socialPreference: 'Small Group',
      interests: ['Nature', 'Hiking', 'Wellness'],
      travelPace: 'Moderate',
      avatar: 'A'
    },
    {
      id: 'traveler_arjun',
      name: 'Arjun',
      travelStyle: ['Adventure', 'Photography'],
      budget: '7000-12000',
      socialPreference: 'Small Group',
      interests: ['Adventure', 'Photography', 'Local Food'],
      travelPace: 'Moderate',
      avatar: 'A'
    },
    {
      id: 'traveler_priya',
      name: 'Priya',
      travelStyle: ['Culture', 'Food'],
      budget: '8000-15000',
      socialPreference: '1-2 People',
      interests: ['Culture', 'Food', 'Architecture'],
      travelPace: 'Slow',
      avatar: 'P'
    },
    {
      id: 'traveler_vikram',
      name: 'Vikram',
      travelStyle: ['Adventure', 'Nature'],
      budget: '5000-10000',
      socialPreference: 'Social',
      interests: ['Trekking', 'Camping', 'Photography'],
      travelPace: 'Fast',
      avatar: 'V'
    },
    {
      id: 'traveler_neha',
      name: 'Neha',
      travelStyle: ['Relaxed', 'Nature'],
      budget: '3000-8000',
      socialPreference: 'Solo',
      interests: ['Nature', 'Reading', 'Meditation'],
      travelPace: 'Slow',
      avatar: 'N'
    },
    {
      id: 'traveler_karan',
      name: 'Karan',
      travelStyle: ['Adventure', 'Culture'],
      budget: '10000-20000',
      socialPreference: 'Small Group',
      interests: ['Adventure', 'History', 'Photography'],
      travelPace: 'Moderate',
      avatar: 'K'
    },
    {
      id: 'traveler_meera',
      name: 'Meera',
      travelStyle: ['Nature', 'Wellness'],
      budget: '5000-10000',
      socialPreference: '1-2 People',
      interests: ['Yoga', 'Nature', 'Cafés'],
      travelPace: 'Slow',
      avatar: 'M'
    }
  ];

  setStore(STORAGE_KEYS.SAMPLE_TRAVELERS, sampleTravelers);

  // Sample group trips
  const sampleTrips = [
    {
      id: 'trip_manali_weekend',
      destination: 'Manali',
      destinationId: 'dest_manali',
      title: 'Manali Weekend Escape',
      startDate: '2026-08-24',
      endDate: '2026-08-27',
      budget: 7500,
      travelStyle: 'Nature',
      maxMembers: 6,
      members: ['traveler_rahul', 'traveler_ananya', 'traveler_arjun', 'traveler_priya'],
      socialPreference: 'Small Group',
      interests: ['Nature', 'Photography', 'Adventure'],
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      description: 'A relaxed weekend exploring the mountains of Manali. We\'ll visit Solang Valley, explore Old Manali, and enjoy the scenic beauty at a comfortable pace.',
      status: 'open',
      createdBy: 'traveler_rahul',
      itinerary: [
        {
          day: 1,
          title: 'Arrival & Explore',
          activities: [
            { name: 'Arrive in Manali', time: '10:00 AM', icon: '🚌', cost: 0 },
            { name: 'Check-in & Rest', time: '12:00 PM', icon: '🏨', cost: 0 },
            { name: 'Mall Road Walk', time: '3:00 PM', icon: '🛍️', cost: 300 },
            { name: 'Local Café', time: '5:00 PM', icon: '☕', cost: 400 }
          ]
        },
        {
          day: 2,
          title: 'Adventure Day',
          activities: [
            { name: 'Solang Valley', time: '8:00 AM', icon: '🏔️', cost: 500 },
            { name: 'Lunch at Valley', time: '1:00 PM', icon: '🍽️', cost: 300 },
            { name: 'Adventure Activity', time: '2:30 PM', icon: '🎿', cost: 800 },
            { name: 'Sunset Point', time: '5:30 PM', icon: '📸', cost: 0 }
          ]
        },
        {
          day: 3,
          title: 'Culture & Return',
          activities: [
            { name: 'Hadimba Temple', time: '8:00 AM', icon: '🛕', cost: 0 },
            { name: 'Old Manali', time: '10:30 AM', icon: '🏘️', cost: 200 },
            { name: 'Local Market', time: '12:00 PM', icon: '🛍️', cost: 300 },
            { name: 'Departure', time: '3:00 PM', icon: '🚌', cost: 0 }
          ]
        }
      ],
      createdAt: '2026-08-15T10:00:00Z'
    },
    {
      id: 'trip_kasol_slow',
      destination: 'Kasol',
      destinationId: 'dest_kasol',
      title: 'Kasol Slow Travel',
      startDate: '2026-08-30',
      endDate: '2026-09-02',
      budget: 6500,
      travelStyle: 'Nature',
      maxMembers: 5,
      members: ['traveler_neha', 'traveler_meera', 'traveler_ananya'],
      socialPreference: 'Small Group',
      interests: ['Nature', 'Slow Travel', 'Cafés'],
      image: 'https://images.unsplash.com/photo-1506905927185-0d3c0e4d3f4e?w=1200&q=80',
      description: 'A slow-paced journey through the Parvati Valley. No rush, no strict schedules — just nature, good food, and meaningful conversations.',
      status: 'open',
      createdBy: 'traveler_neha',
      itinerary: [
        {
          day: 1,
          title: 'Settle In',
          activities: [
            { name: 'Arrive in Kasol', time: '11:00 AM', icon: '🚌', cost: 0 },
            { name: 'Riverside Café Lunch', time: '1:00 PM', icon: '☕', cost: 400 },
            { name: 'Parvati River Walk', time: '3:00 PM', icon: '🌊', cost: 0 },
            { name: 'Sunset from Bridge', time: '6:00 PM', icon: '📸', cost: 0 }
          ]
        },
        {
          day: 2,
          title: 'Explore & Trek',
          activities: [
            { name: 'Chalal Village Walk', time: '9:00 AM', icon: '🏘️', cost: 0 },
            { name: 'Café Hopping', time: '12:00 PM', icon: '☕', cost: 500 },
            { name: 'Tosh Village Trip', time: '2:00 PM', icon: '🏔️', cost: 100 },
            { name: 'Stargazing', time: '9:00 PM', icon: '⭐', cost: 0 }
          ]
        },
        {
          day: 3,
          title: 'Wellness & Return',
          activities: [
            { name: 'Morning Meditation', time: '7:00 AM', icon: '🧘', cost: 0 },
            { name: 'Manikaran Visit', time: '10:00 AM', icon: '🛕', cost: 0 },
            { name: 'Hot Springs', time: '11:30 AM', icon: '♨️', cost: 0 },
            { name: 'Departure', time: '2:00 PM', icon: '🚌', cost: 0 }
          ]
        }
      ],
      createdAt: '2026-08-16T10:00:00Z'
    },
    {
      id: 'trip_rishikesh_adventure',
      destination: 'Rishikesh',
      destinationId: 'dest_rishikesh',
      title: 'Rishikesh Adventure Weekend',
      startDate: '2026-09-05',
      endDate: '2026-09-08',
      budget: 9000,
      travelStyle: 'Adventure',
      maxMembers: 8,
      members: ['traveler_vikram', 'traveler_arjun', 'traveler_karan'],
      socialPreference: 'Social',
      interests: ['Adventure', 'Rafting', 'Camping'],
      image: 'https://images.unsplash.com/photo-1527697891168-4d3a18e2955e?w=1200&q=80',
      description: 'An action-packed weekend in Rishikesh — rafting, bungee jumping, cliff jumping, and camping by the Ganges under the stars.',
      status: 'open',
      createdBy: 'traveler_vikram',
      itinerary: [
        {
          day: 1,
          title: 'Arrival & Rafting',
          activities: [
            { name: 'Arrive in Rishikesh', time: '9:00 AM', icon: '🚌', cost: 0 },
            { name: 'White Water Rafting', time: '11:00 AM', icon: '🚣', cost: 1000 },
            { name: 'Riverside Lunch', time: '2:00 PM', icon: '🍽️', cost: 300 },
            { name: 'Camp Setup', time: '4:00 PM', icon: '⛺', cost: 0 },
            { name: 'Ganga Aarti', time: '6:30 PM', icon: '🪔', cost: 0 }
          ]
        },
        {
          day: 2,
          title: 'Extreme Adventures',
          activities: [
            { name: 'Bungee Jumping', time: '9:00 AM', icon: '🤸', cost: 3500 },
            { name: 'Beatles Ashram', time: '1:00 PM', icon: '🎸', cost: 150 },
            { name: 'Cliff Jumping', time: '3:00 PM', icon: '🧗', cost: 500 },
            { name: 'Bonfire Night', time: '8:00 PM', icon: '🔥', cost: 0 }
          ]
        },
        {
          day: 3,
          title: 'Wellness & Return',
          activities: [
            { name: 'Sunrise Yoga', time: '6:00 AM', icon: '🧘', cost: 300 },
            { name: 'Neer Waterfall', time: '9:00 AM', icon: '🌊', cost: 50 },
            { name: 'Café Brunch', time: '12:00 PM', icon: '☕', cost: 400 },
            { name: 'Departure', time: '3:00 PM', icon: '🚌', cost: 0 }
          ]
        }
      ],
      createdAt: '2026-08-17T10:00:00Z'
    },
    {
      id: 'trip_goa_beach',
      destination: 'Goa',
      destinationId: 'dest_goa',
      title: 'Goa Beach & Chill',
      startDate: '2026-09-12',
      endDate: '2026-09-16',
      budget: 12000,
      travelStyle: 'Relaxation',
      maxMembers: 6,
      members: ['traveler_priya', 'traveler_meera'],
      socialPreference: 'Small Group',
      interests: ['Beach', 'Food', 'Culture'],
      image: 'https://images.unsplash.com/photo-1512343879784-a73133f1bf21?w=1200&q=80',
      description: 'A relaxing beach getaway in Goa. Beaches, seafood, sunsets, and a touch of Portuguese heritage. Perfect for unwinding.',
      status: 'open',
      createdBy: 'traveler_priya',
      itinerary: [
        {
          day: 1,
          title: 'Beach Day',
          activities: [
            { name: 'Arrive & Check-in', time: '10:00 AM', icon: '✈️', cost: 0 },
            { name: 'Beach Relaxation', time: '12:00 PM', icon: '🏖️', cost: 300 },
            { name: 'Sunset at Vagator', time: '5:00 PM', icon: '🌅', cost: 0 },
            { name: 'Beach Shack Dinner', time: '7:30 PM', icon: '🦐', cost: 600 }
          ]
        },
        {
          day: 2,
          title: 'Heritage & Nature',
          activities: [
            { name: 'Old Goa Churches', time: '9:00 AM', icon: '⛪', cost: 0 },
            { name: 'Spice Plantation', time: '12:00 PM', icon: '🌿', cost: 400 },
            { name: 'Fontainhas Walk', time: '3:00 PM', icon: '🏘️', cost: 0 },
            { name: 'Seafood Dinner', time: '7:00 PM', icon: '🍽️', cost: 800 }
          ]
        },
        {
          day: 3,
          title: 'Water & Markets',
          activities: [
            { name: 'Water Sports', time: '9:00 AM', icon: '🏄', cost: 1500 },
            { name: 'Beach Lunch', time: '1:00 PM', icon: '🍽️', cost: 400 },
            { name: 'Flea Market', time: '3:00 PM', icon: '🛍️', cost: 500 },
            { name: 'Sunset Cruise', time: '5:00 PM', icon: '⛵', cost: 800 }
          ]
        },
        {
          day: 4,
          title: 'Relax & Return',
          activities: [
            { name: 'Beach Morning', time: '8:00 AM', icon: '🏖️', cost: 0 },
            { name: 'Brunch', time: '11:00 AM', icon: '☕', cost: 500 },
            { name: 'Departure', time: '2:00 PM', icon: '✈️', cost: 0 }
          ]
        }
      ],
      createdAt: '2026-08-18T10:00:00Z'
    }
  ];

  setStore(STORAGE_KEYS.TRIPS, sampleTrips);

  // Mark as initialized
  setStore(STORAGE_KEYS.INITIALIZED, true);
}

// Initialize on load
initSampleData();
