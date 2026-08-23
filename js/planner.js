/* ============================================
   Kibi — Rule-Based Itinerary Planner (API Enabled)
   Generates personalized itineraries based on user preferences.
   ============================================ */

/* --- Generate Itinerary --- */
async function generateItinerary(params) {
  const { destinationId, destinationName, lat, lon, startDate, endDate, budget, travelStyle, interests, socialPreference, travelPace } = params;

  // 1. Resolve Destination
  let destination = getDestinationById(destinationId);
  if (!destination) {
    destination = {
      id: destinationId,
      name: destinationName,
      lat: lat,
      lon: lon,
      budget: '3000-15000',
      tags: travelStyle.concat(interests),
      image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      transport: { flight: { cost: 5000 }, local: { cost: 300 } },
      stays: [{ name: 'Standard Hotel', cost: 1500, type: 'Comfort' }, { name: 'Hostel', cost: 500, type: 'Budget' }],
      activities: getLocalSampleActivities()
    };
  } else {
    if (lat && lon) {
      destination.lat = lat;
      destination.lon = lon;
    }
  }

  const numDays = calculateDays(startDate, endDate);

  // 2. Fetch TripMate data (Wikipedia image/description + attractions + weather)
  let tripMateInfo = null;
  let tripMateAttractions = [];
  let realHotels = [];
  let weatherData = null;

  // Helper: abort slow API calls so one hang doesn't block the whole planner
  const withTimeout = (promise, ms, label) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms))
    ]);
  };

  try {
    const [placeInfo, attractions] = await Promise.all([
      withTimeout(TripMateAPI.getPlaceInfo(destination.name), 8000, 'place info').catch(e => {
        console.warn('TripMate place info failed:', e);
        return null;
      }),
      withTimeout(TripMateAPI.getAttractions(destination.name), 12000, 'attractions').catch(e => {
        console.warn('TripMate attractions failed:', e);
        return [];
      })
    ]);
    tripMateInfo = placeInfo;
    tripMateAttractions = attractions;
  } catch (e) {
    console.warn('TripMate data fetch failed:', e);
  }

  if (destination.lat && destination.lon) {
    try {
      const [weatherRaw, hotels] = await Promise.all([
        withTimeout(TripMateAPI.getWeather(destination.lat, destination.lon), 8000, 'weather').catch(e => {
          console.warn('TripMate weather failed:', e);
          return null;
        }),
        withTimeout(searchRealHotels(destination.lat, destination.lon), 15000, 'hotels').catch(e => {
          console.warn('Real hotel search failed:', e);
          return [];
        })
      ]);

      // Normalize TripMate/Open-Meteo weather into stable shape used by the UI
      if (weatherRaw) {
        const current = weatherRaw.current_weather || weatherRaw;
        const code = current.weathercode !== undefined ? current.weathercode : current.weather_code;
        weatherData = {
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
      realHotels = hotels;
    } catch (e) {
      console.warn('Location data fetch failed:', e);
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

  // If TripMate has no image, ask Gemini for one (with a short timeout)
  let heroImage = tripMateInfo?.image || destination.image;
  if (!heroImage && typeof GeminiAPI !== 'undefined') {
    try {
      heroImage = await withTimeout(GeminiAPI.getPlaceImage(destination.name), 6000, 'Gemini image');
    } catch (e) {
      console.warn('Gemini image fetch failed:', e);
    }
  }

  // 3. Build itinerary from real TripMate attractions (permanent default)
  console.log('[Planner] Building itinerary from real TripMate attractions');
  const dailyBudget = Math.round(budget / numDays);

  // Convert TripMate attractions into activity format
  const attractionActivities = (tripMateAttractions || []).map(a => ({
    name: a.name,
    type: Array.isArray(a.category) ? a.category[0] : (a.category || 'Attraction'),
    icon: '📍',
    cost: typeof a.entryFee === 'number' ? a.entryFee : 300,
    description: a.description || `A popular spot in ${destination.name}.`,
    lat: a.coordinates?.latitude,
    lon: a.coordinates?.longitude,
    isRealPlace: true
  }));

  // Combine with destination activities and sample fallback
  const combinedActivities = [...attractionActivities, ...destination.activities, ...getLocalSampleActivities()];
  destination.activities = combinedActivities;

  const selectedActivities = selectActivities(destination, {
    travelStyle: Array.isArray(travelStyle) ? travelStyle : [travelStyle],
    interests: interests || [],
    budget: dailyBudget,
    pace: travelPace || 'Moderate',
    weather: weatherData
  });

  let stay = selectStay(destination, budget, numDays);
  let itinerary = buildDayPlan(selectedActivities, numDays, travelPace);

  // Use real hotels for accommodations
  let accommodations = realHotels.length > 0
    ? realHotels.slice(0, 3).map(h => ({
        name: h.name,
        costPerNight: h.costPerNight,
        type: h.type,
        description: h.description,
        lat: h.lat,
        lon: h.lon,
        source: 'real'
      }))
    : (destination.stays ? destination.stays.map(s => ({
        name: s.name,
        costPerNight: s.cost,
        type: s.type,
        description: '',
        source: 'fallback'
      })) : []);

  // 4. Optional: let Gemini restructure/enhance the real-data plan if available
  let aiEnhanced = false;
  if (typeof GeminiAPI !== 'undefined') {
    try {
      const aiResult = await withTimeout(
        GeminiAPI.generateItinerary({
          destination: destination.name,
          lat: destination.lat,
          lon: destination.lon,
          startDate,
          endDate,
          budget,
          travelStyle,
          interests,
          socialPreference,
          travelPace,
          numDays,
          attractions: tripMateAttractions,
          hotels: realHotels,
          weather: weatherData
        }),
        10000,
        'Gemini enhancement'
      );

      if (aiResult && aiResult.itinerary && aiResult.itinerary.length > 0) {
        console.log('[Planner] AI enhancement applied');
        itinerary = aiResult.itinerary.map(day => ({
          day: day.day,
          title: day.title || `Day ${day.day}`,
          activities: (day.activities || []).map(act => ({
            name: act.name,
            time: act.time || '12:00 PM',
            icon: act.icon || '📍',
            cost: typeof act.cost === 'number' ? act.cost : 0,
            type: act.type || 'Activity',
            description: act.description || ''
          }))
        }));

        // Merge AI accommodation suggestions with real hotel data when possible
        accommodations = (aiResult.accommodations || []).map(acc => {
          const real = realHotels.find(h =>
            h.name.toLowerCase().includes(acc.name.toLowerCase()) ||
            acc.name.toLowerCase().includes(h.name.toLowerCase())
          );
          return {
            name: real ? real.name : acc.name,
            costPerNight: real ? real.costPerNight : (typeof acc.costPerNight === 'number' ? acc.costPerNight : 1500),
            type: real ? real.type : (acc.type || 'Mid-Range'),
            description: acc.description || (real ? `Real ${real.type.toLowerCase()} stay found near ${destination.name}.` : 'AI-suggested stay.'),
            lat: real ? real.lat : null,
            lon: real ? real.lon : null,
            source: real ? 'real' : 'ai'
          };
        });

        aiEnhanced = true;
      }
    } catch (e) {
      console.warn('Gemini enhancement failed, keeping real-data plan:', e);
    }
  }

  // Pick first accommodation as the primary stay for budget calc
  stay = accommodations.length > 0
    ? { name: accommodations[0].name, cost: accommodations[0].costPerNight, type: accommodations[0].type }
    : selectStay(destination, budget, numDays);

  // 5. Enhance with routes
  await enhanceItineraryWithRoutes(itinerary);

  // 6. Budget breakdown (scaled to match user's entered budget)
  const budgetBreakdown = calculateBudgetBreakdown(itinerary, stay, destination, numDays, budget);

  return {
    destination: destination.name,
    destinationId: destination.id,
    lat: destination.lat,
    lon: destination.lon,
    startDate,
    endDate,
    numDays,
    itinerary,
    stay,
    accommodations,
    budgetBreakdown,
    totalBudget: budgetBreakdown.total,
    image: heroImage,
    travelStyle: Array.isArray(travelStyle) ? travelStyle[0] : travelStyle,
    interests,
    socialPreference,
    weather: weatherData,
    placeDescription: tripMateInfo?.description || '',
    aiEnhanced,
    aiPlanned: aiEnhanced,
    aiFailed: !aiEnhanced
  };
}

/* --- Select Activities Based on Preferences --- */
function selectActivities(destination, prefs) {
  const allActivities = destination.activities || [];
  
  // Basic rain check
  const isRaining = prefs.weather && prefs.weather.current && 
                    (prefs.weather.current.condition.toLowerCase().includes('rain') || 
                     prefs.weather.current.condition.toLowerCase().includes('snow') ||
                     prefs.weather.current.condition.toLowerCase().includes('thunderstorm'));

  // Score each activity based on preference match
  const scored = allActivities.map(activity => {
    let score = 0;

    // Real places from API get a huge boost because we want them!
    if (activity.isRealPlace) score += 50;

    // Match travel style
    const styles = prefs.travelStyle || [];
    if (styles.some(s => activity.type.toLowerCase().includes(s.toLowerCase()) ||
                         s.toLowerCase().includes(activity.type.toLowerCase()))) {
      score += 30;
    }

    // Match interests
    const interests = prefs.interests || [];
    if (interests.some(i => activity.type.toLowerCase().includes(i.toLowerCase()) ||
                            activity.name.toLowerCase().includes(i.toLowerCase()) ||
                            i.toLowerCase().includes(activity.type.toLowerCase()))) {
      score += 25;
    }

    // Budget awareness
    if (activity.cost <= prefs.budget * 0.3) {
      score += 10;
    } else if (activity.cost > prefs.budget * 0.5) {
      score -= 10;
    }

    // Weather awareness optimization
    const isOutdoor = ['Nature', 'Photography', 'Adventure', 'Trekking', 'Camping', 'Wildlife', 'Beach'].includes(activity.type);
    if (isRaining && isOutdoor) {
      score -= 40; // Heavy penalty for outdoors if raining
    } else if (isRaining && !isOutdoor) {
      score += 20; // Boost indoor activities
    } else if (!isRaining && isOutdoor) {
      score += 10; // Boost outdoor if nice weather
    }

    return { ...activity, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Remove duplicates by name (in case API returns same place twice)
  const uniqueScored = [];
  const seen = new Set();
  for (const act of scored) {
    if (!seen.has(act.name)) {
      seen.add(act.name);
      uniqueScored.push(act);
    }
  }

  return uniqueScored;
}

/* --- Select Stay --- */
function selectStay(destination, totalBudget, numDays) {
  const stays = destination.stays || [];
  if (stays.length === 0) return { name: 'Guesthouse', cost: 500, type: 'Budget' };

  const stayBudget = (totalBudget * 0.3) / numDays;
  const affordable = stays.filter(s => s.cost <= stayBudget * 1.2);
  
  if (affordable.length > 0) {
    return affordable.sort((a, b) => b.cost - a.cost)[0];
  }
  return stays.sort((a, b) => a.cost - b.cost)[0];
}

/* --- Build Day-by-Day Plan --- */
function buildDayPlan(scoredActivities, numDays, pace) {
  const activitiesPerDay = pace === 'Slow' ? 3 : pace === 'Fast' ? 5 : 4;
  const days = [];
  const usedActivities = new Set();

  const timeSlots = ['Morning', 'Late Morning', 'Afternoon', 'Late Afternoon', 'Evening'];
  const timeLabels = {
    'Morning': '8:00 AM',
    'Late Morning': '10:30 AM',
    'Afternoon': '1:00 PM',
    'Late Afternoon': '3:30 PM',
    'Evening': '6:00 PM'
  };

  const dayTitles = [
    'Arrival & Explore',
    'Adventure Day',
    'Culture & Discovery',
    'Nature & Scenic',
    'Relaxation Day',
    'Markets & Food',
    'Final Exploration'
  ];

  for (let d = 0; d < numDays; d++) {
    const dayActivities = [];
    let activityCount = 0;

    if (d === 0) {
      dayActivities.push({
        name: `Arrive in destination`,
        time: '10:00 AM',
        icon: '🚌',
        cost: 0,
        type: 'Travel'
      });
      activityCount++;
    }

    const isLastDay = d === numDays - 1;

    for (let i = 0; i < scoredActivities.length && activityCount < activitiesPerDay; i++) {
      const activity = scoredActivities[i];
      if (usedActivities.has(activity.name)) continue;
      if (activity.time === 'Full Day' && activityCount > 0) continue;

      const slotIndex = Math.min(activityCount, timeSlots.length - 1);
      dayActivities.push({
        name: activity.name,
        time: timeLabels[timeSlots[slotIndex]] || '12:00 PM',
        icon: activity.icon || '📍',
        cost: activity.cost,
        type: activity.type,
        description: activity.description,
        lat: activity.lat,
        lon: activity.lon
      });

      usedActivities.add(activity.name);
      activityCount++;
    }

    if (isLastDay) {
      dayActivities.push({
        name: 'Departure',
        time: '3:00 PM',
        icon: '🚌',
        cost: 0,
        type: 'Travel'
      });
    }

    days.push({
      day: d + 1,
      title: dayTitles[d % dayTitles.length],
      activities: dayActivities
    });
  }

  return days;
}

/* --- Enhance Itinerary with Routing API --- */
async function enhanceItineraryWithRoutes(itineraryDays) {
  for (const day of itineraryDays) {
    // Collect activities that have coordinates
    const actsWithCoords = day.activities.filter(a => a.lat && a.lon);
    
    if (actsWithCoords.length >= 2) {
      const coords = actsWithCoords.map(a => [a.lon, a.lat]); // ORS uses [lon, lat]
      const routeData = await RoutingAPI.getRoute(coords);
      
      if (routeData) {
        day.routeSummary = {
          distance: routeData.distanceKm,
          duration: routeData.durationMin,
          geometry: routeData.geometry
        };
      }
    }
  }
}

/* --- Calculate Budget Breakdown --- */
function calculateBudgetBreakdown(itinerary, stay, destination, numDays, userBudget = 0) {
  const transport = destination.transport;
  let transportCost = 0;
  if (transport) {
    const routes = Object.values(transport).filter(r => !r.perDay);
    if (routes.length > 0) transportCost = routes[0].cost * 2;
    if (transport.local) transportCost += transport.local.cost * numDays;
  } else {
    transportCost = 2000; // API fallback estimate
  }

  const stayCost = stay.cost * numDays;
  let activitiesCost = 0;

  itinerary.forEach(day => {
    day.activities.forEach(act => {
      activitiesCost += act.cost || 0;
    });
  });

  const foodCost = numDays * 800; // ₹800 per day average

  // If user entered a budget, scale breakdown so total matches it
  const estimatedTotal = transportCost + stayCost + activitiesCost + foodCost;
  const targetTotal = userBudget > 0 ? userBudget : estimatedTotal;
  const scale = estimatedTotal > 0 ? targetTotal / estimatedTotal : 1;

  return {
    transport: Math.round(transportCost * scale),
    stay: Math.round(stayCost * scale),
    food: Math.round(foodCost * scale),
    activities: Math.round(activitiesCost * scale),
    total: targetTotal
  };
}

/* --- Search Real Hotels via Overpass --- */
async function searchRealHotels(lat, lon) {
  const radius = 15000; // 15km
  const query = `
    [out:json][timeout:20];
    (
      node["tourism"="hotel"](around:${radius},${lat},${lon});
      node["tourism"="guest_house"](around:${radius},${lat},${lon});
      node["tourism"="hostel"](around:${radius},${lat},${lon});
      node["tourism"="apartment"](around:${radius},${lat},${lon});
      node["tourism"="resort"](around:${radius},${lat},${lon});
      way["tourism"="hotel"](around:${radius},${lat},${lon});
      way["tourism"="guest_house"](around:${radius},${lat},${lon});
      way["tourism"="hostel"](around:${radius},${lat},${lon});
      way["tourism"="apartment"](around:${radius},${lat},${lon});
      way["tourism"="resort"](around:${radius},${lat},${lon});
    );
    out center 20;
  `;

  try {
    const response = await fetch(API_CONFIG.overpass.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(query)
    });
    if (!response.ok) throw new Error('Overpass hotel search failed');
    const data = await response.json();

    const hotels = (data.elements || [])
      .filter(el => el.tags && (el.tags.name || el.tags['name:en']))
      .map(el => {
        const tags = el.tags || {};
        const name = tags.name || tags['name:en'];
        let type = 'Mid-Range';
        if (tags.tourism === 'hostel') type = 'Budget';
        else if (tags.tourism === 'resort' || tags.stars >= 4) type = 'Luxury';
        else if (tags.tourism === 'hotel') type = 'Comfort';

        let costPerNight = 1500;
        if (type === 'Budget') costPerNight = 700;
        else if (type === 'Comfort') costPerNight = 2500;
        else if (type === 'Luxury') costPerNight = 5000;

        return {
          name,
          costPerNight,
          type,
          description: `${tags.tourism ? tags.tourism.replace(/_/g, ' ') : 'Stay'} in the area.`,
          lat: el.lat || (el.center && el.center.lat),
          lon: el.lon || (el.center && el.center.lon),
          stars: tags.stars || null,
          source: 'overpass'
        };
      });

    // Deduplicate by name and return top 6
    const seen = new Set();
    const unique = [];
    for (const h of hotels) {
      if (!seen.has(h.name)) {
        seen.add(h.name);
        unique.push(h);
      }
    }
    return unique.slice(0, 6);
  } catch (err) {
    console.warn('Hotel search error:', err);
    return [];
  }
}

/* --- Calculate Number of Days --- */
function calculateDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

/* --- Get Fallback Sample Activities --- */
function getLocalSampleActivities() {
  return [
    { name: 'Local Market Visit', type: 'Culture', icon: '🛍️', cost: 0, description: 'Explore the bustling local market.' },
    { name: 'City Museum', type: 'History', icon: '🏛️', cost: 200, description: 'Discover the rich history of the region.' },
    { name: 'Nature Trail Walk', type: 'Nature', icon: '🌲', cost: 0, description: 'A peaceful walk through the woods.' },
    { name: 'Famous Local Café', type: 'Cafés', icon: '☕', cost: 400, description: 'Relax with some local coffee and snacks.' },
    { name: 'Panoramic Viewpoint', type: 'Photography', icon: '📸', cost: 50, description: 'Best spot for sunset photos.' },
    { name: 'Traditional Dinner', type: 'Local Food', icon: '🍲', cost: 600, description: 'Authentic local culinary experience.' }
  ];
}
