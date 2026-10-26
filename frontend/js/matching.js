/* ============================================
   Kibi — Compatibility Matching Engine
   Calculates traveler compatibility scores
   ============================================ */

/* --- Weights for matching criteria --- */
const MATCH_WEIGHTS = {
  interests: 0.35,
  budget: 0.25,
  travelStyle: 0.20,
  socialPreference: 0.20
};

/* --- Calculate Compatibility Between Two Users --- */
function calculateCompatibility(user1, user2) {
  const scores = {
    interests: calculateInterestMatch(user1, user2),
    budget: calculateBudgetMatch(user1, user2),
    travelStyle: calculateTravelStyleMatch(user1, user2),
    socialPreference: calculateSocialMatch(user1, user2)
  };

  // Weighted total
  const total = Math.round(
    scores.interests * MATCH_WEIGHTS.interests +
    scores.budget * MATCH_WEIGHTS.budget +
    scores.travelStyle * MATCH_WEIGHTS.travelStyle +
    scores.socialPreference * MATCH_WEIGHTS.socialPreference
  );

  return {
    total: Math.min(total, 99), // Cap at 99%
    breakdown: scores
  };
}

/* --- Interest Match (Jaccard Similarity) --- */
function calculateInterestMatch(user1, user2) {
  const interests1 = new Set([...(user1.interests || []), ...(user1.travelStyle || [])]);
  const interests2 = new Set([...(user2.interests || []), ...(user2.travelStyle || [])]);

  if (interests1.size === 0 || interests2.size === 0) return 50;

  const intersection = new Set([...interests1].filter(x => interests2.has(x)));
  const union = new Set([...interests1, ...interests2]);

  return Math.round((intersection.size / union.size) * 100);
}

/* --- Budget Match --- */
function calculateBudgetMatch(user1, user2) {
  const budget1 = parseBudgetRange(user1.budget);
  const budget2 = parseBudgetRange(user2.budget);

  if (!budget1 || !budget2) return 50;

  // Calculate overlap between ranges
  const overlapStart = Math.max(budget1.min, budget2.min);
  const overlapEnd = Math.min(budget1.max, budget2.max);

  if (overlapStart >= overlapEnd) {
    // No overlap — calculate distance
    const distance = Math.abs(overlapStart - overlapEnd);
    const maxRange = Math.max(budget1.max - budget1.min, budget2.max - budget2.min) || 5000;
    return Math.max(0, Math.round(100 - (distance / maxRange) * 100));
  }

  // Has overlap — calculate overlap percentage
  const overlapSize = overlapEnd - overlapStart;
  const totalRange = Math.max(budget1.max, budget2.max) - Math.min(budget1.min, budget2.min);
  return Math.round((overlapSize / totalRange) * 100);
}

function parseBudgetRange(budget) {
  if (!budget) return null;
  if (typeof budget === 'number') return { min: budget * 0.8, max: budget * 1.2 };

  const str = String(budget);

  // Handle "20000+" format
  if (str.includes('+')) {
    const min = parseInt(str.replace('+', ''));
    return { min, max: min * 2 };
  }

  // Handle "5000-10000" format
  const parts = str.split('-').map(s => parseInt(s.replace(/[^\d]/g, '')));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { min: parts[0], max: parts[1] };
  }

  // Handle single number
  const num = parseInt(str.replace(/[^\d]/g, ''));
  if (!isNaN(num)) return { min: num * 0.8, max: num * 1.2 };

  return null;
}

/* --- Travel Style Match --- */
function calculateTravelStyleMatch(user1, user2) {
  const styles1 = Array.isArray(user1.travelStyle) ? user1.travelStyle : [user1.travelStyle].filter(Boolean);
  const styles2 = Array.isArray(user2.travelStyle) ? user2.travelStyle : [user2.travelStyle].filter(Boolean);

  if (styles1.length === 0 || styles2.length === 0) return 50;

  const set1 = new Set(styles1);
  const set2 = new Set(styles2);
  const intersection = [...set1].filter(x => set2.has(x));
  const union = new Set([...set1, ...set2]);

  return Math.round((intersection.length / union.size) * 100);
}

