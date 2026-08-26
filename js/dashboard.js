/* ============================================
   Kibi — Dashboard Module
   Personalized dashboard with recommendations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user) return;

  initNav('dashboard');
  renderDashboard(user);
});

function renderDashboard(user) {
  // Greeting
  const greetingEl = document.getElementById('dashGreeting');
  if (greetingEl) {
    greetingEl.innerHTML = `
      <h1 class="heading-2 font-serif text-charcoal">${getGreeting()}, ${user.name ? user.name.split(' ')[0] : 'Explorer'}</h1>
      <p class="text-large text-text-secondary">Ready for your next adventure? Here's what we've found for you.</p>
    `;
  }

  // Stats
  renderStats(user);

  // Upcoming trips
  renderUpcomingTrips(user);

  // Recommended trips
  renderRecommendedTrips(user);

  // Compatible travelers
  renderCompatibleTravelers(user);

  // Initialize animations
  if (typeof initAllAnimations === 'function' && typeof runAnimationInit === 'function') {
    setTimeout(runAnimationInit, 500); // Give time for async renders
  }
}

function renderStats(user) {
  const container = document.getElementById('dashStats');
  if (!container) return;

  const userTrips = typeof getUserTrips === 'function' ? getUserTrips(user.id) : [];
  const joinedTrips = typeof getJoinedTrips === 'function' ? getJoinedTrips(user.id) : [];
  const savedTrips = typeof getSavedTrips === 'function' ? getSavedTrips(user.id) : [];
  const personality = typeof getTravelPersonality === 'function' ? getTravelPersonality(user) : 'Explorer';

  container.innerHTML = `
    <div class="stat-card reveal bg-white rounded-2xl shadow-soft p-6">
      <div class="stat-value text-charcoal">${userTrips.length + joinedTrips.length}</div>
      <div class="stat-label text-text-secondary">Trips Planned</div>
    </div>
    <div class="stat-card reveal bg-white rounded-2xl shadow-soft p-6">
      <div class="stat-value text-charcoal">${savedTrips.length}</div>
      <div class="stat-label text-text-secondary">Saved Trips</div>
    </div>
    <div class="stat-card reveal bg-white rounded-2xl shadow-soft p-6">
      <div class="stat-value text-charcoal">${personality}</div>
      <div class="stat-label text-text-secondary">Travel Personality</div>
    </div>
  `;
}

async function renderUpcomingTrips(user) {
  const container = document.getElementById('upcomingTrips');
  if (!container) return;

  const userTrips = [
    ...(typeof getUserTrips === 'function' ? getUserTrips(user.id) : []),
    ...(typeof getJoinedTrips === 'function' ? getJoinedTrips(user.id) : [])
  ];
  const now = new Date();

  // Get upcoming trips (future dates)
  const upcoming = userTrips.filter(t => new Date(t.startDate) >= now)
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  if (upcoming.length === 0) {
    container.innerHTML = `
      <div class="empty-state col-span-full">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-16 h-16 mx-auto mb-4 text-text-muted">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
        </svg>
        <h3 class="heading-4 font-serif text-charcoal mb-1">No upcoming trips</h3>
        <p class="text-text-secondary">Plan your first adventure!</p>
        <a href="plan-trip.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Plan a Trip</a>
      </div>
    `;
    return;
  }

  // Pre-render loading state for weather
  const tripCardsHtml = upcoming.slice(0, 2).map((trip, i) => `
    <div class="trip-card reveal bg-white rounded-2xl shadow-soft overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-card transition-all duration-300" onclick="window.location.href='itinerary.html?id=${trip.id}'">
      <div class="card-image-container aspect-[16/10] overflow-hidden">
        <img id="tripImg-${i}" src="${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'}" alt="${trip.destination}" class="card-image w-full h-full object-cover" loading="lazy">
      </div>
      <div class="card-body p-5">
        <div class="card-title font-serif text-lg text-charcoal">${trip.title || trip.destination}</div>
        <div class="card-subtitle text-sm text-text-secondary mt-1">${typeof formatDateRange === 'function' ? formatDateRange(trip.startDate, trip.endDate) : ''}</div>
        <div class="trip-card-meta flex items-center justify-between text-sm text-text-secondary mt-3">
          <span>${typeof formatBudget === 'function' ? formatBudget(trip.budget || trip.totalBudget) : (trip.budget || trip.totalBudget || '')}</span>
          <span>${Array.isArray(trip.members) ? trip.members.length : 0}/${trip.maxMembers || '?'} travelers</span>
        </div>
        <div id="upcoming-weather-${i}" class="mt-4 min-h-[24px]"></div>
      </div>
    </div>
  `).join('');

  container.innerHTML = tripCardsHtml;

  upcoming.slice(0, 2).forEach((trip, idx) => {
    if (!trip.image && typeof getDestinationImage === 'function') {
      getDestinationImage(trip.destination).then(url => {
        const img = document.getElementById(`tripImg-${idx}`);
        if (img && url) img.src = url;
      }).catch(() => {});
    }
  });

  // Fetch weather for the upcoming trips
  for (let i = 0; i < Math.min(upcoming.length, 2); i++) {
    const trip = upcoming[i];
    const weatherContainer = document.getElementById(`upcoming-weather-${i}`);

    // Check if trip has lat/lon or try to find destination
    let lat = trip.lat;
    let lon = trip.lon;

    if (!lat || !lon) {
      const dest = (typeof getDestinationById === 'function' && trip.destinationId) ? getDestinationById(trip.destinationId) : null;
      if (dest && dest.lat) {
        lat = dest.lat;
        lon = dest.lon;
      }
    }

    if (lat && lon && typeof WeatherAPI !== 'undefined') {
      weatherContainer.innerHTML = '<span class="text-small text-muted">Loading weather...</span>';
      try {
        const weather = await WeatherAPI.getWeather(lat, lon);
        if (weather && weather.current) {
          weatherContainer.innerHTML = `
            <div class="inline-flex items-center gap-2 bg-cream-dark rounded-xl px-3 py-2">
              <span>${weather.current.icon}</span>
              <span class="text-sm font-semibold text-text-main">${weather.current.temp}°C</span>
              <span class="text-sm text-text-muted">${weather.current.condition}</span>
            </div>
          `;
        } else {
          weatherContainer.innerHTML = '';
        }
      } catch (e) {
        weatherContainer.innerHTML = '';
      }
    }
  }
}

function renderRecommendedTrips(user) {
  const container = document.getElementById('recommendedTrips');
  if (!container) return;

  const recommended = getRecommendedTrips(user, 4);

  if (recommended.length === 0) {
    container.innerHTML = '<p class="text-muted col-span-full">Complete your profile to get recommendations.</p>';
    return;
  }

  container.innerHTML = recommended.map(trip => `
    <div class="trip-card reveal bg-white rounded-2xl shadow-soft overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-card transition-all duration-300" onclick="window.location.href='itinerary.html?id=${trip.id}'">
      <div class="card-image-container aspect-[16/10] overflow-hidden relative">
        <img src="${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'}" alt="${trip.destination}" class="card-image w-full h-full object-cover" loading="lazy">
        <div class="absolute top-3 right-3">
          <span class="match-score inline-flex items-center px-2.5 py-1 rounded-full bg-sage/10 text-sage text-xs font-semibold">${trip.matchScore}% match</span>
        </div>
      </div>
      <div class="card-body p-5">
        <div class="card-title font-serif text-lg text-charcoal">${trip.title || trip.destination}</div>
        <div class="card-subtitle text-sm text-text-secondary mt-1">${typeof formatDateRange === 'function' ? formatDateRange(trip.startDate, trip.endDate) : ''}</div>
        <div class="tags flex flex-wrap gap-2 mt-4">
          <span class="tag">${typeof formatBudget === 'function' ? formatBudget(trip.budget) : (trip.budget || '')}</span>
          <span class="tag">${Array.isArray(trip.members) ? trip.members.length : 0}/${trip.maxMembers || '?'} spots</span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCompatibleTravelers(user) {
  const container = document.getElementById('compatibleTravelers');
  if (!container) return;

  const travelers = getCompatibleTravelers(user, 4);

  if (travelers.length === 0) {
    container.innerHTML = '<p class="text-muted col-span-full">Complete your profile to find compatible travelers.</p>';
    return;
  }

  container.innerHTML = travelers.map(traveler => {
    const initial = (traveler.name || 'T').charAt(0).toUpperCase();
    const interests = Array.isArray(traveler.interests) ? traveler.interests
      : Array.isArray(traveler.travelStyle) ? traveler.travelStyle : [];
    const budgetLabel = typeof getBudgetLabel === 'function' ? getBudgetLabel(traveler.budget) : (traveler.budget || '');
    const socialLabel = typeof getSocialLabel === 'function' ? getSocialLabel(traveler.socialPreference) : (traveler.socialPreference || '');
    return `
    <div class="traveler-card reveal bg-white rounded-2xl shadow-soft p-6 text-center">
      <div class="traveler-avatar w-16 h-16 rounded-full bg-sage text-white flex items-center justify-center font-serif text-2xl mx-auto mb-4">${traveler.avatar || initial}</div>
      <div class="traveler-name font-serif text-lg text-charcoal mb-2">${traveler.name || 'Traveler'}</div>
      <div class="tags flex flex-wrap justify-center gap-2 mb-4">
        ${interests.slice(0, 3).map(i => `<span class="tag tag-sage">${i}</span>`).join('')}
      </div>
      <div class="text-sm text-text-secondary mb-2">${budgetLabel}</div>
      <div class="text-sm text-text-secondary mb-4">${socialLabel}</div>
      <div class="match-score inline-flex items-center px-3 py-1 rounded-full bg-sage/10 text-sage text-xs font-semibold" data-score="${traveler.matchScore || 0}">
        <span class="score-value">${traveler.matchScore || 0}%</span>&nbsp;Match
      </div>
      <div class="compat-bar w-full h-1.5 bg-cream-dark rounded-full mt-3 overflow-hidden">
        <div class="compat-bar-fill h-full bg-sage rounded-full" style="width: ${Math.min(traveler.matchScore || 0, 100)}%"></div>
      </div>
    </div>
  `;
  }).join('');
}

