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
  let weatherData = null;

  try {
    tripMateInfo = await TripMateAPI.getPlaceInfo(destination.name);
  } catch (e) {
    console.warn('TripMate place info failed:', e);
  }

  if (destination.lat && destination.lon) {
    try {
      weatherData = await TripMateAPI.getWeather(destination.lat, destination.lon);
      if (weatherData && weatherData.weathercode !== undefined) {
        weatherData.current = {
          temp: weatherData.temperature,
          condition: TripMateAPI.weatherCodeToText(weatherData.weathercode),
          weather_code: weatherData.weathercode
        };
      }
    } catch (e) {
      console.warn('TripMate weather failed:', e);
    }
  }

  try {
    tripMateAttractions = await TripMateAPI.getAttractions(destination.name);
  } catch (e) {
    console.warn('TripMate attractions failed:', e);
  }

  // If TripMate has no image, ask Gemini for one
  let heroImage = tripMateInfo?.image || destination.image;
  if (!heroImage && typeof GeminiAPI !== 'undefined') {
    try {
      heroImage = await GeminiAPI.getPlaceImage(destination.name);
    } catch (e) {
      console.warn('Gemini image fetch failed:', e);
    }
  }

  // 3. Try AI-powered itinerary generation
  let aiResult = null;
  if (typeof GeminiAPI !== 'undefined') {
    try {
      aiResult = await GeminiAPI.generateItinerary({
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
        weather: weatherData
      });
    } catch (e) {
      console.warn('Gemini itinerary generation failed, falling back to rule-based:', e);
    }
  }

  // 4. Use AI result or fall back to rule-based
  let itinerary;
  let accommodations;
  let stay;

  if (aiResult && aiResult.itinerary && aiResult.itinerary.length > 0) {
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

    accommodations = (aiResult.accommodations || []).map(acc => ({
      name: acc.name,
      costPerNight: typeof acc.costPerNight === 'number' ? acc.costPerNight : 1500,
      type: acc.type || 'Mid-Range',
      description: acc.description || ''
    }));

    // Pick first accommodation as the primary stay for budget calc
    stay = accommodations.length > 0
      ? { name: accommodations[0].name, cost: accommodations[0].costPerNight, type: accommodations[0].type }
      : selectStay(destination, budget, numDays);
  } else {
    // Fallback to rule-based planner
    const dailyBudget = Math.round(budget / numDays);
    const selectedActivities = selectActivities(destination, {
      travelStyle: Array.isArray(travelStyle) ? travelStyle : [travelStyle],
      interests: interests || [],
      budget: dailyBudget,
      pace: travelPace || 'Moderate',
      weather: weatherData
    });

    stay = selectStay(destination, budget, numDays);
    itinerary = buildDayPlan(selectedActivities, numDays, travelPace);
    accommodations = destination.stays ? destination.stays.map(s => ({
      name: s.name,
      costPerNight: s.cost,
      type: s.type,
      description: ''
    })) : [];
  }

  // 5. Enhance with routes
  await enhanceItineraryWithRoutes(itinerary);

  // 6. Budget breakdown
  const budgetBreakdown = calculateBudgetBreakdown(itinerary, stay, destination, numDays);

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
    placeDescription: tripMateInfo?.description || ''
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
function calculateBudgetBreakdown(itinerary, stay, destination, numDays) {
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

  const total = transportCost + stayCost + activitiesCost + foodCost;

  return {
    transport: transportCost,
    stay: stayCost,
    food: foodCost,
    activities: activitiesCost,
    total
  };
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
