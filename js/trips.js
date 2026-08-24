/* ============================================
   Kibi — Trips Module
   CRUD operations, tab management, trip cards
   ============================================ */

// Curated Unsplash travel photos used when Wikipedia/TripMate has no image.
const DESTINATION_FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80',
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1600&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80',
  'https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1600&q=80',
  'https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=1600&q=80',
  'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1600&q=80',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=1600&q=80',
  'https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=1600&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1600&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1600&q=80'
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function deterministicFallbackImage(destination) {
  const idx = hashString(destination) % DESTINATION_FALLBACK_IMAGES.length;
  return DESTINATION_FALLBACK_IMAGES[idx];
}

async function getDestinationImage(destination) {
  if (!destination) return deterministicFallbackImage('unknown');
  if (typeof TripMateAPI === 'undefined') return deterministicFallbackImage(destination);

  try {
    const place = await TripMateAPI.getPlaceInfo(destination);
    if (place && place.image) return place.image;
  } catch (e) {
    console.warn('[getDestinationImage] getPlaceInfo failed:', e);
  }

  try {
    const img = await TripMateAPI.searchForImage(destination);
    if (img) return img;
  } catch (e) {
    console.warn('[getDestinationImage] searchForImage failed:', e);
  }

  return deterministicFallbackImage(destination);
}

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'my-trips') {
    const user = requireAuth();
    if (!user) return;
    initNav('my-trips');
    initMyTrips(user);
  }

  if (page === 'trip-details') {
    initNav('discover', true);
    initTripDetails();
  }

  if (page === 'plan-trip') {
    requireAuth('login.html');
    initNav('plan-trip');
    initPlanTrip();
  }

  if (page === 'itinerary') {
    initNav('itinerary');
    initItineraryPage();
  }

  if (page === 'discover') {
    initNav('discover');
    initDiscover();
  }

  if (page === 'profile') {
    const user = requireAuth();
    if (!user) return;
    initNav('profile');
    initProfile(user);
  }
});

/* ==========================================
   MY TRIPS PAGE
   ========================================== */
function initMyTrips(user) {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  renderPlannedTrips(user);
  renderJoinedTrips(user);
  renderSavedTripsTab(user);
}

function renderPlannedTrips(user) {
  const container = document.getElementById('plannedTrips');
  if (!container) return;

  const trips = getUserTrips(user.id);

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No planned trips yet</h3>
        <p class="text-text-secondary">Start by planning your first adventure!</p>
        <a href="plan-trip.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Plan a Trip</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${trips.map(trip => renderTripCard(trip, true)).join('')}
  </div>`;

  // Attach delete handlers
  container.querySelectorAll('.delete-trip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmModal('This trip will be permanently removed.', () => {
        deleteTrip(btn.dataset.id);
        renderPlannedTrips(user);
        showToast('Trip deleted', 'default');
      });
    });
  });
}

function renderJoinedTrips(user) {
  const container = document.getElementById('joinedTrips');
  if (!container) return;

  const requests = getUserJoinRequests(user.id);
  const trips = getTrips();

  const joinedTripIds = requests.map(r => r.tripId);
  const joinedTrips = trips.filter(t => joinedTripIds.includes(t.id));

  if (joinedTrips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No joined trips</h3>
        <p class="text-text-secondary">Browse trips and request to join!</p>
        <a href="discover.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Discover Trips</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${joinedTrips.map(trip => {
      const request = requests.find(r => r.tripId === trip.id);
      return renderTripCard(trip, false, request?.status);
    }).join('')}
  </div>`;
}

