/* ============================================
   Kibi — Gemini AI API Client
   ============================================ */

// IMPORTANT: Set your Gemini API key in config.json or via env, never commit it.
const GEMINI_API_KEY = (typeof window !== 'undefined' && window.KIBI_CONFIG && window.KIBI_CONFIG.geminiApiKey) ? window.KIBI_CONFIG.geminiApiKey : '';
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-1.5-flash-latest";

const GeminiAPI = {
  /**
   * Generate an itinerary using Gemini AI
   * @param {Object} params - Trip parameters
   * @returns {Promise<Object>} { itinerary: [...], accommodations: [...], image: string|null }
   */
  async generateItinerary(params) {
    const prompt = this.buildPrompt(params);

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192
          }
        })
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${err}`);
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      console.log('[Gemini raw response]', text);

      // Extract JSON from markdown code block if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) text = jsonMatch[1];
      text = text.trim();

      // If response starts with text before JSON, find the first '{'
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(text);

      return {
        itinerary: parsed.itinerary || [],
        accommodations: parsed.accommodations || [],
        image: parsed.image || null,
        notes: parsed.notes || ""
      };
    } catch (err) {
      console.error("Gemini itinerary generation failed:", err);
      throw err;
    }
  },

  /**
   * Ask Gemini a free-form prompt and return the text response.
   * @param {string} prompt
   * @param {Object} opts - Optional { temperature, maxOutputTokens }
   * @returns {Promise<string|null>}
   */
  async askGemini(prompt, opts = {}) {
    if (!GEMINI_API_KEY) {
      console.warn('[GeminiAPI] No API key configured.');
      return null;
    }
    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: opts.temperature ?? 0.4,
            maxOutputTokens: opts.maxOutputTokens ?? 2048
          }
        })
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (err) {
      console.warn('[GeminiAPI] askGemini failed:', err);
      return null;
    }
  },

  /**
   * Ask Gemini for a place image URL when TripMate has none
   * @param {string} destination
   * @returns {Promise<string|null>}
   */
  async getPlaceImage(destination) {
    const prompt = `Return ONLY a valid HTTPS URL to a high-quality, representative travel photo of ${destination}. No explanation, no markdown, just the URL. If unsure, return "null".`;

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
        })
      });

      if (!response.ok) return null;
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (text.toLowerCase() === "null") return null;
      if (text.startsWith("http")) return text;
      return null;
    } catch (err) {
      console.warn("Gemini image fetch failed:", err);
      return null;
    }
  },

  buildPrompt(params) {
    const { destination, lat, lon, startDate, endDate, budget, travelStyle, interests, socialPreference, travelPace, numDays, attractions, weather } = params;

    const attractionList = (attractions || []).map(a =>
      `- ${a.name}${a.category ? ` (${Array.isArray(a.category) ? a.category.join(", ") : a.category})` : ""}: ${a.description || "No description"}`
    ).join("\n") || "No specific attractions provided.";

    const hotelList = (params.hotels || []).map(h =>
      `- ${h.name} (${h.type}, ~₹${h.costPerNight}/night)`
    ).join("\n") || "No specific hotels found.";

    const weatherText = weather?.current
      ? `Current weather: ${weather.current.temperature_2m || weather.current.temp || "N/A"}°C, ${weather.current.weather_code || ""}`
      : "Weather data not available.";

    return `You are an expert travel planner. Create a detailed ${numDays}-day itinerary for ${destination}.

Trip Details:
- Dates: ${startDate} to ${endDate}
- Total Budget: ₹${budget} INR (approx)
- Travel Style: ${Array.isArray(travelStyle) ? travelStyle.join(", ") : travelStyle}
- Interests: ${Array.isArray(interests) ? interests.join(", ") : interests}
- Social Preference: ${socialPreference}
- Travel Pace: ${travelPace}

Attractions available in ${destination}:
${attractionList}

Real hotels/lodging found near ${destination}:
${hotelList}

${weatherText}

Instructions:
1. Create a day-by-day itinerary. Each day should have a title and 3-5 activities.
2. PRIORITY: Use the attractions listed above when planning activities. If the list is empty or insufficient, research well-known attractions for ${destination} yourself.
3. Each activity must include: name, time (e.g. "9:00 AM"), icon (a single emoji), cost in INR (number), type (e.g. Nature, Culture, Food, Adventure), and a short description.
4. Distribute activities logically across days and times (Morning, Afternoon, Evening).
5. Respect the total budget — keep activity costs reasonable for the destination.
6. For accommodations, prefer the real hotels listed above. If none fit, suggest 2-3 realistic hotels with: name, cost per night in INR, type (Budget/Mid-Range/Comfort/Luxury), and a one-line description.
7. Return ONLY a single valid JSON object matching this exact structure. Do NOT wrap it in markdown. Do NOT add explanations.

{"itinerary":[{"day":1,"title":"...","activities":[{"name":"...","time":"...","icon":"...","cost":0,"type":"...","description":"..."}]}],"accommodations":[{"name":"...","costPerNight":0,"type":"...","description":"..."}],"notes":"..."}`;
  }
};
