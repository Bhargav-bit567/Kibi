/* ============================================
   Kibi — Itinerary Overview Module
   Renders a rich Overview tab using real data.
   Priority: TripMate APIs → Gemini AI → curated fallback.
   ============================================ */

(function () {
  'use strict';

  // Minimal curated fallback for when APIs fail entirely.
  const DESTINATION_INFO = {
    'paris': {
      description: "Paris is a global center for art, fashion, gastronomy and culture.",
      bestTime: "April–June, September–October",
      cuisine: ["Croissants", "Steak frites", "Coq au vin", "Macarons"],
      tips: ["Learn a few French phrases.", "Check museum closing days.", "Use Metro day passes."],
      attractions: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Montmartre"]
    },
    'tokyo': {
      description: "Tokyo mixes ultramodern neon-lit skyscrapers with historic temples.",
      bestTime: "March–May, October–November",
      cuisine: ["Sushi", "Ramen", "Tempura", "Tonkatsu"],
      tips: ["Get a Suica/Pasmo card.", "Carry cash.", "Tipping is not customary."],
      attractions: ["Senso-ji Temple", "Shibuya Crossing", "Tokyo Tower", "Meiji Shrine"]
    },
    'new york': {
      description: "NYC is a global hub of finance, culture, entertainment and dining.",
      bestTime: "April–June, September–November",
      cuisine: ["Pizza", "Bagels", "Cheesecake", "Pastrami sandwich"],
      tips: ["Walk fast on sidewalks.", "Subway runs 24/7.", "Book shows in advance."],
      attractions: ["Statue of Liberty", "Central Park", "Times Square", "Empire State Building"]
    },
    'rome': {
      description: "Rome is Italy's capital, packed with ancient ruins and Renaissance art.",
      bestTime: "April–June, September–October",
      cuisine: ["Carbonara", "Cacio e pepe", "Gelato", "Pizza al taglio"],
      tips: ["Carry cash for small cafes.", "Dress modestly at churches.", "Validate transit tickets."],
      attractions: ["Colosseum", "Vatican Museums", "Trevi Fountain", "Pantheon"]
    },
    'bali': {
      description: "Bali is an Indonesian island known for beaches, temples and rice terraces.",
      bestTime: "April–October",
      cuisine: ["Nasi goreng", "Satay", "Babi guling", "Gado-gado"],
      tips: ["Rent scooters carefully.", "Dress modestly at temples.", "Drink bottled water."],
      attractions: ["Uluwatu Temple", "Tegallalang Rice Terrace", "Tanah Lot", "Sacred Monkey Forest"]
    },
    'manali': {
      description: "Manali is a Himalayan resort town and adventure gateway in Himachal Pradesh.",
      bestTime: "October–June; December–February for snow",
      cuisine: ["Siddu", "Trout fish", "Chana madra", "Momos"],
      tips: ["Acclimatize before treks.", "Book activities via registered operators.", "Carry warm layers."],
      attractions: ["Solang Valley", "Rohtang Pass", "Hadimba Temple", "Old Manali"]
    },
    'goa': {
      description: "Goa is India's beach state with Portuguese heritage and nightlife.",
      bestTime: "November–February",
      cuisine: ["Fish curry rice", "Pork vindaloo", "Bebinca", "Feni"],
      tips: ["Rent a scooter for beaches.", "Respect local customs.", "Use sunscreen."],
      attractions: ["Baga Beach", "Dudhsagar Falls", "Basilica of Bom Jesus", "Fort Aguada"]
    },
    'dubai': {
      description: "Dubai is known for luxury shopping, ultramodern architecture and desert safaris.",
      bestTime: "November–March",
      cuisine: ["Shawarma", "Hummus & falafel", "Kunafa", "Dates & Arabic coffee"],
      tips: ["Dress modestly in malls.", "Use Metro/taxis.", "Check Friday timings."],
      attractions: ["Burj Khalifa", "Dubai Mall", "Palm Jumeirah", "Desert Safari"]
    },
    'london': {
      description: "London blends centuries of history with world-class museums and parks.",
      bestTime: "May–September",
      cuisine: ["Fish and chips", "Sunday roast", "Full English", "Afternoon tea"],
      tips: ["Stand right on escalators.", "Many museums are free.", "Use Oyster/contactless."],
      attractions: ["British Museum", "Tower of London", "Buckingham Palace", "London Eye"]
    },
    'sydney': {
      description: "Sydney is famous for its harbourfront Opera House and beaches.",
      bestTime: "September–November, March–May",
      cuisine: ["Meat pie", "Fish and chips", "Barramundi", "Pavlova"],
      tips: ["Tap water is safe.", "Use Opal/contactless.", "Be sun-safe."],
      attractions: ["Sydney Opera House", "Harbour Bridge", "Bondi Beach", "Taronga Zoo"]
    }
  };

  function getDestinationInfo(destination) {
    if (!destination) return null;
    const key = Object.keys(DESTINATION_INFO).find(k => destination.toLowerCase().includes(k));
    return key ? DESTINATION_INFO[key] : null;
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

  /* ---------- Gemini helpers ---------- */
  async function askGeminiForOverview(destination) {
    if (typeof GeminiAPI === 'undefined' || !GeminiAPI.askGemini) {
      console.warn('[Overview] GeminiAPI.askGemini not available');
      return null;
    }
    const prompt = `For the travel destination "${destination}", return ONLY a valid JSON object (no markdown, no explanations) with this exact structure:
{
  "description": "2-3 sentence overview of the destination",
  "bestTime": "short answer like 'March to May' or 'October to March'",
  "cuisine": ["dish 1", "dish 2", "dish 3", "dish 4"],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "attractions": ["attraction 1", "attraction 2", "attraction 3", "attraction 4", "attraction 5"]
}`;
    try {
      const text = await GeminiAPI.askGemini(prompt, { temperature: 0.4, maxOutputTokens: 1024 });
      if (!text) return null;
      const cleaned = text.replace(/```(?:json)?\s*|\s*```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
      return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
    } catch (e) {
      console.warn('[Overview] Gemini overview fetch failed:', e);
      return null;
    }
  }

  async function fetchAttractions(destination) {
    const results = [];
    if (typeof TripMateAPI !== 'undefined' && TripMateAPI.getAttractions) {
      try {
        const list = await TripMateAPI.getAttractions(destination);
        if (list && list.length) {
          list.slice(0, 6).forEach(a => {
            if (a.name) results.push({ name: a.name, source: 'api' });
          });
        }
      } catch (e) { console.warn('[Overview] TripMate attractions failed:', e); }
    }
    if (results.length >= 4) return results.map(r => r.name);

    // Try Gemini fallback
    if (typeof GeminiAPI !== 'undefined' && GeminiAPI.askGemini) {
      try {
        const prompt = `List the top 6 must-visit attractions in ${destination}. Return ONLY a JSON array of strings, no markdown, no explanations.`;
        const text = await GeminiAPI.askGemini(prompt, { temperature: 0.3, maxOutputTokens: 512 });
        if (text) {
          const cleaned = text.replace(/```(?:json)?\s*|\s*```/g, '').trim();
          const arr = JSON.parse(cleaned);
          if (Array.isArray(arr) && arr.length) return arr.slice(0, 6);
        }
      } catch (e) { console.warn('[Overview] Gemini attractions failed:', e); }
    }
    return null;
  }

  /* ---------- Render sections ---------- */
  function showLoadingState() {
    const ids = ['overviewDescription', 'overviewBestTime', 'overviewCuisine', 'overviewTips', 'overviewAttractions'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.loaded) el.innerHTML = '<span class="text-sm text-gray-400 dark:text-[#9AA0A6] flex items-center gap-2"><span class="material-symbols-outlined animate-spin text-base">progress_activity</span> Loading...</span>';
    });
  }

  async function renderOverview(itinerary) {
    showLoadingState();
    const info = getDestinationInfo(itinerary.destination);
    const nights = Math.max(0, Math.round((new Date(itinerary.endDate) - new Date(itinerary.startDate)) / (1000 * 60 * 60 * 24)));

    // Description: TripMate first, then Gemini, then fallback.
    let description = itinerary.placeDescription || info?.description || null;
    let bestTime = info?.bestTime || null;
    let cuisine = info?.cuisine || null;
    let tips = info?.tips || null;
    let attractions = info?.attractions || null;

    // Try TripMate place info for description
    if (typeof TripMateAPI !== 'undefined' && TripMateAPI.getPlaceInfo) {
      try {
        const place = await TripMateAPI.getPlaceInfo(itinerary.destination);
        if (place && place.description && !description) description = place.description;
      } catch (e) { console.warn('[Overview] TripMate place info failed:', e); }
    }

    // Try Gemini for richer data
    const geminiData = await askGeminiForOverview(itinerary.destination);
    if (geminiData) {
      if (geminiData.description && !description) description = geminiData.description;
      if (geminiData.bestTime) bestTime = geminiData.bestTime;
      if (geminiData.cuisine && geminiData.cuisine.length) cuisine = geminiData.cuisine;
      if (geminiData.tips && geminiData.tips.length) tips = geminiData.tips;
      if (geminiData.attractions && geminiData.attractions.length) attractions = geminiData.attractions;
    }

    // Attractions from API/Gemini if not already set
    if (!attractions || attractions.length < 4) {
      const fetched = await fetchAttractions(itinerary.destination);
      if (fetched && fetched.length) attractions = fetched;
    }

    // Defaults if still missing
    description = description || `${itinerary.destination} offers a wonderful mix of experiences for travelers. Plan your days to make the most of your trip.`;
    bestTime = bestTime || 'Varies by season — check local climate before booking.';
    cuisine = cuisine || ['Local street food', 'Regional specialties', 'Popular cafes', 'Traditional desserts'];
    tips = tips || ['Keep digital copies of important documents.', 'Carry a portable charger and adapter.', 'Book popular attractions in advance when possible.'];

    // Description
    const descEl = document.getElementById('overviewDescription');
    if (descEl) {
      descEl.textContent = description;
      descEl.dataset.loaded = 'true';
    }
    const introSection = document.getElementById('overviewIntro');
    if (introSection) introSection.querySelector('h2').textContent = `About ${itinerary.destination}`;

    // Stats
    const statsEl = document.getElementById('overviewStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="bg-blue-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-brand-blue dark:text-[#7EB8FF]">${formatDays(nights)}</div>
          <div class="text-xs text-gray-500 dark:text-[#9AA0A6] mt-1">Duration</div>
        </div>
        <div class="bg-green-50 dark:bg-[#1F2630] rounded-2xl p-4 text-center">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">${countUniqueActivities(itinerary)}</div>
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

    // Highlights from itinerary data
    const highlightsEl = document.getElementById('overviewHighlights');
    if (highlightsEl) {
      const activities = [];
      (itinerary.itinerary || []).forEach(day => (day.activities || []).forEach(act => activities.push(act)));
      const food = activities.find(a => /food|restaurant|cafe|dining|lunch|dinner|breakfast/i.test(a.name));
      const culture = activities.find(a => /temple|museum|palace|church|monument|fort|gallery|historic/i.test(a.name));
      const nature = activities.find(a => /park|garden|beach|valley|mountain|lake|waterfall|viewpoint/i.test(a.name));
      const market = activities.find(a => /market|shopping|mall|bazaar|souvenir/i.test(a.name));
      const highlights = [
        culture && { icon: '🏛️', title: 'Cultural Landmarks', desc: `Visit places like ${culture.name}.` },
        food && { icon: '🍽️', title: 'Local Food Scene', desc: `Enjoy meals at ${food.name}.` },
        nature && { icon: '🌿', title: 'Scenic Experiences', desc: `Explore natural spots such as ${nature.name}.` },
        market && { icon: '🛍️', title: 'Shopping & Leisure', desc: `Browse places like ${market.name}.` },
        { icon: '✨', title: 'Personalized Plan', desc: 'Tailored to your travel style and interests.' }
      ].filter(Boolean).slice(0, 4);

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
      const activityNames = [];
      (itinerary.itinerary || []).forEach(day => {
        (day.activities || []).forEach(act => {
          if (!activityNames.includes(act.name)) activityNames.push(act.name);
        });
      });
      const combined = [...(attractions || []), ...activityNames].slice(0, 6);
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

    // Quick Info with icons
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
          <span>₹${(itinerary.budgetBreakdown?.total || itinerary.totalBudget || itinerary.budget || 0).toLocaleString()}</span>
        </li>
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF]">hiking</span>
          <span>${Array.isArray(itinerary.travelStyle) ? itinerary.travelStyle.join(', ') : (itinerary.travelStyle || 'Travel')}</span>
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
      bestTimeEl.textContent = bestTime;
      bestTimeEl.dataset.loaded = 'true';
    }

    // Cuisine
    const cuisineEl = document.getElementById('overviewCuisine');
    if (cuisineEl) {
      cuisineEl.innerHTML = cuisine.slice(0, 5).map(item => `
        <li class="flex items-center gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="w-6 h-6 rounded-full bg-orange-100 dark:bg-[#1F2630] text-orange-500 flex items-center justify-center text-xs">🍴</span>
          <span>${item}</span>
        </li>
      `).join('');
      cuisineEl.dataset.loaded = 'true';
    }

    // Tips
    const tipsEl = document.getElementById('overviewTips');
    if (tipsEl) {
      tipsEl.innerHTML = tips.slice(0, 5).map(tip => `
        <li class="flex items-start gap-3 text-gray-700 dark:text-[#BDC1C6]">
          <span class="material-symbols-outlined text-brand-blue dark:text-[#7EB8FF] text-base mt-0.5">lightbulb</span>
          <span>${tip}</span>
        </li>
      `).join('');
      tipsEl.dataset.loaded = 'true';
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

    const content = document.getElementById('tabContent');
    if (content && window.scrollY > content.offsetTop - 200) {
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  function initOverviewTabs() {
    document.querySelectorAll('.itin-tab').forEach(btn => {
      btn.addEventListener('click', () => switchItinTab(btn.dataset.tab));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOverviewTabs);
  } else {
    initOverviewTabs();
  }

  function wrapRender() {
    const originalRender = window.renderLoadedItinerary;
    if (!originalRender || originalRender.__overviewWrapped) return;
    window.renderLoadedItinerary = async function (itinerary) {
      window.__currentItinerary = itinerary;
      originalRender(itinerary);
      await renderOverview(itinerary);
    };
    window.renderLoadedItinerary.__overviewWrapped = true;
    if (window.__currentItinerary) renderOverview(window.__currentItinerary);
  }

  wrapRender();
  document.addEventListener('DOMContentLoaded', wrapRender);
  setTimeout(wrapRender, 0);
  setTimeout(wrapRender, 100);
})();