function renderSavedTripsTab(user) {
  const container = document.getElementById('savedTrips');
  if (!container) return;

  const trips = getSavedTrips(user.id);

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No saved trips</h3>
        <p class="text-text-secondary">Save trips you're interested in!</p>
        <a href="discover.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Discover Trips</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${trips.map(trip => renderTripCard(trip, true, null, true)).join('')}
  </div>`;

  // Attach delete handlers for saved trips
  container.querySelectorAll('.delete-trip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmModal('This saved trip will be permanently removed.', () => {
        removeSavedItinerary(btn.dataset.id);
        renderSavedTripsTab(user);
        showToast('Saved trip deleted', 'default');
      });
    });
  });
}

function renderTripCard(trip, showDelete = false, status = null, savedView = false) {
  const detailUrl = savedView ? 'saved-itinerary.html' : 'itinerary.html';
  return `
    <div class="trip-card bg-white rounded-2xl shadow-soft overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-card transition-all duration-300" onclick="window.location.href='${detailUrl}?id=${trip.id}'">
      <div class="card-image-container aspect-[16/10] overflow-hidden relative">
        <img src="${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'}" alt="${trip.destination}" class="card-image w-full h-full object-cover" loading="lazy">
        ${status ? `<div class="absolute top-3 right-3">
          <span class="tag ${status === 'pending' ? '' : 'tag-sage'}">${status === 'pending' ? 'Request Sent' : 'Joined'}</span>
        </div>` : ''}
      </div>
      <div class="card-body p-5">
        <div class="card-title font-serif text-lg text-charcoal">${trip.title || trip.destination}</div>
        <div class="card-subtitle text-sm text-text-secondary mt-1">${formatDateRange(trip.startDate, trip.endDate)}</div>
        <div class="trip-card-meta flex items-center justify-between text-sm text-text-secondary mt-3">
          <span>${formatBudget(trip.budget || trip.totalBudget || 0)}</span>
          ${trip.maxMembers ? `<span>${(trip.members || []).length}/${trip.maxMembers} travelers</span>` : ''}
        </div>
      </div>
      ${showDelete ? `
        <div class="card-footer flex items-center justify-between px-5 pb-5">
          <a href="${detailUrl}?id=${trip.id}" class="btn btn-ghost btn-sm">View</a>
          <button class="btn btn-ghost btn-sm delete-trip text-error font-semibold" data-id="${trip.id}">Delete</button>
        </div>
      ` : ''}
    </div>
  `;
}

/* ==========================================
   TRIP DETAILS PAGE
   ========================================== */
function initTripDetails() {
  const tripId = getQueryParam('id');
  if (!tripId) {
    window.location.href = 'discover.html';
    return;
  }

  const trip = getTripById(tripId);
  if (!trip) {
    window.location.href = 'discover.html';
    return;
  }

  const user = getCurrentUser();
  const dest = getDestinationById(trip.destinationId);
  const hasRequested = user ? hasRequestedToJoin(user.id, tripId) : false;

  // Header
  const headerEl = document.getElementById('tripHeader');
  if (headerEl) {
    headerEl.style.backgroundImage = `url(${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'})`;
    headerEl.innerHTML = `
      <div class="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-transparent flex items-end">
        <div class="max-w-7xl mx-auto px-6 pb-12 w-full">
          <h1 class="font-serif text-4xl md:text-5xl text-white">${trip.title || trip.destination}</h1>
          <p class="text-lg text-white/80 mt-2">${formatDateRange(trip.startDate, trip.endDate)} · ${formatBudget(trip.budget)}</p>
        </div>
      </div>
    `;
  }

  // Description
  const descEl = document.getElementById('tripDescription');
  if (descEl) {
    descEl.innerHTML = `
      <p class="text-large">${trip.description || 'An amazing trip waiting for you.'}</p>
      <div class="tags flex flex-wrap gap-2 mt-6">
        ${(trip.interests || []).map(i => `<span class="tag tag-sage">${i}</span>`).join('')}
        <span class="tag">${trip.travelStyle || 'Adventure'}</span>
        <span class="tag">${trip.socialPreference || 'Small Group'}</span>
      </div>
    `;
  }

  // Compatibility
  if (user) {
    const compatEl = document.getElementById('tripCompat');
    if (compatEl) {
      const score = calculateTripCompatibility(user, trip);
      compatEl.innerHTML = `
        <div class="match-score inline-flex items-center px-6 py-4 rounded-full bg-sage/10 text-sage text-2xl font-semibold">
          <span data-counter="${score}" data-suffix="%" data-duration="1500">0%</span> Match
        </div>
        <p class="text-small text-text-secondary mt-2">Based on your travel profile</p>
      `;
    }
  }

  // Itinerary
  const itinEl = document.getElementById('tripItinerary');
  if (itinEl && trip.itinerary) {
    itinEl.innerHTML = `
      <div class="itinerary-timeline">
        ${trip.itinerary.map(day => `
          <div class="itinerary-day">
            <div class="itinerary-day-label">Day ${day.day} — ${day.title}</div>
            <div class="itinerary-activities">
              ${day.activities.map(act => `
                <div class="itinerary-activity">
                  <div class="activity-icon">${act.icon || '📍'}</div>
                  <div class="activity-info">
                    <div class="activity-name">${act.name}</div>
                    <div class="activity-time">${act.time}${act.cost ? ` · ${formatBudget(act.cost)}` : ''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Members
  const membersEl = document.getElementById('tripMembers');
  if (membersEl && trip.members) {
    const travelers = getSampleTravelers();
    membersEl.innerHTML = `
      <div class="flex flex-wrap gap-3">
        ${trip.members.map(memberId => {
          const member = travelers.find(t => t.id === memberId);
          return member ? `
            <div class="flex items-center gap-2 px-3 py-1.5 bg-cream-dark rounded-full">
              <div class="w-7 h-7 rounded-full bg-sage text-white flex items-center justify-center text-xs font-semibold">${member.avatar || member.name.charAt(0)}</div>
              <span class="text-small text-text-main">${member.name}</span>
            </div>
          ` : '';
        }).join('')}
        ${trip.maxMembers - trip.members.length > 0 ? `
          <div class="text-small text-text-muted px-3 py-1.5">${trip.maxMembers - trip.members.length} spots left</div>
        ` : ''}
      </div>
    `;
  }

  // Join button
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn) {
    if (!user) {
      joinBtn.textContent = 'Login to Join';
      joinBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
    } else if (hasRequested) {
      joinBtn.textContent = 'Request Sent ✓';
      joinBtn.classList.remove('btn-accent');
      joinBtn.classList.add('btn-secondary');
      joinBtn.disabled = true;
    } else {
      joinBtn.addEventListener('click', () => {
        saveJoinRequest({
          tripId: trip.id,
          userId: user.id
        });

        saveNotification({
          userId: user.id,
          message: `Your request to join "${trip.title || trip.destination}" was sent!`,
          type: 'join_request'
        });

        joinBtn.textContent = 'Request Sent ✓';
        joinBtn.classList.remove('btn-accent');
        joinBtn.classList.add('btn-secondary');
        joinBtn.disabled = true;

        showToast('Join request sent! 🎉', 'success');
      });
    }
  }

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn && user) {
    saveBtn.addEventListener('click', () => {
      const snapshot = {
        ...deepClone(trip),
        createdBy: user.id,
        createdAt: new Date().toISOString()
      };
      const saved = saveSavedItinerary(snapshot);
      if (!saved) {
        showToast('This trip is already saved.', 'default');
        saveBtn.textContent = 'Already Saved';
        saveBtn.disabled = true;
        return;
      }
      showToast('Trip saved! ✓', 'success');
      saveBtn.textContent = 'Saved ✓';
      saveBtn.disabled = true;
    });
  }

  // Initialize animations
  if (typeof runAnimationInit === 'function') runAnimationInit();
}

/* ==========================================
   PLAN TRIP PAGE
   ========================================== */
function initPlanTrip() {
  const user = getCurrentUser();
  const form = document.getElementById('planForm');
  if (!form) return;

  // Destination Search (Nominatim API Integration)
  const destSearch = document.getElementById('destSearch');
  const destSuggestions = document.getElementById('destSuggestions');
  const destId = document.getElementById('destId');
  const destLat = document.getElementById('destLat');
  const destLon = document.getElementById('destLon');

  if (destSearch && destSuggestions) {
    let debounceTimer;
    let abortController;

    function hideSuggestions() {
      destSuggestions.classList.add('hidden');
      destSuggestions.style.display = '';
    }

    function showSuggestions(html) {
      destSuggestions.innerHTML = html;
      destSuggestions.classList.remove('hidden');
      destSuggestions.style.display = 'block';
    }

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!destSearch.contains(e.target) && !destSuggestions.contains(e.target)) {
        hideSuggestions();
      }
    });

    destSearch.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);
      if (abortController) abortController.abort();

      if (query.length < 3) {
        hideSuggestions();
        return;
      }

      // Debounce API calls — 250ms feels snappy while still avoiding spam
      debounceTimer = setTimeout(async () => {
        showSuggestions('<div class="px-4 py-3 text-text-muted dark:text-[#BDC1C6] text-sm">Searching...</div>');

        abortController = new AbortController();
        let results;
        try {
          results = await GeocodingAPI.searchDestination(query, abortController.signal);
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('Destination search error:', err);
          results = null;
        }

        if (!results || results.length === 0) {
          showSuggestions('<div class="px-4 py-3 text-text-muted dark:text-[#BDC1C6] text-sm">No destinations found.</div>');
          return;
        }

        showSuggestions(results.map(result => `
          <div class="suggestion-item px-4 py-3 cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-cream-dark dark:hover:bg-white/5" data-id="${result.id}" data-lat="${result.latitude}" data-lon="${result.longitude}" data-name="${result.name}">
            <div class="font-semibold text-sm text-text-main dark:text-[#F1F3F4]">${result.name}</div>
            <div class="text-xs text-text-muted dark:text-[#BDC1C6]">${result.displayName}</div>
          </div>
        `).join(''));

        // Add click handlers to suggestions
        destSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            destSearch.value = item.dataset.name;
            destId.value = item.dataset.id;
            destLat.value = item.dataset.lat;
            destLon.value = item.dataset.lon;
            hideSuggestions();
          });
        });
      }, 250);
    });
  }

  // Pre-fill from user preferences
  if (user) {
    const budgetInput = document.getElementById('budgetInput');
    if (budgetInput && user.budget) {
      const range = parseBudgetRange(user.budget);
      if (range) budgetInput.value = Math.round((range.min + range.max) / 2);
    }
  }

  // Interest chips
  document.querySelectorAll('#planInterests .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Travel style chips
  document.querySelectorAll('#planStyles .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Generate itinerary
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const destinationName = document.getElementById('destSearch').value;
    const destinationId = document.getElementById('destId').value || 'custom_dest';
    const lat = document.getElementById('destLat').value;
    const lon = document.getElementById('destLon').value;

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const budget = parseInt(document.getElementById('budgetInput').value);

    const selectedStyles = [...document.querySelectorAll('#planStyles .chip.active')].map(c => c.dataset.value);
    const selectedInterests = [...document.querySelectorAll('#planInterests .chip.active')].map(c => c.dataset.value);
    const socialPref = document.getElementById('socialSelect')?.value || 'Small Group';
    const pace = document.getElementById('paceSelect')?.value || 'Moderate';

    // Validation
    if (!destinationName) return showToast('Please select a destination', 'error');
    if (!startDate) return showToast('Please select a start date', 'error');
    if (!endDate) return showToast('Please select an end date', 'error');
    if (new Date(endDate) <= new Date(startDate)) return showToast('End date must be after start date', 'error');
    if (!budget || budget < 1000) return showToast('Please enter a valid budget (min ₹1,000)', 'error');

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner inline-block w-5 h-5 border-2 mr-2 align-middle"></span> Generating...';
    submitBtn.disabled = true;

    // Generate async
    try {
      const result = await generateItinerary({
        destinationId,
        destinationName,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        startDate,
        endDate,
        budget,
        travelStyle: selectedStyles,
        interests: selectedInterests,
        socialPreference: socialPref,
        travelPace: pace
      });

      if (!result) {
        throw new Error('Itinerary generation failed');
      }

      // Store the generated itinerary temporarily
      sessionStorage.setItem('wm_generated_itinerary', JSON.stringify(result));

      showToast('Itinerary generated! 🎉', 'success');
      setTimeout(() => {
        window.location.href = 'itinerary.html';
      }, 500);

    } catch (err) {
      console.error('Itinerary generation error:', err);
      showToast('Could not generate itinerary: ' + (err && err.message ? err.message : 'Unknown error'), 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

/* ==========================================
   ITINERARY PAGE
   ========================================== */
function initItineraryPage() {
  try {
    runInitItineraryPage();
  } catch (err) {
    console.error('Itinerary page crashed:', err);
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = `
        <div class="max-w-xl mx-auto mt-20 p-8 glass-panel rounded-3xl text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
          <p class="text-gray-600 mb-6">We couldn't display this itinerary. Please try planning the trip again.</p>
          <p class="text-xs text-gray-400 mb-6 font-mono">${String(err && err.message ? err.message : err).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</p>
          <a href="plan-trip.html" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors">Plan a New Trip</a>
        </div>
      `;
    }
  }
}

function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.warn('[Itinerary] deepClone failed:', e);
    return obj;
  }
}

function runInitItineraryPage() {
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get('id');

  // STRICT: If a saved trip ID is in the URL, ONLY load that saved trip.
  if (tripId) {
    // Extra safety: remove any generated itinerary lingering in sessionStorage
    try { sessionStorage.removeItem('wm_generated_itinerary'); } catch (e) {}

    // Load from the saved itineraries array first, then legacy storages.
    let saved = null;
    const savedList = getSavedItineraries ? getSavedItineraries() : [];
    saved = savedList.find(t => t.id === tripId) || null;

    if (!saved) {
      try {
        const isolated = localStorage.getItem(`wm_saved_itinerary_${tripId}`);
        if (isolated) saved = JSON.parse(isolated);
      } catch (e) {}
    }
    if (!saved) {
      saved = getTripById(tripId);
    }

    const isValidSaved = saved && saved.destination && (Array.isArray(saved.itinerary) && saved.itinerary.length > 0);
    if (isValidSaved) {
      renderLoadedItinerary(deepClone(saved));
      return;
    }
    // Saved trip missing or corrupt — show clear error instead of falling back
    console.error('[Itinerary] Saved trip not found or invalid for id:', tripId, saved);
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = `
        <div class="max-w-xl mx-auto mt-20 p-8 glass-panel rounded-3xl text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Trip not available</h2>
          <p class="text-gray-600 mb-6">We couldn't load this saved trip. It may have been deleted, corrupted, or not fully saved.</p>
          <a href="my-trips.html" class="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-colors">Go to My Trips</a>
        </div>
      `;
    }
    return;
  }

  // No ID in URL: use generated itinerary from plan-trip/discover flow
  let itinerary = null;
  try {
    const generated = sessionStorage.getItem('wm_generated_itinerary');
    if (generated) itinerary = JSON.parse(generated);
  } catch (e) {
    console.warn('Failed to parse generated itinerary:', e);
  }

  if (!itinerary) {
    window.location.href = 'plan-trip.html';
    return;
  }

  renderLoadedItinerary(deepClone(itinerary));
}

function renderLoadedItinerary(itinerary) {
  // Normalize fields so downstream code doesn't crash on missing data
  itinerary.destination = itinerary.destination || 'Your Destination';
  itinerary.startDate = itinerary.startDate || new Date().toISOString();
  itinerary.endDate = itinerary.endDate || new Date().toISOString();
  itinerary.itinerary = Array.isArray(itinerary.itinerary) ? itinerary.itinerary : [];
  itinerary.accommodations = Array.isArray(itinerary.accommodations) ? itinerary.accommodations : [];
  itinerary.budgetBreakdown = itinerary.budgetBreakdown || { stay: 0, food: 0, transport: 0, activities: 0, total: 0 };
  itinerary.weather = itinerary.weather || {};

  // 1. Hero Section
  const heroEl = document.getElementById('itinHero');
  if (heroEl) {
    const fallbackBg = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80`;

    function renderHero(imageUrl, description) {
      const currentUser = getCurrentUser();
      // Check My Trips (wm_trips) for an existing planned trip with same destination + start date.
      const alreadySaved = currentUser && getUserTrips(currentUser.id).some(t =>
        t.destination === itinerary.destination && t.startDate === itinerary.startDate
      );
      const saveBtnText = alreadySaved ? 'Already Saved' : 'Save Trip';
      heroEl.innerHTML = `
        <div id="itinHeroBg" class="absolute inset-0 bg-cover bg-center transition-all duration-700" style="background-image: url('${imageUrl || fallbackBg}')"></div>
        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
        <div class="relative z-10 w-full flex flex-col md:flex-row justify-between items-end gap-6">
            <div class="text-white max-w-2xl">
                <div class="flex flex-wrap items-center gap-3 mb-4">
                    <span class="px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md text-blue-100 text-xs font-semibold border border-blue-400/30">Personalized Trip</span>
                    <span class="text-sm text-gray-200 flex items-center gap-1 font-medium">
                        <i class="fa-regular fa-calendar text-xs"></i>
                        ${formatDateRange(itinerary.startDate, itinerary.endDate)}
                    </span>
                </div>
                <h1 class="text-4xl md:text-5xl font-bold mb-3 tracking-tight">${itinerary.destination} Escape</h1>
                <p class="text-base md:text-lg text-gray-200 opacity-90 font-light line-clamp-2">${(description || itinerary.placeDescription || '').slice(0, 120)}</p>
            </div>
            <div class="flex gap-3 shrink-0 w-full md:w-auto">
                <button class="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20">
                    <i class="fa-solid fa-share-nodes"></i>
                    Share
                </button>
                <button id="saveItinBtn" class="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/80 transition-colors shadow-lg shadow-brand-blue/30 border border-brand-blue/50" ${alreadySaved ? 'disabled' : ''}>
                    <i class="fa-regular fa-bookmark"></i>
                    ${saveBtnText}
                </button>
            </div>
        </div>
      `;

      const saveBtn = document.getElementById('saveItinBtn');
      if (saveBtn) {
        if (alreadySaved) {
          saveBtn.disabled = true;
          saveBtn.classList.add('opacity-70', 'cursor-not-allowed');
        }
        saveBtn.addEventListener('click', () => {
          const currentUser = getCurrentUser();
          if (!currentUser) {
            showToast('Please log in to save your trip.', 'error');
            return;
          }
          if (alreadySaved) return;

          // Re-check in case another tab or action saved it meanwhile.
          const stillNew = !getUserTrips(currentUser.id).some(t =>
            t.destination === itinerary.destination && t.startDate === itinerary.startDate
          );
          if (!stillNew) {
            showToast('This trip is already saved.', 'default');
            saveBtn.innerHTML = '<i class="fa-regular fa-bookmark"></i> Already Saved';
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-70', 'cursor-not-allowed');
            return;
          }

          // Guard: don't save if itinerary data is incomplete
          if (!itinerary.destination || !itinerary.startDate || !itinerary.endDate ||
              !Array.isArray(itinerary.itinerary) || itinerary.itinerary.length === 0) {
            showToast('Itinerary is still loading. Please wait a moment and try again.', 'error');
            return;
          }

          if (saveBtn.dataset.saving === 'true') return;
          saveBtn.dataset.saving = 'true';
          saveBtn.innerHTML = '<span class="spinner w-4 h-4 mr-2 border-2"></span> Saving...';
          setTimeout(() => {
            // Save generated itineraries from Plan Trip into My Trips (wm_trips).
            const newTrip = {
              ...deepClone(itinerary),
              title: `${itinerary.destination} Trip`,
              id: generateId(),
              createdBy: currentUser.id,
              createdAt: new Date().toISOString()
            };
            saveTrip(newTrip);
            showToast(`Your ${newTrip.destination} trip has been saved to My Trips!`, 'success');
            saveBtn.innerHTML = '✅ Saved';
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-70');
          }, 800);
        });
      }
    }

    // Load a place-specific hero image, falling back to a deterministic image per destination.
    getDestinationImage(itinerary.destination).then(url => {
      if (url) renderHero(url, null);
    });
  }

  // 2. Timeline
  const timelineEl = document.getElementById('itinTimeline');
  if (timelineEl) {
    const colors = ['blue-500', 'green-500', 'orange-400', 'purple-500', 'pink-500'];
    const textColors = ['blue-600', 'green-600', 'orange-500', 'purple-600', 'pink-600'];

    if (itinerary.itinerary.length === 0) {
      timelineEl.innerHTML = `<p class="text-gray-500 text-center py-8">No day-by-day plan available.</p>`;
    } else {
      timelineEl.innerHTML = itinerary.itinerary.map((day) => `
        <div class="glass-panel rounded-3xl p-8 flex flex-col gap-6 dark:bg-[#161B22] dark:border-white/[0.08]">
            <div class="flex items-start justify-between border-b border-gray-200/50 dark:border-white/[0.08] pb-6">
                <div>
                    <div class="flex items-center gap-4 mb-2">
                        <span class="w-10 h-10 rounded-full bg-blue-100 dark:bg-[#1F2630] text-brand-blue dark:text-[#7EB8FF] flex items-center justify-center font-bold text-lg">${day.day || 1}</span>
                        <h3 class="text-2xl font-bold text-gray-900 dark:text-[#F1F3F4]">${day.title || `Day ${day.day || 1}`}</h3>
                    </div>
                    <p class="text-gray-600 dark:text-[#BDC1C6] ml-14">Discovering ${itinerary.destination}'s highlights.</p>
                </div>
                <span class="px-4 py-1.5 bg-gray-100 dark:bg-[#1F2630] rounded-full text-xs font-semibold text-gray-600 dark:text-[#BDC1C6]">${itinerary.destination}</span>
            </div>
            <div class="flex flex-col gap-8 relative ml-5 pl-8 border-l-2 border-blue-200 dark:border-white/[0.12] mt-2">
                ${(day.activities || []).map((act, aIdx) => {
                    const cIdx = aIdx % colors.length;
                    const cBorder = `border-${colors[cIdx]}`;
                    const cText = `text-${colors[cIdx]}`;
                    const cTime = `text-${textColors[cIdx]}`;
                    return `
                    <div class="relative">
                        <div class="absolute -left-[43px] top-1 w-8 h-8 rounded-full bg-white dark:bg-[#161B22] border-2 ${cBorder} flex items-center justify-center">
                            <span class="text-xs ${cText}">${act.icon || '📍'}</span>
                        </div>
                        <div class="flex flex-col md:flex-row gap-6 md:items-start">
                            <div class="w-24 shrink-0 text-sm font-bold ${cTime} mt-1">${act.time || 'TBD'}</div>
                            <div class="flex-1 bg-white dark:bg-[#161B22] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-white/[0.08] hover:shadow-md transition-shadow">
                                <h4 class="font-bold text-gray-900 dark:text-[#F1F3F4] text-lg mb-2">${act.name || 'Activity'}</h4>
                                <p class="text-gray-600 dark:text-[#BDC1C6] mb-4 text-sm leading-relaxed">${act.description || ''}</p>
                                ${act.cost ? `
                                <div class="flex gap-2">
                                    <span class="px-3 py-1.5 bg-gray-50 dark:bg-[#1F2630] rounded-lg text-xs font-medium text-gray-600 dark:text-[#BDC1C6] flex items-center gap-1.5 border border-gray-100 dark:border-white/[0.08]"><i class="fa-solid fa-tag text-gray-400 dark:text-[#9AA0A6]"></i> ${formatBudget(act.cost)}</span>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
      `).join('');
    }
  }

  // 3. Accommodations
  const accommodationsSection = document.getElementById('itinAccommodations');
  if (accommodationsSection && itinerary.accommodations.length > 0) {
    accommodationsSection.innerHTML = `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Where You'll Stay</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="accommodationsGrid">
        ${itinerary.accommodations.map((acc, idx) => `
          <div class="glass-panel rounded-3xl overflow-hidden group dark:bg-[#161B22] dark:border-white/[0.08]" data-acc-name="${acc.name || 'Stay'}" data-acc-idx="${idx}">
            <div class="h-48 relative overflow-hidden bg-gradient-to-br from-blue-100 to-cream dark:from-[#1F2630] dark:to-[#0B0F17] flex items-center justify-center acc-image-placeholder">
              <span class="material-symbols-outlined text-6xl text-primary/30 dark:text-primary/50">hotel</span>
            </div>
            <div class="p-6">
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-bold text-gray-900 dark:text-[#F1F3F4]">${acc.name || 'Stay'}</h3>
                <span class="text-brand-blue font-bold text-sm dark:text-[#7EB8FF]">₹${acc.costPerNight || 0}<span class="text-gray-400 dark:text-[#9AA0A6] font-normal">/nt</span></span>
              </div>
              <p class="text-gray-500 dark:text-[#BDC1C6] text-sm mb-4">${acc.type || 'Mid-Range'}${acc.source === 'real' ? ' · Verified lodging' : ' · AI Suggested'}</p>
              <p class="text-gray-600 dark:text-[#BDC1C6] text-sm mb-4">${acc.description || 'A comfortable stay tailored to your trip.'}</p>
              <div class="flex flex-wrap gap-2 mb-4">
                ${acc.lat && acc.lon ? `<span class="text-xs text-gray-600 dark:text-[#BDC1C6] bg-gray-100 dark:bg-[#1F2630] px-2.5 py-1 rounded-md flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span> Near ${itinerary.destination}</span>` : ''}
                <span class="text-xs text-gray-600 dark:text-[#BDC1C6] bg-gray-100 dark:bg-[#1F2630] px-2.5 py-1 rounded-md">${acc.source === 'real' ? 'Real listing' : 'AI Suggested'}</span>
              </div>
              <button class="w-full py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.12] text-gray-700 dark:text-[#F1F3F4] text-sm font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Details</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (typeof TripMateAPI !== 'undefined') {
      itinerary.accommodations.forEach((acc, idx) => {
        TripMateAPI.searchForImage(`${acc.name || ''} ${itinerary.destination} hotel`).then(url => {
          if (url) {
            const card = accommodationsSection.querySelector(`[data-acc-idx="${idx}"]`);
            if (card) {
              const placeholder = card.querySelector('.acc-image-placeholder');
              if (placeholder) {
                placeholder.innerHTML = `<img src="${url}" alt="${acc.name || 'Stay'}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500" />`;
                placeholder.classList.remove('bg-gradient-to-br', 'from-blue-100', 'to-cream', 'flex', 'items-center', 'justify-center');
              }
            }
          }
        }).catch(() => {});
      });
    }
  }

  // 4. Budget
  const budgetEl = document.getElementById('itinBudget');
  if (budgetEl) {
    const b = itinerary.budgetBreakdown;
    const tot = b.total || 1;
    const pStay = Math.round((b.stay / tot) * 100) || 0;
    const pFood = Math.round((b.food / tot) * 100) || 0;
    const pTrans = Math.round((b.transport / tot) * 100) || 0;
    const pAct = Math.round((b.activities / tot) * 100) || 0;

    budgetEl.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-gray-900 dark:text-[#F1F3F4]">Budget Estimate</h3>
            <span class="text-2xl font-bold text-brand-blue dark:text-[#7EB8FF]">₹${b.total || 0}</span>
        </div>
        <div class="flex h-3 w-full rounded-full overflow-hidden mb-6">
            <div class="bg-brand-blue dark:bg-[#5C9CE6]" style="width: ${pStay}%"></div>
            <div class="bg-orange-400 dark:bg-orange-400" style="width: ${pFood}%"></div>
            <div class="bg-green-400 dark:bg-green-400" style="width: ${pTrans}%"></div>
            <div class="bg-purple-400 dark:bg-purple-400" style="width: ${pAct}%"></div>
        </div>
        <ul class="space-y-4">
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700 dark:text-[#BDC1C6]"><span class="w-3 h-3 rounded-full bg-brand-blue dark:bg-[#5C9CE6]"></span> Stay</div>
                <span class="font-bold text-gray-900 dark:text-[#F1F3F4]">₹${b.stay || 0}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700 dark:text-[#BDC1C6]"><span class="w-3 h-3 rounded-full bg-orange-400"></span> Food &amp; Dining</div>
                <span class="font-bold text-gray-900 dark:text-[#F1F3F4]">₹${b.food || 0}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700 dark:text-[#BDC1C6]"><span class="w-3 h-3 rounded-full bg-green-400"></span> Transportation</div>
                <span class="font-bold text-gray-900 dark:text-[#F1F3F4]">₹${b.transport || 0}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700 dark:text-[#BDC1C6]"><span class="w-3 h-3 rounded-full bg-purple-400"></span> Activities</div>
                <span class="font-bold text-gray-900 dark:text-[#F1F3F4]">₹${b.activities || 0}</span>
            </li>
        </ul>
    `;
  }

  // 5. Weather
  const weatherEl = document.getElementById('itinWeather');
  if (weatherEl) {
    renderWeatherCard(weatherEl, itinerary.weather);

    // Refresh weather from TripMate if coordinates are available
    if (itinerary.lat && itinerary.lon && typeof TripMateAPI !== 'undefined') {
      Promise.all([
        TripMateAPI.getWeather(itinerary.lat, itinerary.lon).catch(() => null),
        TripMateAPI.getSunTimes(itinerary.lat, itinerary.lon).catch(() => null)
      ]).then(([weatherRaw, sun]) => {
        let normalized = null;
        if (weatherRaw) {
          const current = weatherRaw.current_weather || weatherRaw;
          const code = current.weathercode !== undefined ? current.weathercode : current.weather_code;
          normalized = {
            current: {
              temp: current.temperature !== undefined ? current.temperature : (current.temp || null),
              condition: TripMateAPI.weatherCodeToText(code),
              icon: getWeatherIcon(code),
              wind: current.windspeed !== undefined ? current.windspeed : (current.wind || null),
              weather_code: code
            },
            daily: (weatherRaw.daily || []).time ? weatherRaw.daily.time.map((date, i) => ({
              date,
              maxTemp: Math.round(weatherRaw.daily.temperature_2m_max[i]),
              minTemp: Math.round(weatherRaw.daily.temperature_2m_min[i]),
              rainProb: weatherRaw.daily.precipitation_probability_max[i],
              condition: TripMateAPI.weatherCodeToText(weatherRaw.daily.weather_code[i]),
              icon: getWeatherIcon(weatherRaw.daily.weather_code[i])
            })) : []
          };
        }
        if (normalized) {
          itinerary.weather = normalized;
          renderWeatherCard(weatherEl, normalized, sun);
        } else if (sun) {
          renderWeatherCard(weatherEl, itinerary.weather, sun);
        }
      }).catch(err => {
        console.warn('Failed to refresh weather:', err);
      });
    }
  }

  // 6. Destination Gallery (TripMate scenic images)
  const essentialsSection = document.querySelector('#itinWeather')?.closest('.grid');
  if (essentialsSection && typeof TripMateAPI !== 'undefined') {
    TripMateAPI.getMultipleImages(itinerary.destination).then(urls => {
      if (urls && urls.length > 0) {
        const gallery = document.createElement('div');
        gallery.className = 'md:col-span-3 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4 mt-2';
        gallery.innerHTML = `
          <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">photo_library</span>
            ${itinerary.destination} Gallery
          </h3>
          <div class="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            ${urls.slice(0, 6).map(url => `
              <div class="shrink-0 w-48 h-32 rounded-2xl overflow-hidden shadow-sm">
                <img src="${url}" alt="${itinerary.destination}" class="w-full h-full object-cover hover:scale-105 transition duration-500" loading="lazy">
              </div>
            `).join('')}
          </div>
        `;
        essentialsSection.appendChild(gallery);
      }
    }).catch(err => {
      console.warn('Gallery fetch failed:', err);
    });
  }

  // 7. Map modal
  initMapModal(itinerary);

  // Debug banner: show itinerary coordinates and ID for troubleshooting
  const debugBanner = document.getElementById('itinDebugBanner');
  if (debugBanner) {
    debugBanner.style.display = 'block';
    debugBanner.textContent = `DEBUG — dest: ${itinerary.destination || 'n/a'} | lat: ${itinerary.lat || 'n/a'} | lon: ${itinerary.lon || 'n/a'} | id: ${itinerary.id || 'n/a'}`;
  }
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 2) return '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 75) return '❄️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function initMapModal(itinerary) {
  const modal = document.getElementById('mapModal');
  const openBtn = document.getElementById('viewMapBtn');
  const panel = document.getElementById('mapPanel');
  const closeBtn = document.getElementById('closeMapBtn');
  const titleEl = document.getElementById('mapModalTitle');
  if (!modal || !closeBtn) return;

  if (titleEl && itinerary.destination) {
    titleEl.innerHTML = `<span class="material-symbols-outlined text-primary">map</span> ${itinerary.destination} Map`;
  }

  let map = null;
  let initialized = false;

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';

    if (!initialized) {
      // Leaflet requires the container to be visible and measured.
      // Wait for the modal to fully render before initializing.
      setTimeout(() => {
        ensureCoords().then(() => {
          initMap();
          initialized = true;
        });
      }, 300);
    } else if (map) {
      setTimeout(() => map.invalidateSize(), 300);
    }
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (panel) panel.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  async function ensureCoords() {
    if (itinerary.lat && itinerary.lon) return;
    if (!itinerary.destination) return;

    // Try geocoding API first
    if (typeof GeocodingAPI !== 'undefined') {
      try {
        const results = await GeocodingAPI.searchDestination(itinerary.destination);
        if (results && results.length > 0) {
          itinerary.lat = parseFloat(results[0].latitude);
          itinerary.lon = parseFloat(results[0].longitude);
          return;
        }
      } catch (e) {
        console.warn('Geocoding failed for map:', e);
      }
    }

    // Fallback to TripMate place info
    if (typeof TripMateAPI !== 'undefined') {
      try {
        const place = await TripMateAPI.getPlaceInfo(itinerary.destination);
        if (place && place.coordinates) {
          itinerary.lat = parseFloat(place.coordinates.lat);
          itinerary.lon = parseFloat(place.coordinates.lon);
        }
      } catch (e) {
        console.warn('TripMate place info failed for map:', e);
      }
    }
  }

  function initMap() {
    const lat = itinerary.lat;
    const lon = itinerary.lon;
    const mapContainer = document.getElementById('tripMap');
    if (!mapContainer) return;

    if (!lat || !lon) {
      mapContainer.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Location coordinates not available for this trip.</div>';
      return;
    }

    mapContainer.innerHTML = '';
    mapContainer.style.position = 'absolute';
    mapContainer.style.inset = '0';
    mapContainer.style.width = '100%';
    mapContainer.style.height = '100%';

    console.log('[Kibi Map] initMap called with lat/lon:', lat, lon);
    console.log('[Kibi Map] container dimensions:', mapContainer.getBoundingClientRect());

    map = L.map('tripMap', { zoomControl: false }).setView([lat, lon], 13);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Re-measure map once tiles start loading and after container settles.
    setTimeout(() => { if (map) map.invalidateSize(); }, 100);
    setTimeout(() => { if (map) map.invalidateSize(); }, 400);
    setTimeout(() => { if (map) map.invalidateSize(); }, 800);

    // If tiles fail to paint, force a reload by invalidating size again.
    tileLayer.on('load', () => console.log('[Kibi Map] tiles loaded'));
    tileLayer.on('tileerror', (e) => console.warn('[Kibi Map] tile error', e));

    // If the modal resizes (e.g. orientation change), keep map sized correctly.
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => { if (map) map.invalidateSize(); });
      ro.observe(mapContainer);
    }

    // Destination marker
    const destMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="w-8 h-8 rounded-full bg-brand-blue text-white flex items-center justify-center shadow-lg border-2 border-white"><span class="material-symbols-outlined text-sm">location_on</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      })
    }).addTo(map);
    destMarker.bindPopup(`<b>${itinerary.destination}</b>`).openPopup();

    const bounds = [[lat, lon]];

    // Accommodation markers
    const accColors = ['#005da7', '#01658c', '#555d63'];
    (itinerary.accommodations || []).forEach((acc, idx) => {
      if (acc.lat && acc.lon) {
        const marker = L.marker([acc.lat, acc.lon], {
          icon: L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md border-2 border-white" style="background:${accColors[idx % accColors.length]}"><span class="material-symbols-outlined text-xs">hotel</span></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
          })
        }).addTo(map);
        marker.bindPopup(`<b>${acc.name}</b><br>${acc.type || 'Stay'} · ₹${acc.costPerNight || 0}/nt`);
        bounds.push([acc.lat, acc.lon]);
      }
    });

    // Activity markers per day + polylines
    const dayColors = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ec4899'];
    (itinerary.itinerary || []).forEach((day, dIdx) => {
      const color = dayColors[dIdx % dayColors.length];
      const dayCoords = [];
      (day.activities || []).forEach((act) => {
        if (act.lat && act.lon) {
          const marker = L.circleMarker([act.lat, act.lon], {
            radius: 7,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
          marker.bindPopup(`<b>Day ${day.day || (dIdx + 1)} · ${act.time || ''}</b><br>${act.name || 'Activity'}`);
          dayCoords.push([act.lat, act.lon]);
          bounds.push([act.lat, act.lon]);
        }
      });

      if (dayCoords.length >= 2) {
        // Try to get a routed polyline; fall back to straight line
        drawRoute(dayCoords, color);
      }
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  async function drawRoute(coords, color) {
    if (!coords || coords.length < 2 || !map) return;
    try {
      const route = await RoutingAPI.getRoute(coords.map(c => [c[1], c[0]])); // RoutingAPI expects [lon, lat]
      if (route && route.geometry && typeof L !== 'undefined' && L.Polyline && L.Polyline.fromEncoded) {
        L.Polyline.fromEncoded(route.geometry, { color, weight: 4, opacity: 0.8 }).addTo(map);
      } else if (route) {
        L.polyline(coords, { color, weight: 4, opacity: 0.8 }).addTo(map);
      } else {
        L.polyline(coords, { color, weight: 4, opacity: 0.8, dashArray: '5, 10' }).addTo(map);
      }
    } catch (err) {
      console.warn('Route draw failed, using straight line:', err);
      L.polyline(coords, { color, weight: 4, opacity: 0.8, dashArray: '5, 10' }).addTo(map);
    }
  }
}

function renderWeatherCard(el, weather, sun = null) {
  const w = weather && weather.current ? weather.current : {};
  const daily = (weather && weather.daily && weather.daily[0]) || {};
  el.innerHTML = `
      <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue text-3xl mb-2">
          ${w.icon || '☀️'}
      </div>
      <h3 class="font-bold text-gray-900 text-lg">Weather Outlook</h3>
      <p class="text-gray-600 text-sm">
          Current conditions are ${w.temp || '—'}°C and ${w.condition || 'clear'}.
          ${daily.rainProb !== undefined ? `Expect a ${daily.rainProb}% chance of rain` : 'Enjoy your stay'}
          ${w.wind !== undefined ? `with winds around ${w.wind} km/h.` : '.'}
      </p>
      ${sun ? `
      <div class="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">
          <span class="flex items-center gap-1"><i class="fa-solid fa-sun text-orange-400"></i> Sunrise ${sun.sunrise}</span>
          <span class="flex items-center gap-1"><i class="fa-solid fa-moon text-slate-400"></i> Sunset ${sun.sunset}</span>
      </div>` : ''}
  `;
}

