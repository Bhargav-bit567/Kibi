/* ============================================
   Kibi — Itinerary Overview Module
   Renders a rich Overview tab for any itinerary.
   Uses TripMate/Geocoding data when available,
   falls back to deterministic destination content.
   ============================================ */

(function () {
  'use strict';

  // Destination knowledge base for fallback content.
  const DESTINATION_INFO = {
    'paris': {
      description: "Paris is a global center for art, fashion, gastronomy and culture. Its 19th-century cityscape is crisscrossed by wide boulevards and the River Seine. Beyond such landmarks as the Eiffel Tower and the 12th-century, Gothic Notre-Dame cathedral, the city is known for its cafe culture and designer boutiques.",
      bestTime: "April to June and October to early November offer the most pleasant weather and fewer crowds.",
      cuisine: ["Croissants & pastries", "Steak frites", "Coq au vin", "Macarons", "French onion soup"],
      tips: ["Learn a few basic French phrases — locals appreciate the effort.", "Museums are often closed on Mondays or Tuesdays; check schedules.", "Use the Metro day pass for easy travel across arrondissements."],
      attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Montmartre", "Seine River Cruise", "Musée d'Orsay"]
    },
    'tokyo': {
      description: "Tokyo is Japan's busy capital, mixing the ultramodern and the traditional, from neon-lit skyscrapers to historic temples. The opulent Meiji Shinto Shrine is known for its towering gate and surrounding woods. The Imperial Palace sits amid large public gardens.",
      bestTime: "March to May for cherry blossoms, or October to November for crisp autumn foliage.",
      cuisine: ["Sushi & sashimi", "Ramen", "Tempura", "Tonkatsu", "Matcha desserts"],
      tips: ["Get a Suica or Pasmo IC card for trains and convenience stores.", "Many restaurants only accept cash — keep yen handy.", "Tipping is not customary and can be considered rude."],
      attractions: ["Senso-ji Temple", "Shibuya Crossing", "Tokyo Tower", "Meiji Shrine", "Tsukiji Outer Market", "Akihabara"]
    },
    'new york': {
      description: "New York City comprises 5 boroughs sitting where the Hudson River meets the Atlantic Ocean. At its core is Manhattan, a densely populated borough that’s among the world’s major commercial, financial and cultural centers. Its iconic sites include skyscrapers such as the Empire State Building and sprawling Central Park.",
      bestTime: "April to June and September to early November have the best weather for walking.",
      cuisine: ["New York pizza", "Bagels with lox", "Cheesecake", "Hot dogs", "Pastrami sandwich"],
      tips: ["Walk fast and keep to the right on escalators.", "Subway runs 24/7 — download a transit app.", "Book popular observation decks and shows in advance."],
      attractions: ["Statue of Liberty", "Central Park", "Times Square", "Empire State Building", "Brooklyn Bridge", "Metropolitan Museum of Art"]
    },
    'rome': {
      description: "Rome is the capital city and a special comune of Italy. Rome also serves as the capital of the Lazio region. With 2,860,009 residents in 1,285 km², it is also the country's most populated comune. It is the fourth-most populous city in the European Union.",
      bestTime: "April to June and September to October are ideal for sightseeing without extreme heat.",
      cuisine: ["Carbonara", "Cacio e pepe", "Pizza al taglio", "Gelato", "Supplì"],
      tips: ["Carry cash for small trattorias and coffee bars.", "Dress modestly when visiting churches and the Vatican.", "Validate train and bus tickets before boarding."],
      attractions: ["Colosseum", "Vatican Museums", "Trevi Fountain", "Pantheon", "Roman Forum", "Spanish Steps"]
    },
    'bali': {
      description: "Bali is an Indonesian island known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs. The island is home to religious sites such as cliffside Uluwatu Temple. To the south, the beachside city of Kuta has lively bars, while Seminyak, Sanur and Nusa Dua are popular resort towns.",
      bestTime: "April to October is the dry season with the best beach weather.",
      cuisine: ["Nasi goreng", "Satay", "Babi guling", "Gado-gado", "Lawar"],
      tips: ["Rent a scooter only if you are confident — traffic can be chaotic.", "Dress modestly when visiting temples; sarongs are usually provided.", "Drink bottled or filtered water only."],
      attractions: ["Uluwatu Temple", "Tegallalang Rice Terrace", "Sacred Monkey Forest", "Tanah Lot", "Nusa Penida", "Seminyak Beach"]
    },
    'manali': {
      description: "Manali is a high-altitude Himalayan resort town in India's northern Himachal Pradesh state. It has a reputation as a backpacking center and honeymoon destination. Set on the Beas River, it’s a gateway for skiing in the Solang Valley and trekking in Parvati Valley.",
      bestTime: "October to June for sightseeing and adventure; December to February for snow lovers.",
      cuisine: ["Siddu", "Trout fish", "Chana madra", "Dham", "Momos"],
      tips: ["Acclimatize for a day before high-altitude treks.", "Book adventure activities through registered operators.", "Carry warm layers even in summer — evenings get chilly."],
      attractions: ["Solang Valley", "Rohtang Pass", "Hadimba Temple", "Old Manali", "Parvati Valley", "Jogini Waterfall"]
    },
    'goa': {
      description: "Goa is a state in western India with coastlines stretching along the Arabian Sea. Its long history as a Portuguese colony prior to 1961 is evident in its preserved 17th-century churches and the area's tropical spice plantations. Goa is also known for its beaches, from popular stretches at Baga and Palolem.",
      bestTime: "November to February offers the best beach weather and nightlife.",
      cuisine: ["Fish curry rice", "Pork vindaloo", "Bebinca", "Prawn balchão", "Feni"],
      tips: ["Rent a scooter to explore beaches at your own pace.", "Respect local customs away from tourist beaches.", "Carry sunscreen and stay hydrated."],
      attractions: ["Baga Beach", "Dudhsagar Falls", "Basilica of Bom Jesus", "Anjuna Flea Market", "Fort Aguada", "Palolem Beach"]
    },
    'dubai': {
      description: "Dubai is a city and emirate in the United Arab Emirates known for luxury shopping, ultramodern architecture and a lively nightlife scene. Burj Khalifa, an 830m-tall tower, dominates the skyscraper-filled skyline. At its foot lies Dubai Fountain, with jets and lights choreographed to music.",
      bestTime: "November to March has pleasant temperatures for outdoor activities.",
      cuisine: ["Shawarma", "Hummus & falafel", "Lamb ouzi", "Kunafa", "Dates & Arabic coffee"],
      tips: ["Dress modestly in malls and public areas.", "Taxis and Metro are reliable; ride-hailing apps work well.", "Friday timings may differ for attractions and restaurants."],
      attractions: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Dubai Marina", "Desert Safari", "Gold Souk"]
    },
    'london': {
      description: "London, the capital of England and the United Kingdom, is a 21st-century city with history stretching back to Roman times. At its centre stand the imposing Houses of Parliament, the iconic 'Big Ben' clock tower and Westminster Abbey, site of British monarch coronations.",
      bestTime: "May to September is the warmest, though rain is possible year-round.",
      cuisine: ["Fish and chips", "Sunday roast", "Full English breakfast", "Afternoon tea", "Pie and mash"],
      tips: ["Stand on the right on escalators.", "Many museums are free — arrive early to beat crowds.", "An Oyster card or contactless payment works on all public transport."],
      attractions: ["British Museum", "Tower of London", "Buckingham Palace", "London Eye", "Westminster Abbey", "Hyde Park"]
    },
    'sydney': {
      description: "Sydney, capital of New South Wales and one of Australia's largest cities, is best known for its harbourfront Sydney Opera House, with a distinctive sail-like design. Massive Darling Harbour and the smaller Circular Quay port are hubs of waterside life.",
      bestTime: "September to November and March to May offer mild weather and fewer crowds.",
      cuisine: ["Meat pie", "Fish and chips", "Barramundi", "Pavlova", "Flat white coffee"],
      tips: ["Tap water is safe to drink.", "Public transport uses Opal cards or contactless payments.", "Be sun-safe — UV levels can be high even on cooler days."],
      attractions: ["Sydney Opera House", "Harbour Bridge", "Bondi Beach", "Royal Botanic Garden", "Taronga Zoo", "The Rocks"]
    }
  };

  function getDestinationInfo(destination) {
    if (!destination) return null;
    const key = Object.keys(DESTINATION_INFO).find(k => destination.toLowerCase().includes(k));
    return key ? DESTINATION_INFO[key] : null;
  }

  function getDestinationKey(destination) {
    if (!destination) return null;
    return Object.keys(DESTINATION_INFO).find(k => destination.toLowerCase().includes(k));
  }

  function formatDays(nights) {
    const days = (nights || 0) + 1;
    return `${days} Day${days > 1 ? 's' : ''}`;
  }

  function countUniqueActivities(itinerary) {
    const set = new Set();
    (itinerary.itinerary || []).forEach(day => {
      (day.activities || []).forEach(act => set.add(act.name));
    });
    return set.size;
  }

  function getTopHighlights(itinerary, info) {
    const fallbackHighlights = [
      { icon: '🏛️', title: 'Cultural Landmarks', desc: 'Explore iconic architecture and historic sites.' },
      { icon: '🍽️', title: 'Local Food Scene', desc: 'Savor authentic dishes and regional specialties.' },
      { icon: '🌿', title: 'Scenic Experiences', desc: 'Enjoy beautiful viewpoints and natural landscapes.' },
      { icon: '🛍️', title: 'Shopping & Leisure', desc: 'Browse local markets, boutiques and souvenirs.' }
    ];

    const highlights = [];
    const activities = [];
    (itinerary.itinerary || []).forEach(day => {
      (day.activities || []).forEach(act => activities.push(act));
    });

    // Build highlights from actual itinerary data
    const food = activities.find(a => /food|restaurant|cafe|dining|lunch|dinner|breakfast/i.test(a.name));
    const culture = activities.find(a => /temple|museum|palace|church|monument|fort|gallery|historic/i.test(a.name));
    const nature = activities.find(a => /park|garden|beach|valley|mountain|lake|waterfall|viewpoint/i.test(a.name));
    const market = activities.find(a => /market|shopping|mall|bazaar|souvenir/i.test(a.name));

    if (culture) highlights.push({ icon: '🏛️', title: 'Cultural Landmarks', desc: `Visit places like ${culture.name}.` });
    if (food) highlights.push({ icon: '🍽️', title: 'Local Food Scene', desc: `Enjoy meals at ${food.name}.` });
    if (nature) highlights.push({ icon: '🌿', title: 'Scenic Experiences', desc: `Explore natural spots such as ${nature.name}.` });
    if (market) highlights.push({ icon: '🛍️', title: 'Shopping & Leisure', desc: `Browse places like ${market.name}.` });

    // Fill remaining slots with fallback highlights
    fallbackHighlights.forEach(h => {
      if (!highlights.find(x => x.title === h.title)) highlights.push(h);
    });

    return highlights.slice(0, 4);
  }

  function renderOverview(itinerary) {
    const info = getDestinationInfo(itinerary.destination);
    const nights = Math.max(0, Math.round((new Date(itinerary.endDate) - new Date(itinerary.startDate)) / (1000 * 60 * 60 * 24)));
    const totalActivities = countUniqueActivities(itinerary);

    // Description
    const descEl = document.getElementById('overviewDescription');
    if (descEl) {
      descEl.textContent = itinerary.placeDescription || (info ? info.description : `${itinerary.destination} offers a wonderful mix of experiences for travelers. Plan your days to make the most of your trip.`);
    }

    // Intro heading uses destination name
    const introSection = document.getElementById('overviewIntro');
    if (introSection) {
      introSection.querySelector('h2').textContent = `About ${itinerary.destination}`;
    }

    // Stats
    const statsEl = document.getElementById('overviewStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="bg-blue-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-brand-blue dark:text-[#7EB8FF]">${formatDays(nights)}</div>
          <div class="text-xs text-gray-500 dark:text-[#9AA0A6] mt-1">Duration</div>
        </div>
        <div class="bg-green-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">${totalActivities}</div>
          <div class="text-xs text-gray-500 dark:text-[#9AA0A6] mt-1">Activities</div>
        </div>
        <div class="bg-purple-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${(itinerary.interests || []).length || 3}</div>
          <div class="text-xs text-gray-500 dark:text-[#9AA0A6] mt-1">Interests</div>
        </div>
        <div class="bg-orange-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">₹${(itinerary.budgetBreakdown?.total || itinerary.totalBudget || itinerary.budget || 0).toLocaleString()}</div>
          <div class="text-xs text-gray-500 dark:text-[#9AA0A6] mt-1">Budget</div>
        </div>
      `;
    }

    // Highlights
    const highlightsEl = document.getElementById('overviewHighlights');
    if (highlightsEl) {
      const highlights = getTopHighlights(itinerary, info);
      highlightsEl.innerHTML = highlights.map(h => `
        <div class="glass-panel rounded-2xl p-6 flex items-start gap-4 dark:bg-[#161B22] dark:border-white/[0.08]">
          <div class="w-12 h-12 rounded-2xl bg-white dark:bg-[#1F2630] flex items-center justify-center text-2xl shadow-sm">${h.icon}</div>
          <div>
            <h3 class="font-bold text-gray-900 dark:text-[#F1F3F4] mb-1">${h.title}</h3>
            <p class="text-sm text-gray-600 dark:text-[#BDC1C6] leading-relaxed">${h.desc}</p>
          </div>
        </div>
      `).join('');
    }

    // Attractions
    const attractionsEl = document.getElementById('overviewAttractions');
    if (attractionsEl) {
      const attractions = (info ? info.attractions : []);
      // Mix itinerary activities if available
      const activityNames = [];
      (itinerary.itinerary || []).forEach(day => {
        (day.activities || []).forEach(act => {
          if (!activityNames.includes(act.name)) activityNames.push(act.name);
        });
      });
      const combined = [...attractions, ...activityNames].slice(0, 6);
      if (combined.length === 0) {
        attractionsEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-[#9AA0A6] col-span-full">Attraction suggestions will appear once your itinerary is generated.</p>`;
      } else {
        attractionsEl.innerHTML = combined.map((a, i) => `
          <div class="bg-white dark:bg-[#161B22] rounded-2xl p-4 border border-gray-100 dark:border-white/[0.08] shadow-sm flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-[#1F2630] text-brand-blue dark:text-[#7EB8FF] flex items-center justify-center font-bold text-sm">${i + 1}</div>
            <span class="text-sm font-semibold text-gray-900 dark:text-[#F1F3F4]">${a}</span>
          </div>
        `).join('');
      }
    }

    // Timeline preview
    const timelineEl = document.getElementById('overviewTimeline');
    if (timelineEl) {
      const days = (itinerary.itinerary || []).slice(0, 3);
      if (days.length === 0) {
        timelineEl.innerHTML = `<p class="text-sm text-gray-500 dark:text-[#9AA0A6]">Your day-by-day plan will appear here.</p>`;
      } else {
        timelineEl.innerHTML = days.map(day => {
          const first = (day.activities || [])[0];
          const last = (day.activities || [])[(day.activities || []).length - 1];
          return `
            <div class="glass-panel rounded-2xl p-5 flex items-center justify-between dark:bg-[#161B22] dark:border-white/[0.08]">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-primary/10 dark:bg-[#1F2630] text-primary dark:text-[#7EB8FF] flex items-center justify-center font-bold">${day.day || 1}</div>
                <div>
                  <h4 class="font-bold text-gray-900 dark:text-[#F1F3F4] text-sm">${day.title || `Day ${day.day || 1}`}</h4>
                  <p class="text-xs text-gray-500 dark:text-[#9AA0A6]">${(day.activities || []).length} activities${first ? ` · starts ${first.time || 'TBD'}` : ''}</p>
                </div>
              </div>
              <span class="text-xs font-medium text-brand-blue dark:text-[#7EB8FF]">${last ? (last.time || 'TBD') : ''} end</span>
            </div>
          `;
        }).join('');
      }
    }

    // Quick info
    const quickEl = document.getElementById('overviewQuickInfo');
    if (quickEl) {
      quickEl.innerHTML = `
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">calendar_month</span>
          <span>${formatDateRange(itinerary.startDate, itinerary.endDate)}</span>
        </li>
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">schedule</span>
          <span>${formatDays(nights)} · ${nights} Night${nights !== 1 ? 's' : ''}</span>
        </li>
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">payments</span>
          <span>₹${(itinerary.budgetBreakdown?.total || itinerary.totalBudget || itinerary.budget || 0).toLocaleString()} estimated</span>
        </li>
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">hiking</span>
          <span>${itinerary.travelStyle || 'Travel'} style</span>
        </li>
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">group</span>
          <span>${itinerary.socialPreference || 'Small Group'}</span>
        </li>
      `;
    }

    // Best time
    const bestTimeEl = document.getElementById('overviewBestTime');
    if (bestTimeEl) {
      bestTimeEl.textContent = info ? info.bestTime : 'The best time to visit depends on your preferred weather and activities.';
    }

    // Cuisine
    const cuisineEl = document.getElementById('overviewCuisine');
    if (cuisineEl) {
      const cuisine = info ? info.cuisine : ['Local street food', 'Regional specialties', 'Popular cafes', 'Traditional desserts'];
      cuisineEl.innerHTML = cuisine.map(item => `
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="w-6 h-6 rounded-full bg-orange-100 dark:bg-[#1F2630] text-orange-500 flex items-center justify-center text-xs">🍴</span>
          <span>${item}</span>
        </li>
      `).join('');
    }

    // Tips
    const tipsEl = document.getElementById('overviewTips');
    if (tipsEl) {
      const tips = info ? info.tips : [
        'Keep digital copies of important documents.',
        'Carry a portable charger and adapter.',
        'Book popular attractions in advance when possible.'
      ];
      tipsEl.innerHTML = tips.map(tip => `
        <li class="flex items-start gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF] text-base mt-0.5">lightbulb</span>
          <span>${tip}</span>
        </li>
      `).join('');
    }

    // Try to enrich with TripMate/Geocoding data
    enrichOverview(itinerary);
  }

  async function enrichOverview(itinerary) {
    if (!itinerary.destination) return;

    // Try TripMate place info for description and images
    if (typeof TripMateAPI !== 'undefined') {
      try {
        const place = await TripMateAPI.getPlaceInfo(itinerary.destination);
        if (place && place.description) {
          const descEl = document.getElementById('overviewDescription');
          if (descEl) descEl.textContent = place.description;
        }
      } catch (e) {
        console.warn('[Overview] TripMate enrichment failed:', e);
      }
    }
  }

  // Tab switching helper exposed globally
  window.switchItinTab = function (tabName) {
    document.querySelectorAll('.itin-tab').forEach(btn => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('bg-white', isActive);
      btn.classList.toggle('text-primary', isActive);
      btn.classList.toggle('shadow-sm', isActive);
      btn.classList.toggle('font-bold', isActive);
      btn.classList.toggle('text-on-surface-variant', !isActive);
      btn.classList.toggle('font-medium', !isActive);
    });

    document.getElementById('overviewTab').classList.toggle('hidden', tabName !== 'overview');
    document.getElementById('itineraryTab').classList.toggle('hidden', tabName !== 'itinerary');

    // Scroll to content
    const content = document.getElementById('tabContent');
    if (content && window.scrollY > content.offsetTop - 200) {
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Wire up tab buttons
  function initOverviewTabs() {
    document.querySelectorAll('.itin-tab').forEach(btn => {
      btn.addEventListener('click', () => switchItinTab(btn.dataset.tab));
    });
  }

  // Hook into itinerary render lifecycle
  const originalRender = window.renderLoadedItinerary;
  if (originalRender) {
    window.renderLoadedItinerary = function (itinerary) {
      originalRender(itinerary);
      initOverviewTabs();
      renderOverview(itinerary);
    };
  } else {
    // Fallback: listen for a custom event if renderLoadedItinerary isn't loaded yet
    document.addEventListener('DOMContentLoaded', () => {
      initOverviewTabs();
      if (window.__currentItinerary) renderOverview(window.__currentItinerary);
    });
  }
})();