/* --- Social Preference Match --- */
function calculateSocialMatch(user1, user2) {
  const socialLevels = {
    'Solo': 1,
    '1-2 People': 2,
    'Small Group': 3,
    'Social': 4,
    'Highly Social': 5
  };

  const level1 = socialLevels[user1.socialPreference] || 3;
  const level2 = socialLevels[user2.socialPreference] || 3;

  const diff = Math.abs(level1 - level2);
  // Map difference (0-4) to score (100-0)
  return Math.round(100 - (diff / 4) * 100);
}

/* --- Get Compatible Travelers for a User --- */
function getCompatibleTravelers(user, limit = 10) {
  const sampleTravelers = getSampleTravelers();
  const allUsers = getUsers();

  // Combine sample travelers and real users (excluding current user)
  const candidates = [
    ...sampleTravelers,
    ...allUsers.filter(u => u.id !== user.id)
  ];

  // Calculate compatibility for each candidate
  const scored = candidates.map(candidate => {
    const compatibility = calculateCompatibility(user, candidate);
    return {
      ...candidate,
      matchScore: compatibility.total,
      matchBreakdown: compatibility.breakdown
    };
  });

  // Sort by match score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);

  return scored.slice(0, limit);
}

/* --- Get Recommended Trips for a User --- */
function getRecommendedTrips(user, limit = 6) {
  const trips = getTrips();

  const scored = trips.map(trip => {
    let score = 0;

    // Destination preference match
    const userInterests = [...(user.interests || []), ...(user.travelStyle || [])];
    const dest = getDestinationById(trip.destinationId);
    if (dest) {
      const destTags = dest.tags || [];
      const matchingTags = userInterests.filter(i => destTags.includes(i));
      score += (matchingTags.length / Math.max(destTags.length, 1)) * 30;
    }

    // Budget match
    const budgetMatch = calculateBudgetMatch(user, { budget: trip.budget });
    score += (budgetMatch / 100) * 25;

    // Travel style match
    const styleUser = Array.isArray(user.travelStyle) ? user.travelStyle : [user.travelStyle];
    if (styleUser.includes(trip.travelStyle)) score += 20;

    // Social preference match
    if (user.socialPreference === trip.socialPreference) score += 15;

    // Availability (open trips rank higher)
    if (trip.status === 'open' && trip.members && trip.members.length < trip.maxMembers) {
      score += 10;
    }

    return {
      ...trip,
      matchScore: Math.min(Math.round(score), 99)
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  return scored.slice(0, limit);
}

/* --- Calculate Trip Compatibility --- */
function calculateTripCompatibility(user, trip) {
  let score = 0;

  // Interest overlap with trip interests
  const userInterests = [...(user.interests || []), ...(user.travelStyle || [])];
  const tripInterests = trip.interests || [];
  const intersection = userInterests.filter(i => tripInterests.includes(i));
  score += (intersection.length / Math.max(tripInterests.length, 1)) * 35;

  // Budget match
  const budgetMatch = calculateBudgetMatch(user, { budget: trip.budget });
  score += (budgetMatch / 100) * 25;

  // Social preference
  const socialMatch = calculateSocialMatch(user, { socialPreference: trip.socialPreference });
  score += (socialMatch / 100) * 20;

  // Travel style
  const styleUser = Array.isArray(user.travelStyle) ? user.travelStyle : [user.travelStyle];
  if (styleUser.includes(trip.travelStyle)) score += 20;

  return Math.min(Math.round(score), 99);
}

/* --- Get Destination Suggestions --- */
function getDestinationSuggestions(user) {
  const destinations = getDestinations();
  const userInterests = [...(user.interests || []), ...(user.travelStyle || [])];

  return destinations.map(dest => {
    let score = 0;
    const destTags = dest.tags || [];
    const intersection = userInterests.filter(i => destTags.includes(i));
    score += (intersection.length / Math.max(destTags.length, 1)) * 100;

    return { ...dest, matchScore: score };
  }).sort((a, b) => b.matchScore - a.matchScore);
}
